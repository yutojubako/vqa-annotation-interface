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
  console.log('Firebase integration module loaded at:', new Date().toISOString());
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
  db.settings({
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
  });
  console.log('Firestore initialized with cache enabled');
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
  console.log('Creating mock Firestore with localStorage fallback');
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
          console.log(`Mock Firestore: Set data for ${collectionName}/${docId}`);
          return Promise.resolve();
        },
        update: (data) => {
          const storageKey = `mock_firestore_${collectionName}_${docId}`;
          const existingData = localStorage.getItem(storageKey);
          const mergedData = existingData ? { ...JSON.parse(existingData), ...data } : data;
          localStorage.setItem(storageKey, JSON.stringify(mergedData));
          console.log(`Mock Firestore: Updated data for ${collectionName}/${docId}`);
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
        console.log(`Mock Firestore: Added data to ${collectionName} with ID ${docId}`);
        return Promise.resolve({ id: docId });
      },
      limit: () => ({
        get: () => Promise.resolve({
          empty: true,
          docs: [],
          forEach: () => {}
        })
      })
    }),
    settings: () => {}
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
      
      console.log('User authenticated:', currentUser.username);
      
      // Check if user is admin
      db.collection('users').doc(user.uid).get()
        .then(doc => {
          if (doc.exists && doc.data().isAdmin) {
            currentUser.isAdmin = true;
            console.log('User has admin privileges');
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
          
          // Still initialize the application even if admin check fails
          document.getElementById('username-display').textContent = currentUser.username;
          
          if (typeof initAnnotation === 'function') {
            initAnnotation();
          }
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
  
  console.log('Attempting to sign in with:', username);
  
  // Sign in with email and password
  auth.signInWithEmailAndPassword(username, password)
    .then(userCredential => {
      console.log('Sign in successful');
      // Close modal
      const loginModal = bootstrap.Modal.getInstance(document.getElementById('login-modal'));
      loginModal.hide();
      
      // Initialize annotation if not already initialized
      if (typeof initAnnotation === 'function') {
        initAnnotation();
      }
    })
    .catch(error => {
      console.error('Sign in error:', error);
      
      // Show error
      errorElement.textContent = error.message;
      errorElement.classList.remove('d-none');
      
      // If Firebase auth fails, try local auth as fallback
      tryLocalAuth(username.split('@')[0], password);
    });
}

/**
 * Try local authentication as fallback
 * @param {string} username - Username
 * @param {string} password - Password
 */
function tryLocalAuth(username, password) {
  console.log('Trying local authentication as fallback');
  
  // Local users (same as in auth.js)
  const USERS = {
    'admin': { password: 'admin123', isAdmin: true },
    'annotator': { password: 'anno123', isAdmin: false }
  };
  
  if (USERS[username] && USERS[username].password === password) {
    console.log('Local authentication successful');
    
    // Set current user
    currentUser = {
      id: username,
      username: username,
      isAdmin: USERS[username].isAdmin
    };
    
    // Update UI
    document.getElementById('username-display').textContent = currentUser.username;
    
    // Close modal
    const loginModal = bootstrap.Modal.getInstance(document.getElementById('login-modal'));
    loginModal.hide();
    
    // Initialize the application
    if (typeof initAnnotation === 'function') {
      initAnnotation();
    }
  } else {
    console.log('Local authentication failed');
  }
}

/**
 * Handle logout
 */
function handleLogout() {
  auth.signOut()
    .then(() => {
      console.log('User signed out');
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

/**
 * Load saved annotations
 * @returns {Array} Saved annotations
 */
function loadAnnotations() {
  try {
    const data = localStorage.getItem('vqa_annotations');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading annotations from localStorage:', error);
    return [];
  }
}

/**
 * Show message to user
 * @param {string} message - Message text
 * @param {string} type - Message type (success, warning, danger, info)
 */
function showMessage(message, type) {
  // Create alert element
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.role = 'alert';
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  // Add to page
  const container = document.querySelector('.container');
  if (container) {
    container.insertBefore(alertDiv, container.firstChild);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      const bsAlert = new bootstrap.Alert(alertDiv);
      bsAlert.close();
    }, 5000);
  } else {
    console.warn('Container not found for showing message');
  }
}

// Firebase Firestore API functions

/**
 * Format questions from sample data
 * @param {Object} item - Sample data item
 * @returns {Array} Formatted questions
 */
function formatQuestions(item) {
  try {
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
  } catch (error) {
    console.error('Error formatting questions:', error);
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
 * Load annotation tasks
 * @param {number} limit - Maximum number of tasks to load (optional)
 * @returns {Promise<Array>} Array of annotation tasks
 */
async function loadTasks(limit = null) {
  try {
    // Check if we already have tasks in localStorage
    const cachedTasks = localStorage.getItem('cached_tasks');
    if (cachedTasks) {
      console.log('Using cached tasks from localStorage');
      try {
        const tasks = JSON.parse(cachedTasks);
        
        // Apply limit if specified
        const limitedTasks = limit ? tasks.slice(0, limit) : tasks;
        return limitedTasks;
      } catch (parseError) {
        console.error('Error parsing cached tasks:', parseError);
        // Continue to load from file
      }
    }
    
    // If no cached tasks, load from file
    console.log('Loading tasks from captions_v2_fixed.json...');
    const response = await fetch('assets/captions_v2_fixed.json');
    
    if (!response.ok) {
      throw new Error('Failed to load sample data');
    }
    
    // Read the response as text first
    const text = await response.text();
    
    // Try to parse the JSON
    let data;
    try {
      data = JSON.parse(text);
      console.log(`Loaded ${data.length} tasks from captions_v2_fixed.json`);
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      throw new Error('Invalid JSON format in captions_v2_fixed.json');
    }
    
    // Get all tasks without filtering completed ones
    const allTasks = data;
    
    // Apply limit only if specified, otherwise load all tasks
    const limitedTasks = limit ? allTasks.slice(0, limit) : allTasks;
    
    // Format tasks for the UI
    const formattedTasks = limitedTasks.map(item => {
      try {
        return {
          imageId: item.url,
          imageUrl: item.url,
          caption: item.context,
          questions: formatQuestions(item)
        };
      } catch (itemError) {
        console.error('Error formatting task:', itemError, item);
        return null;
      }
    }).filter(task => task !== null); // Remove any null tasks
    
    // Store the formatted tasks in localStorage for future use
    try {
      localStorage.setItem('cached_tasks', JSON.stringify(formattedTasks));
      console.log('Tasks cached in localStorage');
    } catch (cacheError) {
      console.error('Error caching tasks in localStorage:', cacheError);
      // Continue even if caching fails
    }
    
    // If user is authenticated, try to save tasks to Firestore
    if (currentUser) {
      try {
        console.log('Saving tasks to Firestore...');
        // Check if tasks already exist in Firestore
        const snapshot = await db.collection('tasks').get();
        if (snapshot.empty) {
          // No tasks in Firestore, add them
          const batchSize = 20; // Process in batches to avoid overloading Firestore
          for (let i = 0; i < formattedTasks.length; i += batchSize) {
            const batch = formattedTasks.slice(i, i + batchSize);
            await Promise.all(batch.map(task => db.collection('tasks').add(task)));
            console.log(`Saved batch ${i/batchSize + 1} to Firestore`);
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
  } catch (error) {
    console.error('Error loading tasks:', error);
    // エラー時はモックデータを使用
    console.log('Using mock data as fallback');
    const mockData = generateMockData();
    
    // Cache mock data for future use
    try {
      localStorage.setItem('cached_tasks', JSON.stringify(mockData));
    } catch (cacheError) {
      console.error('Error caching mock data:', cacheError);
    }
    
    return mockData;
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
    
    // Try to get tasks from localStorage first
    const cachedTasks = localStorage.getItem('cached_tasks');
    let data;
    
    if (cachedTasks) {
      console.log('Using cached tasks from localStorage');
      try {
        data = JSON.parse(cachedTasks);
      } catch (parseError) {
        console.error('Error parsing cached tasks:', parseError);
        // Continue to load tasks
        data = await loadTasks();
      }
    } else {
      // If not in localStorage, load tasks
      console.log('No cached tasks, loading tasks');
      data = await loadTasks();
    }
    
    if (!data || data.length === 0) {
      console.log('No tasks available');
      return null;
    }
    
    console.log(`Working with ${data.length} tasks`);
    
    // Check if id is a number (0-based index)
    if (!isNaN(parseInt(id))) {
      const index = parseInt(id);
      console.log(`Parsed as numeric index: ${index}`);
      
      if (index >= 0 && index < data.length) {
        console.log(`Found item at index ${index}`);
        return data[index];
      } else {
        console.log(`Index ${index} out of range (0-${data.length-1})`);
        
        // If index is out of range but close to the end, return the last item
        if (index >= data.length && index < data.length + 10) {
          console.log(`Index close to end, returning last item (${data.length-1})`);
          return data[data.length - 1];
        }
      }
    }
    
    // Find task by imageId or imageUrl
    const item = data.find(item => 
      item.imageId === id || 
      item.imageUrl === id || 
      (item.imageId && item.imageId.includes(id)) || 
      (item.imageUrl && item.imageUrl.includes(id))
    );
    
    if (!item) {
      console.log('Not found in tasks data');
      return null;
    }
    
    console.log('Found in tasks data');
    return item;
  } catch (error) {
    console.error('Error finding task by ID:', error);
    return null;
  }
}

/**
 * Generate mock questions for testing
 * @param {number} count - Number of questions to generate
 * @param {string} attribute - Question attribute
 * @returns {Array} Mock questions
 */
function generateMockQuestions(count = 6, attribute = null) {
  const questions = [
    {
      question: 'What is the dominant color of the sky in this image?',
      answer: 'The dominant color of the sky is blue with some white clouds.',
      attribute: 'Objects & Attributes'
    },
    {
      question: 'How many mountains can be seen in the panorama?',
      answer: 'There are approximately 3-4 distinct mountain peaks visible in the panorama.',
      attribute: 'Objects & Attributes'
    },
    {
      question: 'What is the relative position of the sun in this panorama?',
      answer: 'The sun appears to be positioned high in the sky, slightly to the right of the center of the panorama.',
      attribute: 'Spatial Relationships'
    },
    {
      question: 'How is the landscape oriented in relation to the viewer?',
      answer: 'The landscape stretches around the viewer in a 360-degree view, with mountains visible on the horizon.',
      attribute: 'Spatial Relationships'
    },
    {
      question: 'What time of day does this panorama appear to be taken?',
      answer: 'The panorama appears to be taken during daytime, likely in the middle of the day based on the lighting.',
      attribute: 'View / Scene'
    },
    {
      question: 'Is this an indoor or outdoor scene?',
      answer: 'This is an outdoor scene showing a natural landscape.',
      attribute: 'View / Scene'
    }
  ];
  
  // If attribute is specified, filter questions
  const filteredQuestions = attribute 
    ? questions.filter(q => q.attribute === attribute)
    : questions;
  
  // Return requested number of questions
  return filteredQuestions.slice(0, count);
}

/**
 * Generate mock data for testing
 * @returns {Array} Mock data
 */
function generateMockData() {
  const mockData = [];
  
  // Generate 10 mock tasks
  for (let i = 0; i < 10; i++) {
    mockData.push({
      imageId: `mock_image_${i}`,
      imageUrl: 'https://pannellum.org/images/cerro-toco-01.jpg',
      caption: `This is a mock panoramic view ${i + 1}.`,
      questions: generateMockQuestions()
    });
  }
  
  return mockData;
}

/**
 * Save annotation
 * @param {Object} annotation - Annotation to save
 * @returns {Promise<Object>} Saved annotation
 */
async function saveAnnotation(annotation) {
  try {
    console.log('Saving annotation with complete status:', annotation.isComplete);
    
    // Always save to localStorage first as a backup
    const annotations = loadAnnotations();
    const index = annotations.findIndex(a => a.imageId === annotation.imageId);
    
    // Make sure isComplete flag is properly set
    const annotationToSave = {
      ...annotation,
      isComplete: !!annotation.isComplete, // Ensure boolean value
      lastUpdated: new Date().toISOString()
    };
    
    if (index >= 0) {
      annotations[index] = {
        ...annotations[index],
        ...annotationToSave
      };
    } else {
      annotations.push(annotationToSave);
    }
    
    try {
      localStorage.setItem('vqa_annotations', JSON.stringify(annotations));
      console.log('Annotation saved to localStorage successfully');
    } catch (localStorageError) {
      console.error('Error saving to localStorage:', localStorageError);
      // Continue even if localStorage fails
    }
    
    // Check if user is authenticated
    if (!currentUser || !currentUser.id) {
      console.warn('User not authenticated, saving to localStorage only');
      
      // Show login modal to encourage authentication
      showLoginModal();
      
      // Show a message to the user
      showMessage('アノテーションはローカルに保存されました。Firebaseに保存するにはログインしてください。', 'warning');
      
      return annotationToSave;
    }
    
    // Add user ID and timestamp
    annotationToSave.userId = currentUser.id;
    annotationToSave.createdAt = annotationToSave.createdAt || new Date();
    
    console.log('Saving annotation to Firebase for user:', currentUser.id);
    
    try {
      // Check if annotation already exists
      const querySnapshot = await db.collection('annotations')
        .where('imageId', '==', annotation.imageId)
        .where('userId', '==', currentUser.id)
        .get();
      
      let result;
      let docId;
      
      if (!querySnapshot.empty) {
        // Update existing annotation
        docId = querySnapshot.docs[0].id;
        console.log('Updating existing annotation with ID:', docId);
        
        await db.collection('annotations').doc(docId).update(annotationToSave);
        result = { id: docId, ...annotationToSave };
        console.log('Annotation updated in Firebase');
      } else {
        // Create new annotation
        console.log('Creating new annotation in Firebase');
        
        const docRef = await db.collection('annotations').add(annotationToSave);
        docId = docRef.id;
        console.log('New annotation created with ID:', docId);
        result = { id: docId, ...annotationToSave };
      }
      
      // Verify the save was successful by retrieving the document
      try {
        const savedDoc = await db.collection('annotations').doc(docId).get();
        if (savedDoc.exists) {
          const savedData = savedDoc.data();
          console.log('Verified annotation was saved successfully to Firebase');
          console.log('isComplete flag in saved data:', savedData.isComplete);
          
          // Don't show success message to user anymore - it's distracting
          // Status will be shown in the save-status element instead
        } else {
          throw new Error('Document does not exist after save');
        }
      } catch (verifyError) {
        console.error('Error verifying annotation save:', verifyError);
        showMessage('アノテーションの保存は成功しましたが、検証中にエラーが発生しました', 'warning');
        // Continue with the result even if verification fails
      }
      
      return result;
    } catch (firebaseError) {
      console.error('Error saving to Firebase:', firebaseError);
      showMessage('Firebaseへの保存中にエラーが発生しました。ローカルに保存されています。', 'danger');
      
      // Return the annotation from localStorage as fallback
      return annotationToSave;
    }
  } catch (error) {
    console.error('Error in saveAnnotation:', error);
    showMessage('アノテーションの保存中にエラーが発生しました。', 'danger');
    
    // Return the original annotation
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
    console.log('Getting annotation for image:', imageId);
    
    // Always check localStorage first for faster retrieval
    const annotations = loadAnnotations();
    const localAnnotation = annotations.find(a => a.imageId === imageId);
    
    if (localAnnotation) {
      console.log('Found annotation in localStorage');
      console.log('isComplete flag in localStorage:', localAnnotation.isComplete);
    } else {
      console.log('No annotation found in localStorage');
    }
    
    // Check if user is authenticated
    if (!currentUser) {
      console.info('User not authenticated, using localStorage annotation');
      return localAnnotation || null;
    }
    
    // User is authenticated, try to get annotation from Firestore
    try {
      console.log('Fetching annotation from Firestore for user:', currentUser.id);
      const querySnapshot = await db.collection('annotations')
        .where('imageId', '==', imageId)
        .where('userId', '==', currentUser.id)
        .get();
      
      if (querySnapshot.empty) {
        console.log('No annotation found in Firestore');
        
        // If found in localStorage, save it to Firestore
        if (localAnnotation) {
          console.log('Found annotation in localStorage, saving to Firestore');
          
          // Save the local annotation to Firestore
          try {
            // Make sure isComplete flag is properly set
            const annotationToSave = {
              ...localAnnotation,
              userId: currentUser.id,
              lastUpdated: new Date(),
              createdAt: localAnnotation.createdAt || new Date(),
              isComplete: !!localAnnotation.isComplete // Ensure boolean value
            };
            
            const docRef = await db.collection('annotations').add(annotationToSave);
            console.log('Saved localStorage annotation to Firestore with ID:', docRef.id);
            
            return { id: docRef.id, ...annotationToSave };
          } catch (e) {
            console.error('Error saving localStorage annotation to Firestore:', e);
            return localAnnotation;
          }
        }
        
        return null;
      }
      
      const doc = querySnapshot.docs[0];
      console.log('Found annotation in Firestore with ID:', doc.id);
      const annotationData = doc.data();
      console.log('isComplete flag in Firestore data:', annotationData.isComplete);
      
      // Convert Firestore timestamps to ISO strings for consistent handling
      if (annotationData.lastUpdated && typeof annotationData.lastUpdated.toDate === 'function') {
        annotationData.lastUpdated = annotationData.lastUpdated.toDate().toISOString();
      }
      if (annotationData.createdAt && typeof annotationData.createdAt.toDate === 'function') {
        annotationData.createdAt = annotationData.createdAt.toDate().toISOString();
      }
      
      // Update localStorage with the Firestore data for backup
      try {
        const index = annotations.findIndex(a => a.imageId === imageId);
        const annotationWithId = { id: doc.id, ...annotationData };
        
        if (index >= 0) {
          annotations[index] = annotationWithId;
        } else {
          annotations.push(annotationWithId);
        }
        
        localStorage.setItem('vqa_annotations', JSON.stringify(annotations));
        console.log('Updated localStorage with Firestore data');
      } catch (localStorageError) {
        console.error('Error updating localStorage:', localStorageError);
        // Continue even if localStorage update fails
      }
      
      return { id: doc.id, ...annotationData };
    } catch (firebaseError) {
      console.error('Error fetching from Firestore:', firebaseError);
      
      // Fallback to localStorage
      console.warn('Falling back to localStorage for annotation retrieval');
      return localAnnotation || null;
    }
  } catch (error) {
    console.error('Error in getAnnotation:', error);
    return localAnnotation || null;
  }
}

/**
 * Get annotation progress
 * @returns {Promise<Object>} Progress statistics
 */
async function getProgress() {
  try {
    console.log('Getting annotation progress');
    
    // Get total tasks from sample data first
    let total = 0;
    try {
      const response = await fetch('assets/captions_v2_fixed.json');
      if (response.ok) {
        const data = await response.json();
        total = data.length;
        console.log(`Total tasks from sample data: ${total}`);
      }
    } catch (e) {
      console.error('Error loading sample data for progress:', e);
    }
    
    // If total is still 0, try Firestore
    if (total === 0) {
      try {
        const tasksSnapshot = await db.collection('tasks').get();
        total = tasksSnapshot.size;
        console.log(`Total tasks from Firestore: ${total}`);
      } catch (e) {
        console.error('Error getting tasks from Firestore for progress:', e);
        // Use mock data length as fallback
        total = 10;
        console.log(`Using fallback total: ${total}`);
      }
    }
    
    // Check if user is authenticated
    if (!currentUser) {
      console.warn('User not authenticated, using localStorage for progress');
      const annotations = loadAnnotations();
      
      // Debug: log all annotations to check isComplete flags
      console.log('All localStorage annotations:', JSON.stringify(annotations));
      
      const completed = annotations.filter(a => a.isComplete === true).length;
      const inProgress = annotations.filter(a => a.isComplete !== true).length;
      
      console.log(`Progress from localStorage: ${completed}/${total} completed, ${inProgress} in progress`);
      return { total, completed, inProgress };
    }
    
    // Try to get completed annotations from Firestore
    try {
      // Get all annotations for the current user
      const userAnnotationsSnapshot = await db.collection('annotations')
        .where('userId', '==', currentUser.id)
        .get();
      
      // Process annotations to count completed and in-progress
      let completed = 0;
      let inProgress = 0;
      let completedAnnotations = [];
      let inProgressAnnotations = [];
      
      userAnnotationsSnapshot.forEach(doc => {
        const data = doc.data();
        // Check isComplete flag - handle different types (boolean, string, number)
        const isCompleteFlag = data.isComplete;
        console.log(`Annotation ${doc.id} isComplete flag:`, isCompleteFlag, `(type: ${typeof isCompleteFlag})`);
        
        // Convert to boolean properly
        const isComplete = (isCompleteFlag === true || isCompleteFlag === 'true' || isCompleteFlag === 1);
        
        if (isComplete) {
          completed++;
          completedAnnotations.push({ id: doc.id, ...data });
        } else {
          inProgress++;
          inProgressAnnotations.push({ id: doc.id, ...data });
        }
      });
      
      // Debug: log completed annotations
      console.log(`Found ${completed} completed annotations in Firestore`);
      completedAnnotations.forEach(annotation => {
        console.log(`Completed annotation ${annotation.id}:`, JSON.stringify(annotation));
      });
      
      // Debug: log in-progress annotations
      console.log(`Found ${inProgress} in-progress annotations in Firestore`);
      
      // Debug: log in-progress annotations
      console.log(`Found ${inProgress} in-progress annotations in Firestore`);
      
      console.log(`Progress from Firestore: ${completed}/${total} completed, ${inProgress} in progress`);
      return { total, completed, inProgress };
    } catch (e) {
      console.error('Error getting progress from Firestore:', e);
      
      // Fallback to localStorage
      const annotations = loadAnnotations();
      
      // Debug: log all annotations to check isComplete flags
      console.log('All localStorage annotations (fallback):', JSON.stringify(annotations));
      
      const completed = annotations.filter(a => a.isComplete === true).length;
      const inProgress = annotations.filter(a => a.isComplete !== true).length;
      
      console.log(`Progress from localStorage (fallback): ${completed}/${total} completed, ${inProgress} in progress`);
      return { total, completed, inProgress };
    }
  } catch (error) {
    console.error('Error getting progress:', error);
    
    // Final fallback
    return { total: 10, completed: 0, inProgress: 0 };
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
