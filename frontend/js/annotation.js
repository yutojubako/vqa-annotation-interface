/**
 * Annotation module for VQA Panorama Annotation Interface
 * Handles panorama viewing and annotation functionality
 */

// State variables
let currentTasks = [];
let currentTaskIndex = 0;
let currentAnnotation = {
  answers: []
};
let panoramaViewer = null;
let saveTimeout = null;

/**
 * Initialize the annotation interface
 */
async function initAnnotation() {
  // Check if user is authenticated
  if (typeof checkAuth === 'function' && !checkAuth()) {
    return;
  }
  
  try {
    // Show loading state
    showLoading(true);
    
    // Load tasks from API without limit
    currentTasks = await loadTasks();
    
    // Even if no tasks are available, don't show warning and continue
    // This allows for jumping to specific samples even if the initial task list is empty
    if (currentTasks.length === 0) {
      console.log('No tasks loaded initially, but continuing to allow sample jumps');
    }
    
    // Load progress
    await updateProgress();
    
    // Load first task
    loadTask(0);
    
    // Set up event listeners
    document.getElementById('prev-btn').addEventListener('click', loadPreviousTask);
    document.getElementById('next-btn').addEventListener('click', loadNextTask);
    document.getElementById('save-btn').addEventListener('click', () => saveCurrentAnnotation(false));
    
    // Hide loading state
    showLoading(false);
  } catch (error) {
    console.error('Error initializing annotation:', error);
    showMessage('Failed to load annotation tasks. Please try again later.', 'danger');
    showLoading(false);
  }
}

/**
 * Load a specific task
 * @param {number} index - Task index
 */
async function loadTask(index) {
  if (index < 0 || index >= currentTasks.length) return;
  
  // Show loading state
  showLoading(true);
  
  try {
    currentTaskIndex = index;
    const task = currentTasks[index];
    
    // Reset current annotation
    currentAnnotation = {
      imageId: task.imageId,
      imageUrl: task.imageUrl,
      caption: task.caption,
      answers: [],
      isComplete: false
    };
    
    // Update caption
    document.getElementById('image-caption').textContent = task.caption || 'No caption available';
    
    // Initialize panorama viewer
    initPanorama(task.imageUrl);
    
    // Generate question tabs and forms
    generateQuestionTabs(task.questions);
    
    // Load existing answers if available
    const savedAnnotation = await getAnnotation(task.imageId);
    if (savedAnnotation) {
      loadSavedAnswers(savedAnnotation);
    }
    
    // Hide loading state
    showLoading(false);
  } catch (error) {
    console.error('Error loading task:', error);
    showMessage('Failed to load task. Please try again.', 'danger');
    showLoading(false);
  }
}

/**
 * Initialize Pannellum viewer
 * @param {string} imageUrl - URL of the panorama image
 */
function initPanorama(imageUrl) {
  // Destroy existing viewer if any
  if (panoramaViewer) {
    panoramaViewer.destroy();
    panoramaViewer = null;
  }
  
  // Load the base64 loading image
  fetch('assets/loading.txt')
    .then(response => response.text())
    .then(base64Data => {
      // Create new viewer
      panoramaViewer = pannellum.viewer('panorama', {
        type: 'equirectangular',
        panorama: imageUrl,
        autoLoad: true,
        autoRotate: -2,
        compass: true,
        hotSpotDebug: false,
        crossOrigin: 'anonymous', // CORSの問題を解決するために追加
        preview: base64Data
      });
      
      // Handle errors
      panoramaViewer.on('error', function(err) {
        console.error('Pannellum error:', err);
        console.error('Failed URL:', imageUrl); // URLを表示
        showMessage(`Error loading panorama image: ${err}. URL: ${imageUrl}`, 'danger');
      });
    })
    .catch(error => {
      console.error('Error loading loading image:', error);
      
      // Create viewer without preview image
      panoramaViewer = pannellum.viewer('panorama', {
        type: 'equirectangular',
        panorama: imageUrl,
        autoLoad: true,
        autoRotate: -2,
        compass: true,
        hotSpotDebug: false,
        crossOrigin: 'anonymous' // CORSの問題を解決するために追加
      });
      
      // Handle errors
      panoramaViewer.on('error', function(err) {
        console.error('Pannellum error:', err);
        console.error('Failed URL:', imageUrl); // URLを表示
        showMessage(`Error loading panorama image: ${err}. URL: ${imageUrl}`, 'danger');
      });
    });
}

/**
 * Generate tabs for different question attributes
 * @param {Array} questions - Array of questions
 */
function generateQuestionTabs(questions) {
  // Group questions by attribute
  const questionsByAttribute = {};
  questions.forEach(q => {
    if (!questionsByAttribute[q.attribute]) {
      questionsByAttribute[q.attribute] = [];
    }
    questionsByAttribute[q.attribute].push(q);
  });
  
  // Generate tabs
  const tabsContainer = document.getElementById('attribute-tabs');
  const questionsContainer = document.getElementById('questions-container');
  
  tabsContainer.innerHTML = '';
  questionsContainer.innerHTML = '';
  
  Object.keys(questionsByAttribute).forEach((attribute, index) => {
    // Create tab
    const tabItem = document.createElement('li');
    tabItem.className = 'nav-item';
    
    const tabLink = document.createElement('a');
    tabLink.className = `nav-link ${index === 0 ? 'active' : ''}`;
    tabLink.href = `#${attribute.replace(/\s+/g, '-').toLowerCase()}`;
    tabLink.setAttribute('data-bs-toggle', 'tab');
    tabLink.textContent = attribute;
    
    tabItem.appendChild(tabLink);
    tabsContainer.appendChild(tabItem);
    
    // Create tab content
    const tabContent = document.createElement('div');
    tabContent.className = `tab-pane fade ${index === 0 ? 'show active' : ''}`;
    tabContent.id = attribute.replace(/\s+/g, '-').toLowerCase();
    
    // Add questions to tab content
    questionsByAttribute[attribute].forEach(question => {
      const questionCard = document.createElement('div');
      questionCard.className = 'card mb-3 question-card';
      
      const questionBody = document.createElement('div');
      questionBody.className = 'card-body';
      
      const questionText = document.createElement('p');
      questionText.className = 'card-text';
      questionText.textContent = question.question;
      
      const answerInput = document.createElement('textarea');
      answerInput.className = 'form-control mb-2';
      answerInput.rows = 3;
      answerInput.placeholder = 'Enter your answer here...';
      answerInput.dataset.questionId = question.id;
      answerInput.dataset.question = question.question;
      answerInput.dataset.attribute = question.attribute;
      
      // Add event listener for auto-save
      answerInput.addEventListener('input', () => {
        updateAnswer(question.id, question.question, question.attribute, answerInput.value);
        scheduleAutoSave();
      });
      
      const confidenceDiv = document.createElement('div');
      confidenceDiv.className = 'confidence-rating d-flex align-items-center';
      
      const confidenceLabel = document.createElement('label');
      confidenceLabel.className = 'me-2';
      confidenceLabel.textContent = 'Confidence:';
      
      const confidenceSelect = document.createElement('select');
      confidenceSelect.className = 'form-select';
      confidenceSelect.dataset.questionId = question.id;
      
      for (let i = 1; i <= 5; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        confidenceSelect.appendChild(option);
      }
      
      // Add event listener for confidence change
      confidenceSelect.addEventListener('change', () => {
        updateConfidence(question.id, parseInt(confidenceSelect.value));
        scheduleAutoSave();
      });
      
      confidenceDiv.appendChild(confidenceLabel);
      confidenceDiv.appendChild(confidenceSelect);
      
      questionBody.appendChild(questionText);
      questionBody.appendChild(answerInput);
      questionBody.appendChild(confidenceDiv);
      questionCard.appendChild(questionBody);
      tabContent.appendChild(questionCard);
    });
    
    questionsContainer.appendChild(tabContent);
  });
}

/**
 * Update an answer in the current annotation
 * @param {string} questionId - Question ID
 * @param {string} questionText - Question text
 * @param {string} attribute - Question attribute
 * @param {string} answer - Answer text
 */
function updateAnswer(questionId, questionText, attribute, answer) {
  const existingAnswerIndex = currentAnnotation.answers.findIndex(a => a.questionId === questionId);
  
  if (existingAnswerIndex >= 0) {
    currentAnnotation.answers[existingAnswerIndex].answer = answer;
  } else {
    currentAnnotation.answers.push({
      questionId,
      question: questionText,
      attribute,
      answer,
      confidence: 3 // Default confidence
    });
  }
  
  // Update save status
  updateSaveStatus('Unsaved changes', 'warning');
}

/**
 * Update confidence for an answer
 * @param {string} questionId - Question ID
 * @param {number} confidence - Confidence level (1-5)
 */
function updateConfidence(questionId, confidence) {
  const existingAnswerIndex = currentAnnotation.answers.findIndex(a => a.questionId === questionId);
  
  if (existingAnswerIndex >= 0) {
    currentAnnotation.answers[existingAnswerIndex].confidence = confidence;
  }
  
  // Update save status
  updateSaveStatus('Unsaved changes', 'warning');
}

/**
 * Schedule auto-save
 */
function scheduleAutoSave() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  
  saveTimeout = setTimeout(() => {
    saveCurrentAnnotation(false);
  }, 3000); // Auto-save after 3 seconds of inactivity
}

/**
 * Save current annotation
 * @param {boolean} isComplete - Whether the annotation is complete
 */
async function saveCurrentAnnotation(isComplete = false) {
  try {
    // Show saving status
    updateSaveStatus('Saving...', 'info');
    
    // Update completion status
    currentAnnotation.isComplete = isComplete;
    
    // Save annotation
    await saveAnnotation(currentAnnotation);
    
    // Update save status
    updateSaveStatus('All changes saved', 'success');
    
    // Update progress
    await updateProgress();
    
    // Move to next task if completed
    if (isComplete && currentTaskIndex < currentTasks.length - 1) {
      loadNextTask();
    } else if (isComplete && currentTaskIndex >= currentTasks.length - 1) {
      showMessage('All tasks completed! Thank you for your contributions.', 'success');
    }
  } catch (error) {
    console.error('Error saving annotation:', error);
    updateSaveStatus('Failed to save', 'danger');
    showMessage('Failed to save annotation. Please try again.', 'danger');
  }
}

/**
 * Load saved answers into the form
 * @param {Object} savedAnnotation - Saved annotation
 */
function loadSavedAnswers(savedAnnotation) {
  if (!savedAnnotation || !savedAnnotation.answers) return;
  
  // Update current annotation
  currentAnnotation = savedAnnotation;
  
  // Populate form with saved answers
  savedAnnotation.answers.forEach(answer => {
    const answerInput = document.querySelector(`textarea[data-question-id="${answer.questionId}"]`);
    if (answerInput) {
      answerInput.value = answer.answer;
    }
    
    const confidenceSelect = document.querySelector(`select[data-question-id="${answer.questionId}"]`);
    if (confidenceSelect) {
      confidenceSelect.value = answer.confidence;
    }
  });
  
  // Update save status
  updateSaveStatus('All changes saved', 'success');
}

/**
 * Update progress display
 */
async function updateProgress() {
  try {
    const progress = await getProgress();
    
    // Update progress bar
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    
    const progressPercent = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
    progressBar.style.width = `${progressPercent}%`;
    progressText.textContent = `${progress.completed}/${progress.total} images annotated`;
  } catch (error) {
    console.error('Error updating progress:', error);
  }
}

/**
 * Load previous task
 */
function loadPreviousTask() {
  if (currentTaskIndex > 0) {
    saveCurrentAnnotation(false).then(() => {
      loadTask(currentTaskIndex - 1);
    });
  }
}

/**
 * Load next task
 */
function loadNextTask() {
  if (currentTaskIndex < currentTasks.length - 1) {
    saveCurrentAnnotation(false).then(() => {
      loadTask(currentTaskIndex + 1);
    });
  } else {
    showMessage('No more tasks available. You have reached the end of the queue.', 'info');
  }
}

/**
 * Update save status indicator
 * @param {string} message - Status message
 * @param {string} type - Status type (success, warning, danger, info)
 */
function updateSaveStatus(message, type) {
  const saveStatus = document.getElementById('save-status');
  saveStatus.textContent = message;
  
  // Remove all status classes
  saveStatus.classList.remove('text-success', 'text-warning', 'text-danger', 'text-info');
  
  // Add appropriate class
  switch (type) {
    case 'success':
      saveStatus.classList.add('text-success');
      break;
    case 'warning':
      saveStatus.classList.add('text-warning');
      break;
    case 'danger':
      saveStatus.classList.add('text-danger');
      break;
    case 'info':
      saveStatus.classList.add('text-info');
      break;
  }
}

/**
 * Show loading state
 * @param {boolean} isLoading - Whether loading is in progress
 */
function showLoading(isLoading) {
  // Implement loading indicator
  // For simplicity, we'll just disable buttons
  const buttons = document.querySelectorAll('button');
  buttons.forEach(button => {
    button.disabled = isLoading;
  });
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
  container.insertBefore(alertDiv, container.firstChild);
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    const bsAlert = new bootstrap.Alert(alertDiv);
    bsAlert.close();
  }, 5000);
}

/**
 * Create a sample data file from the current WebDataset
 * This function would be used to convert the WebDataset to a format usable by the interface
 */
async function createSampleDataFromWebDataset() {
  // In a real implementation, this would parse the WebDataset
  // For now, we'll just use mock data
  const mockData = generateMockData();
  
  // Save to localStorage for demo purposes
  localStorage.setItem(SAMPLE_DATA_KEY, JSON.stringify(mockData));
  
  return mockData;
}

/**
 * 特定のサンプルにジャンプする
 * @param {string} sampleId - サンプルIDまたはURL、または0-based-index
 */
async function jumpToSample(sampleId) {
  try {
    showLoading(true);
    
    // サンプルIDでタスクを検索
    const task = await findTaskById(sampleId);
    
    if (!task) {
      // サンプルが見つからない場合、モックデータを生成して表示
      console.log(`Sample ID "${sampleId}" not found, generating mock data`);
      const mockTask = generateMockTask(sampleId);
      
      // モックタスクを現在のタスクリストに追加
      currentTasks.push(mockTask);
      loadTask(currentTasks.length - 1);
      showLoading(false);
      return;
    }
    
    // 現在のタスクリストに追加（まだ含まれていない場合）
    const existingIndex = currentTasks.findIndex(t => t.imageId === task.imageId);
    if (existingIndex >= 0) {
      // 既に存在する場合はそのインデックスに移動
      loadTask(existingIndex);
    } else {
      // 存在しない場合は追加して移動
      currentTasks.push(task);
      loadTask(currentTasks.length - 1);
    }
    
    showLoading(false);
  } catch (error) {
    console.error('Error jumping to sample:', error);
    showMessage('サンプルへのジャンプに失敗しました。', 'danger');
    showLoading(false);
  }
}

/**
 * モックタスクを生成する
 * @param {string} sampleId - サンプルID
 * @returns {Object} モックタスク
 */
function generateMockTask(sampleId) {
  // サンプルIDを使用してユニークなモックタスクを生成
  const mockId = `mock_${sampleId}`;
  const mockUrl = `https://pannellum.org/images/cerro-toco-01.jpg`;
  const mockCaption = `This is a mock panoramic view for sample ID ${sampleId}.`;
  
  // モック質問を生成
  const mockQuestions = [
    {
      id: `q1_${mockId}`,
      question: 'What is the dominant color of the sky in this panorama?',
      attribute: 'Objects & Attributes'
    },
    {
      id: `q2_${mockId}`,
      question: 'How many mountains can be seen in the panorama?',
      attribute: 'Objects & Attributes'
    },
    {
      id: `q3_${mockId}`,
      question: 'What is the relative position of the sun in this panorama?',
      attribute: 'Spatial Relationships'
    },
    {
      id: `q4_${mockId}`,
      question: 'How is the landscape oriented in relation to the viewer?',
      attribute: 'Spatial Relationships'
    },
    {
      id: `q5_${mockId}`,
      question: 'What time of day does this panorama appear to be taken?',
      attribute: 'View / Scene'
    },
    {
      id: `q6_${mockId}`,
      question: 'Is this an indoor or outdoor scene?',
      attribute: 'View / Scene'
    }
  ];
  
  return {
    imageId: mockId,
    imageUrl: mockUrl,
    caption: mockCaption,
    questions: mockQuestions
  };
}

// Initialize annotation on page load
document.addEventListener('DOMContentLoaded', () => {
  // Annotation will be initialized after authentication
  // in the handleLogin function
  
  // ジャンプボタンのイベントリスナーを追加
  const jumpBtn = document.getElementById('jump-btn');
  if (jumpBtn) {
    jumpBtn.addEventListener('click', () => {
      const sampleId = document.getElementById('sample-id-input').value.trim();
      if (sampleId) {
        jumpToSample(sampleId);
      }
    });
  }
});
