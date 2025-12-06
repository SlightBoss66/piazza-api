const express = require("express");
const auth = require("../middleware/auth");
const Post = require("../models/Post");

const router = express.Router();


const ALLOWED_TOPICS = ["Politics", "Health", "Sport", "Tech"];


router.post("/", auth, async (req, res) => {
  try {
    const { title, message, topic, expirationMinutes } = req.body;

    if (!title || !message || !topic || !expirationMinutes) {
      return res.status(400).json({ error: "Missing required fields" });
    }


    let topics = Array.isArray(topic) ? topic : [topic];
    topics = topics.filter((t) => ALLOWED_TOPICS.includes(t));
    if (!topics.length) {
      return res.status(400).json({ error: "Invalid topic(s)" });
    }

    const minutes = Number(expirationMinutes);
    if (isNaN(minutes) || minutes <= 0) {
      return res.status(400).json({ error: "expirationMinutes must be a positive number" });
    }

    const expirationAt = new Date(Date.now() + minutes * 60 * 1000);

    const post = new Post({
      title,
      message,
      topic: topics,
      expirationAt,
      owner: req.user._id,
      ownerName: req.user.username
    });

    await post.save();
    res.status(201).json(post);
  } catch (err) {
    console.error("Create post error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


router.get("/topic/:topic", auth, async (req, res) => {
  try {
    const topic = req.params.topic;
    if (!ALLOWED_TOPICS.includes(topic)) {
      return res.status(400).json({ error: "Invalid topic" });
    }

    const status = req.query.status;
    let posts = await Post.find({ topic }).sort({ timestamp: 1 });

    if (status === "Live") {
      posts = posts.filter((p) => p.status === "Live");
    } else if (status === "Expired") {
      posts = posts.filter((p) => p.status === "Expired");
    }

    res.json(posts);
  } catch (err) {
    console.error("List posts error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/expired/:topic", auth, async (req, res) => {
  try {
    const topic = req.params.topic;
    if (!ALLOWED_TOPICS.includes(topic)) {
      return res.status(400).json({ error: "Invalid topic" });
    }

    const now = Date.now();
    const posts = await Post.find({
      topic,
      expirationAt: { $lte: new Date(now) }
    }).sort({ timestamp: 1 });

    res.json(posts);
  } catch (err) {
    console.error("Expired posts error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/active/highest-interest", auth, async (req, res) => {
  try {
    const topic = req.query.topic;
    if (!ALLOWED_TOPICS.includes(topic)) {
      return res.status(400).json({ error: "Invalid topic" });
    }

    const now = new Date();
    const posts = await Post.find({
      topic,
      expirationAt: { $gt: now }
    });

    if (!posts.length) {
      return res.status(404).json({ error: "No active posts for this topic" });
    }

    let best = posts[0];
    for (const p of posts) {
      const scoreP = p.likes + p.dislikes;
      const scoreBest = best.likes + best.dislikes;
      if (scoreP > scoreBest) best = p;
    }

    res.json(best);
  } catch (err) {
    console.error("Highest interest post error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;