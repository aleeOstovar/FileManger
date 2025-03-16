const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

/**
 * @swagger
 * components:
 *   schemas:
 *     File:
 *       type: object
 *       required:
 *         - originalname
 *         - mimetype
 *         - filename
 *         - path
 *         - size
 *         - type
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the file
 *         originalname:
 *           type: string
 *           description: Original name of the uploaded file
 *         encoding:
 *           type: string
 *           description: Encoding type of the file
 *         mimetype:
 *           type: string
 *           description: Mime type of the file
 *         filename:
 *           type: string
 *           description: Generated filename in the server
 *         path:
 *           type: string
 *           description: Path to the file on the server
 *         size:
 *           type: number
 *           description: Size of the file in bytes
 *         type:
 *           type: string
 *           description: Type of file (image, document, video)
 *           enum: [image, document, video]
 *         metadata:
 *           type: object
 *           description: Additional metadata for the file
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the file was uploaded
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date the file was last updated
 */
const fileSchema = new mongoose.Schema(
  {
    originalname: {
      type: String,
      required: [true, 'File must have an original name'],
      trim: true
    },
    encoding: {
      type: String
    },
    mimetype: {
      type: String,
      required: [true, 'File must have a mimetype']
    },
    filename: {
      type: String,
      required: [true, 'File must have a filename'],
      unique: true,
      default: () => `${Date.now()}-${uuidv4()}`
    },
    path: {
      type: String,
      required: [true, 'File must have a path']
    },
    size: {
      type: Number,
      required: [true, 'File must have a size']
    },
    type: {
      type: String,
      required: [true, 'File must have a type'],
      enum: {
        values: ['image', 'document', 'video'],
        message: 'Type must be either: image, document, or video'
      }
    },
    metadata: {
      type: Object,
      default: {}
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Create index for faster queries
fileSchema.index({ type: 1, createdAt: -1 });
fileSchema.index({ filename: 1 }, { unique: true });

// Middleware to sanitize the filename and path before saving
fileSchema.pre('save', function(next) {
  // Remove any path information from the originalname
  this.originalname = this.originalname.replace(/^.*[\\\/]/, '');
  
  // Ensure path doesn't contain any invalid characters
  this.path = this.path.replace(/[^a-zA-Z0-9\/_\-\.\\]/g, '');
  
  next();
});

// Virtual property for the absolute URL to the file
fileSchema.virtual('url').get(function() {
  return `/uploads/${this.type}s/${this.filename}`;
});

// Virtual property for the full URL (including host)
fileSchema.virtual('fullUrl').get(function() {
  // This will be populated by the controller
  return null;
});

// Static method to get file stats
fileSchema.statics.getStats = async function() {
  return await this.aggregate([
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalSize: { $sum: '$size' }
      }
    }
  ]);
};

const File = mongoose.model('File', fileSchema);

module.exports = File; 