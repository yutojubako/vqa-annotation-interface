/**
 * API module for VQA Panorama Annotation Interface
 * Handles data loading, saving, and communication with the backend
 * 
 * Note: This implementation uses localStorage for persistence to work with GitHub Pages
 * In a production environment, this would communicate with a real backend API
 */

// Configuration
const STORAGE_KEY = 'vqa_annotations';
const SAMPLE_DATA_KEY = 'vqa_sample_data';

// Sample data URL - replace with your actual data source
const SAMPLE_DATA_URL = 'assets/captions_v1.json';

/**
 * Load annotation tasks
 * @param {number} limit - Maximum number of tasks to load (optional)
 * @returns {Promise<Array>} Array of annotation tasks
 */
async function loadTasks(limit = null) {
  try {
    // 直接ファイルから読み込み、localStorageには保存しない
    const response = await fetch(SAMPLE_DATA_URL);
    
    if (!response.ok) {
      throw new Error('Failed to load sample data');
    }
    
    // JSONとして直接解析
    const data = await response.json();
    
    // Get all tasks without filtering completed ones
    const allTasks = data;
    
    // Apply limit only if specified
    const limitedTasks = limit ? allTasks.slice(0, limit) : allTasks;
    
    // Format tasks for the UI
    return limitedTasks.map(item => ({
      imageId: item.url,
      imageUrl: item.url,
      caption: item.context,
      questions: formatQuestions(item)
    }));
  } catch (error) {
    console.error('Error loading tasks:', error);
    // エラー時はモックデータを使用
    const mockData = generateMockData();
    const limitedMockData = limit ? mockData.slice(0, limit) : mockData;
    return limitedMockData.map(item => ({
      imageId: item.url,
      imageUrl: item.url,
      caption: item.context,
      questions: formatQuestions(item)
    }));
  }
}

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
 * Load saved annotations
 * @returns {Array} Saved annotations
 */
function loadAnnotations() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

/**
 * Save annotation
 * @param {Object} annotation - Annotation to save
 * @returns {Promise<Object>} Saved annotation
 */
async function saveAnnotation(annotation) {
  // Get existing annotations
  const annotations = loadAnnotations();
  
  // Find existing annotation or add new one
  const index = annotations.findIndex(a => a.imageId === annotation.imageId);
  
  if (index >= 0) {
    // Update existing annotation
    annotations[index] = {
      ...annotations[index],
      ...annotation,
      lastUpdated: new Date().toISOString()
    };
  } else {
    // Add new annotation
    annotations.push({
      ...annotation,
      lastUpdated: new Date().toISOString()
    });
  }
  
  // Save annotations
  localStorage.setItem(STORAGE_KEY, JSON.stringify(annotations));
  
  // In a real app, this would be a POST/PUT to a backend API
  // Simulate async operation
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(annotation);
    }, 300);
  });
}

/**
 * Get annotation for an image
 * @param {string} imageId - Image ID
 * @returns {Promise<Object|null>} Annotation or null if not found
 */
async function getAnnotation(imageId) {
  // Get existing annotations
  const annotations = loadAnnotations();
  
  // Find annotation for image
  const annotation = annotations.find(a => a.imageId === imageId);
  
  // In a real app, this would be a GET to a backend API
  // Simulate async operation
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(annotation || null);
    }, 300);
  });
}

/**
 * Get annotation progress
 * @returns {Promise<Object>} Progress statistics
 */
async function getProgress() {
  try {
    // Get existing annotations
    const annotations = loadAnnotations();
    
    // Get total from sample data file
    let total = 0;
    try {
      const response = await fetch(SAMPLE_DATA_URL);
      if (response.ok) {
        const data = await response.json();
        total = data.length;
      }
    } catch (error) {
      console.error('Error loading sample data for progress:', error);
      // Fallback to mock data length
      total = 10; // Default mock data length
    }
    
    // Calculate progress
    const completed = annotations.filter(a => a.isComplete).length;
    const inProgress = annotations.filter(a => !a.isComplete).length;
    
    // Return progress
    return {
      total,
      completed,
      inProgress
    };
  } catch (error) {
    console.error('Error getting progress:', error);
    return { total: 0, completed: 0, inProgress: 0 };
  }
}

/**
 * Export annotations
 * @returns {Promise<Array>} All annotations
 */
async function exportAnnotations() {
  // Get existing annotations
  const annotations = loadAnnotations();
  
  // In a real app, this would be a GET to a backend API
  // Simulate async operation
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(annotations);
    }, 300);
  });
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
      url: `https://pannellum.org/images/cerro-toco-0${i % 5 + 1}.jpg`,
      context: `This is a panoramic view of a landscape with mountains, sky, and various natural features. Sample image ${i}.`,
      generated_qa_pairs_by_attribute: {
        'Objects & Attributes': generateMockQuestions(2, 'Objects & Attributes'),
        'Spatial Relationships': generateMockQuestions(2, 'Spatial Relationships'),
        'View / Scene': generateMockQuestions(2, 'View / Scene')
      }
    });
  }
  
  return mockData;
}

/**
 * Find a task by ID, URL, or 0-based index
 * @param {string} id - Task ID, URL, or 0-based index
 * @returns {Promise<Object|null>} Task or null if not found
 */
async function findTaskById(id) {
  try {
    const response = await fetch(SAMPLE_DATA_URL);
    
    if (!response.ok) {
      throw new Error('Failed to load sample data');
    }
    
    const data = await response.json();
    
    // Check if id is a number (0-based index)
    if (!isNaN(parseInt(id))) {
      const index = parseInt(id);
      if (index >= 0 && index < data.length) {
        const task = data[index];
        return {
          imageId: task.url,
          imageUrl: task.url,
          caption: task.context,
          questions: formatQuestions(task)
        };
      }
    }
    
    // Find task by URL or partial URL match
    const task = data.find(item => 
      item.url === id || 
      item.url.includes(id) || 
      (item.id && item.id === id)
    );
    
    if (!task) return null;
    
    // Format task for the UI
    return {
      imageId: task.url,
      imageUrl: task.url,
      caption: task.context,
      questions: formatQuestions(task)
    };
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
