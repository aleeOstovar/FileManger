# File Manager API

An advanced file management REST API built with Node.js, Express, and MongoDB. This API provides functionalities for uploading, retrieving, and managing different types of files including images, documents, and videos.

## Features

- **Secure File Upload**: Specialized handling for different file types with validation
- **File Type Support**: Separate routes for images, documents, and videos 
- **Image Processing**: Support for resizing and optimizing images
- **Advanced Filtering**: Query parameters for sorting, filtering, and pagination
- **Documentation**: Fully documented API with Swagger
- **Logging & Tracing**: Comprehensive logging with Pino for debugging and monitoring
- **Error Handling**: Centralized error handling with detailed logs
- **Security**: Implementation of OWASP Top 10 security recommendations

## Technologies Used

- **Node.js & Express**: Backend server and API framework
- **MongoDB**: Database for storing file metadata
- **Mongoose**: MongoDB object modeling
- **Multer**: File upload handling
- **Sharp**: Image processing library
- **Pino**: Fast, low overhead logging
- **Swagger**: API documentation
- **Helmet**: Security headers
- **CORS**: Cross-Origin Resource Sharing
- **XSS Protection**: Sanitizing input to prevent XSS attacks
- **Rate Limiting**: Protection against brute force attacks

## API Endpoints

### Files
- `GET /api/v1/files`: Get all files (paginated, sortable)
- `GET /api/v1/files/:id`: Get a specific file by ID
- `DELETE /api/v1/files/:id`: Delete a file
- `GET /api/v1/files/stats`: Get file statistics (counts, sizes by type)

### Images
- `GET /api/v1/images`: Get all images (paginated, sortable)
- `POST /api/v1/images`: Upload a new image

### Documents
- `GET /api/v1/documents`: Get all documents (paginated, sortable)
- `POST /api/v1/documents`: Upload a new document

### Videos
- `GET /api/v1/videos`: Get all videos (paginated, sortable)
- `POST /api/v1/videos`: Upload a new video

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4 or higher)
- npm or yarn

### Installation

1. Clone the repository
```
git clone <repository-url>
cd filemanager-server
```

2. Install dependencies
```
npm install
```

3. Set up environment variables
```
cp .env.example .env
```
Then edit the `.env` file with your configuration.

4. Start the server
```
npm start
```

For development with hot-reload:
```
npm run dev
```

### API Documentation

Once the server is running, you can access the Swagger documentation at:
```
http://localhost:3000/api-docs
```

## Security Considerations

This project implements the OWASP Top 10 security recommendations:

1. **Broken Access Control**: JWT-based authentication and proper authorization checks
2. **Cryptographic Failures**: Secure credential storage with proper encryption
3. **Injection**: Input validation and MongoDB query sanitization
4. **Insecure Design**: Separation of concerns and proper error handling
5. **Security Misconfiguration**: Proper environment configuration with secure defaults
6. **Vulnerable Components**: Regular dependency updates and audits
7. **Identification and Authentication Failures**: Secure JWT implementation
8. **Software and Data Integrity Failures**: Validation of uploaded content
9. **Security Logging and Monitoring Failures**: Comprehensive logging with Pino
10. **Server-Side Request Forgery**: Proper validation of file paths and URLs

## License

This project is licensed under the MIT License - see the LICENSE file for details. 