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

  const extractedEmail = emailFromInput || emailFromStorage || emailFromCookie || (emailsInText && emailsInText[0]) || null;
  console.log('Email extraction results:', {
    input: emailFromInput,
    text: emailsInText && emailsInText[0],
    storage: emailFromStorage,
    cookie: emailFromCookie,
    final: extractedEmail
  });

  return extractedEmail;
}

// Send login event with a unique identifier to track
function sendLoginEvent(eventId = Date.now()) {
  const email = extractEmail();
  console.log(`SessionSync: Sending LOGIN event (ID: ${eventId})`, {
    hostname: window.location.hostname,
    url: window.location.href,
    email: email
  });

  chrome.runtime.sendMessage({
    type: 'LOGIN',
    eventId: eventId, // Unique ID to trace the message
    hostname: window.location.hostname,
    url: window.location.href,
    email: email,
    timestamp: Date.now()
  });
}

// Send logout event
function sendLogoutEvent() {
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
}

// Use a delay on load to ensure dynamic content is ready
window.addEventListener('load', () => {
  const eventId = Date.now();
  setTimeout(() => sendLoginEvent(eventId), 1000);
  setTimeout(() => sendLoginEvent(eventId), 3000); // Second check
});

// Mutation observer for dynamic DOM changes
const observer = new MutationObserver(() => {
  const eventId = Date.now();
  sendLoginEvent(eventId);
});
observer.observe(document.body, { childList: true, subtree: true });

// Prevent multiple initializations
if (typeof window.SessionDetector === 'undefined') {
  window.SessionDetector = true;
  console.log('SessionSync: Content script initialized for', window.location.hostname);
}
