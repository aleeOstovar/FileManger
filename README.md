# File Manager API

An advanced file management REST API built with Node.js, Express, and MongoDB. This API provides functionalities for uploading, retrieving, and managing different types of files including images, documents, and videos, as well as managing news posts.

## Features

- **Secure File Upload**: Specialized handling for different file types with validation
- **File Type Support**: Separate routes for images, documents, and videos 
- **Image Processing**: Support for resizing and optimizing images
- **Advanced Filtering**: Query parameters for sorting, filtering, and pagination
- **News Posts Management**: Create, edit, and manage news posts with rich content support
- **Dashboard Interface**: User-friendly dashboard for managing files, users, and news posts
- **User Management**: Admin interface for creating and managing user accounts
- **Documentation**: Fully documented API with Swagger
- **Logging & Tracing**: Comprehensive logging with Pino for debugging and monitoring
- **Error Handling**: Centralized error handling with detailed logs
- **Security**: Implementation of OWASP Top 10 security recommendations
- **API Key Authentication**: Secure access with API keys and granular permissions
- **Session Authentication**: Secure dashboard login with session management

## Technologies Used

- **Node.js & Express**: Backend server and API framework
- **MongoDB**: Database for storing file metadata and news posts
- **Mongoose**: MongoDB object modeling
- **Multer**: File upload handling
- **Sharp**: Image processing library
- **EJS**: Templating engine for dashboard views
- **Bootstrap**: Frontend framework for dashboard UI
- **Pino**: Fast, low overhead logging
- **Swagger**: API documentation
- **Helmet**: Security headers
- **CORS**: Cross-Origin Resource Sharing
- **XSS Protection**: Sanitizing input to prevent XSS attacks
- **Rate Limiting**: Protection against brute force attacks

## API Authentication

The API uses API key authentication. You need to include your API key in the HTTP header:

```
x-api-key: YOUR_API_KEY
```

API keys can have different permission levels:
- `read`: Access to GET endpoints
- `write`: Access to POST endpoints
- `delete`: Access to DELETE endpoints
- `admin`: Full access including API key management

## Dashboard Authentication

The dashboard uses session-based authentication. Users can have different roles:
- `user`: Basic access to dashboard features
- `manager`: Extended access to create and edit content
- `admin`: Full access to all dashboard features including user management

## API Endpoints

### API Keys
- `GET /api/v1/api-keys`: Get all API keys (admin only)
- `POST /api/v1/api-keys`: Create a new API key (admin only)
- `DELETE /api/v1/api-keys/:id`: Revoke an API key (admin only)

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

### News Posts
- `GET /api/v1/news-posts`: Get all news posts (paginated, sortable)
- `GET /api/v1/news-posts/:id`: Get a specific news post by ID
- `POST /api/v1/news-posts`: Create a new news post
- `PATCH /api/v1/news-posts/:id`: Update a news post
- `DELETE /api/v1/news-posts/:id`: Delete a news post
- `GET /api/v1/news-posts/stats`: Get news post statistics

## Dashboard Routes

The application includes a user-friendly dashboard with the following features:

### Authentication
- `/dashboard/login`: Login to the dashboard
- `/dashboard/logout`: Logout from the dashboard
- `/dashboard/profile`: User profile management

### File Management
- `/dashboard/files`: View and manage all files
- `/dashboard/images`: View and manage images
- `/dashboard/documents`: View and manage documents
- `/dashboard/videos`: View and manage videos

### News Post Management
- `/dashboard/news-posts`: View all news posts
- `/dashboard/news-posts/create`: Create a new news post
- `/dashboard/news-posts/:id`: View a specific news post
- `/dashboard/news-posts/:id/edit`: Edit a news post
- `/dashboard/news-posts/:id/delete`: Delete a news post

### User Management (Admin Only)
- `/dashboard/users`: View and manage users
- `/dashboard/users/create`: Create a new user
- `/dashboard/users/:id`: View a specific user
- `/dashboard/users/:id/edit`: Edit a user
- `/dashboard/users/:id/delete`: Delete a user

### Settings (Admin Only)
- `/dashboard/settings`: View and manage application settings

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

### Creating Your First API Key

After starting the server for the first time, you need to create an admin API key. You can use the provided script:

```
npm run create-admin-key
```

This will output an API key with admin permissions that you can use to access all endpoints.

### Creating Your First Dashboard Admin User

To access the dashboard, you need to create an admin user. You can use the provided script:

```
npm run create-admin-user
```

This will create an admin user with the credentials:
- Email: admin@example.com
- Password: adminpass123

Make sure to change these credentials after your first login.

### API Documentation

Once the server is running, you can access the Swagger documentation at:
```
http://localhost:3000/api-docs
```

## Security Considerations

This project implements the OWASP Top 10 security recommendations:

1. **Broken Access Control**: API key-based authentication with granular permissions
2. **Cryptographic Failures**: Secure credential storage
3. **Injection**: Input validation and MongoDB query sanitization
4. **Insecure Design**: Separation of concerns and proper error handling
5. **Security Misconfiguration**: Proper environment configuration with secure defaults
6. **Vulnerable Components**: Regular dependency updates and audits
7. **Identification and Authentication Failures**: Secure API key implementation
8. **Software and Data Integrity Failures**: Validation of uploaded content
9. **Security Logging and Monitoring Failures**: Comprehensive logging with Pino
10. **Server-Side Request Forgery**: Proper validation of file paths and URLs

## License

This project is licensed under the MIT License - see the LICENSE file for details. 