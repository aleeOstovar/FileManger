require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Initialize users array for memory store mode
let memoryUsers = [];

// Connect to MongoDB
const connectDB = async () => {
  try {
    // Check if we're in memory-only mode
    if (process.env.USE_MEMORY_STORE === 'true') {
      console.log('Running in memory-only mode. Users will be saved to a JSON file.');
      
      // Try to load existing users from JSON file
      const usersPath = path.join(process.cwd(), 'data', 'users.json');
      if (fs.existsSync(usersPath)) {
        try {
          const usersData = fs.readFileSync(usersPath, 'utf8');
          memoryUsers = JSON.parse(usersData);
          console.log(`Loaded ${memoryUsers.length} users from file.`);
        } catch (err) {
          console.error(`Error reading users file: ${err.message}`);
          memoryUsers = [];
        }
      }
      
      return { memory: true };
    }
    
    // Try to use direct connection string first
    let mongoURI;
    
    if (process.env.MONGODB_DIRECT_URI) {
      mongoURI = process.env.MONGODB_DIRECT_URI;
      console.log('Using direct MongoDB connection string');
    } else {
      // Fall back to constructing from parts
      mongoURI = process.env.MONGO_URI;
      const username = process.env.MONGO_USERNAME;
      const password = process.env.MONGO_PASSWORD;
      
      // If username and password are provided, use them
      if (username && password) {
        // Handle connection string for MongoDB Atlas (cloud)
        if (mongoURI.includes('mongodb+srv://')) {
          // Make sure we don't have username/password already in the URI
          if (!mongoURI.includes('@')) {
            // URI format: mongodb+srv://host/
            const [protocol, host] = mongoURI.split('//');
            mongoURI = `${protocol}//${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}`;
          }
        } 
        // Handle connection string for MongoDB local
        else if (mongoURI.includes('mongodb://')) {
          // Make sure we don't have username/password already in the URI
          if (!mongoURI.includes('@')) {
            // URI format: mongodb://host:port/
            const [protocol, host] = mongoURI.split('//');
            mongoURI = `${protocol}//${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}`;
          }
        }
      }
    }
    
    console.log('Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('MongoDB Connected');
    return { memory: false };
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    console.log('Falling back to memory-only mode...');
    return { memory: true };
  }
};

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Prompt for user input
const promptUser = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};

// Save users to file in memory mode
const saveMemoryUsers = () => {
  const usersDir = path.join(process.cwd(), 'data');
  const usersPath = path.join(usersDir, 'users.json');
  
  // Create data directory if it doesn't exist
  if (!fs.existsSync(usersDir)) {
    fs.mkdirSync(usersDir, { recursive: true });
  }
  
  try {
    fs.writeFileSync(usersPath, JSON.stringify(memoryUsers, null, 2));
    console.log(`Users saved to ${usersPath}`);
  } catch (err) {
    console.error(`Error saving users file: ${err.message}`);
  }
};

// Create a dashboard user
const createDashboardUser = async () => {
  try {
    const dbConfig = await connectDB();
    const memoryMode = dbConfig.memory;
    
    console.log('\n=== Create Dashboard User ===\n');
    
    // Get user details
    const name = await promptUser('Enter full name: ');
    const email = await promptUser('Enter email: ');
    const password = await promptUser('Enter password (min 8 characters): ');
    
    if (!name || !email || !password) {
      console.error('Error: All fields are required');
      return;
    }
    
    if (password.length < 8) {
      console.error('Error: Password must be at least 8 characters');
      return;
    }
    
    // Get role with validation
    let role = await promptUser('Enter role (admin, manager, viewer) [default: admin]: ');
    if (!role || !['admin', 'manager', 'viewer'].includes(role.toLowerCase())) {
      role = 'admin';
    }
    
    if (memoryMode) {
      // Handle memory mode
      const existingUserIndex = memoryUsers.findIndex(u => u.email === email);
      
      if (existingUserIndex !== -1) {
        console.log('\n⚠️ A user with this email already exists.');
        const updateConfirm = await promptUser('Do you want to update this user? (y/n): ');
        
        if (updateConfirm.toLowerCase() === 'y') {
          memoryUsers[existingUserIndex].name = name;
          memoryUsers[existingUserIndex].role = role;
          memoryUsers[existingUserIndex].password = password; // In real app, this would be hashed
          
          saveMemoryUsers();
          console.log(`\n✅ User ${email} has been updated.`);
        } else {
          console.log('\nUser creation cancelled.');
        }
      } else {
        // Create a new user in memory
        const newUser = {
          id: Date.now().toString(),
          name,
          email,
          password, // In real app, this would be hashed
          role,
          active: true,
          createdAt: new Date().toISOString()
        };
        
        memoryUsers.push(newUser);
        saveMemoryUsers();
        
        console.log(`\n✅ User created successfully:`);
        console.log('----------------------------------');
        console.log(`Name: ${newUser.name}`);
        console.log(`Email: ${newUser.email}`);
        console.log(`Role: ${newUser.role}`);
      }
    } else {
      // Handle MongoDB mode
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      
      if (existingUser) {
        console.log('\n⚠️ A user with this email already exists.');
        const updateConfirm = await promptUser('Do you want to update this user? (y/n): ');
        
        if (updateConfirm.toLowerCase() === 'y') {
          existingUser.name = name;
          existingUser.role = role;
          
          // Update password if it's different
          if (password && password.length >= 8) {
            existingUser.password = password;
          }
          
          await existingUser.save();
          console.log(`\n✅ User ${email} has been updated.`);
        } else {
          console.log('\nUser creation cancelled.');
        }
      } else {
        // Create a new user
        const user = await User.create({
          name,
          email,
          password,
          role
        });
        
        console.log(`\n✅ User created successfully:`);
        console.log('----------------------------------');
        console.log(`Name: ${user.name}`);
        console.log(`Email: ${user.email}`);
        console.log(`Role: ${user.role}`);
      }
    }
    
  } catch (error) {
    console.error('Error creating dashboard user:', error);
  } finally {
    rl.close();
    if (!dbConfig.memory) {
      await mongoose.disconnect();
    }
  }
};

createDashboardUser(); 