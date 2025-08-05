const mongoose = require('mongoose');

const shareLinkSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
  },
  file: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  expiresAt: {
    type: Date,
    default: null,
  },
  accessCount: {
    type: Number,
    default: 0,
  },
  maxAccess: {
    type: Number,
    default: null,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('ShareLink', shareLinkSchema);