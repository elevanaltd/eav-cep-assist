#!/usr/bin/env node

/**
 * Create Test Users via Supabase Auth Admin API
 *
 * Purpose: Seed test users for CI/local testing using official Auth API
 * Why: Direct SQL insertion bypasses GoTrue internal state (auth.identities, etc)
 *
 * Usage: node scripts/create-test-users-via-api.mjs
 *
 * Environment Variables Required:
 * - VITE_SUPABASE_URL: Supabase project URL (defaults to local)
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key (admin access, required)
 */

import { createClient } from '@supabase/supabase-js';

// Configuration from environment (CI-compatible)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('   For CI: Extracted from supabase status');
  console.error('   For local: Get from Supabase dashboard or `supabase status`');
  process.exit(1);
}

console.log('🔧 Configuration:');
console.log(`   URL: ${SUPABASE_URL}`);
console.log(`   Service Role Key: ${SERVICE_ROLE_KEY.substring(0, 20)}...`);

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const users = [
  { email: 'admin.test@example.com', password: 'test-password-admin-123', role: 'admin', name: 'Test Admin User' },
  { email: 'client.test@example.com', password: 'test-password-client-123', role: 'client', name: 'Test Client User' },
  { email: 'test-client2@another.com', password: 'test-client2-password-123', role: 'client', name: 'Test Client 2 User' },
  { email: 'unauthorized.test@example.com', password: 'test-password-unauth-123', role: 'client', name: 'Test Unauthorized User' }
];

// Delete existing test users first (idempotent operation)
console.log('\n🧹 Cleaning existing test users...');
const { data: existingUsers } = await adminClient.auth.admin.listUsers();
for (const user of users) {
  const existingUser = existingUsers.users.find(u => u.email === user.email);
  if (existingUser) {
    await adminClient.auth.admin.deleteUser(existingUser.id);
    console.log(`   ✓ Deleted existing ${user.email}`);
  }
}

// Verify cleanup completed (eventual consistency grace period)
console.log('   ⏳ Waiting for auth system propagation...');
await new Promise(resolve => setTimeout(resolve, 2000)); // 2s grace period

const { data: verifyUsers } = await adminClient.auth.admin.listUsers();
const remainingTestUsers = verifyUsers.users.filter(u =>
  users.some(testUser => testUser.email === u.email)
);
if (remainingTestUsers.length > 0) {
  console.error(`   ⚠️  Warning: ${remainingTestUsers.length} users still exist after cleanup:`);
  remainingTestUsers.forEach(u => console.error(`      - ${u.email}`));
  console.log('   🔄 Attempting additional cleanup pass...');
  for (const user of remainingTestUsers) {
    await adminClient.auth.admin.deleteUser(user.id);
  }
  await new Promise(resolve => setTimeout(resolve, 1000)); // Additional wait
}

// Create users via Auth API (proper way - handles auth.users + auth.identities)
console.log('\n👥 Creating test users via Auth API...');
let successCount = 0;
let failCount = 0;
const createdUsers = []; // Track created users for user_clients

for (const user of users) {
  console.log(`\n   📝 ${user.email} (${user.role})...`);

  // Retry logic for eventual consistency issues
  let data = null;
  let error = null;
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    ({ data, error } = await adminClient.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true, // Auto-confirm for testing
      user_metadata: { role: user.role }
    }));

    if (!error) break;

    // If user exists, try deleting and retrying
    if (error.message.includes('already been registered') && attempts < maxAttempts - 1) {
      console.log(`      ⚠️  User exists after cleanup (attempt ${attempts + 1}/${maxAttempts})`);
      const { data: checkUsers } = await adminClient.auth.admin.listUsers();
      const ghostUser = checkUsers.users.find(u => u.email === user.email);
      if (ghostUser) {
        console.log(`      🔄 Deleting ghost user ${ghostUser.id}...`);
        await adminClient.auth.admin.deleteUser(ghostUser.id);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      attempts++;
      continue;
    }

    break;
  }

  if (error) {
    console.error(`      ❌ Auth API failed after ${attempts + 1} attempts: ${error.message}`);
    failCount++;
    continue;
  }

  console.log(`      ✓ Auth user created: ${data.user.id}`);

  // Create user_profile in public schema
  const { error: profileError } = await adminClient
    .from('user_profiles')
    .upsert({
      id: data.user.id,
      email: user.email,
      display_name: user.name,
      role: user.role
    });

  if (profileError) {
    console.error(`      ❌ Profile creation failed: ${profileError.message}`);
    failCount++;
  } else {
    console.log(`      ✓ User profile created`);
    successCount++;
    // Track created user for user_clients
    createdUsers.push({
      id: data.user.id,
      email: user.email,
      role: user.role
    });
  }
}

// Create user_clients for client users (RLS testing)
console.log('\n🔗 Creating user_clients for RLS testing...');
const clientUsers = createdUsers.filter(u => u.role === 'client');
for (const user of clientUsers) {
  // Map test users to client_filters matching seed.sql projects
  let clientFilter;
  if (user.email === 'client.test@example.com') {
    clientFilter = 'CLIENT_ALPHA';  // Matches Project Alpha in seed.sql
  } else if (user.email === 'test-client2@another.com') {
    clientFilter = 'CLIENT_BETA';   // Matches Project Beta in seed.sql
  } else {
    clientFilter = 'CLIENT_UNAUTHORIZED'; // No matching projects (tests security)
  }

  const { error: ucError } = await adminClient
    .from('user_clients')
    .upsert({
      user_id: user.id,
      client_filter: clientFilter
    });

  if (ucError) {
    console.error(`      ❌ user_clients failed for ${user.email}: ${ucError.message}`);
  } else {
    console.log(`      ✓ Granted ${clientFilter} access to ${user.email}`);
  }
}

// Verification
console.log('\n📊 Summary:');
console.log(`   ✓ Successful: ${successCount}`);
console.log(`   ✗ Failed: ${failCount}`);

console.log('\n🔍 Verification:');
const { data: profiles, error: queryError } = await adminClient
  .from('user_profiles')
  .select('email, role, display_name')
  .order('email');

if (queryError) {
  console.error(`   ❌ Query error: ${queryError.message}`);
} else {
  console.log(`   Found ${profiles.length} user profiles:`);
  profiles.forEach(p => console.log(`   - ${p.email} (${p.role}): ${p.display_name}`));
}

// Exit with appropriate code
if (failCount > 0) {
  console.error('\n❌ Some users failed to create');
  process.exit(1);
} else {
  console.log('\n✅ All test users created successfully!');
  process.exit(0);
}
