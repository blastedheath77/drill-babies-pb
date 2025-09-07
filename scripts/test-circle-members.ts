#!/usr/bin/env tsx

import { getCircleMembers } from '../src/lib/circles';

// Test circle members function with the DL Smashers circle
async function testCircleMembers() {
  const circleId = 'xipvm9a7sbPZCY9YveLv'; // DL Smashers circle ID
  
  console.log('Testing getCircleMembers function...');
  console.log(`Circle ID: ${circleId}`);
  
  try {
    const result = await getCircleMembers(circleId);
    
    console.log('\n=== RESULTS ===');
    console.log(`Found ${result.memberships.length} memberships`);
    console.log(`Found ${result.users.length} users/players`);
    
    console.log('\n=== MEMBERSHIPS ===');
    result.memberships.forEach((membership, i) => {
      console.log(`${i + 1}. User ID: ${membership.userId}, Role: ${membership.role}, Joined: ${membership.joinedAt}`);
    });
    
    console.log('\n=== USERS/PLAYERS ===');
    result.users.forEach((user, i) => {
      console.log(`${i + 1}. ${user.name} (${user.id}) - Role: ${user.role}, Email: ${user.email}`);
      if (user.role === 'phantom') {
        console.log(`   [PHANTOM PLAYER] Location: ${user.location?.city}, ${user.location?.country}`);
      }
    });
    
    console.log('\n=== MATCHING CHECK ===');
    console.log('Checking if all memberships have corresponding users/players:');
    result.memberships.forEach(membership => {
      const user = result.users.find(u => u.id === membership.userId);
      if (user) {
        console.log(`✅ ${membership.userId} → ${user.name} (${user.role})`);
      } else {
        console.log(`❌ ${membership.userId} → NO USER/PLAYER FOUND`);
      }
    });
    
  } catch (error) {
    console.error('Error testing circle members:', error);
  }
}

testCircleMembers();