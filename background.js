/**
 * Background script for LinkedIn Post Automator
 * Handles scheduling and coordination of LinkedIn post interactions
 */

// Default configuration
const DEFAULT_CONFIG = {
  postsToProcess: 3,
  enableLike: true,
  enableRepost: true,
  companyPages: ['acceldata'],
  scheduleTime: '11:00',
  scheduleDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
  autoProcess: true,
  lastRun: null,
  runHistory: []
};

// Initialize extension when installed
chrome.runtime.onInstalled.addListener((details) => {
  console.log('LinkedIn Post Automator: Extension installed');

  // Set default configuration
  chrome.storage.sync.get(DEFAULT_CONFIG, (items) => {
    // Only set defaults for items that don't exist
    chrome.storage.sync.set(items);
    console.log('LinkedIn Post Automator: Default configuration set');
  });

  // Set up initial alarms
  setupScheduledAlarms();
});

// Listen for alarm events
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith('linkedinPostAutomation')) {
    console.log('LinkedIn Post Automator: Scheduled automation triggered');
    runAutomation();
  }
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('LinkedIn Post Automator: Message received', message);

  if (message.action === 'runNow') {
    // Manual trigger from popup
    runAutomation();
    sendResponse({ status: 'started' });
  }
  else if (message.action === 'processingComplete') {
    // Content script has completed processing
    handleProcessingComplete(message.results);
    sendResponse({ status: 'received' });
  }
  else if (message.action === 'updateConfig') {
    // Update configuration from options page
    updateConfiguration(message.config);
    setupScheduledAlarms();
    sendResponse({ status: 'updated' });
  }
  else if (message.action === 'getConfig') {
    // Return current configuration to popup or options page
    chrome.storage.sync.get(DEFAULT_CONFIG, (items) => {
      sendResponse({ config: items });
    });
    return true; // Indicates async response
  }
  else if (message.action === 'getHistory') {
    // Return run history to popup or options page
    chrome.storage.sync.get({ runHistory: [] }, (items) => {
      sendResponse({ history: items.runHistory });
    });
    return true; // Indicates async response
  }
});

/**
 * Set up scheduled alarms based on user configuration
 */
function setupScheduledAlarms() {
  // Clear any existing alarms
  chrome.alarms.clearAll(() => {
    console.log('LinkedIn Post Automator: Cleared existing alarms');

    // Get configuration
    chrome.storage.sync.get({
      scheduleTime: '09:00',
      scheduleDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      autoProcess: false
    }, (config) => {
      if (!config.autoProcess) {
        console.log('LinkedIn Post Automator: Automatic processing disabled, no alarms set');
        return;
      }

      // Parse schedule time
      const [hours, minutes] = config.scheduleTime.split(':').map(Number);

      // Create alarm for each scheduled day
      const now = new Date();
      const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

      config.scheduleDays.forEach(day => {
        const dayIndex = daysOfWeek.indexOf(day.toLowerCase());
        if (dayIndex === -1) return;

        // Calculate next occurrence of this day
        let nextDate = new Date();
        nextDate.setHours(hours, minutes, 0, 0);

        // Adjust to next occurrence of the day
        const daysUntilNext = (dayIndex - now.getDay() + 7) % 7;
        nextDate.setDate(nextDate.getDate() + daysUntilNext);

        // If it's today but the time has passed, move to next week
        if (daysUntilNext === 0 && nextDate.getTime() < now.getTime()) {
          nextDate.setDate(nextDate.getDate() + 7);
        }

        // Create alarm
        const alarmName = `linkedinPostAutomation_${day}`;
        chrome.alarms.create(alarmName, {
          when: nextDate.getTime(),
          periodInMinutes: 7 * 24 * 60 // Weekly
        });

        console.log(`LinkedIn Post Automator: Scheduled for ${day} at ${config.scheduleTime}`);
      });
    });
  });
}

/**
 * Run the automation process
 */
function runAutomation() {
  console.log('LinkedIn Post Automator: Starting automation');

  // Get configuration
  chrome.storage.sync.get({
    companyPages: ['acceldata'],
    postsToProcess: 3
  }, async (config) => {
    // Process each company page
    for (const company of config.companyPages) {
      const url = `https://www.linkedin.com/company/${company}/posts/`;

      try {
        // Find or create a tab for LinkedIn
        const tabs = await chrome.tabs.query({ url: 'https://www.linkedin.com/*' });
        let tab;

        if (tabs.length > 0) {
          // Use existing LinkedIn tab
          tab = tabs[0];
          await chrome.tabs.update(tab.id, { url: url, active: true });
        } else {
          // Create new tab
          tab = await chrome.tabs.create({ url: url, active: true });
        }

        // Wait for page to load
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Update last run timestamp
        chrome.storage.sync.set({
          lastRun: new Date().toISOString()
        });
        
        // Send message to content script to process posts
        await chrome.tabs.sendMessage(tab.id, {
          action: 'processLinkedInPosts',
          config: {
            postsToProcess: config.postsToProcess
          }
        });

      } catch (error) {
        console.log('LinkedIn Post Automator: Error during automation', error);
      }
    }
  });
}

/**
 * Handle completion of post processing
 * @param {Object} results - Results from content script
 */
function handleProcessingComplete(results) {
  console.log('LinkedIn Post Automator: Processing complete', results);

  // Update run history
  chrome.storage.sync.get({ runHistory: [] }, (items) => {
    const history = items.runHistory;

    // Add new entry to history
    history.unshift({
      timestamp: results.timestamp,
      url: results.url,
      postsProcessed: results.postsProcessed
    });

    // Limit history to 20 entries
    if (history.length > 20) {
      history.pop();
    }

    // Save updated history
    chrome.storage.sync.set({ runHistory: history });
  });
}

/**
 * Update extension configuration
 * @param {Object} newConfig - New configuration values
 */
function updateConfiguration(newConfig) {
  chrome.storage.sync.set(newConfig, () => {
    console.log('LinkedIn Post Automator: Configuration updated', newConfig);
  });
}
