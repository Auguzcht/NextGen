#!/usr/bin/env node

/**
 * NextGen AI Chatbot - Quick Setup Script
 * Verifies configuration and guides through setup
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log('🚀 NextGen AI Chatbot - Setup Verification\n');

const checks = {
  openai: {
    name: 'OpenAI API Key',
    check: () => !!process.env.OPENAI_API_KEY && !!process.env.VITE_OPENAI_API_KEY,
    fix: 'Add OPENAI_API_KEY and VITE_OPENAI_API_KEY to .env file'
  },
  pinecone: {
    name: 'Pinecone API Key',
    check: () => !!process.env.PINECONE_API_KEY && !!process.env.VITE_PINECONE_API_KEY,
    fix: 'Add PINECONE_API_KEY and VITE_PINECONE_API_KEY to .env file'
  },
  pineconeIndex: {
    name: 'Pinecone Index Name',
    check: () => !!process.env.PINECONE_INDEX_NAME && !!process.env.VITE_PINECONE_INDEX_NAME,
    fix: 'Add PINECONE_INDEX_NAME and VITE_PINECONE_INDEX_NAME to .env file'
  },
  pineconeHost: {
    name: 'Pinecone Host URL',
    check: () => !!process.env.PINECONE_HOST && !!process.env.VITE_PINECONE_HOST,
    fix: 'Add PINECONE_HOST and VITE_PINECONE_HOST to .env file'
  },
  pdf: {
    name: 'User Manual PDF',
    check: () => fs.existsSync(path.resolve(__dirname, '../NextGen-User Manual.pdf')),
    fix: 'Place NextGen-User Manual.pdf in the root directory'
  },
  migration: {
    name: 'Database Migration File',
    check: () => fs.existsSync(path.resolve(__dirname, '../public/migrations/add_ai_chat_logs.sql')),
    fix: 'Migration file should exist at public/migrations/add_ai_chat_logs.sql'
  },
  components: {
    name: 'AI Components',
    check: () => {
      const aiDir = path.resolve(__dirname, '../src/components/ai');
      return fs.existsSync(path.join(aiDir, 'AIChatWidget.jsx')) &&
             fs.existsSync(path.join(aiDir, 'ChatMessage.jsx'));
    },
    fix: 'AI components missing - check src/components/ai/ directory'
  },
  services: {
    name: 'AI Services',
    check: () => {
      const servicesDir = path.resolve(__dirname, '../src/services');
      return fs.existsSync(path.join(servicesDir, 'aiService.js')) &&
             fs.existsSync(path.join(servicesDir, 'pineconeService.js'));
    },
    fix: 'AI services missing - check src/services/ directory'
  }
};

let passed = 0;
let failed = 0;

console.log('Running configuration checks...\n');

for (const [key, check] of Object.entries(checks)) {
  const result = check.check();
  
  if (result) {
    console.log(`✅ ${check.name}`);
    passed++;
  } else {
    console.log(`❌ ${check.name}`);
    console.log(`   Fix: ${check.fix}\n`);
    failed++;
  }
}

console.log(`\n📊 Results: ${passed}/${Object.keys(checks).length} checks passed\n`);

if (failed === 0) {
  console.log('✨ All checks passed! You\'re ready to embed your PDF and start using the AI chatbot.\n');
  console.log('Next steps:');
  console.log('1. Run the SQL migration in Supabase:');
  console.log('   public/migrations/add_ai_chat_logs.sql\n');
  console.log('2. Embed your user manual:');
  console.log('   npm run ai:embed\n');
  console.log('3. Deploy the Supabase Edge Function:');
  console.log('   cd supabase && supabase functions deploy ai-chat\n');
  console.log('4. Start your dev server:');
  console.log('   npm run dev\n');
} else {
  console.log('⚠️  Please fix the failed checks before proceeding.\n');
  console.log('For detailed setup instructions, see:');
  console.log('AI_CHATBOT_README.md\n');
  process.exit(1);
}
