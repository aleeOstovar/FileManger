/**
 * Test MongoDB Connection Script
 * Run with: node scripts/test-db-connection.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const os = require('os');

console.log('\n=== MongoDB Connection Test ===\n');
console.log(`Running on: ${os.platform()} ${os.release()}`);
console.log(`Node.js version: ${process.version}`);

// Function to test the connection
async function testConnection() {
  // Extract credentials from environment variables
  const mongoURI = process.env.MONGO_URI;
  const username = process.env.MONGO_USERNAME;
  const password = process.env.MONGO_PASSWORD;
  const directURI = process.env.MONGODB_DIRECT_URI;
  
  console.log('\n--- Environment Variables ---');
  console.log(`MONGO_URI: ${mongoURI ? '✓ Set' : '✗ Missing'}`);
  console.log(`MONGO_USERNAME: ${username ? '✓ Set' : '✗ Missing'}`);
  console.log(`MONGO_PASSWORD: ${password ? '✓ Set' : '✗ Missing'}`);
  console.log(`MONGODB_DIRECT_URI: ${directURI ? '✓ Set' : '✗ Missing'}`);
  
  if (!mongoURI && !directURI) {
    console.error('\n❌ Error: Neither MONGO_URI nor MONGODB_DIRECT_URI found in environment variables');
    process.exit(1);
  }

  let connectionString;
  
  if (directURI) {
    console.log('\n🔍 Using direct MongoDB connection string');
    connectionString = directURI;
  } else {
    console.log('\n🔍 Constructing MongoDB connection string from parts');
    
    if (!username || !password) {
      console.warn('⚠️ No MongoDB credentials found in environment variables');
    }

    // Construct connection string
    connectionString = mongoURI;
    if (username && password) {
      try {
        // Handle connection string for MongoDB Atlas
        if (mongoURI.includes('mongodb+srv://')) {
          if (!mongoURI.includes('@')) {
            const [protocol, host] = mongoURI.split('//');
            connectionString = `${protocol}//${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}`;
            console.log('✓ Successfully constructed MongoDB Atlas connection string');
          }
        } 
        // Handle connection string for MongoDB local
        else if (mongoURI.includes('mongodb://')) {
          if (!mongoURI.includes('@')) {
            const [protocol, host] = mongoURI.split('//');
            connectionString = `${protocol}//${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}`;
            console.log('✓ Successfully constructed local MongoDB connection string');
          }
        }
      } catch (err) {
        console.error(`❌ Error formatting connection string: ${err.message}`);
      }
    }
  }

  console.log('\n📡 Attempting to connect to MongoDB...');
  console.log(`Connection string: ${connectionString.replace(/\/\/[^:]+:[^@]+@/, '//****:****@')}`);  // Hide credentials
  
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000, // 10 second timeout for Windows
    socketTimeoutMS: 45000, // 45 second socket timeout
  };
  
  console.log('Connection options:', JSON.stringify(options, null, 2));
  
  try {
    const startTime = Date.now();
    const conn = await mongoose.connect(connectionString, options);
    const endTime = Date.now();
    
    console.log(`\n✅ SUCCESS: Connected to MongoDB at ${conn.connection.host} in ${endTime - startTime}ms`);
    
    // Get database name
    const dbName = conn.connection.db.databaseName;
    console.log(`📊 Database name: ${dbName}`);
    
    // List collections
    const collections = await conn.connection.db.listCollections().toArray();
    console.log(`📋 Collections found: ${collections.length}`);
    
    if (collections.length > 0) {
      console.log('\nAvailable collections:');
      collections.forEach(collection => {
        console.log(`- ${collection.name}`);
      });
    }
    
    // Close the connection
    await mongoose.disconnect();
    console.log('\n👋 Connection closed');
    
  } catch (error) {
    console.error('\n❌ Connection FAILED');
    console.error(`Error name: ${error.name}`);
    console.error(`Error details: ${error.message}`);
    
    if (error.name === 'MongoServerSelectionError') {
      console.error('\nThis error typically occurs when:');
      console.error('1. The connection string is incorrect');
      console.error('2. Network connectivity issues (firewalls, VPNs)');
      console.error('3. IP address is not whitelisted in MongoDB Atlas');
      console.error('4. Windows Defender or antivirus is blocking the connection');
      
      console.error('\nTroubleshooting steps:');
      console.error('1. Check that your IP is whitelisted in MongoDB Atlas');
      console.error('2. Try adding this app to your firewall exceptions');
      console.error('3. Try setting USE_MEMORY_STORE=true in .env to bypass MongoDB for testing');
    }
    
    if (error.message.includes('Authentication failed')) {
      console.error('\nAuthentication failed. Please check:');
      console.error('1. Username and password are correct');
      console.error('2. User has access to the database');
      console.error('3. Special characters in password are properly URL encoded');
    }
    
    if (error.message.includes('timed out')) {
      console.error('\nConnection timed out. Please check:');
      console.error('1. Your internet connection');
      console.error('2. MongoDB server is running');
      console.error('3. Network allows connections to MongoDB port');
      console.error('4. Windows Defender or other security software is not blocking');
    }
  }
}

// Run the test
testConnection().catch(err => {
  console.error('Unexpected error:', err);
}); 