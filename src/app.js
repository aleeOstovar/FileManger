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
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const cookieParser = require('cookie-parser');
const ejs = require('ejs');
const expressLayouts = require('express-ejs-layouts');

// Import custom modules
const logger = require('./utils/logger');
const errorHandler = require('./middlewares/errorHandler');
const { notFound } = require('./middlewares/notFound');
const { protect } = require('./middlewares/auth');

// Import routes
const fileRoutes = require('./routes/fileRoutes');
const imageRoutes = require('./routes/imageRoutes');
const documentRoutes = require('./routes/documentRoutes');
const videoRoutes = require('./routes/videoRoutes');
const apiKeyRoutes = require('./routes/apiKeyRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const newsPostRoutes = require('./routes/newsPostRoutes');
const scraperRoutes = require('./routes/scraperRoutes');
const { router: authRoutes } = require('./routes/authRoutes');

// Create Express app
const app = express();

// Ensure required directories exist
const requiredDirs = [
  'logs',
  'uploads',
  'uploads/images',
  'uploads/documents',
  'uploads/videos',
  'public',
  'public/css',
  'public/js',
  'public/img'
];

requiredDirs.forEach(dir => {
  const dirPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      logger.info(`Created directory: ${dirPath}`);
    } catch (err) {
      logger.error(`Failed to create directory: ${dirPath}`, err);
    }
  }
});

// Create a write stream for access logs (in append mode)
const accessLogStream = fs.createWriteStream(
  path.join(process.cwd(), 'logs', 'access.log'),
  { flags: 'a' }
);

// Configure view engine for dashboard
app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'src', 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Middleware for logging HTTP requests
app.use(morgan('combined', { stream: accessLogStream }));

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || '*' 
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
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

// Cookie parser (needed for CSRF and sessions)
app.use(cookieParser());

// Session configuration
let sessionStore;

// Check if we should use a memory store for testing (without MongoDB)
if (process.env.USE_MEMORY_STORE === 'true') {
  logger.info('Using memory store for sessions (for testing only, not for production)');
  sessionStore = new session.MemoryStore();
} else {
  // Try to use direct connection string first
  let sessionMongoUrl;
  
  if (process.env.MONGODB_DIRECT_URI) {
    sessionMongoUrl = process.env.MONGODB_DIRECT_URI;
    logger.info('Using direct MongoDB connection string for session store');
  } else {
    // Fall back to constructing the connection string from parts
    const mongoUrl = process.env.MONGO_URI;
    const username = process.env.MONGO_USERNAME;
    const password = process.env.MONGO_PASSWORD;
    
    sessionMongoUrl = mongoUrl;
    if (username && password && mongoUrl.includes('mongodb+srv://') && !mongoUrl.includes('@')) {
      const [protocol, host] = mongoUrl.split('//');
      sessionMongoUrl = `${protocol}//${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}`;
      logger.info('Constructed MongoDB connection string from parts for session store');
    }
  }
  
  // Create MongoDB session store
  try {
    sessionStore = MongoStore.create({
      mongoUrl: sessionMongoUrl,
      collectionName: 'sessions',
      ttl: 24 * 60 * 60 // 1 day
    });
    logger.info('MongoDB session store created successfully');
  } catch (err) {
    logger.error(`Failed to create MongoDB session store: ${err.message}`);
    logger.info('Falling back to memory store for sessions (not recommended for production)');
    sessionStore = new session.MemoryStore();
  }
}

// Configure session with the appropriate store
app.use(session({
  secret: process.env.SESSION_SECRET || 'super-secret-dashboard-key',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// Flash messages
app.use(flash());

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// Set local variables for the views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.messages = {
    success: req.flash('success') || [],
    error: req.flash('error') || [],
    info: req.flash('info') || []
  };
  next();
});

// Serve static files
app.use('/static', express.static(path.join(process.cwd(), 'public')));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

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
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key'
        }
      }
    },
    security: [{
      apiKeyAuth: []
    }]
  },
  apis: ['./src/routes/*.js', './src/models/*.js', './src/controllers/*.js']
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Dashboard routes
app.use('/dashboard', dashboardRoutes);

// API health check route (public)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is healthy',
    timestamp: new Date().toISOString()
  });
});

// Protected API routes
app.use('/api/auth', authRoutes);
app.use('/api/files', protect, fileRoutes);
app.use('/api/v1/images', protect, imageRoutes);
app.use('/api/documents', protect, documentRoutes);
app.use('/api/videos', protect, videoRoutes);
app.use('/api/api-keys', protect, apiKeyRoutes);
app.use('/api/dashboard', protect, dashboardRoutes);
app.use('/api/v1/news-posts', newsPostRoutes);
app.use('/api/scrapers', protect, scraperRoutes);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

module.exports = app; 