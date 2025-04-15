# VQA Panorama Annotation Interface

A web-based interface for annotating panoramic images with Visual Question Answering (VQA) data. This tool allows annotators to view 360-degree panoramic images and answer questions about them, with support for different question categories and confidence ratings.

## Recent Updates

### Fixed Issues Between Local and GitHub Pages Environments

We've addressed several issues that were causing differences in behavior between local and GitHub Pages environments:

1. **Progress Display**: Fixed the issue where the progress bar showed "0/0 images annotated" when the user was not authenticated.
2. **Image Loading**: Modified the data loading strategy to always load from the local JSON file first, ensuring that images are always displayed correctly.
3. **Authentication Handling**: Improved handling of unauthenticated users to ensure the application works correctly even without Firebase authentication.

For more details, see [fix-progress-display.md](fix-progress-display.md).

## Features

- **Interactive Panorama Viewing**: Uses Pannellum for 360-degree panoramic image viewing
- **User Authentication**: Restricts access to authorized annotators
- **Progress Saving**: Automatically saves annotation progress
- **Admin Dashboard**: Allows administrators to monitor annotation progress and export results
- **Question Categories**: Organizes questions by visual attribute categories
- **Confidence Ratings**: Allows annotators to rate their confidence in answers
- **GitHub Pages Compatible**: Can be hosted on GitHub Pages for easy deployment

## Project Structure

```
vqa-interface/
├── frontend/                  # Frontend web application
│   ├── index.html             # Main annotation interface
│   ├── admin.html             # Admin dashboard
│   ├── css/                   # Stylesheets
│   │   └── styles.css         # Custom styles
│   ├── js/                    # JavaScript files
│   │   ├── annotation.js      # Annotation interface logic
│   │   ├── api.js             # API communication
│   │   └── auth.js            # Authentication logic
│   └── assets/                # Static assets
│       ├── loading.txt        # Base64 loading image
│       └── captions_v1.json   # Annotation data
└── backend/                   # Server-side code (optional)
    └── ...                    # Backend implementation
```

## Getting Started

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/vqa-interface.git
   cd vqa-interface
   ```

2. Run the interface using the provided script:
   ```bash
   # Start the annotation interface
   ./run.py
   
   # Or start the admin dashboard
   ./run.py --admin
   
   # Run without opening browser
   ./run.py --no-browser
   ```

3. The browser will automatically open to the interface. If it doesn't, navigate to:
   ```
   http://localhost:8000/
   ```

4. Login with the default credentials:
   - Regular user: `annotator` / `anno123`
   - Admin user: `admin` / `admin123`

### Accessing from Other Networks

The interface can be accessed from other devices on your network:

1. Run the server:
   ```bash
   ./run.py --no-browser
   ```

2. The script will display the local network URL:
   ```
   Starting server at:
     - Local:   http://localhost:8000
     - Network: http://192.168.1.100:8000
   ```

3. Other devices on the same network can access the interface using the Network URL.

### Data Storage

By default, all annotation data is stored in the browser's localStorage:

- This is a client-side storage mechanism that persists even when you close the browser
- You can view the saved data by opening your browser's developer tools (F12), going to the "Application" tab, and looking under "Local Storage"
- The data is stored under the key `vqa_annotations`
- You can export the data from the admin dashboard by clicking the "Export Results" button

For production use, you may want to implement a backend server for data storage as described in the "Backend Integration" section.

### Docker Deployment

1. Build and run using Docker Compose:
   ```bash
   docker-compose up -d
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:8000/
   ```

3. To stop the container:
   ```bash
   docker-compose down
   ```

### GitHub Pages Deployment

The repository includes a GitHub Actions workflow for automatic deployment to GitHub Pages:

1. Push the code to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/vqa-interface.git
   git push -u origin main
   ```

2. GitHub Actions will automatically deploy the frontend to GitHub Pages

3. Enable GitHub Pages in the repository settings:
   - Go to Settings > Pages
   - Source: Deploy from a branch
   - Branch: gh-pages

4. Your site will be available at:
   ```
   https://yourusername.github.io/vqa-interface/
   ```

For detailed instructions, see [github-pages-deployment.md](github-pages-deployment.md).

## Data Format

The annotation interface expects data in the following format:

```json
[
  {
    "url": "https://example.com/panorama1.jpg",
    "context": "Description or caption of the panoramic image",
    "generated_qa_pairs_by_attribute": {
      "Objects & Attributes": [
        {
          "question": "What is the dominant color in this image?",
          "answer": "The dominant color is blue.",
          "attribute": "Objects & Attributes"
        }
      ],
      "Spatial Relationships": [
        {
          "question": "Where is the mountain located relative to the lake?",
          "answer": "The mountain is behind the lake.",
          "attribute": "Spatial Relationships"
        }
      ]
    }
  }
]
```

## Converting WebDataset to Annotation Format

The interface can work with data generated from WebDataset format using the provided conversion script:

```bash
./convert_webdataset.py --data path/to/shard-{000000..000999}.tar --output frontend/assets/captions_v1.json
```

This will generate a JSON file that can be used with the annotation interface. The script supports several options:

```
usage: convert_webdataset.py [-h] --data DATA [--output OUTPUT] [--model MODEL] [--batch-size BATCH_SIZE]
                            [--samples SAMPLES] [--questions-per-attribute QUESTIONS_PER_ATTRIBUTE]
                            [--include-images] [--shuffle]

Convert WebDataset to VQA Annotation Interface format

options:
  -h, --help            show this help message and exit
  --data DATA           Path to the WebDataset (can be a pattern like path/to/shard-{000000..000999}.tar)
  --output OUTPUT       Path to save the results
  --model MODEL         OpenAI model to use
  --batch-size BATCH_SIZE
                        Batch size for API calls
  --samples SAMPLES     Number of samples to process (None for all)
  --questions-per-attribute QUESTIONS_PER_ATTRIBUTE
                        Number of questions to generate per attribute
  --include-images      Include image binary data in output
  --shuffle             Shuffle the dataset
```

After converting the data, you can run the annotation interface with:

```bash
./run.py
```

## Customization

### Adding New Question Categories

Edit the `VISUAL_ATTRIBUTES` array in the `pfqs_caption_webdataset_fixed.py` script to add new question categories:

```python
VISUAL_ATTRIBUTES = [
    "Objects & Attributes",
    "Spatial Relationships",
    "Text Rendering",
    "World Knowledge",
    "View / Scene",
    "Your New Category"  # Add your category here
]
```

### Modifying the Interface

The interface is built with standard web technologies:

- HTML/CSS for structure and styling
- JavaScript for interactivity
- Bootstrap 5 for UI components
- Pannellum for panorama viewing

You can modify these files to customize the interface to your needs.

## Backend Integration

The current implementation uses localStorage for data persistence by default, which is suitable for GitHub Pages hosting. However, several backend options are provided for production use:

### Option 1: Firebase Integration (Serverless)

For GitHub Pages deployment with proper authentication and data persistence, Firebase is an excellent option:

1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Authentication and Firestore
3. Add a web app to your project and get the configuration
4. Replace the Firebase configuration in `frontend/js/firebase-config.js`:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "your-project-id.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project-id.appspot.com",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```

5. Include the Firebase SDK in your HTML files (index.html and admin.html):
   ```html
   <script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js"></script>
   <script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js"></script>
   <script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js"></script>
   ```

6. Create users in the Firebase Authentication console or implement a registration form

This approach allows you to deploy to GitHub Pages while still having proper authentication and data persistence.

### Option 2: Express/MongoDB Backend

For a more traditional backend approach:

#### Running the Backend Server

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. The server will run at http://localhost:3000

### Using the Backend API

To use the backend API instead of localStorage:

1. Replace the `api.js` file with `api_with_backend.js`:
   ```bash
   cp frontend/js/api_with_backend.js frontend/js/api.js
   ```

2. Edit the `API_URL` in `frontend/js/api.js` to point to your backend server:
   ```javascript
   const API_URL = 'http://localhost:3000/api';
   ```

### Full Stack Deployment with Docker

The easiest way to run the complete application (frontend, backend, and database) is using Docker Compose:

1. Make sure Docker and Docker Compose are installed on your system

2. Build and start the containers:
   ```bash
   docker-compose up -d
   ```

3. Access the application:
   - Frontend: http://localhost:8000
   - Backend API: http://localhost:3000/api

4. Stop the containers:
   ```bash
   docker-compose down
   ```

### Backend API Endpoints

The backend provides the following API endpoints:

- `POST /api/auth/login` - Authenticate user
- `GET /api/tasks` - Get annotation tasks
- `POST /api/annotations` - Save annotation
- `GET /api/annotations/:imageId` - Get annotation for an image
- `GET /api/progress` - Get annotation progress
- `GET /api/export` - Export all annotations
- `GET /api/admin/dashboard` - Get admin dashboard data

## Troubleshooting

### Common Issues

1. **Firebase Authentication Issues**: If you're having trouble with Firebase authentication, check the browser console for error messages. Make sure your Firebase configuration is correct and that you've enabled the Email/Password authentication method in the Firebase Console.

2. **Images Not Loading**: If images are not loading, check the browser console for CORS errors. You may need to ensure that your image hosting service allows cross-origin requests.

3. **Progress Not Saving**: If your progress is not being saved, check that localStorage is available in your browser and that you have sufficient storage space.

4. **GitHub Pages Deployment Issues**: If your GitHub Pages deployment is not working correctly, check the GitHub Actions logs for error messages. Make sure your repository is set up correctly for GitHub Pages deployment.

### Fixing Issues Between Local and GitHub Pages Environments

If you encounter differences in behavior between local and GitHub Pages environments, see [fix-progress-display.md](fix-progress-display.md) for solutions to common issues.

## License

[MIT License](LICENSE)
