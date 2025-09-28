/**
 * SessionSync Content Script
 * Runs on every website to detect login/logout events
 */

// Prevent multiple declarations
if (typeof window.SessionDetector !== 'undefined') {
  console.log('SessionSync: Content script already loaded, skipping');
} else {
  class SessionDetector {
    // ... keep all your class code here ...
  }

  // Initialize the session detector
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.SessionDetector = new SessionDetector();
    });
  } else {
    window.SessionDetector = new SessionDetector();
  }
}


class SessionDetector {
  constructor() {
    this.hostname = window.location.hostname;
    this.url = window.location.href;
    this.isLoggedIn = false;
    this.loginSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      '[data-testid*="login"]',
      '[data-testid*="signin"]',
      'button:contains("Sign in")',
      'button:contains("Log in")',
      'button:contains("Login")',
      '.login-button',
      '.signin-button',
      '#login-button',
      '#signin-button'
    ];
    
    this.logoutSelectors = [
      '[data-testid*="logout"]',
      '[data-testid*="signout"]',
      'button:contains("Sign out")',
      'button:contains("Log out")',
      'button:contains("Logout")',
      '.logout-button',
      '.signout-button',
      '#logout-button',
      '#signout-button',
      'a[href*="logout"]',
      'a[href*="signout"]'
    ];
    
    this.formSelectors = [
      'form[action*="login"]',
      'form[action*="signin"]',
      'form.login-form',
      'form.signin-form',
      '#login-form',
      '#signin-form'
    ];
    
    this.init();
  }
  
  init() {
    // Initial check
    this.checkInitialState();
    
    // Set up observers
    this.setupMutationObserver();
    this.setupStorageListener();
    this.setupFormListener();
    
    console.log('SessionSync: Content script initialized for', this.hostname);
  }
  
  checkInitialState() {
    const hasLogoutButtons = this.findElements(this.logoutSelectors).length > 0;
    const hasLoginForms = this.findElements(this.formSelectors).length > 0;
    const hasLoginButtons = this.findElements(this.loginSelectors).length > 0;
    
    // If logout buttons exist and no login forms, likely logged in
    if (hasLogoutButtons && !hasLoginForms) {
      this.isLoggedIn = true;
      this.sendLoginEvent();
    }
    // If login forms/buttons exist and no logout buttons, likely logged out
    else if ((hasLoginForms || hasLoginButtons) && !hasLogoutButtons) {
      this.isLoggedIn = false;
    }
  }
  
  findElements(selectors) {
    const elements = [];
    selectors.forEach(selector => {
      try {
        if (selector.includes(':contains(')) {
          // Handle custom :contains() selector
          const text = selector.match(/:contains\("([^"]+)"\)/)[1];
          const baseSelector = selector.split(':contains(')[0];
          const baseElements = baseSelector ? document.querySelectorAll(baseSelector) : document.querySelectorAll('*');
          
          Array.from(baseElements).forEach(el => {
            if (el.textContent && el.textContent.toLowerCase().includes(text.toLowerCase())) {
              elements.push(el);
            }
          });
        } else {
          elements.push(...document.querySelectorAll(selector));
        }
      } catch (e) {
        // Ignore invalid selectors
      }
    });
    return elements;
  }
  
  setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      let shouldCheck = false;
      
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              shouldCheck = true;
            }
          });
          
          mutation.removedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              shouldCheck = true;
            }
          });
        }
      });
      
      if (shouldCheck) {
        setTimeout(() => this.checkForStateChange(), 500);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  setupStorageListener() {
    // Monitor localStorage changes
    const originalSetItem = localStorage.setItem;
    const originalRemoveItem = localStorage.removeItem;
    
    localStorage.setItem = (key, value) => {
      originalSetItem.call(localStorage, key, value);
      if (this.isAuthRelatedKey(key)) {
        setTimeout(() => this.checkForStateChange(), 1000);
      }
    };
    
    localStorage.removeItem = (key) => {
      originalRemoveItem.call(localStorage, key);
      if (this.isAuthRelatedKey(key)) {
        setTimeout(() => this.checkForStateChange(), 1000);
      }
    };
  }
  
  setupFormListener() {
    document.addEventListener('submit', (e) => {
      const form = e.target;
      if (form.tagName === 'FORM') {
        const isLoginForm = this.formSelectors.some(selector => {
          try {
            return form.matches(selector) || form.querySelector('input[type="password"]');
          } catch (e) {
            return false;
          }
        });
        
        if (isLoginForm) {
          // Wait a bit for the form submission to complete
          setTimeout(() => this.checkForStateChange(), 2000);
        }
      }
    });
  }
  
  isAuthRelatedKey(key) {
    const authKeys = ['token', 'auth', 'user', 'session', 'login', 'jwt', 'access_token'];
    return authKeys.some(authKey => key.toLowerCase().includes(authKey));
  }
  
  checkForStateChange() {
    const hasLogoutButtons = this.findElements(this.logoutSelectors).length > 0;
    const hasLoginForms = this.findElements(this.formSelectors).length > 0;
    const hasLoginButtons = this.findElements(this.loginSelectors).length > 0;
    
    const currentlyLoggedIn = hasLogoutButtons && !hasLoginForms;
    const currentlyLoggedOut = (hasLoginForms || hasLoginButtons) && !hasLogoutButtons;
    
    // State changed from logged out to logged in
    if (!this.isLoggedIn && currentlyLoggedIn) {
      this.isLoggedIn = true;
      this.sendLoginEvent();
    }
    // State changed from logged in to logged out
    else if (this.isLoggedIn && currentlyLoggedOut) {
      this.isLoggedIn = false;
      this.sendLogoutEvent();
    }
  }
  
sendLoginEvent() {
  const email = this.extractEmail();
  console.log("SessionSync: Sending LOGIN event", {
    hostname: this.hostname,
    url: this.url,
    email: email
  });

  chrome.runtime.sendMessage({
    type: 'LOGIN',
    hostname: this.hostname,
    url: this.url,
    email: email,
    timestamp: Date.now()
  });
}

sendLogoutEvent() {
  console.log("SessionSync: Sending LOGOUT event", {
    hostname: this.hostname,
    url: this.url
  });

  chrome.runtime.sendMessage({
    type: 'LOGOUT',
    hostname: this.hostname,
    url: this.url,
    timestamp: Date.now()
  });
}

  
  extractEmail() {
    // Try to find email in various places
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    
    // Check visible text on page
    const bodyText = document.body.textContent || '';
    const emailsInText = bodyText.match(emailRegex);
    
    // Check input fields
    const emailInputs = document.querySelectorAll('input[type="email"], input[name*="email"], input[id*="email"]');
    let emailFromInput = null;
    
    emailInputs.forEach(input => {
      if (input.value && emailRegex.test(input.value)) {
        emailFromInput = input.value;
      }
    });
    
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
      // Ignore localStorage errors
    }
    
    return emailFromInput || emailFromStorage || (emailsInText && emailsInText[0]) || null;
  }
}

// Initialize the session detector
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.SessionDetector = new SessionDetector();
  });
} else {
  window.SessionDetector = new SessionDetector();
}