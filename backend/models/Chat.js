const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      index: true
    },
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true
    },
    content: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index for efficient session queries
chatSchema.index({ sessionId: 1, createdAt: 1 });

module.exports = mongoose.model('Chat', chatSchema);