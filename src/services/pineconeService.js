/**
 * NextGen Pinecone Service - Vector Search Integration
 * Handles vector similarity search for RAG chatbot
 */

import { Pinecone } from '@pinecone-database/pinecone';

let pineconeClient = null;
let pineconeIndex = null;

/**
 * Initialize Pinecone client (lazy initialization)
 */
const initializePinecone = async () => {
  if (pineconeClient) return pineconeClient;
  
  try {
    pineconeClient = new Pinecone({
      apiKey: import.meta.env.VITE_PINECONE_API_KEY,
    });
    
    const indexName = import.meta.env.VITE_PINECONE_INDEX_NAME;
    pineconeIndex = pineconeClient.index(indexName);
    
    console.log('✅ Pinecone initialized:', indexName);
    return pineconeClient;
  } catch (error) {
    console.error('❌ Failed to initialize Pinecone:', error);
    throw new Error('Pinecone initialization failed');
  }
};

/**
 * Query Pinecone for similar vectors
 */
export const querySimilarDocuments = async (embedding, topK = 5, filter = {}) => {
  try {
    if (!pineconeIndex) {
      await initializePinecone();
    }
    
    const queryResponse = await pineconeIndex.query({
      vector: embedding,
      topK,
      includeMetadata: true,
      filter,
    });
    
    return queryResponse.matches.map(match => ({
      id: match.id,
      score: match.score,
      text: match.metadata?.text || '',
      source: match.metadata?.source || 'unknown',
      chunkIndex: match.metadata?.chunkIndex,
      metadata: match.metadata,
    }));
  } catch (error) {
    console.error('Error querying Pinecone:', error);
    throw new Error('Failed to query vector database');
  }
};

/**
 * Get relevant context for RAG
 * Filters results by similarity threshold
 */
export const getRAGContext = async (embedding, options = {}) => {
  const {
    topK = 5,
    minScore = 0.7, // Minimum similarity score (0-1)
    filter = {},
  } = options;
  
  try {
    const results = await querySimilarDocuments(embedding, topK, filter);
    
    // Filter by minimum score and return formatted context
    const relevantDocs = results
      .filter(doc => doc.score >= minScore)
      .map(doc => ({
        text: doc.text,
        score: doc.score,
        source: doc.source,
      }));
    
    return relevantDocs;
  } catch (error) {
    console.error('Error getting RAG context:', error);
    return []; // Return empty array on error to allow chatbot to continue
  }
};

/**
 * Check Pinecone index stats
 */
export const getIndexStats = async () => {
  try {
    if (!pineconeIndex) {
      await initializePinecone();
    }
    
    const stats = await pineconeIndex.describeIndexStats();
    return stats;
  } catch (error) {
    console.error('Error getting index stats:', error);
    throw new Error('Failed to get index statistics');
  }
};

export default {
  initializePinecone,
  querySimilarDocuments,
  getRAGContext,
  getIndexStats,
};
