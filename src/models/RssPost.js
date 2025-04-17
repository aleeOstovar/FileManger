const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     RssPost:
 *       type: object
 *       required:
 *         - title
 *         - sourceURL
 *         - pubDate
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the RSS post
 *         title:
 *           type: string
 *           description: Title of the RSS post
 *         sourceURL:
 *           type: string
 *           description: Source URL of the RSS post
 *         pubDate:
 *           type: string
 *           format: date-time
 *           description: Publication date of the RSS post
 *         creator:
 *           type: string
 *           description: Creator of the RSS post
 *         content:
 *           type: string
 *           description: Content of the RSS post
 *         contentSnippet:
 *           type: string
 *           description: Content snippet of the RSS post
 *         thumbnailImage:
 *           type: string
 *           description: URL of the thumbnail image
 *         categories:
 *           type: array
 *           items:
 *             type: string
 *           description: Categories of the RSS post
 *         status:
 *           type: string
 *           enum: [draft, published, archived]
 *           description: Status of the RSS post
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the RSS post was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date the RSS post was last updated
 */
const rssPostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'RSS post must have a title'],
      trim: true
    },
    sourceURL: {
      type: String,
      required: [true, 'RSS post must have a source URL'],
      trim: true
    },
    pubDate: {
      type: String,
      required: [true, 'RSS post must have a publication date']
    },
    creator: {
      type: String,
      trim: true
    },
    content: {
      type: String,
      trim: true
    },
    contentSnippet: {
      type: String,
      trim: true
    },
    thumbnailImage: {
      type: String,
      trim: true
    },
    categories: {
      type: [String],
      default: []
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'published', 'archived'],
        message: 'Status must be either: draft, published, or archived'
      },
      default: 'draft'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Create indexes for faster queries
rssPostSchema.index({ pubDate: -1 });
rssPostSchema.index({ sourceURL: 1 });
rssPostSchema.index({ title: 1 });
rssPostSchema.index({ categories: 1 });
rssPostSchema.index({ status: 1 });

const RssPost = mongoose.model('RssPost', rssPostSchema);

module.exports = RssPost; 