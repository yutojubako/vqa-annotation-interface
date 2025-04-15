/**
 * Authentication module for VQA Panorama Annotation Interface
 * Handles user login, session management, and access control
 */

// Configuration
const AUTH_KEY = 'vqa_auth';
const USERS = {
  // Default users (in a real app, this would be server-side)
  'admin': { password: 'admin123', isAdmin: true },
  'annotator': { password: 'anno123', isAdmin: false }
};

// Current authenticated user (renamed to avoid conflict with firebase-integration.js)
let localCurrentUser = null;

/**
 * Initialize authentication on page load
 */
function initAuth() {
  // Check if user is already logged in
  checkAuth();
  
  // Set up event listeners
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if authenticated, false otherwise
 */
function checkAuth() {
  const authData = localStorage.getItem(AUTH_KEY);
  
  if (!authData) {
    showLoginModal();
    return false;
  }
  
  try {
    // Parse stored auth data
    const userData = JSON.parse(authData);
    
    // Check if token is expired (in a real app, this would validate a JWT)
    if (userData.expires && userData.expires < Date.now()) {
      handleLogout();
      return false;
    }
    
    // Set current user
    localCurrentUser = {
      username: userData.username,
      isAdmin: userData.isAdmin
    };
    
    // Update UI
    document.getElementById('username-display').textContent = localCurrentUser.username;
    return true;
  } catch (error) {
    console.error('Error parsing auth data:', error);
    handleLogout();
    return false;
  }
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
  
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const errorElement = document.getElementById('login-error');
  
  // Clear previous errors
  errorElement.classList.add('d-none');
  
  // Validate credentials (in a real app, this would be a server request)
  if (!USERS[username] || USERS[username].password !== password) {
    errorElement.textContent = 'Invalid username or password';
    errorElement.classList.remove('d-none');
    return;
  }
  
  // Set auth data
  const authData = {
    username: username,
    isAdmin: USERS[username].isAdmin,
    expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  };
  
  // Store auth data
  localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
  
  // Set current user
  localCurrentUser = {
    username: username,
    isAdmin: USERS[username].isAdmin
  };
  
  // Update UI
  document.getElementById('username-display').textContent = localCurrentUser.username;
  
  // Close modal
  const loginModal = bootstrap.Modal.getInstance(document.getElementById('login-modal'));
  loginModal.hide();
  
  // Initialize the application
  if (typeof initAnnotation === 'function') {
    initAnnotation();
  }
}

/**
 * Handle logout
 */
function handleLogout() {
  // Clear auth data
  localStorage.removeItem(AUTH_KEY);
  
  // Clear current user
  localCurrentUser = null;
  
  // Show login modal
  showLoginModal();
}

/**
 * Check if current user is admin
 * @returns {boolean} True if admin, false otherwise
 */
function isAdmin() {
  return localCurrentUser && localCurrentUser.isAdmin;
}

/**
 * Get current username
 * @returns {string|null} Username or null if not authenticated
 */
function getUsername() {
  return localCurrentUser ? localCurrentUser.username : null;
}

// Initialize authentication on page load
document.addEventListener('DOMContentLoaded', initAuth);
