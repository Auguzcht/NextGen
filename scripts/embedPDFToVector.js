/**
 * NextGen AI RAG - PDF Embedding Script
 * Extracts text from user manual PDF, chunks it, generates embeddings, and uploads to Pinecone
 * 
 * Usage: node scripts/embedPDFToVector.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

// Import CommonJS module
const require = createRequire(import.meta.url);
const pdfParseLib = require('pdf-parse');
const pdfParse = pdfParseLib.PDFParse || pdfParseLib;

// ES Module dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Configuration
const CONFIG = {
  pdfPath: path.resolve(__dirname, '../NextGen-User Manual.pdf'),
  chunkSize: 1000, // characters per chunk
  chunkOverlap: 200, // overlap between chunks for context continuity
  embeddingModel: 'text-embedding-3-small',
  embeddingDimensions: 1536,
  batchSize: 100, // Pinecone batch upsert size
};

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Pinecone
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

/**
 * Extract text from PDF
 */
async function extractTextFromPDF(pdfPath) {
  console.log('📄 Reading PDF from:', pdfPath);
  
  const dataBuffer = fs.readFileSync(pdfPath);
  const parser = new pdfParse();
  const data = await parser.parse(dataBuffer);
  
  console.log(`✅ PDF extracted: ${data.numpages} pages, ${data.text.length} characters`);
  return data.text;
}

/**
 * Split text into overlapping chunks
 */
function chunkText(text, chunkSize = 1000, overlap = 200) {
  console.log('✂️  Chunking text...');
  
  const chunks = [];
  let startIndex = 0;
  
  while (startIndex < text.length) {
    const endIndex = startIndex + chunkSize;
    const chunk = text.slice(startIndex, endIndex);
    
    // Clean up the chunk
    const cleanChunk = chunk
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
      .trim();
    
    if (cleanChunk.length > 50) { // Only add meaningful chunks
      chunks.push({
        text: cleanChunk,
        startIndex,
        endIndex: Math.min(endIndex, text.length),
      });
    }
    
    // Move to next chunk with overlap
    startIndex += (chunkSize - overlap);
  }
  
  console.log(`✅ Created ${chunks.length} chunks`);
  return chunks;
}

/**
 * Generate embeddings for chunks using OpenAI
 */
async function generateEmbeddings(chunks) {
  console.log('🧠 Generating embeddings...');
  
  const embeddings = [];
  const batchSize = 100; // OpenAI allows batching
  
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const texts = batch.map(chunk => chunk.text);
    
    console.log(`  Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}...`);
    
    try {
      const response = await openai.embeddings.create({
        model: CONFIG.embeddingModel,
        input: texts,
        dimensions: CONFIG.embeddingDimensions,
      });
      
      // Combine chunk data with embeddings
      response.data.forEach((embeddingObj, idx) => {
        embeddings.push({
          ...batch[idx],
          embedding: embeddingObj.embedding,
        });
      });
      
      // Rate limiting - wait a bit between batches
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`❌ Error generating embeddings for batch ${i}:`, error.message);
      throw error;
    }
  }
  
  console.log(`✅ Generated ${embeddings.length} embeddings`);
  return embeddings;
}

/**
 * Upload embeddings to Pinecone
 */
async function uploadToPinecone(embeddings) {
  console.log('☁️  Uploading to Pinecone...');
  
  const indexName = process.env.PINECONE_INDEX_NAME;
  const index = pinecone.index(indexName);
  
  // Prepare vectors for Pinecone
  const vectors = embeddings.map((item, idx) => ({
    id: `chunk-${idx}`,
    values: item.embedding,
    metadata: {
      text: item.text,
      startIndex: item.startIndex,
      endIndex: item.endIndex,
      source: 'NextGen-User Manual.pdf',
      type: 'documentation',
      chunkIndex: idx,
      totalChunks: embeddings.length,
    },
  }));
  
  // Upload in batches
  for (let i = 0; i < vectors.length; i += CONFIG.batchSize) {
    const batch = vectors.slice(i, i + CONFIG.batchSize);
    
    console.log(`  Uploading batch ${Math.floor(i / CONFIG.batchSize) + 1}/${Math.ceil(vectors.length / CONFIG.batchSize)}...`);
    
    try {
      await index.upsert(batch);
      
      // Rate limiting
      if (i + CONFIG.batchSize < vectors.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`❌ Error uploading batch ${i}:`, error.message);
      throw error;
    }
  }
  
  console.log(`✅ Uploaded ${vectors.length} vectors to Pinecone`);
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 NextGen AI RAG - PDF Embedding Pipeline\n');
  
  try {
    // Step 1: Extract text from PDF
    const text = await extractTextFromPDF(CONFIG.pdfPath);
    
    // Step 2: Chunk the text
    const chunks = chunkText(text, CONFIG.chunkSize, CONFIG.chunkOverlap);
    
    // Step 3: Generate embeddings
    const embeddings = await generateEmbeddings(chunks);
    
    // Step 4: Upload to Pinecone
    await uploadToPinecone(embeddings);
    
    console.log('\n✨ Success! Your NextGen User Manual is now embedded in Pinecone!');
    console.log(`📊 Stats:`);
    console.log(`   - Total chunks: ${chunks.length}`);
    console.log(`   - Embedding model: ${CONFIG.embeddingModel}`);
    console.log(`   - Dimensions: ${CONFIG.embeddingDimensions}`);
    console.log(`   - Index: ${process.env.PINECONE_INDEX_NAME}`);
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main();
