/**
 * Options page script for LinkedIn Post Automator
 * Handles saving and loading user configuration
 */

// DOM elements
const companyListElement = document.getElementById('company-list');
const userListElement = document.getElementById('user-list');
const addCompanyButton = document.getElementById('add-company');
const addUserButton = document.getElementById('add-user');
const postsToProcessInput = document.getElementById('posts-to-process');
const enableLikeCheckbox = document.getElementById('enable-like');
const enableRepostCheckbox = document.getElementById('enable-repost');
const autoProcessCheckbox = document.getElementById('auto-process');
const scheduleTimeInput = document.getElementById('schedule-time');
const scheduleDayCheckboxes = document.querySelectorAll('input[name="schedule-day"]');
const saveButton = document.getElementById('save-options');
const statusElement = document.getElementById('status');

// Load saved options when the page loads
document.addEventListener('DOMContentLoaded', loadOptions);

// Add event listeners
addCompanyButton.addEventListener('click', addCompanyField);
addUserButton.addEventListener('click', addUserField);
saveButton.addEventListener('click', saveOptions);

/**
 * Load saved options from storage
 */
function loadOptions() {
  chrome.storage.sync.get({
    // Default values
    companyPages: ['acceldata'],
    userPages: ['rconline'],
    postsToProcess: 3,
    enableLike: true,
    enableRepost: true,
    autoProcess: false,
    scheduleTime: '09:00',
    scheduleDays: ['monday', 'wednesday', 'friday']
  }, (items) => {
    // Populate company list
    companyListElement.innerHTML = '';
    items.companyPages.forEach(company => {
      addCompanyField(company);
    });
    // Populate user list
    userListElement.innerHTML = '';
    items.userPages.forEach(user => {
      addUserField(user);
    });

    // Set other form values
    postsToProcessInput.value = items.postsToProcess;
    enableLikeCheckbox.checked = items.enableLike;
    enableRepostCheckbox.checked = items.enableRepost;
    autoProcessCheckbox.checked = items.autoProcess;
    scheduleTimeInput.value = items.scheduleTime;

    // Set schedule day checkboxes
    scheduleDayCheckboxes.forEach(checkbox => {
      checkbox.checked = items.scheduleDays.includes(checkbox.value);
    });
  });
}

/**
 * Add a new company field to the list
 * @param {string} [companyName] - Optional company name to pre-fill
 */
function addCompanyField(companyName = '') {
  // If called from event listener, companyName will be an event object
  if (typeof companyName !== 'string') {
    companyName = '';
  }

  const companyItem = document.createElement('div');
  companyItem.className = 'company-item';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'company-input';
  input.value = companyName;
  input.placeholder = 'Company name (e.g., acceldata)';

  const removeButton = document.createElement('button');
  removeButton.className = 'remove-btn';
  removeButton.textContent = 'Remove';
  removeButton.addEventListener('click', () => {
    companyItem.remove();
  });

  companyItem.appendChild(input);
  companyItem.appendChild(removeButton);
  companyListElement.appendChild(companyItem);
}

function addUserField(userName = '') {
  // If called from event listener, userName will be an event object
  if (typeof userName !== 'string') {
    userName = '';
  }

  const userItem = document.createElement('div');
  userItem.className = 'user-item';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'user-input';
  input.value = userName;
  input.placeholder = 'User name (e.g., rconline)';

  const removeButton = document.createElement('button');
  removeButton.className = 'remove-btn';
  removeButton.textContent = 'Remove';
  removeButton.addEventListener('click', () => {
    userItem.remove();
  });

  userItem.appendChild(input);
  userItem.appendChild(removeButton);
  userListElement.appendChild(userItem);
}

/**
 * Save options to storage
 */
function saveOptions() {
  // Get company names from inputs
  const companyInputs = document.querySelectorAll('.company-input');
  const companyPages = Array.from(companyInputs)
    .map(input => input.value.trim())
    .filter(company => company !== '');

  // Get user from inputs
  const userInputs = document.querySelectorAll('.user-input');
  const userPages = Array.from(userInputs)
  .map(input => input.value.trim())
  .filter(user => user !== '');

  // Get selected schedule days
  const scheduleDays = Array.from(scheduleDayCheckboxes)
    .filter(checkbox => checkbox.checked)
    .map(checkbox => checkbox.value);

  // Create configuration object
  const config = {
    companyPages: companyPages,
    userPages: userPages,
    postsToProcess: parseInt(postsToProcessInput.value, 10),
    enableLike: enableLikeCheckbox.checked,
    enableRepost: enableRepostCheckbox.checked,
    autoProcess: autoProcessCheckbox.checked,
    scheduleTime: scheduleTimeInput.value,
    scheduleDays: scheduleDays
  };

  // Save to storage
  chrome.storage.sync.set(config, () => {
    // Notify background script to update alarms
    chrome.runtime.sendMessage({
      action: 'updateConfig',
      config: config
    });

    // Show success message
    showStatus('Options saved successfully!', 'success');
  });
}

/**
 * Show status message
 * @param {string} message - Message to display
 * @param {string} type - Message type ('success' or 'error')
 */
function showStatus(message, type) {
  statusElement.textContent = message;
  statusElement.className = `status ${type}`;
  statusElement.style.display = 'block';

  // Hide after 3 seconds
  setTimeout(() => {
    statusElement.style.display = 'none';
  }, 3000);
}
