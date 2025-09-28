// Utility to extract email (replace with your logic)
function extractEmail() {
  // Example: get email from page or input
  return document.querySelector('input[type="email"]')?.value || 'unknown@example.com';
}

// Send login event
function sendLoginEvent() {
  const email = extractEmail();
  chrome.runtime.sendMessage({
    type: 'LOGIN',
    hostname: window.location.hostname,
    url: window.location.href,
    email: email,
    timestamp: Date.now()
  });
}

// Send logout event
function sendLogoutEvent() {
  chrome.runtime.sendMessage({
    type: 'LOGOUT',
    hostname: window.location.hostname,
    url: window.location.href,
    timestamp: Date.now()
  });
}

// Example usage: automatically send login on page load
window.addEventListener('load', () => {
  sendLoginEvent();
});

// Example: send logout before leaving page
window.addEventListener('beforeunload', () => {
  sendLogoutEvent();
});
