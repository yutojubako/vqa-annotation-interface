/**
 * API module for VQA Panorama Annotation Interface
 * This version communicates with a backend server instead of using localStorage
 */

// Configuration
const API_URL = 'http://localhost:3000/api'; // Change this to your backend server URL

/**
 * Load annotation tasks
 * @param {number} limit - Maximum number of tasks to load
 * @returns {Promise<Array>} Array of annotation tasks
 */
async function loadTasks(limit = 10) {
  try {
    const response = await fetch(`${API_URL}/tasks?limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load tasks');
    }
    
    const data = await response.json();
    return data.tasks || [];
  } catch (error) {
    console.error('Error loading tasks:', error);
    // Fallback to mock data if server is unavailable
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
    // Add user ID from auth
    if (currentUser && currentUser.id) {
      annotation.userId = currentUser.id;
    }
    
    const response = await fetch(`${API_URL}/annotations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(annotation)
    });
    
    if (!response.ok) {
      throw new Error('Failed to save annotation');
    }
    
    const data = await response.json();
    return data.annotation;
  } catch (error) {
    console.error('Error saving annotation:', error);
    
    // Fallback to localStorage if server is unavailable
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
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(annotations));
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
    // Add user ID from auth
    let userId = '';
    if (currentUser && currentUser.id) {
      userId = `?userId=${currentUser.id}`;
    }
    
    const response = await fetch(`${API_URL}/annotations/${imageId}${userId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error('Failed to get annotation');
    }
    
    const data = await response.json();
    return data.annotation;
  } catch (error) {
    console.error('Error getting annotation:', error);
    
    // Fallback to localStorage if server is unavailable
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
    // Add user ID from auth
    let userId = '';
    if (currentUser && currentUser.id) {
      userId = `?userId=${currentUser.id}`;
    }
    
    const response = await fetch(`${API_URL}/progress${userId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to get progress');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting progress:', error);
    
    // Fallback to localStorage if server is unavailable
    const annotations = loadAnnotations();
    const total = annotations.length;
    const completed = annotations.filter(a => a.isComplete).length;
    const inProgress = annotations.filter(a => !a.isComplete).length;
    
    return { total, completed, inProgress };
  }
}

/**
 * Export annotations
 * @returns {Promise<Array>} All annotations
 */
async function exportAnnotations() {
  try {
    const response = await fetch(`${API_URL}/export`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to export annotations');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error exporting annotations:', error);
    
    // Fallback to localStorage if server is unavailable
    return loadAnnotations();
  }
}

/**
 * Get admin dashboard data
 * @returns {Promise<Object>} Dashboard data
 */
async function getDashboardData() {
  try {
    const response = await fetch(`${API_URL}/admin/dashboard`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to get dashboard data');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    
    // Fallback to localStorage if server is unavailable
    const annotations = loadAnnotations();
    const total = annotations.length;
    const completed = annotations.filter(a => a.isComplete).length;
    const inProgress = annotations.filter(a => !a.isComplete).length;
    
    return {
      totalImages: total,
      completedImages: completed,
      inProgressImages: inProgress,
      userCount: 1,
      activeUserCount: 1
    };
  }
}

// Fallback functions for localStorage

const STORAGE_KEY = 'vqa_annotations';
const SAMPLE_DATA_KEY = 'vqa_sample_data';

/**
 * Load saved annotations from localStorage
 * @returns {Array} Saved annotations
 */
function loadAnnotations() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

/**
 * Generate mock data for testing
 * @returns {Array} Mock data
 */
function generateMockData() {
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
