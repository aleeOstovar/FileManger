const mongoose = require('mongoose');
const logger = require('../src/utils/logger');

/**
 * Connect to MongoDB database
 * @returns {Promise<void>}
 */
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
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error.message}`);
    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB; 