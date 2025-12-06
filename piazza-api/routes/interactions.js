const express = require("express");
const auth = require("../middleware/auth");
const Post = require("../models/Post");

const router = express.Router();

async function getPostOr404(postId, res) {
  try {
    const post = await Post.findById(postId);
    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return null;
    }
    return post;
  } catch (err) {
    console.error("Get post error:", err);
    res.status(400).json({ error: "Invalid post id" });
    return null;
  }
}

function ensureNotExpired(post, res) {
  if (post.status === "Expired") {
    res.status(400).json({ error: "Post is expired, no more interactions allowed" });
    return false;
  }
  return true;
}

router.post("/:postId/like", auth, async (req, res) => {
  const post = await getPostOr404(req.params.postId, res);
  if (!post) return;

  if (!ensureNotExpired(post, res)) return;

  if (post.owner.toString() === req.user._id.toString()) {
    return res.status(400).json({ error: "Owner cannot like their own post" });
  }

  if (!post.likedBy.includes(req.user._id)) {
    post.likedBy.push(req.user._id);
    post.likes = post.likedBy.length;

router.post("/:postId/dislike", auth, async (req, res) => {
  const post = await getPostOr404(req.params.postId, res);
  if (!post) return;

  if (!ensureNotExpired(post, res)) return;

router.post("/:postId/comment", auth, async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: "Comment text is required" });
  }

  const post = await getPostOr404(req.params.postId, res);
  if (!post) return;

  if (!ensureNotExpired(post, res)) return;

  post.comments.push({
    user: req.user._id,
    username: req.user.username,
    text: text.trim()
  });

  await post.save();
  res.json({
    message: "Comment added",
    post,
    timeLeftSeconds: post.timeLeftSeconds
  });
});

module.exports = router;
