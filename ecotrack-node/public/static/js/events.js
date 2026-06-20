// Superseded by dashboard.js — kept for reference; not loaded by any page.
// EcoTrack v3 — Event Handlers

/**
 * Setup event listeners for dashboard
 * This replaces all inline onclick/onchange handlers
 */
function setupDashboardEvents() {
  
  // Refresh button
  const refreshBtn = document.querySelector('button[data-action="loadAll"]');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadAll);
  }
  
  // Category dropdown
  const addCatSelect = document.getElementById('addCat');
  if (addCatSelect) {
    addCatSelect.addEventListener('change', updateSubTypes);
  }
  
  // Chat send button
  const chatSendBtn = document.querySelector('button[data-action="sendChat"]');
  if (chatSendBtn) {
    chatSendBtn.addEventListener('click', sendChat);
  }
  
  // Save goal button
  const saveGoalBtn = document.querySelector('button[data-action="saveGoal"]');
  if (saveGoalBtn) {
    saveGoalBtn.addEventListener('click', saveGoal);
  }
  
  // Drop zone click (for file upload)
  const dropZone = document.getElementById('dropZone');
  if (dropZone) {
    dropZone.addEventListener('click', () => {
      document.getElementById('fileInput').click();
    });
    
    // Drag and drop handlers
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--green)';
    });
    
    dropZone.addEventListener('dragleave', () => {
      dropZone.style.borderColor = 'var(--border)';
    });
    
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--border)';
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileUpload(files[0]);
      }
    });
  }
  
  // File input change
  const fileInput = document.getElementById('fileInput');
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleFileUpload(e.target.files[0]);
      }
    });
  }
  
  // Chat input - send on Enter
  const chatInput = document.getElementById('chatInput');
  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        sendChat();
      }
    });
  }
  
  // Add emission form submit
  const addForm = document.getElementById('addForm');
  if (addForm) {
    addForm.addEventListener('submit', handleAddEmission);
  }
  
  // Setup logout buttons (from nav.js)
  const logoutLinks = document.querySelectorAll('a[data-action="logout"]');
  logoutLinks.forEach(link => {
    link.addEventListener('click', logout);
  });
  
  console.log('✓ Dashboard event listeners initialized');
}

/**
 * Initialize event listeners on DOM ready
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupDashboardEvents);
} else {
  setupDashboardEvents();
}
