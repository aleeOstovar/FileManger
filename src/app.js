const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Import custom modules
const logger = require('./utils/logger');
const errorHandler = require('./middlewares/errorHandler');
const { notFound } = require('./middlewares/notFound');

// Import routes
const fileRoutes = require('./routes/fileRoutes');
const imageRoutes = require('./routes/imageRoutes');
const documentRoutes = require('./routes/documentRoutes');
const videoRoutes = require('./routes/videoRoutes');

// Create Express app
const app = express();

// Create a write stream for access logs (in append mode)
const accessLogStream = fs.createWriteStream(
  path.join(process.cwd(), 'logs', 'access.log'),
  { flags: 'a' }
);

// Middleware for logging HTTP requests
app.use(morgan('combined', { stream: accessLogStream }));

// Security headers with Helmet
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || '*' 
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15) * 60 * 1000, // Default: 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Default: 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later'
});
app.use('/api', limiter);

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp({
  whitelist: ['sort', 'fields', 'page', 'limit'] // Add allowed query parameters to whitelist
}));

// Compress responses
app.use(compression());

// Swagger documentation setup
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'File Manager API',
      version: '1.0.0',
      description: 'An advanced file manager API for handling different types of files',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{
      bearerAuth: []
    }]
  },
  apis: ['./src/routes/*.js', './src/models/*.js']
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
app.use('/api/v1/files', fileRoutes);
app.use('/api/v1/images', imageRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/videos', videoRoutes);

// API health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is healthy',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

module.exports = app; 