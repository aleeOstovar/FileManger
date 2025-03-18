const mongoose = require('mongoose');
const logger = require('../src/utils/logger');

/**
 * Connect to MongoDB database
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    // Try to use direct connection string first
    let mongoURI;
    
    if (process.env.MONGODB_DIRECT_URI) {
      mongoURI = process.env.MONGODB_DIRECT_URI;
      logger.info('Using direct MongoDB connection string');
    } else {
      // Fall back to constructing from parts
      mongoURI = process.env.MONGO_URI;
      const username = process.env.MONGO_USERNAME;
      const password = process.env.MONGO_PASSWORD;
      
      // If username and password are provided, use them
      if (username && password) {
        // Handle connection string for MongoDB Atlas (cloud)
        if (mongoURI.includes('mongodb+srv://')) {
          // Make sure we don't have username/password already in the URI
          if (!mongoURI.includes('@')) {
            // URI format: mongodb+srv://host/
            const [protocol, host] = mongoURI.split('//');
            
            // Properly encode the username and password for URI
            const encodedUsername = encodeURIComponent(username);
            const encodedPassword = encodeURIComponent(password);
            
            mongoURI = `${protocol}//${encodedUsername}:${encodedPassword}@${host}`;
            logger.info('Constructed MongoDB connection string from parts');
          }
        } 
        // Handle connection string for MongoDB local
        else if (mongoURI.includes('mongodb://')) {
          // Make sure we don't have username/password already in the URI
          if (!mongoURI.includes('@')) {
            // URI format: mongodb://host:port/
            const [protocol, host] = mongoURI.split('//');
            
            // Properly encode the username and password for URI
            const encodedUsername = encodeURIComponent(username);
            const encodedPassword = encodeURIComponent(password);
            
            mongoURI = `${protocol}//${encodedUsername}:${encodedPassword}@${host}`;
          }
        }
      }
    }
    
    logger.info('Connecting to MongoDB...');
    
    // Connect to MongoDB with enhanced options for Windows
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 15000, // 15 second timeout for Windows
      socketTimeoutMS: 45000, // 45 second socket timeout
    });
    
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error.message}`);
    throw error; // Let the server.js handle the error
  }
};

module.exports = connectDB; 