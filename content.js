function extractEmail() {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

  // Check input fields
  const emailInputs = document.querySelectorAll('input[type="email"], input[name*="email"], input[id*="email"]');
  let emailFromInput = null;
  emailInputs.forEach(input => {
    if (input.value && emailRegex.test(input.value)) {
      emailFromInput = input.value;
    }
  });

  // Check page text as fallback
  const bodyText = document.body.textContent || '';
  const emailsInText = bodyText.match(emailRegex);

  // Check localStorage
  let emailFromStorage = null;
  try {
    Object.keys(localStorage).forEach(key => {
      const value = localStorage.getItem(key);
      if (value && emailRegex.test(value)) {
        const match = value.match(emailRegex);
        if (match) emailFromStorage = match[0];
      }
    });
  } catch (e) {
    console.error('Error accessing localStorage:', e);
  }

  // Check cookies
  let emailFromCookie = null;
  try {
    const cookies = document.cookie.split(';').map(c => c.trim());
    cookies.forEach(cookie => {
      const [name, value] = cookie.split('=');
      if (value && emailRegex.test(value)) {
        const match = value.match(emailRegex);
        if (match) emailFromCookie = match[0];
      }
    });
  } catch (e) {
    console.error('Error accessing cookies:', e);
  }

  console.log('Email extraction results:', {
    input: emailFromInput,
    text: emailsInText && emailsInText[0],
    storage: emailFromStorage,
    cookie: emailFromCookie
  });

  return emailFromInput || emailFromStorage || emailFromCookie || (emailsInText && emailsInText[0]) || null;
}

// Track state to prevent duplicate spams
let isLoggedIn = false;
let debounceTimer = null;

// Send login event with a unique identifier
function sendLoginEvent(eventId = Date.now()) {
  if (isLoggedIn) {
    console.log(`SessionSync: Login already sent for ${window.location.hostname}, ignoring (Event ID: ${eventId})`);
    return;
  }

  const email = extractEmail();
  console.log(`SessionSync: Sending LOGIN event (ID: ${eventId})`, {
    hostname: window.location.hostname,
    url: window.location.href,
    email: email
  });

  chrome.runtime.sendMessage({
    type: 'LOGIN',
    eventId: eventId,
    hostname: window.location.hostname,
    url: window.location.href,
    email: email,
    timestamp: Date.now()
  });

  isLoggedIn = true; // Set flag after sending
}

// Send logout event
function sendLogoutEvent() {
  if (!isLoggedIn) {
    console.log(`SessionSync: No active login to logout for ${window.location.hostname}`);
    return;
  }

  console.log("SessionSync: Sending LOGOUT event", {
    hostname: window.location.hostname,
    url: window.location.href
  });

  chrome.runtime.sendMessage({
    type: 'LOGOUT',
    hostname: window.location.hostname,
    url: window.location.href,
    timestamp: Date.now()
  });

  isLoggedIn = false; // Reset flag after sending
}

// Use a single delay on load to ensure dynamic content is ready
window.addEventListener('load', () => {
  const eventId = Date.now();
  setTimeout(() => sendLoginEvent(eventId), 1500); // Single trigger with delay
});

// Mutation observer with debounce to prevent excessive calls
const observer = new MutationObserver(() => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const eventId = Date.now();
    if (!isLoggedIn) {
      sendLoginEvent(eventId); // Only send if not already logged in
    }
  }, 2000); // Debounce to 2 seconds
});
observer.observe(document.body, { childList: true, subtree: true });

// Prevent multiple initializations
if (typeof window.SessionDetector === 'undefined') {
  window.SessionDetector = true;
  console.log('SessionSync: Content script initialized for', window.location.hostname);
}
