# Firebase Integration Fix

This document explains how to fix the issue where "Next Image" and "Save Progress" buttons don't work properly and data isn't being sent to Firebase database in the VQA Panorama Annotation Interface.

## Problem

The main issues identified:

1. **Script Loading Conflict**: Both `firebase-integration.js` and `api.js` were loaded in the HTML files, with `api.js` overriding the Firebase implementation.
2. **Missing Firestore Database**: The Firestore database doesn't exist for the project "pano-vqa-annotation".
3. **Authentication Conflict**: Both `auth.js` and `firebase-integration.js` were trying to handle authentication.

## Solution

### 1. Fixed Script Loading Order

The `api.js` script has been commented out in both `index.html` and `admin.html` to prevent it from overriding the Firebase implementation:

```html
<!-- <script src="js/api.js"></script> -->
```

This ensures that only the Firebase implementation in `firebase-integration.js` is used.

### 2. Created Script to Check and Create Firestore Database

A new script `create-firestore-database.js` has been created to check if the Firestore database exists and create it if it doesn't. To use this script:

1. Install the Firebase Admin SDK:
   ```bash
   npm install firebase-admin
   ```

2. Download a service account key from the Firebase Console:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project "pano-vqa-annotation"
   - Go to Project Settings > Service accounts
   - Click "Generate new private key"
   - Save the JSON file securely

3. Set the environment variable to the path of the service account key:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your-service-account-key.json"
   ```

4. Run the script:
   ```bash
   node create-firestore-database.js
   ```

If the script indicates that the Firestore database doesn't exist, follow the instructions to create it manually in the Firebase Console.

### 3. Manual Firestore Database Creation

If you prefer to create the Firestore database manually:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project "pano-vqa-annotation"
3. Navigate to "Firestore Database" in the left sidebar
4. Click "Create database"
5. Choose either production mode or test mode (test mode is easier for development)
6. Select a location close to your users
7. Click "Enable"

## Testing

After making these changes, you should test the application to ensure that:

1. Users can log in without errors
2. Annotations can be saved and retrieved
3. The progress counter shows the correct number of annotated images
4. The "Next Image" and "Save Progress" buttons work properly

## Additional Notes

- The Firebase API key in `firebase-config.js` is valid, but you may want to restrict its usage in the Firebase Console to prevent unauthorized use.
- If you continue to experience issues, you can check the browser console for error messages.
- The application has a fallback mechanism to use localStorage if Firestore is not available, but this is not recommended for production use.
