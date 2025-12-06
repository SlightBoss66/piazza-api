const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  username: String,
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const PostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  topic: {
    type: [String],
    required: true,
    enum: ["Politics", "Health", "Sport", "Tech"]
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  expirationAt: {
    type: Date,
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  ownerName: {
    type: String,
    required: true
  },
  likes: {
    type: Number,
    default: 0
  },
  dislikes: {
    type: Number,
    default: 0
  },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  dislikedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  comments: [CommentSchema]
});

PostSchema.virtual("status").get(function () {
  return Date.now() > this.expirationAt.getTime() ? "Expired" : "Live";
});

PostSchema.virtual("timeLeftSeconds").get(function () {
  const diff = this.expirationAt.getTime() - Date.now();
  return diff > 0 ? Math.floor(diff / 1000) : 0;
});

PostSchema.set("toJSON", { virtuals: true });
PostSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Post", PostSchema);