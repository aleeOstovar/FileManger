const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Import the Express app
const app = require('./src/app');

// Import the logger
const logger = require('./src/utils/logger');

// Import the database connection
const connectDB = require('./config/database');

// Connect to MongoDB
connectDB();

// Define the port
const PORT = process.env.PORT || 3000;

// Start the server
const server = app.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
  logger.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  logger.error(err.name, err.message);
  process.exit(1);
});

// Handle SIGTERM signal
process.on('SIGTERM', () => {
  logger.info('👋 SIGTERM RECEIVED. Shutting down gracefully');
  server.close(() => {
    logger.info('💥 Process terminated!');
  });
}); 