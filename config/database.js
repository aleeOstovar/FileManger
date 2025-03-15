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
      // Parse the connection string to insert credentials
      const url = new URL(mongoURI);
      url.username = encodeURIComponent(process.env.MONGO_USERNAME);
      url.password = encodeURIComponent(process.env.MONGO_PASSWORD);
      mongoURI = url.toString();
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