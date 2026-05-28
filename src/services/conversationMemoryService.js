const fs = require('fs');
const path = require('path');

const STORAGE_DIR = path.join(__dirname, '..', 'storage');
const STORAGE_FILE = path.join(STORAGE_DIR, 'user-history.json');
const MAX_INTERACTIONS_PER_USER = 20;
const RECENT_HISTORY_LIMIT = 10;
const HISTORY_TTL_MS = 30 * 24 * 60 * 60 * 1000;

let userHistory = {};

function ensureStorageFile() {
  try {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });

    if (!fs.existsSync(STORAGE_FILE)) {
      fs.writeFileSync(STORAGE_FILE, '{}\n');
    }
  } catch (error) {
    console.error('Conversation memory storage unavailable', {
      message: error.message,
    });
  }
}

function writeStorage() {
  try {
    ensureStorageFile();
    fs.writeFileSync(STORAGE_FILE, `${JSON.stringify(userHistory, null, 2)}\n`);
  } catch (error) {
    console.error('Conversation memory storage write failed', {
      message: error.message,
    });
  }
}

function loadStorage() {
  try {
    ensureStorageFile();
    const rawContent = fs.readFileSync(STORAGE_FILE, 'utf8').trim() || '{}';
    const parsedContent = JSON.parse(rawContent);

    userHistory =
      parsedContent && typeof parsedContent === 'object' && !Array.isArray(parsedContent)
        ? parsedContent
        : {};
  } catch (error) {
    console.error('Conversation memory storage corrupted, recreating file', {
      message: error.message,
    });

    userHistory = {};
    writeStorage();
  }
}

function addInteraction(phone, role, message) {
  const currentHistory = Array.isArray(userHistory[phone]) ? userHistory[phone] : [];

  currentHistory.push({
    role,
    message,
    timestamp: new Date().toISOString(),
  });

  userHistory[phone] = currentHistory.slice(-MAX_INTERACTIONS_PER_USER);
  writeStorage();
}

function getRecentHistory(phone) {
  const currentHistory = Array.isArray(userHistory[phone]) ? userHistory[phone] : [];

  return currentHistory.slice(-RECENT_HISTORY_LIMIT);
}

function clearOldHistory() {
  const cutoff = Date.now() - HISTORY_TTL_MS;
  let hasChanges = false;

  Object.entries(userHistory).forEach(([phone, history]) => {
    if (!Array.isArray(history)) {
      delete userHistory[phone];
      hasChanges = true;
      return;
    }

    const freshHistory = history.filter((item) => {
      const timestamp = new Date(item.timestamp).getTime();

      return !Number.isNaN(timestamp) && timestamp >= cutoff;
    });

    if (freshHistory.length !== history.length) {
      userHistory[phone] = freshHistory.slice(-MAX_INTERACTIONS_PER_USER);
      hasChanges = true;
    }
  });

  if (hasChanges) {
    writeStorage();
  }
}

function getLastExpenseContext(phone) {
  const history = getRecentHistory(phone);

  return [...history]
    .reverse()
    .find((item) => item.role === 'user' && /\d/.test(item.message || '')) || null;
}

function clearHistory(phone) {
  delete userHistory[phone];
  writeStorage();
}

function initialize() {
  loadStorage();
  clearOldHistory();
  console.log('Conversation memory loaded');
}

loadStorage();

module.exports = {
  addInteraction,
  getRecentHistory,
  clearOldHistory,
  getLastExpenseContext,
  clearHistory,
  initialize,
};
