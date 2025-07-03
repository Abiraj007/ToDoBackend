const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 8080;
const MONGOURL = process.env.MONGOURL;

app.use(express.json());
app.use(cors());

// ✅ MongoDB Connection
mongoose
  .connect(MONGOURL)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection failed:", err.message));

// ✅ User Schema & Model
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});
const User = mongoose.model("User", userSchema);

// ✅ Task Schema & Model
const taskSchema = new mongoose.Schema({
  text: String,
  status: String,
  priority: String,
  userId: String,
});
const Task = mongoose.model("Task", taskSchema);

// ✅ Register Endpoint
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hashed });
  await user.save();
  res.json({ message: "User has been registered" });
});

// ✅ Login Endpoint
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: "Invalid Credentials" });
  }
  const token = jwt.sign({ userId: user._id }, "secret", { expiresIn: "1h" });
  res.json({ token });
});

// ✅ Auth Middleware
const authMiddleware = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "No token" });

  try {
    const decode = jwt.verify(token, "secret");
    req.userId = decode.userId;
    next();
  } catch (e) {
    res.status(401).json({ message: "Invalid Token" });
  }
};

// ✅ Get Tasks
app.get("/tasks", authMiddleware, async (req, res) => {
  const tasks = await Task.find({ userId: req.userId });
  res.json(tasks);
});

// ✅ Create Task
app.post("/tasks", authMiddleware, async (req, res) => {
  const task = new Task({ ...req.body, userId: req.userId });
  await task.save();
  res.json(task);
});

// ✅ Delete Task
app.delete("/tasks/:id", authMiddleware, async (req, res) => {
  await Task.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  res.json({ message: "Task deleted" });
});

// ✅ Update Task Status
app.patch("/tasks/:id/status", authMiddleware, async (req, res) => {
  const { status } = req.body;
  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { status },
    { new: true }
  );
  if (!task) return res.status(404).json({ message: "Task not Found" });
  res.json(task);
});

// ✅ Update Task Priority
app.patch("/tasks/:id/priority", authMiddleware, async (req, res) => {
  const { priority } = req.body;
  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { priority },
    { new: true }
  );
  if (!task) return res.status(404).json({ message: "Task not Found" });
  res.json(task);
});

// ✅ Start Server
app.listen(PORT, () =>
  console.log(`You're code is running buddy at : ${PORT} 🚀`)
);
