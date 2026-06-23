const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// ── GET /api/messages/conversations  —  List recent chats ───────────
router.get('/conversations', authMiddleware, async (req, res) => {
  try {
    const myId = req.user.id;

    // Find all messages involving the current user
    const messages = await Message.find({
      $or: [{ sender: myId }, { receiver: myId }],
    })
      .sort({ createdAt: -1 })
      .populate('sender', 'username avatar')
      .populate('receiver', 'username avatar');

    // Group by conversation partner
    const convosMap = new Map();

    messages.forEach((msg) => {
      // Determine the 'other' user in the conversation
      const isSender = msg.sender._id.toString() === myId;
      const otherUser = isSender ? msg.receiver : msg.sender;
      
      // If otherUser is somehow null, skip
      if (!otherUser) return;

      const otherId = otherUser._id.toString();

      if (!convosMap.has(otherId)) {
        convosMap.set(otherId, {
          user: {
            _id: otherUser._id,
            username: otherUser.username,
            avatar: otherUser.avatar,
          },
          lastMessage: msg.content,
          time: msg.createdAt,
          unreadCount: (!isSender && !msg.read) ? 1 : 0,
        });
      } else {
        // Just increment unread count if applicable
        if (!isSender && !msg.read) {
          convosMap.get(otherId).unreadCount += 1;
        }
      }
    });

    const conversations = Array.from(convosMap.values());
    res.json(conversations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /api/messages/:userId  —  Get chat history with user ────────
router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const myId = req.user.id;
    const otherId = req.params.userId;

    const messages = await Message.find({
      $or: [
        { sender: myId, receiver: otherId },
        { sender: otherId, receiver: myId },
      ],
    })
      .sort({ createdAt: 1 })
      .populate('sender', 'username')
      .populate('receiver', 'username');

    // Mark messages from the other user as read
    const unreadMessages = messages.filter(
      (m) => m.sender._id.toString() === otherId && !m.read
    );

    if (unreadMessages.length > 0) {
      await Message.updateMany(
        { _id: { $in: unreadMessages.map(m => m._id) } },
        { $set: { read: true } }
      );
    }

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── POST /api/messages/:userId  —  Send a message ───────────────────
router.post('/:userId', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    const myId = req.user.id;
    const otherId = req.params.userId;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const newMessage = new Message({
      sender: myId,
      receiver: otherId,
      content: content.trim(),
    });

    await newMessage.save();

    const populatedMsg = await Message.findById(newMessage._id)
      .populate('sender', 'username')
      .populate('receiver', 'username');

    res.status(201).json(populatedMsg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
