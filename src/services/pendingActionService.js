const fs = require('fs');
const path = require('path');

const STORAGE_DIR = path.join(__dirname, '..', 'storage');
const STORAGE_FILE = path.join(STORAGE_DIR, 'pending-actions.json');
const TTL_MS = 15 * 60 * 1000;

let pendingActions = {};

function ensureStorageFile() {
  try {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });

    if (!fs.existsSync(STORAGE_FILE)) {
      fs.writeFileSync(STORAGE_FILE, '{}\n');
    }
  } catch (error) {
    console.error('Pending action storage unavailable', {
      message: error.message,
    });
  }
}

function writeStorage() {
  try {
    ensureStorageFile();
    fs.writeFileSync(STORAGE_FILE, `${JSON.stringify(pendingActions, null, 2)}\n`);
  } catch (error) {
    console.error('Pending action storage write failed', {
      message: error.message,
    });
  }
}

function loadStorage() {
  try {
    ensureStorageFile();
    const rawContent = fs.readFileSync(STORAGE_FILE, 'utf8').trim() || '{}';
    const parsedContent = JSON.parse(rawContent);

    pendingActions =
      parsedContent && typeof parsedContent === 'object' && !Array.isArray(parsedContent)
        ? parsedContent
        : {};
  } catch (error) {
    console.error('Pending action storage corrupted, recreating file', {
      message: error.message,
    });

    pendingActions = {};
    writeStorage();
  }
}

function isExpired(action) {
  return Boolean(action?.expiresAt && new Date(action.expiresAt).getTime() <= Date.now());
}

function save(phone, action) {
  const createdAt = action.createdAt || new Date().toISOString();
  const expiresAt =
    action.expiresAt || new Date(new Date(createdAt).getTime() + TTL_MS).toISOString();

  pendingActions[phone] = {
    ...action,
    createdAt,
    expiresAt,
  };

  writeStorage();

  return pendingActions[phone];
}

function get(phone) {
  const action = pendingActions[phone] || null;

  if (!action) {
    return null;
  }

  if (isExpired(action)) {
    remove(phone);

    return {
      ...action,
      expired: true,
    };
  }

  return action;
}

function remove(phone) {
  delete pendingActions[phone];
  writeStorage();
}

function exists(phone) {
  return Boolean(get(phone));
}

function cleanupExpired() {
  let hasChanges = false;

  Object.entries(pendingActions).forEach(([phone, action]) => {
    if (isExpired(action)) {
      delete pendingActions[phone];
      hasChanges = true;
    }
  });

  if (hasChanges) {
    writeStorage();
  }
}

function getAll() {
  cleanupExpired();

  return { ...pendingActions };
}

function initialize() {
  loadStorage();
  cleanupExpired();
  console.log('Pending actions restored');
}

loadStorage();

module.exports = {
  save,
  get,
  remove,
  exists,
  cleanupExpired,
  getAll,
  initialize,
  TTL_MS,
};
