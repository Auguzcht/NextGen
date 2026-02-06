#!/usr/bin/env python3
"""
NextGen AI RAG - Enhanced PDF Embedding with Metadata (Python)
Processes PDF efficiently with better memory handling than Node.js
Usage: python3 scripts/embedPDFWithMetadata.py
"""

import os
import re
import time
from typing import List, Dict, Tuple
from dotenv import load_dotenv
import PyPDF2
from openai import OpenAI
from pinecone import Pinecone, ServerlessSpec

# Load environment variables
load_dotenv()

# Configuration
CONFIG = {
    'pdf_path': 'NextGen-User Manual.pdf',
    'chunk_size': 800,
    'chunk_overlap': 150,
    'embedding_model': 'text-embedding-3-small',
    'embedding_dimensions': 512,
    'embedding_batch_size': 100,
}

# Initialize clients
openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
pinecone_client = Pinecone(api_key=os.getenv('PINECONE_API_KEY'))

chunk_counter = 0


def detect_metadata(text: str, page_num: int) -> Dict:
    """Detect metadata from chunk content using pattern matching"""
    text_lower = text.lower()
    
    topic = 'general'
    task = 'reference'
    role_min = 1
    
    # Attendance/Check-in
    if re.search(r'check.?in|attendance|qr.?(code|scan)', text_lower):
        topic = 'attendance'
        task = 'procedure'
        role_min = 1
    # Children Management
    elif re.search(r'register.*child|add.*child|child.*record|formal.?id', text_lower):
        topic = 'children'
        task = 'procedure' if re.search(r'register|add', text_lower) else 'navigation'
        role_min = 3
    # Guardians
    elif re.search(r'guardian|parent|emergency', text_lower):
        topic = 'guardians'
        task = 'navigation'
        role_min = 3
    # Reports
    elif re.search(r'report|analytic|dashboard|statistic', text_lower):
        topic = 'reports'
        task = 'navigation'
        role_min = 5
    # Staff Management
    elif re.search(r'staff.*management|volunteer.*assign|access.*level', text_lower):
        topic = 'staff_management'
        task = 'navigation'
        role_min = 5
    # Email
    elif re.search(r'email.*template|send.*email|smtp', text_lower):
        topic = 'email'
        task = 'procedure'
        role_min = 5
    # Settings
    elif re.search(r'settings|configuration|api.*key|deployment', text_lower):
        topic = 'settings'
        task = 'navigation'
        role_min = 10
    # Navigation
    elif re.search(r'navigation|menu|button|sidebar', text_lower):
        topic = 'navigation'
        task = 'navigation'
        role_min = 1
    # Troubleshooting
    elif re.search(r'error|troubleshoot|fix|debug', text_lower):
        topic = 'troubleshooting'
        task = 'troubleshooting'
        role_min = 1
    # Overview
    elif re.search(r'introduction|overview|getting.*started', text_lower):
        topic = 'overview'
        task = 'reference'
        role_min = 1
    
    return {
        'topic': topic,
        'task': task,
        'role_min': role_min,
        'page': page_num
    }


def extract_text_from_pdf(pdf_path: str) -> List[Dict]:
    """Extract text from PDF page by page"""
    print(f'📄 Reading PDF: {pdf_path}')
    
    pages = []
    with open(pdf_path, 'rb') as file:
        pdf_reader = PyPDF2.PdfReader(file)
        total_pages = len(pdf_reader.pages)
        
        print(f'✅ PDF has {total_pages} pages')
        
        for page_num in range(total_pages):
            page = pdf_reader.pages[page_num]
            text = page.extract_text()
            
            if text and text.strip():
                pages.append({
                    'page_num': page_num + 1,
                    'text': text
                })
            
            # Progress indicator every 20 pages
            if (page_num + 1) % 20 == 0:
                print(f'  Extracted {page_num + 1}/{total_pages} pages...')
    
    print(f'✅ Extracted {len(pages)} pages with text\n')
    return pages


def create_chunks(pages: List[Dict]) -> List[Dict]:
    """Create overlapping chunks with metadata"""
    global chunk_counter
    chunks = []
    
    print(f'Processing {len(pages)} pages into chunks...')
    
    for idx, page in enumerate(pages):
        text = page['text']
        start = 0
        
        # Progress indicator
        if (idx + 1) % 10 == 0:
            print(f'  Chunking page {idx + 1}/{len(pages)}...')
        
        while start < len(text):
            end = min(start + CONFIG['chunk_size'], len(text))
            chunk_text = text[start:end]
            
            # Try to break at sentence or newline
            if end < len(text):
                last_period = chunk_text.rfind('.')
                last_newline = chunk_text.rfind('\n')
                break_point = max(last_period, last_newline)
                
                if break_point > CONFIG['chunk_size'] * 0.7:
                    chunk_text = text[start:start + break_point + 1]
            
            # Clean and validate
            chunk_text = chunk_text.strip()
            
            if len(chunk_text) > 100:  # Only meaningful chunks
                metadata = detect_metadata(chunk_text, page['page_num'])
                
                chunks.append({
                    'id': f'chunk-{chunk_counter}',
                    'text': chunk_text,
                    **metadata
                })
                chunk_counter += 1
            
            start += (len(chunk_text) - CONFIG['chunk_overlap'])
    
    return chunks


def generate_embeddings(chunks: List[Dict]) -> List[Dict]:
    """Generate embeddings using OpenAI"""
    print(f'🧠 Generating embeddings for {len(chunks)} chunks...')
    
    embeddings = []
    batch_size = CONFIG['embedding_batch_size']
    
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i + batch_size]
        texts = [c['text'] for c in batch]
        
        batch_num = i // batch_size + 1
        total_batches = (len(chunks) + batch_size - 1) // batch_size
        print(f'  Batch {batch_num}/{total_batches}...')
        
        # Call OpenAI API
        response = openai_client.embeddings.create(
            model=CONFIG['embedding_model'],
            input=texts,
            dimensions=CONFIG['embedding_dimensions']
        )
        
        # Combine chunks with embeddings
        for j, embedding_data in enumerate(response.data):
            embeddings.append({
                **batch[j],
                'embedding': embedding_data.embedding
            })
        
        # Rate limiting
        if i + batch_size < len(chunks):
            time.sleep(0.2)
    
    print(f'✅ Generated {len(embeddings)} embeddings\n')
    return embeddings


def upload_to_pinecone(embeddings: List[Dict], index_name: str):
    """Upload vectors to Pinecone"""
    print(f'☁️  Uploading to Pinecone index: {index_name}...')
    
    index = pinecone_client.Index(index_name)
    
    # Prepare vectors
    vectors = []
    for item in embeddings:
        vectors.append({
            'id': item['id'],
            'values': item['embedding'],
            'metadata': {
                'text': item['text'],
                'page': item['page'],
                'topic': item['topic'],
                'task': item['task'],
                'role_min': item['role_min'],
                'source': 'NextGen-User Manual.pdf',
                'type': 'documentation'
            }
        })
    
    # Upload in batches
    batch_size = 100
    for i in range(0, len(vectors), batch_size):
        batch = vectors[i:i + batch_size]
        index.upsert(vectors=batch)
        print(f'  Uploaded {min(i + batch_size, len(vectors))}/{len(vectors)} vectors...')
        time.sleep(0.1)  # Rate limiting
    
    print(f'✅ Uploaded {len(vectors)} vectors\n')


def delete_all_vectors(index_name: str):
    """Delete all vectors from Pinecone index"""
    print('🗑️  Clearing Pinecone index...')
    
    try:
        index = pinecone_client.Index(index_name)
        index.delete(delete_all=True)
        print('✅ Index cleared')
        time.sleep(3)  # Wait for propagation
    except Exception as e:
        if '404' in str(e):
            print('ℹ️  Index already empty')
        else:
            print(f'⚠️  Could not delete: {e}')
            print('✅ Continuing anyway (will overwrite existing vectors)')
    print()


def print_metadata_stats(chunks: List[Dict]):
    """Print metadata distribution statistics"""
    topic_counts = {}
    task_counts = {}
    role_counts = {}
    
    for chunk in chunks:
        topic_counts[chunk['topic']] = topic_counts.get(chunk['topic'], 0) + 1
        task_counts[chunk['task']] = task_counts.get(chunk['task'], 0) + 1
        role_counts[chunk['role_min']] = role_counts.get(chunk['role_min'], 0) + 1
    
    print('📊 Metadata Distribution:')
    print(f'  Topics: {dict(sorted(topic_counts.items(), key=lambda x: x[1], reverse=True))}')
    print(f'  Tasks: {task_counts}')
    print(f'  Role Minimums: {dict(sorted(role_counts.items()))}')
    print()


def main():
    try:
        print('🚀 NextGen AI RAG - PDF Embedding with Metadata (Python)\n')
        
        # Validate environment
        if not os.getenv('OPENAI_API_KEY') or not os.getenv('PINECONE_API_KEY'):
            raise ValueError('Missing API keys in environment variables')
        
        index_name = os.getenv('PINECONE_INDEX_NAME')
        if not index_name:
            raise ValueError('Missing PINECONE_INDEX_NAME in environment variables')
        
        # Step 1: Delete existing vectors
        delete_all_vectors(index_name)
        
        # Step 2: Extract PDF
        pages = extract_text_from_pdf(CONFIG['pdf_path'])
        
        # Step 3: Create chunks with metadata
        print('✂️  Creating intelligent chunks with metadata...')
        chunks = create_chunks(pages)
        print(f'✅ Created {len(chunks)} chunks\n')
        
        # Show metadata statistics
        print_metadata_stats(chunks)
        
        # Step 4: Generate embeddings
        embeddings = generate_embeddings(chunks)
        
        # Step 5: Upload to Pinecone
        upload_to_pinecone(embeddings, index_name)
        
        # Success summary
        print('✨ SUCCESS!')
        print(f'📊 Total chunks: {len(chunks)}')
        print(f'💾 Stored in Pinecone index: {index_name}')
        print('\n🎯 Metadata fields:')
        print('   - topic: (attendance, children, guardians, reports, etc.)')
        print('   - task: (procedure, navigation, reference, troubleshooting)')
        print('   - role_min: (1=Volunteer, 3=Team Leader, 5=Coordinator, 10=Admin)')
        print('   - page: (page number in manual)')
        
    except Exception as error:
        print(f'\n❌ ERROR: {error}')
        import traceback
        traceback.print_exc()
        exit(1)


if __name__ == '__main__':
    main()
