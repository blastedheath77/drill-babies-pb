const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Generate a version hash based on build time and package.json version
function generateVersion() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const buildTime = Date.now().toString();
  const version = packageJson.version || '1.0.0';
  
  // Create a hash from version and build time
  const hash = crypto.createHash('md5')
    .update(`${version}-${buildTime}`)
    .digest('hex')
    .substring(0, 8);
  
  return `${version}-${hash}`;
}

// Update service worker with dynamic version
function updateServiceWorker() {
  const swPath = path.join(__dirname, '../public/sw.js');
  const swTemplatePath = path.join(__dirname, '../public/sw-template.js');
  
  // Check if template exists, if not create it from current sw.js
  if (!fs.existsSync(swTemplatePath)) {
    // Read current sw.js and create template
    const currentSw = fs.readFileSync(swPath, 'utf8');
    const template = currentSw.replace(
      /const CACHE_NAME = '[^']+';/,
      "const CACHE_NAME = '__CACHE_VERSION__';"
    );
    fs.writeFileSync(swTemplatePath, template);
    console.log('Created sw-template.js from existing service worker');
  }
  
  // Generate new version
  const version = generateVersion();
  const cacheName = `pbstats-v${version}`;
  
  // Read template and replace placeholder
  const template = fs.readFileSync(swTemplatePath, 'utf8');
  const updatedSw = template.replace(
    '__CACHE_VERSION__',
    cacheName
  );
  
  // Write updated service worker
  fs.writeFileSync(swPath, updatedSw);
  
  console.log(`✅ Service worker updated with cache version: ${cacheName}`);
  
  // Also update environment variable for use in app
  const envPath = path.join(__dirname, '../.env.local');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  // Remove existing APP_VERSION line if it exists
  envContent = envContent.split('\n')
    .filter(line => !line.startsWith('NEXT_PUBLIC_APP_VERSION='))
    .join('\n');
  
  // Add new version
  envContent += `\nNEXT_PUBLIC_APP_VERSION=${version}\n`;
  
  fs.writeFileSync(envPath, envContent.trim() + '\n');
  console.log(`✅ Environment variable updated: NEXT_PUBLIC_APP_VERSION=${version}`);
  
  return version;
}

// Run if called directly
if (require.main === module) {
  try {
    updateServiceWorker();
  } catch (error) {
    console.error('❌ Failed to update service worker:', error);
    process.exit(1);
  }
}

module.exports = { updateServiceWorker, generateVersion };