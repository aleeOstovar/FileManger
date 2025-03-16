/**
 * Setup script for Windows environments
 * Run with: node setup-windows.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up File Manager API for Windows...');

// Create necessary directories
const directories = [
  'logs',
  'uploads',
  'uploads/images',
  'uploads/documents',
  'uploads/videos',
  'public',
  'public/css',
  'public/js',
  'public/img',
  'src/views',
  'src/views/layouts',
  'src/views/dashboard',
  'src/views/dashboard/api-keys',
  'src/views/dashboard/users',
  'src/views/dashboard/news-posts',
  'data'
];

console.log('📁 Creating necessary directories...');
directories.forEach(dir => {
  const dirPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`   ✓ Created ${dir}`);
    } catch (err) {
      console.error(`   ✗ Failed to create ${dir}: ${err.message}`);
    }
  } else {
    console.log(`   ✓ ${dir} already exists`);
  }
});

// Create .env file if it doesn't exist
console.log('\n📝 Checking for .env file...');
const envPath = path.join(process.cwd(), '.env');
const envExamplePath = path.join(process.cwd(), '.env.example');

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  try {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('   ✓ Created .env file from .env.example');
  } catch (err) {
    console.error(`   ✗ Failed to create .env file: ${err.message}`);
  }
} else if (fs.existsSync(envPath)) {
  console.log('   ✓ .env file already exists');
} else {
  console.log('   ✗ Could not find .env.example to create .env file');
}

// Install dependencies
console.log('\n📦 Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('   ✓ Dependencies installed successfully');
} catch (err) {
  console.error('   ✗ Failed to install dependencies. Try running "npm install" manually.');
}

console.log('\n🔧 Setup completed!');
console.log('\nTo get started:');
console.log('1. Edit the .env file to configure your environment');
console.log('   - For quick testing without MongoDB, set USE_MEMORY_STORE=true');
console.log('2. Create a dashboard user: npm run create-dashboard-user');
console.log('3. Start the application: npm start');
console.log('\nAccess the dashboard at: http://localhost:3000/dashboard');

console.log('✅ Setup complete! You can now run the application with the following commands:');
console.log('- npm run dev: Start the development server');
console.log('- npm run test-db: Test the database connection');
console.log('- npm run create-dashboard-user: Create a dashboard user');
console.log('- npm run create-admin-key: Create an admin API key');
console.log('- npm run generate-sample-news: Generate sample news posts for testing'); 