const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const ApiKey = require('../models/ApiKey');
const logger = require('../utils/logger');

// Check if we're using memory store mode
const useMemoryStore = process.env.USE_MEMORY_STORE === 'true';
const apiKeysPath = path.join(__dirname, '../../data/api-keys.json');

/**
 * Helper function to load API keys from file in memory store mode
 */
const loadApiKeys = () => {
  try {
    if (!fs.existsSync(apiKeysPath)) {
      return [];
    }
    const data = fs.readFileSync(apiKeysPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    logger.error('Error loading API keys from file:', error);
    return [];
  }
};

/**
 * Helper function to save API keys to file in memory store mode
 */
const saveApiKeys = (apiKeys) => {
  try {
    const dataDir = path.dirname(apiKeysPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(apiKeysPath, JSON.stringify(apiKeys, null, 2));
  } catch (error) {
    logger.error('Error saving API keys to file:', error);
  }
};

/**
 * Create a new API key
 * @param {Object} apiKeyData - The data for the API key
 * @returns {Promise<Object>} The created API key
 */
exports.createApiKey = async (apiKeyData) => {
  logger.info('Creating new API key');
  
  if (useMemoryStore) {
    const apiKeys = loadApiKeys();
    const newApiKey = {
      ...apiKeyData,
      _id: mongoose.Types.ObjectId().toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    apiKeys.push(newApiKey);
    saveApiKeys(apiKeys);
    logger.info(`Created API key with ID: ${newApiKey._id}`);
    return newApiKey;
  }
  
  const apiKey = await ApiKey.create(apiKeyData);
  logger.info(`Created API key with ID: ${apiKey._id}`);
  return apiKey;
};

/**
 * Get all API keys
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of API keys
 */
exports.getAllApiKeys = async (options = {}) => {
  const { active, sort = '-createdAt' } = options;
  
  if (useMemoryStore) {
    let apiKeys = loadApiKeys();
    
    // Filter by active status if specified
    if (active !== undefined) {
      apiKeys = apiKeys.filter(key => key.active === active);
    }
    
    // Sort
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    const sortOrder = sort.startsWith('-') ? -1 : 1;
    
    apiKeys.sort((a, b) => {
      if (sortField === 'createdAt' || sortField === 'updatedAt') {
        return sortOrder * (new Date(a[sortField]) - new Date(b[sortField]));
      }
      if (a[sortField] < b[sortField]) return -1 * sortOrder;
      if (a[sortField] > b[sortField]) return 1 * sortOrder;
      return 0;
    });
    
    return apiKeys;
  }
  
  // MongoDB implementation
  const query = {};
  if (active !== undefined) {
    query.active = active;
  }
  
  return await ApiKey.find(query).sort(sort);
};

/**
 * Get an API key by ID
 * @param {string} id - The API key ID
 * @returns {Promise<Object|null>} The API key or null if not found
 */
exports.getApiKeyById = async (id) => {
  if (useMemoryStore) {
    const apiKeys = loadApiKeys();
    return apiKeys.find(key => key._id === id) || null;
  }
  
  return await ApiKey.findById(id);
};

/**
 * Get an API key by key value
 * @param {string} keyValue - The API key value
 * @returns {Promise<Object|null>} The API key or null if not found
 */
exports.getApiKeyByValue = async (keyValue) => {
  if (useMemoryStore) {
    const apiKeys = loadApiKeys();
    return apiKeys.find(key => key.key === keyValue) || null;
  }
  
  return await ApiKey.findOne({ key: keyValue });
};

/**
 * Update an API key
 * @param {string} id - The API key ID
 * @param {Object} updateData - The data to update
 * @returns {Promise<Object|null>} The updated API key or null if not found
 */
exports.updateApiKey = async (id, updateData) => {
  logger.info(`Updating API key with ID: ${id}`);
  
  if (useMemoryStore) {
    const apiKeys = loadApiKeys();
    const index = apiKeys.findIndex(key => key._id === id);
    
    if (index === -1) {
      logger.warn(`API key with ID ${id} not found`);
      return null;
    }
    
    const updatedApiKey = {
      ...apiKeys[index],
      ...updateData,
      updatedAt: new Date()
    };
    
    apiKeys[index] = updatedApiKey;
    saveApiKeys(apiKeys);
    
    logger.info(`Updated API key with ID: ${id}`);
    return updatedApiKey;
  }
  
  const apiKey = await ApiKey.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  );
  
  if (!apiKey) {
    logger.warn(`API key with ID ${id} not found`);
    return null;
  }
  
  logger.info(`Updated API key with ID: ${id}`);
  return apiKey;
};

/**
 * Revoke an API key
 * @param {string} id - The API key ID
 * @param {string} revokedBy - ID of the user who revoked the key
 * @returns {Promise<Object|null>} The revoked API key or null if not found
 */
exports.revokeApiKey = async (id, revokedBy) => {
  const updateData = {
    active: false,
    revokedAt: new Date(),
    revokedBy
  };
  
  return await exports.updateApiKey(id, updateData);
};

/**
 * Delete an API key
 * @param {string} id - The API key ID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
exports.deleteApiKey = async (id) => {
  logger.info(`Deleting API key with ID: ${id}`);
  
  if (useMemoryStore) {
    const apiKeys = loadApiKeys();
    const initialLength = apiKeys.length;
    
    const filteredApiKeys = apiKeys.filter(key => key._id !== id);
    
    if (filteredApiKeys.length === initialLength) {
      logger.warn(`API key with ID ${id} not found`);
      return false;
    }
    
    saveApiKeys(filteredApiKeys);
    logger.info(`Deleted API key with ID: ${id}`);
    return true;
  }
  
  const result = await ApiKey.findByIdAndDelete(id);
  
  if (!result) {
    logger.warn(`API key with ID ${id} not found`);
    return false;
  }
  
  logger.info(`Deleted API key with ID: ${id}`);
  return true;
};

/**
 * Validate an API key
 * @param {string} keyValue - The API key value to validate
 * @returns {Promise<Object|null>} The API key if valid, null otherwise
 */
exports.validateApiKey = async (keyValue) => {
  if (!keyValue) {
    return null;
  }
  
  const apiKey = await exports.getApiKeyByValue(keyValue);
  
  // If key doesn't exist or is not active
  if (!apiKey || !apiKey.active) {
    return null;
  }
  
  // Check if key has expired
  if (apiKey.expiresAt && new Date() > new Date(apiKey.expiresAt)) {
    // Automatically deactivate expired keys
    await exports.updateApiKey(apiKey._id, { 
      active: false,
      revokedAt: new Date(),
      revokedBy: 'system:expiration'
    });
    return null;
  }
  
  return apiKey;
}; 