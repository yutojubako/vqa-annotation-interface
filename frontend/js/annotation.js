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
  // We'll initialize the annotation interface regardless of authentication status
  // Firebase integration will handle authentication and show the login modal if needed
  
  try {
    // Show loading state
    showLoading(true);
    
    // Load tasks from API without limit - ensure we load all available tasks
    currentTasks = await loadTasks(null);
    
    // Even if no tasks are available, don't show warning and continue
    // This allows for jumping to specific samples even if the initial task list is empty
    if (currentTasks.length === 0) {
      console.log('No tasks loaded initially, but continuing to allow sample jumps');
    } else {
      console.log(`Loaded ${currentTasks.length} tasks successfully`);
    }
    
    // Load progress
    await updateProgress();
    
    // Load first task
    loadTask(0);
    
    // Set up event listeners
    document.getElementById('prev-btn').addEventListener('click', loadPreviousTask);
    document.getElementById('next-btn').addEventListener('click', loadNextTask);
    document.getElementById('save-btn').addEventListener('click', () => saveCurrentAnnotation(true));
    
    // Initialize segmented progress bar
    initializeProgressBar(currentTasks.length);
    
    // Initialize save status to empty
    document.getElementById('save-status').textContent = '';
    
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
    
    // Update current index display
    document.getElementById('current-index').textContent = `現在：${index + 1}/${currentTasks.length}`;
    
    // Initialize panorama viewer
    initPanorama(task.imageUrl);
    
    // Debug: Log task questions to check if suggestedAnswer is present
    console.log('Task questions:', task.questions);
    
    // Generate question tabs and forms
    generateQuestionTabs(task.questions);
    
    // Load existing answers if available
    const savedAnnotation = await getAnnotation(task.imageId);
    if (savedAnnotation) {
      loadSavedAnswers(savedAnnotation);
      
      // Update the current annotation's isComplete flag
      currentAnnotation.isComplete = savedAnnotation.isComplete;
      
      // If the annotation is complete, update the UI accordingly
      if (savedAnnotation.isComplete) {
        // Update the Save & Complete button
        const saveBtn = document.getElementById('save-btn');
        saveBtn.classList.add('btn-success');
        saveBtn.classList.remove('btn-primary');
        saveBtn.setAttribute('data-completed', 'true');
        saveBtn.textContent = '✓ Completed ✓';
        
        // Show the completion indicator
        showCompletionIndicator();
        
        // Add completed-answer class to all textareas
        document.querySelectorAll('textarea[data-question-id]').forEach(textarea => {
          textarea.classList.add('completed-answer');
        });
      }
    } else {
      // Reset save status if no saved annotation
      document.getElementById('save-status').textContent = '';
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
      
      // Question header with edit button
      const questionHeader = document.createElement('div');
      questionHeader.className = 'd-flex justify-content-between align-items-start mb-2';
      
      const questionText = document.createElement('p');
      questionText.className = 'card-text mb-0';
      questionText.textContent = question.question;
      questionText.dataset.questionId = question.id;
      
      const editButton = document.createElement('button');
      editButton.className = 'btn btn-sm btn-outline-secondary';
      editButton.innerHTML = '編集';
      editButton.addEventListener('click', () => {
        toggleQuestionEditMode(question.id, questionText);
      });
      
      questionHeader.appendChild(questionText);
      questionHeader.appendChild(editButton);
      
      const answerInput = document.createElement('textarea');
      answerInput.className = 'form-control mb-2';
      answerInput.rows = 3;
      answerInput.placeholder = 'Enter your answer here...';
      answerInput.dataset.questionId = question.id;
      answerInput.dataset.question = question.question;
      answerInput.dataset.attribute = question.attribute;
      
      // Set initial value from suggestedAnswer if available
      if (question.suggestedAnswer) {
        answerInput.value = question.suggestedAnswer;
        answerInput.classList.add('suggested-answer');
        
        // Add a note below the textarea
        const noteDiv = document.createElement('div');
        noteDiv.className = 'suggested-answer-note';
        noteDiv.textContent = '※参考回答が表示されています。必要に応じて編集してください。';
        
        // Store the note div for later use
        answerInput.dataset.noteDiv = true;
      }
      
      // Add event listener for auto-save
      answerInput.addEventListener('input', () => {
        // Remove suggested-answer class when user starts typing
        answerInput.classList.remove('suggested-answer');
        
        // Remove note if it exists
        if (answerInput.dataset.noteDiv) {
          const noteDiv = answerInput.nextSibling;
          if (noteDiv && noteDiv.className === 'suggested-answer-note') {
            noteDiv.parentNode.removeChild(noteDiv);
          }
          delete answerInput.dataset.noteDiv;
        }
        
        updateAnswer(question.id, questionText.textContent, question.attribute, answerInput.value);
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
      
      questionBody.appendChild(questionHeader);
      questionBody.appendChild(answerInput);
      questionBody.appendChild(confidenceDiv);
      questionCard.appendChild(questionBody);
      tabContent.appendChild(questionCard);
    });
    
    questionsContainer.appendChild(tabContent);
  });
}

/**
 * Toggle question edit mode
 * @param {string} questionId - Question ID
 * @param {HTMLElement} questionElement - Question element
 */
function toggleQuestionEditMode(questionId, questionElement) {
  const isEditing = questionElement.contentEditable === 'true';
  
  if (isEditing) {
    // Save the edited question
    questionElement.contentEditable = 'false';
    questionElement.classList.remove('editing');
    
    // Update the question in the current task
    updateQuestionText(questionId, questionElement.textContent);
    
    // Update the dataset for the answer input
    const answerInput = document.querySelector(`textarea[data-question-id="${questionId}"]`);
    if (answerInput) {
      answerInput.dataset.question = questionElement.textContent;
    }
  } else {
    // Enter edit mode
    questionElement.contentEditable = 'true';
    questionElement.classList.add('editing');
    questionElement.focus();
    
    // Select all text
    const range = document.createRange();
    range.selectNodeContents(questionElement);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

/**
 * Update question text
 * @param {string} questionId - Question ID
 * @param {string} newText - New question text
 */
function updateQuestionText(questionId, newText) {
  // Find the question in the current task
  const task = currentTasks[currentTaskIndex];
  const questionIndex = task.questions.findIndex(q => q.id === questionId);
  
  if (questionIndex >= 0) {
    // Update the question text
    task.questions[questionIndex].question = newText;
    
    // Update any answers that reference this question
    const answerIndex = currentAnnotation.answers.findIndex(a => a.questionId === questionId);
    if (answerIndex >= 0) {
      currentAnnotation.answers[answerIndex].question = newText;
    }
    
    // Show a message
    showMessage('質問が更新されました', 'success');
    
    // Schedule auto-save
    scheduleAutoSave();
  }
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
  
  // 回答が更新されたら、完了クラスを削除
  const answerInput = document.querySelector(`textarea[data-question-id="${questionId}"]`);
  if (answerInput) {
    answerInput.classList.remove('completed-answer');
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
    console.log('Auto-saving annotation...');
    // Auto-save always sets isComplete to false to avoid marking as complete automatically
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
    
    // Ensure we have answers for all questions
    const allQuestions = [];
    currentTasks[currentTaskIndex].questions.forEach(q => {
      allQuestions.push(q);
    });
    
    // Check if we have answers for all questions
    const answeredQuestionIds = currentAnnotation.answers.map(a => a.questionId);
    const unansweredQuestions = allQuestions.filter(q => !answeredQuestionIds.includes(q.id));
    
    // If there are unanswered questions and this is a complete submission, add default answers
    if (isComplete && unansweredQuestions.length > 0) {
      unansweredQuestions.forEach(q => {
        // Get the textarea for this question
        const textarea = document.querySelector(`textarea[data-question-id="${q.id}"]`);
        let answer = '';
        
        if (textarea && textarea.value) {
          // Use the value in the textarea
          answer = textarea.value;
        } else if (q.suggestedAnswer) {
          // Use the suggested answer if available
          answer = q.suggestedAnswer;
        }
        
        // Add the answer
        currentAnnotation.answers.push({
          questionId: q.id,
          question: q.question,
          attribute: q.attribute,
          answer: answer,
          confidence: 3 // Default confidence
        });
      });
    }
    
    console.log('Saving annotation with complete status:', isComplete);
    console.log('Annotation data before save:', JSON.stringify(currentAnnotation));
    
    // Save annotation
    const savedAnnotation = await saveAnnotation(currentAnnotation);
    
    // Verify the save was successful
    if (savedAnnotation) {
      console.log('Annotation saved successfully:', savedAnnotation);
      
      // Update current annotation with saved data (including any ID)
      currentAnnotation = savedAnnotation;
      
      // Update save status
      updateSaveStatus('All changes saved', 'success', true);
      
      // アノテーションが完了した場合、すべての入力欄に完了クラスを追加
      if (isComplete) {
        document.querySelectorAll('textarea[data-question-id]').forEach(textarea => {
          textarea.classList.add('completed-answer');
        });
        
        // Save & Complete ボタンの状態も更新
        const saveBtn = document.getElementById('save-btn');
        saveBtn.classList.add('btn-success');
        saveBtn.classList.remove('btn-primary');
        saveBtn.setAttribute('data-completed', 'true');
        saveBtn.textContent = '✓ Completed ✓';
        
        // No completion indicator is shown as per user request
      }
      
      // Update progress
      await updateProgress();
      
      // Don't show any message when saving or completing an annotation
    } else {
      throw new Error('Save returned empty result');
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
  if (!savedAnnotation || !savedAnnotation.answers) {
    console.log('No saved annotation found, loading suggested answers if available');
    // If no saved annotation, try to load suggested answers
    const task = currentTasks[currentTaskIndex];
    if (task && task.questions) {
      task.questions.forEach(question => {
        if (question.suggestedAnswer) {
          const answerInput = document.querySelector(`textarea[data-question-id="${question.id}"]`);
          if (answerInput) {
            answerInput.value = question.suggestedAnswer;
            answerInput.classList.add('suggested-answer');
            
            // Add a note below the textarea
            const noteDiv = document.createElement('div');
            noteDiv.className = 'suggested-answer-note';
            noteDiv.textContent = '※参考回答が表示されています。必要に応じて編集してください。';
            answerInput.parentNode.insertBefore(noteDiv, answerInput.nextSibling);
            
            // Also update the current annotation with suggested answers
            updateAnswer(question.id, question.question, question.attribute, question.suggestedAnswer);
          }
        }
      });
    }
    return;
  }
  
  console.log('Loading saved annotation:', savedAnnotation);
  
  // Update current annotation
  currentAnnotation = savedAnnotation;
  
  // Populate form with saved answers
  if (savedAnnotation.answers && savedAnnotation.answers.length > 0) {
    savedAnnotation.answers.forEach(answer => {
      const answerInput = document.querySelector(`textarea[data-question-id="${answer.questionId}"]`);
      if (answerInput) {
        answerInput.value = answer.answer;
        answerInput.classList.remove('suggested-answer');
        
        // Remove note if it exists
        const noteDiv = answerInput.nextSibling;
        if (noteDiv && noteDiv.className === 'suggested-answer-note') {
          noteDiv.parentNode.removeChild(noteDiv);
        }
        
        // アノテーションが完了している場合、入力欄に完了クラスを追加
        if (savedAnnotation.isComplete) {
          answerInput.classList.add('completed-answer');
        } else {
          answerInput.classList.remove('completed-answer');
        }
      }
      
      const confidenceSelect = document.querySelector(`select[data-question-id="${answer.questionId}"]`);
      if (confidenceSelect) {
        confidenceSelect.value = answer.confidence || 3;
      }
    });
    
    // Update save status
    updateSaveStatus('All changes saved', 'success');
    
  // If the annotation is complete, update the Save & Complete button
  if (savedAnnotation.isComplete) {
    const saveBtn = document.getElementById('save-btn');
    saveBtn.classList.add('btn-success');
    saveBtn.classList.remove('btn-primary');
    saveBtn.setAttribute('data-completed', 'true');
    saveBtn.textContent = '✓ Completed ✓';
    
    // Always show the completion indicator for completed annotations
    showCompletionIndicator();
    } else {
      // Reset the button if not complete
      const saveBtn = document.getElementById('save-btn');
      saveBtn.classList.remove('btn-success');
      saveBtn.classList.add('btn-primary');
      saveBtn.removeAttribute('data-completed');
      saveBtn.textContent = 'Save & Complete';
      
      // Remove the completion indicator if it exists
      const completionIndicator = document.getElementById('completion-indicator');
      if (completionIndicator) {
        completionIndicator.remove();
      }
    }
    
    console.log('Saved answers loaded successfully');
  } else {
    console.log('Saved annotation has no answers array or it is empty');
  }
}

/**
 * Initialize the segmented progress bar
 * @param {number} totalTasks - Total number of tasks
 */
function initializeProgressBar(totalTasks) {
  const progressContainer = document.getElementById('segmented-progress');
  progressContainer.innerHTML = '';
  
  // タスク数が多すぎる場合は適切な数に制限
  const maxVisibleSegments = 100; // 表示するセグメントの最大数
  const segmentCount = Math.min(totalTasks, maxVisibleSegments);
  
  // セグメントを作成
  for (let i = 0; i < segmentCount; i++) {
    const segment = document.createElement('div');
    segment.className = 'progress-segment';
    segment.dataset.index = i;
    progressContainer.appendChild(segment);
  }
}

/**
 * Get completed task indices
 * @returns {Promise<Array>} Array of completed task indices
 */
async function getCompletedIndices() {
  try {
    // Get completed annotations from both localStorage and Firestore
    let completedImageIds = [];
    
    // First, get from localStorage
    const localAnnotations = loadAnnotations ? loadAnnotations() : [];
    const localCompletedImageIds = localAnnotations
      .filter(a => a.isComplete === true)
      .map(a => a.imageId);
    
    completedImageIds = [...localCompletedImageIds];
    
    // Then, if user is authenticated, get from Firestore
    if (typeof currentUser !== 'undefined' && currentUser && currentUser.id) {
      try {
        // Get all annotations for the current user from Firestore
        const userAnnotationsSnapshot = await db.collection('annotations')
          .where('userId', '==', currentUser.id)
          .get();
        
        // Process annotations to find completed ones
        userAnnotationsSnapshot.forEach(doc => {
          const data = doc.data();
          // Check isComplete flag - handle different types (boolean, string, number)
          const isCompleteFlag = data.isComplete;
          
          // Convert to boolean properly
          const isComplete = (isCompleteFlag === true || isCompleteFlag === 'true' || isCompleteFlag === 1);
          
          if (isComplete && data.imageId) {
            // Add to completedImageIds if not already included
            if (!completedImageIds.includes(data.imageId)) {
              completedImageIds.push(data.imageId);
            }
          }
        });
      } catch (e) {
        console.error('Error getting completed annotations from Firestore:', e);
        // Continue with localStorage data
      }
    }
    
    // Log the completed image IDs for debugging
    console.log('Completed image IDs:', completedImageIds);
    
    // Get the indices of the completed tasks
    const completedIndices = currentTasks
      .map((task, index) => ({ task, index }))
      .filter(item => completedImageIds.includes(item.task.imageId))
      .map(item => item.index);
    
    console.log('Completed indices:', completedIndices);
    
    // Store the completed indices in localStorage for persistence
    try {
      localStorage.setItem('completed_indices', JSON.stringify(completedIndices));
      console.log('Completed indices cached in localStorage');
    } catch (cacheError) {
      console.error('Error caching completed indices:', cacheError);
    }
    
    return completedIndices;
  } catch (error) {
    console.error('Error getting completed indices:', error);
    
    // Try to get from localStorage as fallback
    try {
      const cachedIndices = localStorage.getItem('completed_indices');
      if (cachedIndices) {
        const indices = JSON.parse(cachedIndices);
        console.log('Using cached completed indices from localStorage:', indices);
        return indices;
      }
    } catch (e) {
      console.error('Error getting cached completed indices:', e);
    }
    
    return [];
  }
}

/**
 * Update progress display
 */
async function updateProgress() {
  try {
    // Get progress from API
    const progress = await getProgress();
    
    // Update original progress bar (for compatibility)
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    
    // Get completed indices to calculate the actual number of completed tasks
    let completedIndices = [];
    try {
      const cachedIndices = localStorage.getItem('completed_indices');
      if (cachedIndices) {
        completedIndices = JSON.parse(cachedIndices);
      } else {
        completedIndices = await getCompletedIndices();
      }
    } catch (e) {
      console.error('Error getting completed indices for progress text:', e);
      completedIndices = await getCompletedIndices();
    }
    
    // Use the length of completedIndices as the completed count
    const completed = completedIndices.length;
    const total = progress.total;
    
    const progressPercent = total > 0 ? (completed / total) * 100 : 0;
    progressBar.style.width = `${progressPercent}%`;
    progressText.textContent = `${completed}/${total} images annotated`;
    
    // Store the progress in localStorage for persistence
    try {
      localStorage.setItem('progress_data', JSON.stringify({ completed, total }));
    } catch (e) {
      console.error('Error storing progress data in localStorage:', e);
    }
    
    // Update segmented progress bar
    const segments = document.querySelectorAll('.progress-segment');
    
    // We already have completedIndices from above, no need to get them again
    
    // Add current index to completed indices if it's marked as complete
    if (currentAnnotation && currentAnnotation.isComplete && !completedIndices.includes(currentTaskIndex)) {
      completedIndices.push(currentTaskIndex);
      // Update the cache
      localStorage.setItem('completed_indices', JSON.stringify(completedIndices));
    }
    
    // 各セグメントを更新
    segments.forEach((segment, index) => {
      // すべてのクラスをリセット
      segment.classList.remove('completed', 'current');
      
      // 完了したタスクのセグメントを塗りつぶす
      if (completedIndices.includes(index)) {
        segment.classList.add('completed');
      }
      
      // 現在のタスクのセグメントをハイライト
      if (index === currentTaskIndex) {
        segment.classList.add('current');
      }
    });
    
    console.log('Progress updated:', progress, 'Completed indices:', completedIndices);
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
      // Update progress after loading the task
      updateProgress();
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
      // Update progress after loading the task
      updateProgress();
    });
  } else {
    showMessage('No more tasks available. You have reached the end of the queue.', 'info');
  }
}

/**
 * Update save status only when explicitly saving
 * @param {string} message - Status message
 * @param {string} type - Status type (success, warning, danger, info)
 * @param {boolean} isExplicit - Whether the status is explicitly set
 */
function updateSaveStatus(message, type, isExplicit = false) {
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

  // Clear the message after a delay if not explicitly set
  if (!isExplicit) {
    setTimeout(() => {
      saveStatus.textContent = '';
      saveStatus.classList.remove('text-success', 'text-warning', 'text-danger', 'text-info');
    }, 3000);
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
 * Show completion indicator at the top of the page
 * This function is now empty as the user found the indicator too noisy
 */
function showCompletionIndicator() {
  // Function intentionally left empty - no completion indicator will be shown
  // Remove any existing indicator
  const existingIndicator = document.getElementById('completion-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
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
