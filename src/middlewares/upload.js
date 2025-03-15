const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

// Define the base upload directory
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Define allowed file types and their extensions
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/mpeg', 'video/webm', 'video/quicktime'];

// Create upload directories if they don't exist
const createUploadDirectories = () => {
  const dirs = [
    path.join(UPLOAD_DIR, 'images'),
    path.join(UPLOAD_DIR, 'documents'),
    path.join(UPLOAD_DIR, 'videos')
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`Created directory: ${dir}`);
    }
  });
};

createUploadDirectories();

// Custom file name generator
const generateFileName = (originalname, fileType) => {
  const timestamp = Date.now();
  const uuid = uuidv4();
  const extension = path.extname(originalname);
  return `${fileType}-${timestamp}-${uuid}${extension}`;
};

// Configure storage for each file type
const createStorage = (fileType) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(UPLOAD_DIR, `${fileType}s`));
    },
    filename: (req, file, cb) => {
      const fileName = generateFileName(file.originalname, fileType);
      cb(null, fileName);
    }
  });
};

// File filter for images
const imageFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(`Unsupported file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`, 400), false);
  }
};

// File filter for documents
const documentFilter = (req, file, cb) => {
  if (ALLOWED_DOCUMENT_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(`Unsupported file type. Allowed types: ${ALLOWED_DOCUMENT_TYPES.join(', ')}`, 400), false);
  }
};

// File filter for videos
const videoFilter = (req, file, cb) => {
  if (ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(`Unsupported file type. Allowed types: ${ALLOWED_VIDEO_TYPES.join(', ')}`, 400), false);
  }
};

// Get file size limit from env or default
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024; // 5MB default
const MAX_FILES_PER_REQUEST = parseInt(process.env.MAX_FILES_PER_REQUEST) || 5;

// Create upload middleware for each file type
const uploadImage = multer({
  storage: createStorage('image'),
  fileFilter: imageFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES_PER_REQUEST
  }
});

const uploadDocument = multer({
  storage: createStorage('document'),
  fileFilter: documentFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES_PER_REQUEST
  }
});

const uploadVideo = multer({
  storage: createStorage('video'),
  fileFilter: videoFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES_PER_REQUEST
  }
});

// Create error handler for multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    let message = 'An error occurred during file upload';
    let statusCode = 400;
    
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        message = `File too large. Maximum size allowed is ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
        break;
      case 'LIMIT_FILE_COUNT':
        message = `Too many files. Maximum allowed is ${MAX_FILES_PER_REQUEST} files`;
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = `Unexpected field name: ${err.field}`;
        break;
    }
    
    return next(new AppError(message, statusCode));
  }
  
  next(err);
};

module.exports = {
  uploadImage,
  uploadDocument,
  uploadVideo,
  handleMulterError,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOCUMENT_TYPES,
  ALLOWED_VIDEO_TYPES
}; 