const express = require("express");
const router = express.Router();

const Post = require("../models/Post");
const auth = require("../middleware/auth");

function isExpired(post) {
  if (!post) return true;

  if (typeof post.status === "string" &&
      post.status.toLowerCase() === "expired") {
    return true;
  }

  if (post.expirationAt) {
    const exp = new Date(post.expirationAt).getTime();
    const now = Date.now();
    if (!isNaN(exp) && exp <= now) {
      return true;
    }
  }

  return false;
}

function toUserIdString(user) {
  if (!user) return "";
  if (typeof user === "string") return user;
  if (user._id) return user._id.toString();
  if (user.id) return user.id.toString();
  return String(user);
}

function initInteractionFields(post) {
  if (typeof post.likes !== "number") post.likes = 0;
  if (typeof post.dislikes !== "number") post.dislikes = 0;

  if (!Array.isArray(post.likedBy)) post.likedBy = [];
  if (!Array.isArray(post.dislikedBy)) post.dislikedBy = [];
  if (!Array.isArray(post.comments)) post.comments = [];
}

router.post("/:postId/like", auth, async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = toUserIdString(req.user);

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (post.owner && toUserIdString(post.owner) === userId) {
      return res
        .status(400)
        .json({ error: "You cannot like your own post" });
    }

    if (isExpired(post)) {
      return res.status(400).json({ error: "Post is expired" });
    }

    initInteractionFields(post);

    const likedSet = new Set(post.likedBy.map(toUserIdString));
    const dislikedSet = new Set(post.dislikedBy.map(toUserIdString));

    if (likedSet.has(userId)) {
      return res.json(post);
    }

    post.likedBy.push(userId);
    post.likes += 1;

    if (dislikedSet.has(userId)) {
      post.dislikedBy = post.dislikedBy.filter(
        (id) => toUserIdString(id) !== userId
      );
      if (post.dislikes > 0) post.dislikes -= 1;
    }

    await post.save();
    return res.json(post);
  } catch (err) {
    console.error("Error in LIKE route:", err);
    return res.status(500).json({ error: "Server error" });
  }
});



router.post("/:postId/dislike", auth, async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = toUserIdString(req.user);

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (post.owner && toUserIdString(post.owner) === userId) {
      return res
        .status(400)
        .json({ error: "You cannot dislike your own post" });
    }

    if (isExpired(post)) {
      return res.status(400).json({ error: "Post is expired" });
    }

    initInteractionFields(post);

    const likedSet = new Set(post.likedBy.map(toUserIdString));
    const dislikedSet = new Set(post.dislikedBy.map(toUserIdString));

    if (dislikedSet.has(userId)) {
      return res.json(post);
    }

    post.dislikedBy.push(userId);
    post.dislikes += 1;

    if (likedSet.has(userId)) {
      post.likedBy = post.likedBy.filter(
        (id) => toUserIdString(id) !== userId
      );
      if (post.likes > 0) post.likes -= 1;
    }

    await post.save();
    return res.json(post);
  } catch (err) {
    console.error("Error in DISLIKE route:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/:postId/comment", auth, async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = toUserIdString(req.user);
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Comment text is required" });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (isExpired(post)) {
      return res.status(400).json({ error: "Post is expired" });
    }

    initInteractionFields(post);

    post.comments.push({
      user: userId,
      username: req.user.username || undefined,
      text: text.trim(),
      createdAt: new Date()
    });

    await post.save();
    return res.json(post);
  } catch (err) {
    console.error("Error in COMMENT route:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
