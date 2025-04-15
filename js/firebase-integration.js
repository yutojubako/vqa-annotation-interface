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
let db;

try {
  // Try to initialize Firestore
  db = firebase.firestore();
  
  // Disable offline persistence to avoid IndexedDB errors
  // and ensure data is always sent directly to Firebase
  console.log('Firestore initialized without offline persistence');
} catch (error) {
  console.error('Error initializing Firestore:', error);
  // Create a mock db object that will fall back to localStorage
  db = createMockFirestore();
}

/**
 * Create a mock Firestore object that uses localStorage
 * This is used as a fallback when Firestore is not available
 * @returns {Object} Mock Firestore object
 */
function createMockFirestore() {
  return {
    collection: (collectionName) => ({
      doc: (docId) => ({
        get: () => Promise.resolve({
          exists: false,
          data: () => null
        }),
        set: (data) => {
          const storageKey = `mock_firestore_${collectionName}_${docId}`;
          localStorage.setItem(storageKey, JSON.stringify(data));
          return Promise.resolve();
        },
        update: (data) => {
          const storageKey = `mock_firestore_${collectionName}_${docId}`;
          const existingData = localStorage.getItem(storageKey);
          const mergedData = existingData ? { ...JSON.parse(existingData), ...data } : data;
          localStorage.setItem(storageKey, JSON.stringify(mergedData));
          return Promise.resolve();
        }
      }),
      where: () => ({
        where: () => ({
          get: () => Promise.resolve({
            empty: true,
            docs: [],
            forEach: () => {}
          })
        }),
        get: () => Promise.resolve({
          empty: true,
          docs: [],
          forEach: () => {}
        }),
        limit: () => ({
          get: () => Promise.resolve({
            empty: true,
            docs: [],
            forEach: () => {}
          })
        })
      }),
      add: (data) => {
        const docId = Math.random().toString(36).substring(2, 15);
        const storageKey = `mock_firestore_${collectionName}_${docId}`;
        localStorage.setItem(storageKey, JSON.stringify(data));
        return Promise.resolve({ id: docId });
      },
      limit: () => ({
        get: () => Promise.resolve({
          empty: true,
          docs: [],
          forEach: () => {}
        })
      })
    })
  };
}

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
 * @param {number} limit - Maximum number of tasks to load (optional)
 * @returns {Promise<Array>} Array of annotation tasks
 */
async function loadTasks(limit = null) {
  try {
    // Always try to load from captions_v1.json first
    try {
      console.log('Loading tasks from captions_v1.json...');
      const response = await fetch('assets/captions_v1.json');
      if (!response.ok) throw new Error('Failed to load sample data');
      
      const data = await response.json();
      console.log(`Loaded ${data.length} tasks from captions_v1.json`);
      
      // Format tasks for the UI
      const formattedTasks = data.map(item => ({
        imageId: item.url,
        imageUrl: item.url,
        caption: item.context,
        questions: formatQuestions(item)
      }));
      
      // If user is authenticated, try to save tasks to Firestore
      if (currentUser) {
        try {
          console.log('Saving tasks to Firestore...');
          // Check if tasks already exist in Firestore
          const snapshot = await db.collection('tasks').get();
          if (snapshot.empty) {
            // No tasks in Firestore, add them
            for (const task of formattedTasks) {
              await db.collection('tasks').add(task);
            }
            console.log(`Saved ${formattedTasks.length} tasks to Firestore`);
          } else {
            console.log('Tasks already exist in Firestore, skipping save');
          }
        } catch (e) {
          console.error('Error saving tasks to Firestore:', e);
          // Continue with the loaded tasks even if saving fails
        }
      }
      
      return formattedTasks;
    } catch (e) {
      console.error('Error loading from captions_v1.json:', e);
      
      // If loading from captions_v1.json fails, try Firestore
      console.log('Trying to load tasks from Firestore...');
      const snapshot = await db.collection('tasks').get();
      
      // Get all tasks without filtering completed ones
      const tasks = [];
      snapshot.forEach(doc => {
        const task = doc.data();
        tasks.push({
          id: doc.id,
          ...task
        });
      });
      
      if (tasks.length > 0) {
        console.log(`Loaded ${tasks.length} tasks from Firestore`);
        return tasks;
      }
      
      // If no tasks in Firestore either, fall back to mock data
      console.log('No tasks found, using mock data');
      return generateMockData();
    }
  } catch (error) {
    console.error('Error in loadTasks:', error);
    // Final fallback to mock data
    console.log('Using mock data as final fallback');
    return generateMockData();
  }
}

/**
 * Find a task by ID, URL, or 0-based index
 * @param {string} id - Task ID, URL, or 0-based index
 * @returns {Promise<Object|null>} Task or null if not found
 */
async function findTaskById(id) {
  try {
    console.log(`Finding task with ID/index: ${id}`);
    
    // Check if id is a number (0-based index)
    if (!isNaN(parseInt(id))) {
      const index = parseInt(id);
      console.log(`Parsed as numeric index: ${index}`);
      
      // For numeric indices, try to load from captions_v1.json first
      try {
        console.log('Loading from captions_v1.json for numeric index...');
        const response = await fetch('assets/captions_v1.json');
        if (!response.ok) throw new Error('Failed to load sample data');
        
        const data = await response.json();
        console.log(`Loaded ${data.length} items from captions_v1.json`);
        
        // Check if index is within range
        if (index >= 0 && index < data.length) {
          console.log(`Found item at index ${index} in captions_v1.json`);
          const item = data[index];
          return {
            imageId: item.url,
            imageUrl: item.url,
            caption: item.context,
            questions: formatQuestions(item)
          };
        } else {
          console.log(`Index ${index} out of range (0-${data.length-1})`);
          
          // If index is out of range but close to the end, return the last item
          if (index >= data.length && index < data.length + 10) {
            console.log(`Index close to end, returning last item (${data.length-1})`);
            const item = data[data.length - 1];
            return {
              imageId: item.url,
              imageUrl: item.url,
              caption: item.context,
              questions: formatQuestions(item)
            };
          }
        }
      } catch (e) {
        console.error('Error loading from captions_v1.json:', e);
        // Continue to try other methods
      }
      
      // If captions_v1.json approach failed, try Firestore
      console.log('Trying to find task by index in Firestore...');
      const snapshot = await db.collection('tasks').get();
      const tasks = [];
      snapshot.forEach(doc => {
        tasks.push({ id: doc.id, ...doc.data() });
      });
      
      console.log(`Found ${tasks.length} tasks in Firestore`);
      
      // Return task at the specified index if it exists
      if (index >= 0 && index < tasks.length) {
        console.log(`Found task at index ${index} in Firestore`);
        return tasks[index];
      } else {
        console.log(`Index ${index} out of range in Firestore (0-${tasks.length-1})`);
      }
    }
    
    // If not an index or index not found, try to find by ID
    console.log('Trying to find task by ID in Firestore...');
    let snapshot = await db.collection('tasks').where('id', '==', id).get();
    
    // If not found, try to find by imageId
    if (snapshot.empty) {
      console.log('Not found by ID, trying imageId...');
      snapshot = await db.collection('tasks').where('imageId', '==', id).get();
    }
    
    // If still not found, try to find by imageUrl
    if (snapshot.empty) {
      console.log('Not found by imageId, trying imageUrl...');
      snapshot = await db.collection('tasks').where('imageUrl', '==', id).get();
    }
    
    // If still not found, try to find by partial URL match
    if (snapshot.empty) {
      console.log('Not found by exact URL, trying partial URL match...');
      snapshot = await db.collection('tasks').get();
      let task = null;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.imageUrl && data.imageUrl.includes(id)) {
          task = { id: doc.id, ...data };
        }
      });
      if (task) {
        console.log('Found by partial URL match');
        return task;
      }
    } else {
      // Return the first match if found
      console.log('Found in Firestore');
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    
    // If still not found, try to load from sample data
    console.log('Not found in Firestore, trying sample data...');
    try {
      const response = await fetch('assets/captions_v1.json');
      if (!response.ok) throw new Error('Failed to load sample data');
      
      const data = await response.json();
      console.log(`Loaded ${data.length} items from captions_v1.json for search`);
      
      const item = data.find(item => 
        item.url === id || 
        item.url.includes(id) || 
        (item.id && item.id === id)
      );
      
      if (!item) {
        console.log('Not found in sample data');
        return null;
      }
      
      console.log('Found in sample data');
      return {
        imageId: item.url,
        imageUrl: item.url,
        caption: item.context,
        questions: formatQuestions ? formatQuestions(item) : []
      };
    } catch (e) {
      console.error('Error finding task in sample data:', e);
      return null;
    }
  } catch (error) {
    console.error('Error finding task by ID:', error);
    return null;
  }
}

/**
 * Save annotation
 * @param {Object} annotation - Annotation to save
 * @returns {Promise<Object>} Saved annotation
 */
async function saveAnnotation(annotation) {
  try {
    // Check if user is authenticated
    if (!currentUser || !currentUser.id) {
      console.warn('User not authenticated, saving to localStorage only');
      
      // Show login modal to encourage authentication
      showLoginModal();
      
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
    
    // Add user ID and timestamp
    annotation.userId = currentUser.id;
    annotation.lastUpdated = new Date();
    annotation.createdAt = annotation.createdAt || new Date();
    
    console.log('Saving annotation to Firebase for user:', currentUser.id);
    console.log('Annotation data:', annotation);
    
    // Check if annotation already exists
    const querySnapshot = await db.collection('annotations')
      .where('imageId', '==', annotation.imageId)
      .where('userId', '==', currentUser.id)
      .get();
    
    let result;
    
    if (!querySnapshot.empty) {
      // Update existing annotation
      const docId = querySnapshot.docs[0].id;
      console.log('Updating existing annotation with ID:', docId);
      await db.collection('annotations').doc(docId).update(annotation);
      result = { id: docId, ...annotation };
    } else {
      // Create new annotation
      console.log('Creating new annotation in Firebase');
      const docRef = await db.collection('annotations').add(annotation);
      console.log('New annotation created with ID:', docRef.id);
      result = { id: docRef.id, ...annotation };
    }
    
    console.log('Annotation saved successfully to Firebase');
    
    // Also save to localStorage as a backup
    try {
      const annotations = loadAnnotations();
      const index = annotations.findIndex(a => a.imageId === annotation.imageId);
      
      if (index >= 0) {
        annotations[index] = { ...result };
      } else {
        annotations.push({ ...result });
      }
      
      localStorage.setItem('vqa_annotations', JSON.stringify(annotations));
      console.log('Annotation also saved to localStorage as backup');
    } catch (e) {
      console.warn('Failed to save backup to localStorage:', e);
    }
    
    return result;
  } catch (error) {
    console.error('Error saving annotation to Firebase:', error);
    
    // Fallback to localStorage
    console.warn('Falling back to localStorage for annotation storage');
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
    // Check if user is authenticated
    if (!currentUser) {
      console.info('User not authenticated, checking localStorage for annotations');
      // Try to get annotation from localStorage
      const annotations = loadAnnotations();
      const localAnnotation = annotations.find(a => a.imageId === imageId);
      
      if (localAnnotation) {
        console.log('Found annotation in localStorage:', localAnnotation);
        return localAnnotation;
      }
      
      console.info('No annotation found in localStorage');
      return null;
    }
    
    // User is authenticated, try to get annotation from Firestore
    console.log('Fetching annotation from Firestore for user:', currentUser.id);
    const querySnapshot = await db.collection('annotations')
      .where('imageId', '==', imageId)
      .where('userId', '==', currentUser.id)
      .get();
    
    if (querySnapshot.empty) {
      console.log('No annotation found in Firestore');
      
      // Check localStorage as fallback
      const annotations = loadAnnotations();
      const localAnnotation = annotations.find(a => a.imageId === imageId);
      
      if (localAnnotation) {
        console.log('Found annotation in localStorage, saving to Firestore');
        
        // Save the local annotation to Firestore
        try {
          localAnnotation.userId = currentUser.id;
          localAnnotation.lastUpdated = new Date();
          localAnnotation.createdAt = localAnnotation.createdAt || new Date();
          
          const docRef = await db.collection('annotations').add(localAnnotation);
          console.log('Saved localStorage annotation to Firestore with ID:', docRef.id);
          
          return { id: docRef.id, ...localAnnotation };
        } catch (e) {
          console.error('Error saving localStorage annotation to Firestore:', e);
          return localAnnotation;
        }
      }
      
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    console.log('Found annotation in Firestore with ID:', doc.id);
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error('Error getting annotation:', error);
    
    // Fallback to localStorage
    console.warn('Falling back to localStorage for annotation retrieval');
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
    // Get total tasks from Firestore
    let total = 0;
    try {
      const tasksSnapshot = await db.collection('tasks').get();
      total = tasksSnapshot.size;
      
      // If no tasks found in Firestore, try to load from sample data
      if (total === 0) {
        try {
          const response = await fetch('assets/captions_v1.json');
          if (response.ok) {
            const data = await response.json();
            total = data.length;
          }
        } catch (e) {
          console.error('Error loading sample data for progress:', e);
          // Use mock data length as fallback
          total = 10;
        }
      }
    } catch (e) {
      console.error('Error getting tasks for progress:', e);
      // Try to load from sample data
      try {
        const response = await fetch('assets/captions_v1.json');
        if (response.ok) {
          const data = await response.json();
          total = data.length;
        }
      } catch (e) {
        console.error('Error loading sample data for progress:', e);
        // Use mock data length as fallback
        total = 10;
      }
    }
    
    // Check if user is authenticated
    if (!currentUser) {
      console.warn('User not authenticated, returning progress with total only');
      return { total, completed: 0, inProgress: 0 };
    }
    
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
    
    // Try to get total from sample data
    let total = completedCount + inProgressCount;
    try {
      const response = await fetch('assets/captions_v1.json');
      if (response.ok) {
        const data = await response.json();
        total = data.length;
      }
    } catch (e) {
      console.error('Error loading sample data for progress fallback:', e);
      // If we can't get the total from sample data, use mock data length
      if (total === 0) {
        total = 10;
      }
    }
    
    return {
      total,
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
    // Check if user is authenticated
    if (!currentUser) {
      console.warn('User not authenticated, returning annotations from localStorage');
      return loadAnnotations();
    }
    
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
    // Check if user is authenticated
    if (!currentUser) {
      console.warn('User not authenticated, returning default dashboard data');
      return {
        totalImages: 0,
        completedImages: 0,
        inProgressImages: 0,
        userCount: 0,
        activeUserCount: 0
      };
    }
    
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
 * Format questions from sample data
 * @param {Object} item - Sample data item
 * @returns {Array} Formatted questions
 */
function formatQuestions(item) {
  // Check if we have questions by attribute
  if (item.generated_qa_pairs_by_attribute) {
    // Flatten questions from all attributes
    return Object.entries(item.generated_qa_pairs_by_attribute)
      .flatMap(([attribute, questions]) => 
        questions.map(q => ({
          id: generateQuestionId(q.question),
          question: q.question,
          attribute: attribute,
          suggestedAnswer: q.answer
        }))
      );
  } else if (item.generated_qa_pairs) {
    // Use flat list of questions
    return item.generated_qa_pairs.map(q => ({
      id: generateQuestionId(q.question),
      question: q.question,
      attribute: q.attribute || 'General',
      suggestedAnswer: q.answer
    }));
  } else {
    // No questions, generate mock ones
    return generateMockQuestions();
  }
}

/**
 * Generate a unique ID for a question
 * @param {string} question - Question text
 * @returns {string} Unique ID
 */
function generateQuestionId(question) {
  // Create a simple hash from the question text
  return question
    .substring(0, 20)
    .replace(/\W+/g, '_')
    .toLowerCase() + '_' + Math.random().toString(36).substring(2, 7);
}

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
  
  // ジャンプボタンのイベントリスナーを追加
  const jumpBtn = document.getElementById('jump-btn');
  if (jumpBtn) {
    jumpBtn.addEventListener('click', () => {
      const sampleId = document.getElementById('sample-id-input').value.trim();
      if (sampleId) {
        if (typeof jumpToSample === 'function') {
          jumpToSample(sampleId);
        } else {
          console.error('jumpToSample function not found');
        }
      }
    });
  }
  
  // Initialize Firebase auth
  initFirebaseAuth();
});
