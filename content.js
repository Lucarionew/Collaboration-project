// In content.js, just send messages
sendLoginEvent() {
  const email = this.extractEmail();
  chrome.runtime.sendMessage({
    type: 'LOGIN',
    hostname: this.hostname,
    url: this.url,
    email: email,
    timestamp: Date.now()
  });
}

sendLogoutEvent() {
  chrome.runtime.sendMessage({
    type: 'LOGOUT',
    hostname: this.hostname,
    url: this.url,
    timestamp: Date.now()
  });
}
