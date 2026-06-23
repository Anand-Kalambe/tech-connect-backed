const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  authorUsername: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
    maxlength: 500,
  },
}, { timestamps: true });

const PostSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  authorUsername: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    default: '',
    maxlength: 1000,
  },
  image: {
    type: String,
    default: '',
  },
  likes: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      username: { type: String },
    }
  ],
  comments: [CommentSchema],
}, { timestamps: true });

module.exports = mongoose.model('Post', PostSchema);
