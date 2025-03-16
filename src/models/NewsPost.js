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
 *           description: Array of image URLs related to the post
 *         content:
 *           type: string
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
      type: String,
      required: [true, 'A news post must have content'],
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
    imageThumbnail: {
      type: String,
      trim: true,
    },
    imagesUrl: {
      type: [String],
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