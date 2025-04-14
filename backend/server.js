/**
 * Example backend server for VQA Panorama Annotation Interface
 * This demonstrates how to save annotations to a MongoDB database
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static('../frontend'));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vqa-annotations', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Define schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const answerSchema = new mongoose.Schema({
  questionId: String,
  question: String,
  answer: String,
  attribute: String,
  confidence: { type: Number, min: 1, max: 5, default: 3 }
});

const annotationSchema = new mongoose.Schema({
  imageId: { type: String, required: true },
  imageUrl: { type: String, required: true },
  caption: String,
  answers: [answerSchema],
  isComplete: { type: Boolean, default: false },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastUpdated: { type: Date, default: Date.now }
});

// Create models
const User = mongoose.model('User', userSchema);
const Annotation = mongoose.model('Annotation', annotationSchema);

// Create default users if they don't exist
async function createDefaultUsers() {
  try {
    const adminExists = await User.findOne({ username: 'admin' });
    if (!adminExists) {
      await User.create({
        username: 'admin',
        password: 'admin123', // In production, hash this password
        isAdmin: true
      });
      console.log('Default admin user created');
    }

    const annotatorExists = await User.findOne({ username: 'annotator' });
    if (!annotatorExists) {
      await User.create({
        username: 'annotator',
        password: 'anno123', // In production, hash this password
        isAdmin: false
      });
      console.log('Default annotator user created');
    }
  } catch (error) {
    console.error('Error creating default users:', error);
  }
}

createDefaultUsers();

// API Routes

// Authentication
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Find user (in production, use proper password hashing)
    const user = await User.findOne({ username });
    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // In production, use JWT tokens
    res.json({
      user: {
        id: user._id,
        username: user.username,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get tasks for annotation
app.get('/api/tasks', async (req, res) => {
  try {
    // In a real app, you would load tasks from your database or files
    // This is just a placeholder
    res.json({ tasks: [] });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Save annotation
app.post('/api/annotations', async (req, res) => {
  try {
    const { imageId, imageUrl, caption, answers, isComplete, userId } = req.body;
    
    // Find existing annotation or create new one
    let annotation = await Annotation.findOne({ imageId, userId });
    
    if (annotation) {
      // Update existing annotation
      annotation.answers = answers;
      annotation.isComplete = isComplete;
      annotation.lastUpdated = Date.now();
      await annotation.save();
    } else {
      // Create new annotation
      annotation = new Annotation({
        imageId,
        imageUrl,
        caption,
        answers,
        isComplete,
        userId
      });
      await annotation.save();
    }
    
    res.json({ success: true, annotation });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get annotation for an image
app.get('/api/annotations/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;
    const { userId } = req.query;
    
    const annotation = await Annotation.findOne({ imageId, userId });
    
    if (!annotation) {
      return res.status(404).json({ message: 'Annotation not found' });
    }
    
    res.json({ annotation });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get progress
app.get('/api/progress', async (req, res) => {
  try {
    const { userId } = req.query;
    
    const total = await Annotation.countDocuments();
    const completed = await Annotation.countDocuments({ userId, isComplete: true });
    const inProgress = await Annotation.countDocuments({ userId, isComplete: false });
    
    res.json({ total, completed, inProgress });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Export annotations
app.get('/api/export', async (req, res) => {
  try {
    // Only allow admins to export (in production, add proper authentication)
    const annotations = await Annotation.find().populate('userId', 'username');
    
    res.json(annotations);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin dashboard data
app.get('/api/admin/dashboard', async (req, res) => {
  try {
    // Only allow admins (in production, add proper authentication)
    const totalImages = await Annotation.countDocuments();
    const completedImages = await Annotation.countDocuments({ isComplete: true });
    const inProgressImages = await Annotation.countDocuments({ isComplete: false });
    
    const userCount = await User.countDocuments();
    const activeUsers = await Annotation.distinct('userId');
    
    res.json({
      totalImages,
      completedImages,
      inProgressImages,
      userCount,
      activeUserCount: activeUsers.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
