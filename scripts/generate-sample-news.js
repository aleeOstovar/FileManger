/**
 * This script generates sample news posts for testing
 * Run with: node scripts/generate-sample-news.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const NewsPost = require('../src/models/NewsPost');
const fs = require('fs');
const path = require('path');
const logger = require('../src/utils/logger');

// Check if we're using memory mode
const useMemoryStore = process.env.USE_MEMORY_STORE === 'true';

// Sample news post data
const sampleNewsPosts = [
  {
    title: 'Introduction to Our File Management System',
    content: `<p>We're excited to introduce our new file management system that allows for seamless organization and sharing of files.</p>
    <p>Key features include:</p>
    <ul>
      <li>Secure file storage</li>
      <li>Easy file sharing</li>
      <li>Role-based access control</li>
      <li>API access for developers</li>
    </ul>
    <p>Stay tuned for more updates and feature enhancements!</p>`,
    status: 'published',
    creator: 'Admin Team',
    sourceUrl: 'https://example.com/intro',
    imageThumbnail: 'https://via.placeholder.com/800x450?text=File+Management+System',
    imagesUrl: [
      'https://via.placeholder.com/1200x600?text=Dashboard+Screenshot',
      'https://via.placeholder.com/1200x600?text=File+Upload+Feature'
    ],
    tags: ['announcement', 'feature', 'introduction'],
    sourceDate: new Date('2023-01-15')
  },
  {
    title: 'Security Features Explained',
    content: `<p>Security is our top priority. Here's how we protect your files:</p>
    <h3>Encryption</h3>
    <p>All files are encrypted at rest and in transit using industry-standard encryption protocols.</p>
    <h3>Access Controls</h3>
    <p>Our granular permission system ensures that only authorized users can access your files.</p>
    <h3>Audit Logs</h3>
    <p>Comprehensive logging provides a clear picture of who accessed what and when.</p>`,
    status: 'published',
    creator: 'Security Team',
    sourceUrl: 'https://example.com/security',
    imageThumbnail: 'https://via.placeholder.com/800x450?text=Security+Features',
    imagesUrl: [
      'https://via.placeholder.com/1200x600?text=Encryption+Diagram',
      'https://via.placeholder.com/1200x600?text=Access+Control+Panel'
    ],
    tags: ['security', 'feature', 'encryption'],
    sourceDate: new Date('2023-02-10')
  },
  {
    title: 'Upcoming API Improvements',
    content: `<p>We're working on enhancing our API capabilities to better serve developers.</p>
    <p>The following improvements are scheduled for next month:</p>
    <ul>
      <li>Faster response times</li>
      <li>New endpoints for batch operations</li>
      <li>Improved error handling</li>
      <li>Comprehensive webhooks</li>
    </ul>
    <p>If you'd like to participate in our beta program, please contact our developer relations team.</p>`,
    status: 'draft',
    creator: 'Dev Team',
    sourceUrl: 'https://example.com/api-improvements',
    imageThumbnail: 'https://via.placeholder.com/800x450?text=API+Improvements',
    imagesUrl: [
      'https://via.placeholder.com/1200x600?text=API+Documentation',
      'https://via.placeholder.com/1200x600?text=Developer+Portal'
    ],
    tags: ['api', 'development', 'upcoming'],
    sourceDate: new Date('2023-03-05')
  },
  {
    title: 'User Interface Redesign Preview',
    content: `<p>We're excited to give you a sneak peek at our upcoming UI redesign.</p>
    <p>The new interface focuses on:</p>
    <ul>
      <li>Improved accessibility</li>
      <li>Faster navigation</li>
      <li>Modern aesthetic</li>
      <li>Responsive design for all devices</li>
    </ul>
    <p>The beta version will be available to select users next week.</p>`,
    status: 'draft',
    creator: 'Design Team',
    sourceUrl: 'https://example.com/ui-redesign',
    imageThumbnail: 'https://via.placeholder.com/800x450?text=UI+Redesign',
    imagesUrl: [
      'https://via.placeholder.com/1200x600?text=New+Dashboard+Design',
      'https://via.placeholder.com/1200x600?text=Mobile+Interface'
    ],
    tags: ['design', 'ui', 'upcoming', 'beta'],
    sourceDate: new Date('2023-04-20')
  },
  {
    title: 'Integration Partners Announcement',
    content: `<p>We're proud to announce new integration partnerships with leading software providers.</p>
    <p>These integrations allow for seamless workflow with:</p>
    <ul>
      <li>Popular CRM systems</li>
      <li>Project management tools</li>
      <li>Communication platforms</li>
      <li>Cloud storage providers</li>
    </ul>
    <p>Check out our documentation for details on how to set up these integrations.</p>`,
    status: 'published',
    creator: 'Partnerships Team',
    sourceUrl: 'https://example.com/integration-partners',
    imageThumbnail: 'https://via.placeholder.com/800x450?text=Integration+Partners',
    imagesUrl: [
      'https://via.placeholder.com/1200x600?text=Integration+Diagram',
      'https://via.placeholder.com/1200x600?text=Partner+Logos'
    ],
    tags: ['integration', 'partners', 'announcement'],
    sourceDate: new Date('2023-05-12')
  }
];

async function generateSampleNewsPosts() {
  try {
    // Handle memory store mode
    if (useMemoryStore) {
      const dataDir = path.join(__dirname, '..', 'data');
      
      // Create data directory if it doesn't exist
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      // Add IDs and timestamps to posts
      const postsWithIds = sampleNewsPosts.map((post, index) => ({
        ...post,
        _id: `sample-${index + 1}`,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      const newsPostsPath = path.join(dataDir, 'news-posts.json');
      fs.writeFileSync(newsPostsPath, JSON.stringify(postsWithIds, null, 2));
      
      logger.info(`Generated ${postsWithIds.length} sample news posts in memory store mode at ${newsPostsPath}`);
      return;
    }

    // MongoDB mode
    const uri = process.env.MONGODB_DIRECT_URI || process.env.MONGO_URI;
    if (!uri) {
      logger.error('No MongoDB connection URI provided in environment variables');
      process.exit(1);
    }

    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    logger.info('Connected to MongoDB');

    // Clear existing news posts
    await NewsPost.deleteMany({});
    logger.info('Cleared existing news posts');

    // Create new sample posts
    const result = await NewsPost.insertMany(sampleNewsPosts);
    logger.info(`Created ${result.length} sample news posts`);

    // Get stats to confirm
    const stats = await NewsPost.getStats();
    logger.info('News post stats by status:', stats);

  } catch (error) {
    logger.error('Error generating sample news posts:', error);
  } finally {
    if (!useMemoryStore) {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
    }
  }
}

generateSampleNewsPosts(); 