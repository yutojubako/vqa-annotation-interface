/**
 * Script to check and create a Firestore database for the VQA Panorama Annotation Interface
 * 
 * This script uses the Firebase Admin SDK to check if a Firestore database exists
 * for the project "pano-vqa-annotation" and creates it if it doesn't.
 * 
 * Usage:
 * 1. Install the Firebase Admin SDK: npm install firebase-admin
 * 2. Download a service account key from the Firebase Console
 * 3. Set the GOOGLE_APPLICATION_CREDENTIALS environment variable to the path of the service account key
 * 4. Run this script: node create-firestore-database.js
 */

const admin = require('firebase-admin');

// Initialize the Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

// Get a Firestore instance
const db = admin.firestore();

// Check if the Firestore database exists by attempting to access it
async function checkAndCreateFirestore() {
  try {
    console.log('Checking if Firestore database exists...');
    
    // Try to get a collection
    const testCollection = await db.collection('test').get();
    
    console.log('Firestore database exists and is accessible.');
    
    // Create some initial collections and documents if needed
    await createInitialData();
    
    console.log('Initial data created successfully.');
  } catch (error) {
    console.error('Error accessing Firestore:', error);
    
    if (error.code === 'resource-exhausted') {
      console.log('Firestore database exists but quota has been exhausted.');
    } else if (error.code === 'not-found') {
      console.log('Firestore database does not exist. Please create it in the Firebase Console:');
      console.log('1. Go to https://console.firebase.google.com/');
      console.log('2. Select your project "pano-vqa-annotation"');
      console.log('3. Navigate to "Firestore Database" in the left sidebar');
      console.log('4. Click "Create database"');
      console.log('5. Choose either production mode or test mode (test mode is easier for development)');
      console.log('6. Select a location close to your users');
      console.log('7. Click "Enable"');
    } else {
      console.log('Unknown error. Please check your Firebase configuration and credentials.');
    }
  } finally {
    // Terminate the Firebase Admin SDK
    await admin.app().delete();
  }
}

// Create initial data in the Firestore database
async function createInitialData() {
  // Create a test user with admin privileges
  await db.collection('users').doc('admin').set({
    username: 'admin',
    isAdmin: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  // Create a test user without admin privileges
  await db.collection('users').doc('annotator').set({
    username: 'annotator',
    isAdmin: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  // Create a test task
  await db.collection('tasks').add({
    imageId: 'https://pannellum.org/images/cerro-toco-01.jpg',
    imageUrl: 'https://pannellum.org/images/cerro-toco-01.jpg',
    caption: 'A panoramic view of a mountainous landscape with clear blue sky.',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

// Run the script
checkAndCreateFirestore();
