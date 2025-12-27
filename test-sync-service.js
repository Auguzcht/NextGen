/**
 * Manual Test: Cal.com Sync Service
 * Run this locally to test the sync without deploying
 */

import { syncCalcomBookings } from './api/calcom/sync.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🧪 Testing Cal.com Sync Service...\n');
console.log('Configuration:');
console.log('  - CALCOM_API_KEY:', process.env.CALCOM_API_KEY ? '✓ Set' : '✗ Missing');
console.log('  - SUPABASE_URL:', process.env.SUPABASE_URL ? '✓ Set' : '✗ Missing');
console.log('  - SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✓ Set' : '✗ Missing');
console.log('\n' + '='.repeat(80) + '\n');

async function runTest() {
  try {
    const result = await syncCalcomBookings();
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ SYNC COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80));
    console.log('\nResults:');
    console.log('  - Total bookings processed:', result.processed);
    console.log('  - New/updated assignments synced:', result.synced);
    console.log('  - Cancelled bookings deleted:', result.deleted);
    console.log('  - Skipped (organizer/invalid):', result.skipped);
    console.log('  - Timestamp:', result.timestamp);
    console.log('\n✨ Test passed! You can now deploy to production.\n');
    
  } catch (error) {
    console.error('\n' + '='.repeat(80));
    console.error('❌ SYNC FAILED');
    console.error('='.repeat(80));
    console.error('\nError:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    console.error('\n🔧 Please fix the error before deploying.\n');
    process.exit(1);
  }
}

runTest();
