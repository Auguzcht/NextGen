const { Pinecone } = require('@pinecone-database/pinecone');
require('dotenv').config();

async function test() {
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });
  
  const index = pinecone.index(process.env.PINECONE_INDEX_NAME);
  
  // Test vector
  const testVector = {
    id: 'test-1',
    values: new Array(1536).fill(0.1),
    metadata: { test: 'value' }
  };
  
  console.log('Testing single vector upsert...');
  
  try {
    // Try method 1: Direct array
    await index.upsert([testVector]);
    console.log('✅ Method 1 worked: index.upsert([vector])');
  } catch (e) {
    console.log('❌ Method 1 failed:', e.message);
    
    try {
      // Try method 2: With namespace
      await index.namespace('').upsert([testVector]);
      console.log('✅ Method 2 worked: index.namespace("").upsert([vector])');
    } catch (e2) {
      console.log('❌ Method 2 failed:', e2.message);
      
      try {
        // Try method 3: Object format
        await index.upsert({ vectors: [testVector] });
        console.log('✅ Method 3 worked: index.upsert({ vectors: [vector] })');
      } catch (e3) {
        console.log('❌ Method 3 failed:', e3.message);
        console.log('Full error:', e3);
      }
    }
  }
}

test().catch(console.error);
