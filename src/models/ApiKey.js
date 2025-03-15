const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * @swagger
 * components:
 *   schemas:
 *     ApiKey:
 *       type: object
 *       required:
 *         - name
 *         - key
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the API key
 *         name:
 *           type: string
 *           description: Name/description of the API key
 *         key:
 *           type: string
 *           description: The actual API key
 *         active:
 *           type: boolean
 *           description: Whether the API key is active
 *         permissions:
 *           type: array
 *           items:
 *             type: string
 *           description: List of permissions for this API key
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the API key was created
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           description: The date the API key expires (if applicable)
 */
const apiKeySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'API key must have a name'],
      trim: true
    },
    key: {
      type: String,
      required: [true, 'API key is required'],
      unique: true,
      index: true
    },
    active: {
      type: Boolean,
      default: true
    },
    permissions: {
      type: [String],
      default: ['read']
    },
    expiresAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Create index for faster queries
apiKeySchema.index({ key: 1 });

/**
 * Generate a new API key
 * @param {string} name - Name for the API key
 * @param {Array} permissions - Array of permissions
 * @param {Date} expiresAt - Expiration date (optional)
 * @returns {Object} - Created API key document
 */
apiKeySchema.statics.generateKey = async function(name, permissions = ['read'], expiresAt = null) {
  // Generate a random API key with prefix 'fm_' (file manager)
  const key = 'fm_' + crypto.randomBytes(24).toString('hex');
  
  // Create and return a new API key document
  return await this.create({
    name,
    key,
    permissions,
    expiresAt
  });
};

/**
 * Verify if an API key is valid
 * @param {string} key - API key to verify
 * @returns {Promise<Object|null>} - API key document if valid, null otherwise
 */
apiKeySchema.statics.verifyKey = async function(key) {
  const apiKey = await this.findOne({ key, active: true });
  
  // If key doesn't exist or is inactive
  if (!apiKey) return null;
  
  // Check if key has expired
  if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
    // Mark as inactive and save
    apiKey.active = false;
    await apiKey.save();
    return null;
  }
  
  return apiKey;
};

/**
 * Check if the API key has a specific permission
 * @param {string} permission - Permission to check
 * @returns {boolean} - True if has permission, false otherwise
 */
apiKeySchema.methods.hasPermission = function(permission) {
  return this.permissions.includes(permission) || this.permissions.includes('admin');
};

const ApiKey = mongoose.model('ApiKey', apiKeySchema);

module.exports = ApiKey; 