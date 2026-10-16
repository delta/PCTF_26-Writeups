function validateName(input) {
  if (typeof input !== 'string') return false;

  // max 50 char username
  if (input.length < 2 || input.length > 50) return false;

  return isSafe(input);
}

function validateAvatar(input) {
  if (typeof input !== 'string') return false;
  if (!input.startsWith('https://')) return false;

  // TODO: add file upload feature and whitelist my cdn endpoint
  const allowedDomains = [
    'picsum.photos',
    'imgur.com',
    'i.imgur.com',
    'unsplash.com',
    'pexels.com',
  ];

  try {
    const url = new URL(input);
    if (!allowedDomains.includes(url.hostname)) return false;
  } catch {
    return false;
  }

  return isSafe(input);
}

function isSafe(input) {
  const blockedWords = [
    "\"", // prevent attribute escape
    '\n',
    '\r',
    'fetch',
    'XMLHttpRequest',
    'navigator',
    'sendBeacon',
    'postMessage',
    'location',
    'document',
    'window',
    'Function',
    'constructor',
    'import',
    '__proto__',
    'prototype',
    'escape',
    'from',
    'char',
    'atob',
    'btoa'
  ];

  const lowerInput = input.toLowerCase();
  for (const word of blockedWords) {
    if (lowerInput.includes(word.toLowerCase())) return false;
  }

  // other validations
  if (/%0a|%0d/i.test(input)) return false; // Block URL encoded stuff
  if (/\\x[\da-f]{2}/i.test(input)) return false; // Hex escapes

  return true
}
