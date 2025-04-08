const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * @swagger
 * components:
 *   schemas:
 *     NewsPost:
 *       type: object
 *       required:
 *         - title
 *         - content
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the news post
 *         title:
 *           type: string
 *           description: Title of the news post
 *         creator:
 *           type: string
 *           description: Creator/author of the news post
 *         sourceUrl:
 *           type: string
 *           description: Source URL of the original news post
 *         imageThumbnail:
 *           type: string
 *           description: URL of the thumbnail image
 *         imagesUrl:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of image objects related to the post
 *         content:
 *           type: array
 *           items:
 *             type: string
 *           description: Main content of the news post
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: Tags/categories for the news post
 *         sourceDate:
 *           type: string
 *           format: date-time
 *           description: Original publication date from the source
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the news post was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date the news post was last updated
 */
const newsPostSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'A news post must have a title'],
      trim: true,
    },
    content: {
      type: Map, // Use Map for objects with arbitrary keys
      of: String, // Specify that the values in the map must be strings
      required: [true, 'A news post must have content'],
      validate: {
        validator: function(v) {
          // 'v' will be a Map instance here.
          // Check if it's a Map and has at least one key-value pair.
          // Mongoose Maps have a 'size' property.
          return v instanceof Map && v.size > 0;
          // Alternatively, a less strict check if Mongoose passes a plain object during validation sometimes:
          // return v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0;
        },
        // Update the error message to reflect the expected object structure
        message: 'Content object must contain at least one key-value pair'
      }
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    creator: {
      type: String,
      trim: true,
    },
    sourceUrl: {
      type: String,
      trim: true,
    },
    thumbnailImage: {
      type: String,
      trim: true,
    },
    imagesUrl: {
      type: [{
        url: {
          type: String,
          required: true
        },
        id: {
          type: String,
          required: true
        },
        caption: {
          type: String
        },
        type: {
          type: String,
          default: 'figure'
        }
      }],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    sourceDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for text search on title and content
newsPostSchema.index({ title: 'text', content: 'text' });

// Index for status and created date for efficient filtering and sorting
newsPostSchema.index({ status: 1, createdAt: -1 });

// Index for tags for efficient filtering
newsPostSchema.index({ tags: 1 });

// Add a pre-save middleware to handle imagesUrl
newsPostSchema.pre('save', function(next) {
  // Handle imagesUrl if it's a string or contains strings
  if (this.imagesUrl) {
    // No pre-save logic needed for simple string array
  }
  next();
});

/**
 * Static method to get post statistics by status
 */
newsPostSchema.statics.getStats = async function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        newest: { $max: '$createdAt' },
        oldest: { $min: '$createdAt' }
      }
    },
    {
      $project: {
        _id: 0,
        status: '$_id',
        count: 1,
        newest: 1,
        oldest: 1
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

const NewsPost = mongoose.model('NewsPost', newsPostSchema);

module.exports = NewsPost; 