/**
 * Firebase Integration for VQA Panorama Annotation Interface
 * This module provides authentication and data storage using Firebase
 * 
 * Setup:
 * 1. Create a Firebase project at https://console.firebase.google.com/
 * 2. Enable Authentication and Firestore
 * 3. Add a web app to your project and get the configuration
 * 4. Replace the firebaseConfig below with your configuration
 * 5. Include the Firebase SDK in your HTML:
 *    <script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js"></script>
 *    <script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js"></script>
 *    <script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js"></script>
 * 6. Include this file in your HTML:
 *    <script src="js/firebase-integration.js"></script>
 * 7. Replace api.js with this file or modify api.js to use these functions
 */

// Firebase configuration is loaded from firebase-config.js
// This file should be included before firebase-integration.js in your HTML

// Check if firebaseConfig is defined
if (typeof firebaseConfig === 'undefined') {
  console.error('Firebase configuration is missing. Make sure firebase-config.js is included before firebase-integration.js');
  // Create a default empty config to prevent errors
  firebaseConfig = {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  };
}

// Initialize Firebase
try {
  firebase.initializeApp(firebaseConfig);
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase:', error);
}

// Get Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Current user
let currentUser = null;

/**
 * Initialize Firebase authentication
 */
function initFirebaseAuth() {
  // Listen for auth state changes
  auth.onAuthStateChanged(user => {
    if (user) {
      // User is signed in
      currentUser = {
        id: user.uid,
        username: user.displayName || user.email,
        isAdmin: false // You'll need to store admin status in Firestore
      };
      
      // Check if user is admin
      db.collection('users').doc(user.uid).get()
        .then(doc => {
          if (doc.exists && doc.data().isAdmin) {
            currentUser.isAdmin = true;
          }
          
          // Update UI
          document.getElementById('username-display').textContent = currentUser.username;
          
          // Initialize the application
          if (typeof initAnnotation === 'function') {
            initAnnotation();
          }
        })
        .catch(error => {
          console.error('Error checking admin status:', error);
        });
    } else {
      // User is signed out
      currentUser = null;
      showLoginModal();
    }
  });
}

/**
 * Show login modal
 */
function showLoginModal() {
  const loginModal = new bootstrap.Modal(document.getElementById('login-modal'), {
    backdrop: 'static',
    keyboard: false
  });
  loginModal.show();
}

/**
 * Handle login form submission
 * @param {Event} e - Form submit event
 */
function handleLogin(e) {
  e.preventDefault();
  
  let username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const errorElement = document.getElementById('login-error');
  
  // Clear previous errors
  errorElement.classList.add('d-none');
  
  // Convert username to email format if it doesn't contain '@'
  if (!username.includes('@')) {
    username = `${username}@example.com`;
  }
  
  // Sign in with email and password
  auth.signInWithEmailAndPassword(username, password)
    .then(userCredential => {
      // Close modal
      const loginModal = bootstrap.Modal.getInstance(document.getElementById('login-modal'));
      loginModal.hide();
    })
    .catch(error => {
      // Show error
      errorElement.textContent = error.message;
      errorElement.classList.remove('d-none');
    });
}

/**
 * Handle logout
 */
function handleLogout() {
  auth.signOut()
    .then(() => {
      // Show login modal
      showLoginModal();
    })
    .catch(error => {
      console.error('Error signing out:', error);
    });
}

/**
 * Check if current user is admin
 * @returns {boolean} True if admin, false otherwise
 */
function isAdmin() {
  return currentUser && currentUser.isAdmin;
}

/**
 * Get current username
 * @returns {string|null} Username or null if not authenticated
 */
function getUsername() {
  return currentUser ? currentUser.username : null;
}

// Firebase Firestore API functions

/**
 * Load annotation tasks
 * @param {number} limit - Maximum number of tasks to load
 * @returns {Promise<Array>} Array of annotation tasks
 */
async function loadTasks(limit = 10) {
  try {
    // Get tasks from Firestore
    const snapshot = await db.collection('tasks').limit(limit).get();
    
    // Get user's progress
    const annotationsSnapshot = await db.collection('annotations')
      .where('userId', '==', currentUser.id)
      .where('isComplete', '==', true)
      .get();
    
    const completedImageIds = annotationsSnapshot.docs.map(doc => doc.data().imageId);
    
    // Filter out completed tasks
    const tasks = [];
    snapshot.forEach(doc => {
      const task = doc.data();
      if (!completedImageIds.includes(task.imageId)) {
        tasks.push({
          id: doc.id,
          ...task
        });
      }
    });
    
    return tasks;
  } catch (error) {
    console.error('Error loading tasks:', error);
    // Fallback to mock data
    return generateMockData();
  }
}

/**
 * Save annotation
 * @param {Object} annotation - Annotation to save
 * @returns {Promise<Object>} Saved annotation
 */
async function saveAnnotation(annotation) {
  try {
    // Add user ID
    annotation.userId = currentUser.id;
    
    // Check if annotation already exists
    const querySnapshot = await db.collection('annotations')
      .where('imageId', '==', annotation.imageId)
      .where('userId', '==', currentUser.id)
      .get();
    
    if (!querySnapshot.empty) {
      // Update existing annotation
      const docId = querySnapshot.docs[0].id;
      annotation.lastUpdated = new Date();
      await db.collection('annotations').doc(docId).update(annotation);
      return { id: docId, ...annotation };
    } else {
      // Create new annotation
      annotation.lastUpdated = new Date();
      const docRef = await db.collection('annotations').add(annotation);
      return { id: docRef.id, ...annotation };
    }
  } catch (error) {
    console.error('Error saving annotation:', error);
    
    // Fallback to localStorage
    const annotations = loadAnnotations();
    const index = annotations.findIndex(a => a.imageId === annotation.imageId);
    
    if (index >= 0) {
      annotations[index] = {
        ...annotations[index],
        ...annotation,
        lastUpdated: new Date().toISOString()
      };
    } else {
      annotations.push({
        ...annotation,
        lastUpdated: new Date().toISOString()
      });
    }
    
    localStorage.setItem('vqa_annotations', JSON.stringify(annotations));
    return annotation;
  }
}

/**
 * Get annotation for an image
 * @param {string} imageId - Image ID
 * @returns {Promise<Object|null>} Annotation or null if not found
 */
async function getAnnotation(imageId) {
  try {
    const querySnapshot = await db.collection('annotations')
      .where('imageId', '==', imageId)
      .where('userId', '==', currentUser.id)
      .get();
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error('Error getting annotation:', error);
    
    // Fallback to localStorage
    const annotations = loadAnnotations();
    return annotations.find(a => a.imageId === imageId) || null;
  }
}

/**
 * Get annotation progress
 * @returns {Promise<Object>} Progress statistics
 */
async function getProgress() {
  try {
    // Get total tasks
    const tasksSnapshot = await db.collection('tasks').get();
    const total = tasksSnapshot.size;
    
    // Get completed annotations
    const completedSnapshot = await db.collection('annotations')
      .where('userId', '==', currentUser.id)
      .where('isComplete', '==', true)
      .get();
    const completed = completedSnapshot.size;
    
    // Get in-progress annotations
    const inProgressSnapshot = await db.collection('annotations')
      .where('userId', '==', currentUser.id)
      .where('isComplete', '==', false)
      .get();
    const inProgress = inProgressSnapshot.size;
    
    return { total, completed, inProgress };
  } catch (error) {
    console.error('Error getting progress:', error);
    
    // Fallback to localStorage
    const annotations = loadAnnotations();
    const completedCount = annotations.filter(a => a.isComplete).length;
    const inProgressCount = annotations.filter(a => !a.isComplete).length;
    
    return {
      total: completedCount + inProgressCount,
      completed: completedCount,
      inProgress: inProgressCount
    };
  }
}

/**
 * Export annotations
 * @returns {Promise<Array>} All annotations
 */
async function exportAnnotations() {
  try {
    // Only allow admins to export all annotations
    if (!currentUser.isAdmin) {
      // For non-admins, only export their own annotations
      const querySnapshot = await db.collection('annotations')
        .where('userId', '==', currentUser.id)
        .get();
      
      const annotations = [];
      querySnapshot.forEach(doc => {
        annotations.push({ id: doc.id, ...doc.data() });
      });
      
      return annotations;
    }
    
    // For admins, export all annotations
    const querySnapshot = await db.collection('annotations').get();
    
    const annotations = [];
    querySnapshot.forEach(doc => {
      annotations.push({ id: doc.id, ...doc.data() });
    });
    
    return annotations;
  } catch (error) {
    console.error('Error exporting annotations:', error);
    
    // Fallback to localStorage
    return loadAnnotations();
  }
}

/**
 * Get admin dashboard data
 * @returns {Promise<Object>} Dashboard data
 */
async function getDashboardData() {
  try {
    // Only allow admins
    if (!currentUser.isAdmin) {
      throw new Error('Unauthorized');
    }
    
    // Get total tasks
    const tasksSnapshot = await db.collection('tasks').get();
    const totalImages = tasksSnapshot.size;
    
    // Get completed annotations
    const completedSnapshot = await db.collection('annotations')
      .where('isComplete', '==', true)
      .get();
    const completedImages = completedSnapshot.size;
    
    // Get in-progress annotations
    const inProgressSnapshot = await db.collection('annotations')
      .where('isComplete', '==', false)
      .get();
    const inProgressImages = inProgressSnapshot.size;
    
    // Get user count
    const usersSnapshot = await db.collection('users').get();
    const userCount = usersSnapshot.size;
    
    // Get active users
    const activeUsersSnapshot = await db.collection('annotations')
      .get();
    const activeUsers = new Set();
    activeUsersSnapshot.forEach(doc => {
      activeUsers.add(doc.data().userId);
    });
    
    return {
      totalImages,
      completedImages,
      inProgressImages,
      userCount,
      activeUserCount: activeUsers.size
    };
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    
    // Fallback to localStorage
    const annotations = loadAnnotations();
    const completedCount = annotations.filter(a => a.isComplete).length;
    const inProgressCount = annotations.filter(a => !a.isComplete).length;
    
    return {
      totalImages: completedCount + inProgressCount,
      completedImages: completedCount,
      inProgressImages: inProgressCount,
      userCount: 1,
      activeUserCount: 1
    };
  }
}

// Helper functions

/**
 * Load saved annotations from localStorage (fallback)
 * @returns {Array} Saved annotations
 */
function loadAnnotations() {
  const data = localStorage.getItem('vqa_annotations');
  return data ? JSON.parse(data) : [];
}

/**
 * Generate mock data for testing
 * @returns {Array} Mock data
 */
function generateMockData() {
  // Same implementation as in api.js
  const mockData = [];
  
  // Generate 10 mock items
  for (let i = 1; i <= 10; i++) {
    mockData.push({
      imageId: `image_${i}`,
      imageUrl: `https://pannellum.org/images/cerro-toco-0${i % 5 + 1}.jpg`,
      caption: `This is a panoramic view of a landscape with mountains, sky, and various natural features. Sample image ${i}.`,
      questions: [
        {
          id: `q1_${i}`,
          question: 'What is the dominant color of the sky in this panorama?',
          attribute: 'Objects & Attributes'
        },
        {
          id: `q2_${i}`,
          question: 'How many mountains can be seen in the panorama?',
          attribute: 'Objects & Attributes'
        },
        {
          id: `q3_${i}`,
          question: 'What is the relative position of the sun in this panorama?',
          attribute: 'Spatial Relationships'
        },
        {
          id: `q4_${i}`,
          question: 'How is the landscape oriented in relation to the viewer?',
          attribute: 'Spatial Relationships'
        },
        {
          id: `q5_${i}`,
          question: 'What time of day does this panorama appear to be taken?',
          attribute: 'View / Scene'
        },
        {
          id: `q6_${i}`,
          question: 'Is this an indoor or outdoor scene?',
          attribute: 'View / Scene'
        }
      ]
    });
  }
  
  return mockData;
}

// Initialize Firebase auth on page load
document.addEventListener('DOMContentLoaded', () => {
  // Set up event listeners
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  
  // Initialize Firebase auth
  initFirebaseAuth();
});
