const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the user
 *         name:
 *           type: string
 *           description: User's full name
 *         email:
 *           type: string
 *           description: User's email address
 *         password:
 *           type: string
 *           description: User's password (hashed)
 *         role:
 *           type: string
 *           enum: [admin, manager, viewer]
 *           description: User's role for access control
 *         active:
 *           type: boolean
 *           description: Whether the user account is active
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the user was created
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'User must have a name'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'User must have an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address'
      ]
    },
    password: {
      type: String,
      required: [true, 'User must have a password'],
      minlength: 8,
      select: false
    },
    role: {
      type: String,
      enum: {
        values: ['admin', 'manager', 'viewer'],
        message: 'Role must be either: admin, manager, or viewer'
      },
      default: 'viewer'
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Create index for faster queries
userSchema.index({ email: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it's modified (or new)
  if (!this.isModified('password')) return next();
  
  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);
  
  next();
});

// Check if password is correct
userSchema.methods.correctPassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if the user has the required role
userSchema.methods.hasRole = function(role) {
  // Admin role has all privileges
  if (this.role === 'admin') return true;
  
  // Manager role has manager and viewer privileges
  if (this.role === 'manager' && (role === 'manager' || role === 'viewer')) {
    return true;
  }
  
  // Viewer role has only viewer privileges
  return this.role === role;
};

const User = mongoose.model('User', userSchema);

module.exports = User; 