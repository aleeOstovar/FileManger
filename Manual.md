# File Manager System Manual

## Table of Contents
1. Introduction
2. System Architecture
3. Prerequisites
4. Installation
5. Configuration
6. API Authentication
7. API Endpoints
8. Dashboard Interface
9. File Management
10. News Post Management
11. RSS Feed Management
12. User Management
13. API Key Management
14. Integration with News Scraper
15. Security Considerations
16. Troubleshooting
17. Development Guide
18. API Reference

## 1. Introduction

The File Manager is a comprehensive system designed for managing different types of files (images, documents, videos) and news content through a RESTful API. It provides both API access for programmatic interaction and a web-based dashboard for visual management. The system is built with Node.js, Express, and MongoDB, offering robust features for file uploads, content management, and user authentication.

**Core Features:**
- File upload and management (images, documents, videos)
- News post creation and management
- RSS feed integration
- User management with role-based permissions
- API key authentication
- Admin dashboard interface
- Integration with news scraper service

## 2. System Architecture

The File Manager follows a modular architecture consisting of the following components:

- **Server**: Express.js application that handles HTTP requests
- **Database**: MongoDB for storing file metadata, news posts, users, and API keys
- **Routes**: API endpoints for different resources
- **Controllers**: Business logic for processing requests
- **Models**: MongoDB schemas for data structure
- **Middlewares**: Functions for processing requests (authentication, validation, etc.)
- **Services**: Reusable business logic components
- **Utils**: Helper functions
- **Views**: EJS templates for the dashboard interface

## 3. Prerequisites

Before installing and running the File Manager, ensure you have:

- **Node.js** (v14 or higher)
- **MongoDB** (v4 or higher)
- **npm** or **yarn**
- **Git** (for version control)

If you plan to use the scraper integration, you'll also need:
- The News Scraper service (separate application)

## 4. Installation

### Step 1: Clone the Repository
```bash
git clone <repository-url>
cd Filemanager
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Set Up Environment Variables
```bash
cp .env.example .env
```
Then edit the `.env` file with your specific configuration (see Configuration section).

### Step 4: Set Up Directory Structure
The system will automatically create the required directories on startup, but you can also create them manually:
```bash
mkdir -p logs uploads/images uploads/documents uploads/videos
mkdir -p public/css public/js public/img
```

### Step 5: Start the Server
For production:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## 5. Configuration

The `.env` file contains all the configuration options for the File Manager. Here's what each section means:

### Server Configuration
```
PORT=3000               # Port on which the server will run
NODE_ENV=development    # Environment (development, production, test)
```

### MongoDB Configuration
```
MONGO_URI=mongodb://localhost:27017/filemanager  # MongoDB connection string
MONGO_USERNAME=yourUsername                      # MongoDB username (if needed)
MONGO_PASSWORD=yourPassword                      # MongoDB password (if needed)
```

### Security
```
SESSION_SECRET=your_super_secret_session_key     # Secret for session encryption
JWT_SECRET=your_jwt_secret_key_for_api_tokens    # Secret for JWT tokens
JWT_EXPIRES_IN=7d                                # JWT token expiration
```

### API Rate Limiting
```
RATE_LIMIT_WINDOW_MS=900000    # Time window for rate limiting (ms)
RATE_LIMIT_MAX_REQUESTS=100    # Maximum requests per window
```

### Logging
```
LOG_LEVEL=info                 # Logging level (debug, info, warn, error)
```

### File Upload Limits
```
MAX_FILE_SIZE=10485760         # Maximum file size (10MB)
MAX_FILES_PER_UPLOAD=10        # Maximum files per upload
```

### CORS Configuration
```
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001  # Allowed CORS origins
```

### Scraper Integration
```
SCRAPER_API_URL=http://localhost:8000  # URL of the scraper service
```

## 6. API Authentication

The File Manager uses API key authentication for API access. Each request to protected endpoints must include an API key in the HTTP header:

```
x-api-key: YOUR_API_KEY
```

### API Key Permissions

API keys can have different permission levels:
- `read`: Access to GET endpoints
- `write`: Access to POST, PUT, PATCH endpoints
- `delete`: Access to DELETE endpoints
- `admin`: Full access to all endpoints

### Creating Your First API Key

After starting the server for the first time, you need to create an admin API key:

```bash
npm run create-admin-key
```

This will generate an API key with admin permissions and output it to the console. Save this key securely, as it grants full access to your API.

## 7. API Endpoints

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

### RSS Posts
- `GET /api/v1/rss-posts`: Get all RSS posts (paginated, sortable)
- `GET /api/v1/rss-posts/:id`: Get a specific RSS post by ID
- `POST /api/v1/rss-posts`: Create a new RSS post
- `DELETE /api/v1/rss-posts/:id`: Delete an RSS post

### API Keys
- `GET /api/v1/api-keys`: Get all API keys (admin only)
- `POST /api/v1/api-keys`: Create a new API key (admin only)
- `DELETE /api/v1/api-keys/:id`: Revoke an API key (admin only)

### Scraper Integration
- `GET /api/v1/scraper/status`: Get scraper status
- `GET /api/v1/scraper/stats`: Get scraper statistics
- `GET /api/v1/scraper/progress`: Get scraper progress
- `POST /api/v1/scraper/run`: Trigger the scraper to run

## 8. Dashboard Interface

The File Manager includes a web-based dashboard for visual management. To access it, navigate to:

```
http://localhost:3000/dashboard
```

### Dashboard Authentication

The dashboard uses session-based authentication. Users need to log in with their credentials:

```
http://localhost:3000/dashboard/login
```

### Creating Your First Dashboard Admin User

To create an admin user for the dashboard:

```bash
npm run create-admin-user
```

By default, this creates a user with:
- Email: admin@example.com
- Password: adminpass123

Change these credentials after your first login.

### Dashboard Menu Structure

- **Home**: Overview and statistics
- **Files**: File management
  - Images
  - Documents
  - Videos
- **News**: News post management
- **RSS Feeds**: RSS post management
- **Users**: User management (admin only)
- **API Keys**: API key management (admin only)
- **Settings**: System settings (admin only)

## 9. File Management

### File Types Supported

The system supports various file types categorized as:

1. **Images**:
   - JPEG, JPG, PNG, GIF, WEBP, SVG
   
2. **Documents**:
   - PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, RTF
   
3. **Videos**:
   - MP4, MOV, AVI, WMV, WEBM

### Uploading Files

Files can be uploaded via:

1. **API**:
   ```
   POST /api/v1/images
   POST /api/v1/documents
   POST /api/v1/videos
   ```
   
   Use multipart/form-data with a field named 'file'.
   
2. **Dashboard**:
   Navigate to the appropriate section and use the upload form.

### File Metadata

Each file stores metadata including:
- Original filename
- File size
- MIME type
- Upload date
- Path on server
- Type (image, document, video)
- Created by (user ID)

### Image Processing

Images are automatically processed:
- Resized if they exceed maximum dimensions
- Optimized for web delivery
- Thumbnails generated for preview

## 10. News Post Management

### News Post Structure

News posts consist of:
- Title
- Content (rich text)
- Featured image
- Source URL
- Publication date
- Author/Creator
- Tags
- Category

### Creating News Posts

1. **Via API**:
   ```
   POST /api/v1/news-posts
   ```
   
   With JSON body containing the post data.
   
2. **Via Dashboard**:
   Navigate to News > Create New Post and fill in the form.

### Rich Text Support

The news post editor supports:
- Formatting (bold, italic, etc.)
- Lists (ordered and unordered)
- Links
- Images
- Embedded content

### News Post Lifecycle

Posts can have different states:
- Draft
- Published
- Archived

## 11. RSS Feed Management

### RSS Post Structure

RSS posts include:
- Title
- Description
- Source URL
- Publication date
- Feed source
- GUID (unique identifier)

### RSS Feed Integration

The system can integrate with external RSS feeds:
1. Set up RSS feed sources in the settings
2. Configure fetch intervals
3. The system will automatically import posts

## 12. User Management

### User Roles

- **user**: Basic dashboard access
- **editor**: Can create and edit content
- **admin**: Full system access

### User Management Functions

1. **Create User**:
   - Via API (admin only)
   - Via dashboard (admin only)
   
2. **Edit User**:
   - Change name, email
   - Reset password
   - Change role (admin only)
   
3. **Delete User** (admin only)

## 13. API Key Management

### API Key Structure

API keys include:
- Key (unique identifier)
- Name (descriptive name)
- Permissions
- Created by
- Creation date
- Expiration date (optional)

### Managing API Keys

1. **Create API Key**:
   - Via API (admin only)
   - Via dashboard (admin only)
   
2. **Revoke API Key**:
   - Via API (admin only)
   - Via dashboard (admin only)

## 14. Integration with News Scraper

The File Manager integrates with a separate News Scraper service to automatically fetch news from various sources.

### Configuration

Set the scraper service URL in your `.env` file:
```
SCRAPER_API_URL=http://localhost:8000
```

### Testing Integration

You can test the integration using the provided script:
```bash
node test-scraper-api.js
```

### API Endpoints

- `GET /api/v1/scraper/status`: Get scraper status
- `GET /api/v1/scraper/stats`: Get scraper statistics
- `GET /api/v1/scraper/progress`: Get scraper progress
- `POST /api/v1/scraper/run`: Trigger the scraper to run

## 15. Security Considerations

The File Manager implements various security measures:

1. **Authentication**:
   - API key authentication for API access
   - Session-based authentication for dashboard
   
2. **Authorization**:
   - Role-based access control
   - Permission-based API keys
   
3. **Data Validation**:
   - Input validation for all API endpoints
   - File type verification and sanitization
   
4. **Protection Against Common Attacks**:
   - XSS protection
   - CSRF protection
   - NoSQL injection protection
   - Rate limiting
   - Secure HTTP headers

5. **Data Security**:
   - Password hashing
   - Secure session management
   - HTTPS support in production

## 16. Troubleshooting

### Common Issues

#### Server Won't Start
- Check MongoDB connection
- Verify port availability
- Check for syntax errors in code
- Ensure all dependencies are installed

#### Authentication Issues
- Verify API key is valid and has necessary permissions
- Check user credentials for dashboard login
- Clear browser cookies if session issues persist

#### File Upload Problems
- Check file size limits
- Verify file type is supported
- Check directory permissions

#### Database Connection Issues
- Verify MongoDB is running
- Check connection string in .env
- Check network connectivity

### Logging

The system logs information to:
- Console (based on LOG_LEVEL)
- Log files in the logs directory
  - application.log
  - error.log
  - access.log

To increase log verbosity, set LOG_LEVEL=debug in your .env file.

## 17. Development Guide

### Project Structure
```
Filemanager/
├── config/              # Configuration files
├── data/                # Data files
├── logs/                # Log files
├── node_modules/        # Node.js modules
├── public/              # Static assets
├── scripts/             # Utility scripts
├── src/                 # Source code
│   ├── controllers/     # Request handlers
│   ├── middlewares/     # Express middlewares
│   ├── models/          # Mongoose models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── swagger/         # API documentation
│   ├── utils/           # Helper functions
│   ├── views/           # EJS templates
│   └── app.js           # Express application
├── uploads/             # Uploaded files
├── .env                 # Environment variables
├── .env.example         # Example environment file
├── package.json         # Project metadata
├── README.md            # Project documentation
└── server.js            # Entry point
```

### Development Workflow

1. **Setup**:
   - Clone repository
   - Install dependencies
   - Configure environment
   
2. **Start Development Server**:
   ```bash
   npm run dev
   ```
   
3. **Testing**:
   ```bash
   npm test
   ```
   
4. **Creating API Endpoints**:
   - Add route in src/routes/
   - Implement controller in src/controllers/
   - Add model if needed in src/models/

### Best Practices

- Follow the existing code style
- Write tests for new features
- Document API endpoints with Swagger
- Follow RESTful API conventions
- Handle errors properly
- Use async/await for asynchronous operations
- Commit frequently with descriptive messages

## 18. API Reference

For detailed API documentation, access the Swagger UI:

```
http://localhost:3000/api-docs
```

This provides a complete reference with:
- Endpoint descriptions
- Request/response schemas
- Authentication requirements
- Example requests
- Try-it-out functionality 