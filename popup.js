/**
 * Popup script for LinkedIn Post Automator
 * Handles the popup UI and interactions
 */

// DOM elements
const statusElement = document.getElementById('status');
const lastRunElement = document.getElementById('last-run');
const runNowButton = document.getElementById('run-now');
const openOptionsButton = document.getElementById('open-options');
const historyListElement = document.getElementById('history-list');

// Load data when popup opens
document.addEventListener('DOMContentLoaded', () => {
  loadStatus();
  loadHistory();
});

// Add event listeners
runNowButton.addEventListener('click', runNow);
openOptionsButton.addEventListener('click', openOptions);

/**
 * Load extension status
 */
function loadStatus() {
  chrome.storage.sync.get({
    lastRun: null,
    autoProcess: false,
    scheduleTime: '09:00',
    scheduleDays: ['monday', 'wednesday', 'friday']
  }, (items) => {
    // Update last run time
    if (items.lastRun) {
      const lastRunDate = new Date(items.lastRun);
      lastRunElement.textContent = formatDate(lastRunDate);
    } else {
      lastRunElement.textContent = 'Never';
    }
    
    // Update status based on configuration
    if (items.autoProcess) {
      const daysText = items.scheduleDays.map(capitalizeFirstLetter).join(', ');
      statusElement.textContent = `Scheduled (${daysText} at ${items.scheduleTime})`;
    } else {
      statusElement.textContent = 'Manual mode';
    }
  });
}

/**
 * Load run history
 */
function loadHistory() {
  chrome.storage.sync.get({ runHistory: [] }, (items) => {
    if (items.runHistory.length === 0) {
      historyListElement.innerHTML = '<div class="empty-history">No recent activity</div>';
      return;
    }
    
    // Clear history list
    historyListElement.innerHTML = '';
    
    // Add history items (limit to 5 most recent)
    const recentHistory = items.runHistory.slice(0, 5);
    recentHistory.forEach(item => {
      const historyItem = document.createElement('div');
      historyItem.className = 'history-item';
      
      const date = new Date(item.timestamp);
      const companyName = extractCompanyName(item.url);
      
      historyItem.innerHTML = `
        <div class="history-date">${formatDate(date)}</div>
        <div class="history-details">
          Processed ${item.postsProcessed} posts from ${companyName}
        </div>
      `;
      
      historyListElement.appendChild(historyItem);
    });
  });
}

/**
 * Run automation now
 */
function runNow() {
  // Update status
  statusElement.textContent = 'Running...';
  
  // Send message to background script
  chrome.runtime.sendMessage({ action: 'runNow' }, (response) => {
    if (response && response.status === 'started') {
      // Close popup
      window.close();
    }
  });
}

/**
 * Open options page
 */
function openOptions() {
  chrome.runtime.openOptionsPage();
}

/**
 * Format date for display
 * @param {Date} date - Date to format
 * @returns {string} - Formatted date string
 */
function formatDate(date) {
  const options = { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Extract company name from LinkedIn URL
 * @param {string} url - LinkedIn URL
 * @returns {string} - Company name
 */
function extractCompanyName(url) {
  try {
    const match = url.match(/linkedin\.com\/company\/([^\/]+)/);
    if (match && match[1]) {
      return capitalizeFirstLetter(match[1]);
    }
    return 'LinkedIn';
  } catch (error) {
    return 'LinkedIn';
  }
}

/**
 * Capitalize first letter of a string
 * @param {string} string - Input string
 * @returns {string} - String with first letter capitalized
 */
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
