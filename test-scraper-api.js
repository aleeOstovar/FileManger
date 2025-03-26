const axios = require('axios');
require('dotenv').config();

// Normalize the API URL to ensure it doesn't have trailing slashes
const SCRAPER_API_URL = (process.env.SCRAPER_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
const FILEMANAGER_URL = 'http://localhost:3000';

// Helper function to build correct API URLs
function buildUrl(endpoint, base = SCRAPER_API_URL) {
    // Ensure endpoint starts with a slash
    if (!endpoint.startsWith('/')) {
        endpoint = '/' + endpoint;
    }
    return `${base}${endpoint}`;
}

async function testScraperDirectAPI() {
  console.log('=== TESTING DIRECT SCRAPER API ===');
  console.log(`Testing connection to scraper API at: ${SCRAPER_API_URL}`);
  
  try {
    console.log('Testing /api/v1/monitoring/test endpoint...');
    const testResponse = await axios.get(buildUrl('/api/v1/monitoring/test'));
    console.log('Test response:', JSON.stringify(testResponse.data, null, 2));
    
    console.log('\nTesting /api/v1/monitoring/status endpoint...');
    const statusResponse = await axios.get(buildUrl('/api/v1/monitoring/status'));
    console.log('Status response:', JSON.stringify(statusResponse.data, null, 2));
    
    console.log('\nTesting /api/v1/monitoring/stats endpoint...');
    const statsResponse = await axios.get(buildUrl('/api/v1/monitoring/stats'));
    console.log('Stats response:', JSON.stringify(statsResponse.data, null, 2));
    
    console.log('\nDirect Scraper API tests successful!');
    return true;
  } catch (error) {
    console.error('Error connecting to scraper API:');
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from server. Is the scraper service running?');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error:', error.message);
    }
    console.error('\nDirect Scraper API tests failed!');
    return false;
  }
}

async function testFilemanagerAPI() {
  console.log('\n=== TESTING FILEMANAGER API ===');
  console.log(`Testing connection to filemanager API at: ${FILEMANAGER_URL}`);
  
  try {
    console.log('Testing /api/v1/scraper/status endpoint...');
    const statusResponse = await axios.get(buildUrl('/api/v1/scraper/status', FILEMANAGER_URL));
    console.log('Status response:', JSON.stringify(statusResponse.data, null, 2));
    
    console.log('\nTesting /api/v1/scraper/stats endpoint...');
    const statsResponse = await axios.get(buildUrl('/api/v1/scraper/stats', FILEMANAGER_URL));
    console.log('Stats response:', JSON.stringify(statsResponse.data, null, 2));
    
    console.log('\nTesting /api/v1/scraper/progress endpoint...');
    const progressResponse = await axios.get(buildUrl('/api/v1/scraper/progress', FILEMANAGER_URL));
    console.log('Progress response:', JSON.stringify(progressResponse.data, null, 2));
    
    console.log('\nFilemanager API tests successful!');
    return true;
  } catch (error) {
    console.error('Error connecting to filemanager API:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No response received from server. Is the filemanager service running?');
    } else {
      console.error('Error:', error.message);
    }
    console.error('\nFilemanager API tests failed!');
    return false;
  }
}

async function runTests() {
  console.log('Starting API tests...\n');
  
  // Test direct scraper API
  const scraperApiSuccess = await testScraperDirectAPI();
  
  // Test filemanager API
  const filemanagerApiSuccess = await testFilemanagerAPI();
  
  console.log('\n=== TEST SUMMARY ===');
  console.log(`Scraper API Test: ${scraperApiSuccess ? 'PASSED' : 'FAILED'}`);
  console.log(`Filemanager API Test: ${filemanagerApiSuccess ? 'PASSED' : 'FAILED'}`);
  
  if (!scraperApiSuccess) {
    console.log('\n⚠️ The scraper API tests failed. Make sure the scraper service is running at:', SCRAPER_API_URL);
  }
  
  if (!filemanagerApiSuccess) {
    console.log('\n⚠️ The filemanager API tests failed. Make sure:');
    console.log('1. The filemanager service is running at:', FILEMANAGER_URL);
    console.log('2. The SCRAPER_API_URL environment variable is set correctly in the filemanager .env file');
    console.log('3. The filemanager can connect to the scraper service');
  }
}

runTests(); 