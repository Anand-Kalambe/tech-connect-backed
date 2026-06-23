const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const authMiddleware = require('../middleware/auth');

// ── GET /api/users/search  —  Search users by username ──────────────
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    // Case-insensitive regex search for username
    const users = await User.find({
      username: { $regex: q, $options: 'i' }
    })
      .select('username avatar bio')
      .limit(10)
      .lean();

    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /api/users/:username  —  public profile + posts ──────────────
router.get('/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('-password');

    if (!user) return res.status(404).json({ message: 'User not found' });

    const posts = await Post.find({ author: user._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      user: {
        _id:            user._id,
        username:       user.username,
        bio:            user.bio,
        avatar:         user.avatar,
        followersCount: user.followers.length,
        followingCount: user.following.length,
        followers:      user.followers,   // array of IDs
        following:      user.following,   // array of IDs
        createdAt:      user.createdAt,
      },
      posts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── POST /api/users/:userId/follow  —  follow / unfollow toggle ───────
router.post('/:userId/follow', authMiddleware, async (req, res) => {
  try {
    const targetId = req.params.userId;
    const myId     = req.user.id;

    if (targetId === myId) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    const [target, me] = await Promise.all([
      User.findById(targetId),
      User.findById(myId),
    ]);

    if (!target || !me) return res.status(404).json({ message: 'User not found' });

    const alreadyFollowing = target.followers.some(id => id.toString() === myId);

    if (alreadyFollowing) {
      // Unfollow
      target.followers = target.followers.filter(id => id.toString() !== myId);
      me.following     = me.following.filter(id => id.toString() !== targetId);
    } else {
      // Follow
      target.followers.push(myId);
      me.following.push(targetId);
    }

    await Promise.all([target.save(), me.save()]);

    res.json({
      following:      !alreadyFollowing,
      followersCount: target.followers.length,
      followingCount: me.following.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
