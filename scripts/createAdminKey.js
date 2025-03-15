require('dotenv').config();
const mongoose = require('mongoose');
const ApiKey = require('../src/models/ApiKey');

// Connect to MongoDB
const connectDB = async () => {
  try {
    // Construct the MongoDB connection string with credentials if provided
    let mongoURI = process.env.MONGO_URI;
    
    // If username and password are provided, use them
    if (process.env.MONGO_USERNAME && process.env.MONGO_PASSWORD) {
      // Handle connection string with credentials in a Windows-compatible way
      if (mongoURI.includes('mongodb://')) {
        // Replace mongodb:// with mongodb://username:password@
        mongoURI = mongoURI.replace(
          'mongodb://',
          `mongodb://${encodeURIComponent(process.env.MONGO_USERNAME)}:${encodeURIComponent(process.env.MONGO_PASSWORD)}@`
        );
      } else if (mongoURI.includes('mongodb+srv://')) {
        // Replace mongodb+srv:// with mongodb+srv://username:password@
        mongoURI = mongoURI.replace(
          'mongodb+srv://',
          `mongodb+srv://${encodeURIComponent(process.env.MONGO_USERNAME)}:${encodeURIComponent(process.env.MONGO_PASSWORD)}@`
        );
      }
    }
    
    // Connect to MongoDB
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('MongoDB Connected');
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

// Generate admin API key
const createAdminKey = async () => {
  try {
    await connectDB();
    
    const keyName = 'Admin Key' + (process.env.NODE_ENV ? ` (${process.env.NODE_ENV})` : '');
    
    // Check if admin key already exists
    const existingKey = await ApiKey.findOne({ 
      permissions: { $in: ['admin'] },
      active: true
    });
    
    if (existingKey) {
      console.log('\n⚠️ An active admin key already exists.');
      console.log('If you need a new one, please revoke the existing one first or use the API.');
      process.exit(0);
    }
    
    // Calculate expiry date if provided in env
    let expiresAt = null;
    if (process.env.API_KEY_EXPIRY_DAYS) {
      const days = parseInt(process.env.API_KEY_EXPIRY_DAYS, 10);
      if (!isNaN(days) && days > 0) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);
      }
    }
    
    // Create a new API key with admin permission
    const apiKey = await ApiKey.generateKey(keyName, ['admin', 'read', 'write', 'delete'], expiresAt);
    
    console.log('\n✅ Admin API key created successfully:');
    console.log('----------------------------------');
    console.log(`Name: ${apiKey.name}`);
    console.log(`Key: ${apiKey.key}`);
    
    if (apiKey.expiresAt) {
      console.log(`Expires: ${apiKey.expiresAt.toISOString()}`);
    } else {
      console.log('Expires: Never (no expiration)');
    }
    
    console.log('\n⚠️ IMPORTANT: Save this key securely. It will not be shown again.');
    console.log('\nUse this key in the API requests with the header:');
    console.log('x-api-key: ' + apiKey.key);
    
  } catch (error) {
    console.error('Error creating admin key:', error);
  } finally {
    await mongoose.disconnect();
  }
};

createAdminKey(); 