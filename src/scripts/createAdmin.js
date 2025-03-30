import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

// Use process.env instead of import.meta.env
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY;

// Create admin client
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function createAdminUser() {
  try {
    // Create the admin user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: 'admin@example.com', // Use the email that matches your existing staff record
      password: 'AdminPassword123!', // Set a secure password
      email_confirm: true,
      user_metadata: {
        first_name: 'Admin',
        last_name: 'User',
        role: 'Administrator'
      }
    });

    if (authError) throw authError;
    console.log('Auth user created:', authData);

    // Check if staff record exists with the matching email
    const { data: existingStaff, error: fetchError } = await supabaseAdmin
      .from('staff')
      .select('*')
      .eq('email', 'admin@example.com')
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.log('Error checking for existing staff:', fetchError);
      
      // Check if the error is related to missing user_id column
      if (fetchError.code === 'PGRST204' && fetchError.message.includes('user_id')) {
        console.log('The user_id column might be missing from the staff table.');
        console.log('Please run the following SQL in your Supabase SQL editor:');
        console.log(`
          ALTER TABLE staff 
          ADD COLUMN user_id UUID UNIQUE;
        `);
        return;
      }
      
      throw fetchError;
    }

    // Try to update the staff record directly
    try {
      const { error: updateError } = await supabaseAdmin
        .from('staff')
        .update({ user_id: authData.user.id })
        .eq('email', 'admin@example.com');

      if (updateError) {
        console.log('Update error:', updateError);
        if (updateError.code === 'PGRST204' && updateError.message.includes('user_id')) {
          console.log('The user_id column is missing from the staff table.');
          console.log('Please run the following SQL to add the column:');
          console.log(`
            ALTER TABLE staff 
            ADD COLUMN user_id UUID UNIQUE;
          `);
          return;
        }
        throw updateError;
      }
      
      console.log('Existing staff record updated with user_id');
    } catch (updateError) {
      console.log('Error updating staff record:', updateError);
      throw updateError;
    }

    console.log('Admin user created successfully!');
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

// Call the function
createAdminUser();