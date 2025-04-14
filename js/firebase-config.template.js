/**
 * Firebase Configuration Template
 * 
 * This is a template file for Firebase configuration.
 * DO NOT add your actual Firebase credentials to this file.
 * 
 * For local development:
 * 1. Copy this file to firebase-config.js
 * 2. Replace the placeholder values with your Firebase project credentials
 * 
 * For production:
 * The GitHub Actions workflow will generate the firebase-config.js file
 * using the secrets stored in the repository settings.
 */

// Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Export the configuration
// This allows firebase-integration.js to import it
if (typeof module !== 'undefined') {
  module.exports = { firebaseConfig };
}
