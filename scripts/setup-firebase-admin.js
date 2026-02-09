#!/usr/bin/env node

/**
 * Helper script to add Firebase Admin service account to .env.local
 *
 * Usage:
 *   node scripts/setup-firebase-admin.js path/to/service-account.json
 *
 * This will:
 * 1. Read your service account JSON file
 * 2. Convert it to a single-line format
 * 3. Add FIREBASE_SERVICE_ACCOUNT to .env.local
 */

const fs = require('fs');
const path = require('path');

// Get the service account file path from command line
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('❌ Error: Please provide the path to your service account JSON file');
  console.log('\nUsage:');
  console.log('  node scripts/setup-firebase-admin.js path/to/service-account.json');
  console.log('\nExample:');
  console.log('  node scripts/setup-firebase-admin.js ~/Downloads/pbstats-firebase-adminsdk-xxxxx.json');
  process.exit(1);
}

const serviceAccountPath = args[0];
const envPath = path.join(__dirname, '..', '.env.local');

// Check if service account file exists
if (!fs.existsSync(serviceAccountPath)) {
  console.error(`❌ Error: Service account file not found: ${serviceAccountPath}`);
  process.exit(1);
}

try {
  // Read and parse the service account JSON
  console.log('📖 Reading service account file...');
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

  // Validate it has the required fields
  if (!serviceAccount.type || !serviceAccount.project_id || !serviceAccount.private_key) {
    console.error('❌ Error: Invalid service account file format');
    process.exit(1);
  }

  console.log(`✅ Service account loaded for project: ${serviceAccount.project_id}`);

  // Convert to single-line JSON string
  const serviceAccountString = JSON.stringify(serviceAccount);

  // Read existing .env.local
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    console.log('📝 Found existing .env.local file');
  } else {
    console.log('📝 Creating new .env.local file');
  }

  // Check if FIREBASE_SERVICE_ACCOUNT already exists
  const firebaseAccountRegex = /FIREBASE_SERVICE_ACCOUNT=.*/;
  if (firebaseAccountRegex.test(envContent)) {
    // Replace existing
    console.log('🔄 Replacing existing FIREBASE_SERVICE_ACCOUNT...');
    envContent = envContent.replace(
      firebaseAccountRegex,
      `FIREBASE_SERVICE_ACCOUNT='${serviceAccountString}'`
    );
  } else {
    // Add new
    console.log('➕ Adding FIREBASE_SERVICE_ACCOUNT...');
    envContent += `\n# Firebase Admin SDK Service Account\nFIREBASE_SERVICE_ACCOUNT='${serviceAccountString}'\n`;
  }

  // Write back to .env.local
  fs.writeFileSync(envPath, envContent, 'utf8');

  console.log('\n✅ Success! Firebase Admin SDK configured');
  console.log('📍 Location: .env.local');
  console.log('\n⚠️  Security Reminder:');
  console.log('   - Never commit .env.local to git');
  console.log('   - Never share your service account credentials');
  console.log(`   - You can safely delete: ${serviceAccountPath}`);
  console.log('\n🚀 Next steps:');
  console.log('   1. Start your dev server: npm run dev');
  console.log('   2. Go to Settings → Calendar Integration');
  console.log('   3. Test the subscription URL');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
