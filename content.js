/**
 * Content script for LinkedIn Post Automator
 * This script runs on LinkedIn company post pages and handles post interactions
 */

// Configuration (will be replaced with values from storage)
let config = {
  postsToProcess: 3,
  enableLike: true,
  enableRepost: true
};

// Main function to process posts
async function processLinkedInPosts() {
  console.log('LinkedIn Post Automator: Starting to process posts');

  // Get posts on the page
  const posts = await findPosts();
  console.log(`LinkedIn Post Automator: Found ${posts.length} posts`);

  // Limit to configured number of posts
  const postsToProcess = posts.slice(0, config.postsToProcess);

  // Process each post
  for (let i = 0; i < postsToProcess.length; i++) {
    const post = postsToProcess[i];
    console.log(`LinkedIn Post Automator: Processing post ${i + 1}/${postsToProcess.length}`);

    // Like the post if enabled and not already liked
    if (config.enableLike) {
      const isLiked = await isPostLiked(post);
      if (!isLiked) {
        await likePost(post);
        await delay(1000);
        await repostPost(post);
        console.log('LinkedIn Post Automator: Post liked');
      } else {
        console.log('LinkedIn Post Automator: Post already liked, skipping');
      }
    }

    // Add delay between posts
    if (i < postsToProcess.length - 1) {
      await delay(2000);
    }
  }

  console.log('LinkedIn Post Automator: Finished processing posts');

  // Send results back to background script
  chrome.runtime.sendMessage({
    action: 'processingComplete',
    results: {
      postsProcessed: postsToProcess.length,
      url: window.location.href,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Find posts on the LinkedIn page
 * Uses multiple strategies to locate posts
 */
async function findPosts() {
  // Strategy 1: Look for post containers using class patterns
  let posts = Array.from(document.querySelectorAll('div.feed-shared-update-v2'));

  // If no posts found, try alternative selectors
  if (posts.length === 0) {
    // Strategy 2: Look for post containers by structure
    posts = Array.from(document.querySelectorAll('div[data-urn]'));
  }

  // If still no posts found, try more generic approach
  if (posts.length === 0) {
    // Strategy 3: Look for any elements that might contain posts
    const feedContainer = document.querySelector('div.scaffold-finite-scroll__content');
    if (feedContainer) {
      // Find direct children that might be posts
      posts = Array.from(feedContainer.children);
    }
  }

  return posts;
}

/**
 * Check if a post is already liked
 * @param {Element} post - The post element
 * @returns {Promise<boolean>} - Whether the post is liked
 */
async function isPostLiked(post) {
  try {
    // Strategy 1: Look for filled like button using XPath pattern
    const likeButton = findElementInPost(post, 'button', 'like', 'aria-pressed');
    if (likeButton && likeButton.getAttribute('aria-pressed') === 'true') {
      return true;
    }

    // Strategy 2: Look for visual indicators (filled icon)
    const likeIcon = findElementInPost(post, 'li-icon[type="like-filled"]');
    if (likeIcon) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('LinkedIn Post Automator: Error checking if post is liked', error);
    return false;
  }
}

/**
 * Like a post
 * @param {Element} post - The post element
 */
async function likePost(post) {
  try {
    // Find the like button using multiple strategies
    let likeButton = null;

    // Strategy 1: Try using the XPath pattern provided
    try {
      // This is a simplified version - in reality we'd need to adapt the XPath
      // to work relative to the current post
      const xpath = `.//button[contains(@id, 'ember') and contains(@aria-label, 'like')]`;
      const result = document.evaluate(xpath, post, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      likeButton = result.singleNodeValue;
    } catch (e) {
      console.log('LinkedIn Post Automator: XPath strategy failed, trying alternatives');
    }

    // Strategy 2: Look for like button by common attributes
    if (!likeButton) {
      likeButton = findElementInPost(post, 'button', 'like');
    }

    // Strategy 3: Look for reaction button section and get first button
    if (!likeButton) {
      const reactionSection = findElementInPost(post, 'div', 'social-actions');
      if (reactionSection) {
        likeButton = reactionSection.querySelector('button');
      }
    }

    if (likeButton) {
      likeButton.click();
      await delay(500); // Short delay after clicking
      return true;
    } else {
      console.error('LinkedIn Post Automator: Could not find like button');
      return false;
    }
  } catch (error) {
    console.error('LinkedIn Post Automator: Error liking post', error);
    return false;
  }
}

/**
 * Check if a post is already reposted
 * @param {Element} post - The post element
 * @returns {Promise<boolean>} - Whether the post is reposted
 */
async function isPostReposted(post) {
  try {
    // Strategy 1: Look for repost button with active state
    const repostButton = findElementInPost(post, 'button', 'repost', 'aria-pressed');
    if (repostButton && repostButton.getAttribute('aria-pressed') === 'true') {
      return true;
    }

    // Strategy 2: Look for visual indicators
    const repostIcon = findElementInPost(post, 'li-icon[type="repost-filled"]');
    if (repostIcon) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('LinkedIn Post Automator: Error checking if post is reposted', error);
    return false;
  }
}

/**
 * Repost a post
 * @param {Element} post - The post element
 */
async function repostPost(post) {
  try {
    // Find the repost button using multiple strategies
    let repostButton = null;

    try {
      // This is a simplified version - in reality we'd need to adapt the XPath
      const xpath = `.//div[contains(@class, 'feed-shared-social-action-bar')]//button[contains(@id, 'ember') and contains(@class, 'artdeco-dropdown__trigger')]`;
      const result = document.evaluate(xpath, post, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      repostButton = result.singleNodeValue;
    } catch (e) {
      console.log('LinkedIn Post Automator: XPath strategy failed, trying alternatives');
    }
    console.log('repostButton1', repostButton);

    if (repostButton) {
      repostButton.click();
      await delay(1000); // Wait for repost dialog

      const repostDialogButton = document.evaluate(
          ".//div[contains(@class, 'artdeco-dropdown__item')]",
          post,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
      ).snapshotItem(1);

      // Find and click the "Repost" button in the dialog

      if (repostDialogButton) {
        repostDialogButton.click();
        await delay(1000); // Wait for repost to complete
        return true;
      } else {
        console.error('LinkedIn Post Automator: Could not find repost confirmation button');
        return false;
      }
    } else {
      console.error('LinkedIn Post Automator: Could not find repost button');
      return false;
    }
  } catch (error) {
    console.error('LinkedIn Post Automator: Error reposting post', error);
    return false;
  }
}

/**
 * Helper function to find an element within a post
 * @param {Element} post - The post element
 * @param {string} selector - The base CSS selector
 * @param {string} [textContent] - Optional text content to match
 * @param {string} [attribute] - Optional attribute to check for existence
 * @returns {Element|null} - The found element or null
 */
function findElementInPost(post, selector, textContent, attribute) {
  // Get all matching elements within the post
  const elements = Array.from(post.querySelectorAll(selector));

  // If no text content specified, return the first match
  if (!textContent) {
    return elements[0] || null;
  }

  // Filter by text content
  const matchingElements = elements.filter(el => {
    const text = el.textContent.toLowerCase();
    return text.includes(textContent.toLowerCase());
  });

  // If no attribute specified, return the first match by text
  if (!attribute) {
    return matchingElements[0] || null;
  }

  // Filter by attribute
  const elementWithAttribute = matchingElements.find(el => el.hasAttribute(attribute));
  return elementWithAttribute || matchingElements[0] || null;
}

/**
 * Helper function to create a delay
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} - Resolves after the delay
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Load configuration from storage
function loadConfiguration() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({
      // Default values
      postsToProcess: 3,
      enableLike: true,
      enableRepost: true
    }, (items) => {
      config = items;
      resolve(config);
    });
  });
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'processLinkedInPosts') {
    // Load latest config and process posts
    loadConfiguration().then(() => {
      processLinkedInPosts();
    });
    return true; // Indicates async response
  }
});

// Initialize when the page is fully loaded
window.addEventListener('load', () => {
  console.log('LinkedIn Post Automator: Content script loaded');

  // Check if we should automatically process posts
  chrome.storage.sync.get({
    autoProcess: false
  }, (items) => {
    if (items.autoProcess) {
      // Wait a bit for the page to stabilize
      setTimeout(() => {
        loadConfiguration().then(() => {
          processLinkedInPosts();
        });
      }, 3000);
    }
  });
});
