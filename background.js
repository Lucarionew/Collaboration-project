/**
 * SessionSync Background Script (Service Worker)
 * Manages session storage and Firebase synchronization
 */

// Firebase configuration - Replace with your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCfFj25OSC9UQ6FwjmmcVXid-4ZcqM_pZQ",
  authDomain: "session-management-syste-f85fb.firebaseapp.com",
  projectId: "session-management-syste-f85fb",
  storageBucket: "session-management-syste-f85fb.firebasestorage.app",
  messagingSenderId: "159188709751",
  appId: "1:159188709751:web:70db4526ab13f7df5b7172",
  measurementId: "G-HEJFEZDMEF"
};

class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.firebaseInitialized = false;
    this.init();
  }
  
  async init() {
    // Load existing sessions from storage
    await this.loadSessions();
    
    // Initialize Firebase
    await this.initializeFirebase();
    
    // Set up message listeners
    this.setupMessageListeners();
    
    console.log('SessionSync: Background script initialized');
  }
  
  async loadSessions() {
    try {
      const result = await chrome.storage.local.get(['sessions']);
      if (result.sessions) {
        this.sessions = new Map(Object.entries(result.sessions));
      }
    } catch (error) {
      console.error('SessionSync: Error loading sessions:', error);
    }
  }
  
  async saveSessions() {
    try {
      const sessionsObj = Object.fromEntries(this.sessions);
      await chrome.storage.local.set({ sessions: sessionsObj });
    } catch (error) {
      console.error('SessionSync: Error saving sessions:', error);
    }
  }
  
  async initializeFirebase() {
    try {
      // Import Firebase modules (you'll need to include Firebase SDK)
      // For now, we'll simulate Firebase initialization
      console.log('SessionSync: Firebase would be initialized here');
      this.firebaseInitialized = true;
      
      // Set up Firebase listeners for remote logout requests
      this.setupFirebaseListeners();
    } catch (error) {
      console.error('SessionSync: Firebase initialization failed:', error);
    }
  }
  
  setupFirebaseListeners() {
    // Listen for remote logout requests from Firebase
    // This would typically use Firebase Firestore real-time listeners
    console.log('SessionSync: Firebase listeners would be set up here');
  }
  
  setupMessageListeners() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("SessionSync: Message received in background", message);

    if (message.type === 'LOGIN') {
      this.handleLogin(message, sender.tab);
    } else if (message.type === 'LOGOUT') {
      this.handleLogout(message, sender.tab);
    } else if (message.type === 'GET_SESSIONS') {
      sendResponse(Array.from(this.sessions.values()));
    } else if (message.type === 'REMOTE_LOGOUT') {
      this.handleRemoteLogout(message);
    }
  });
}

async handleLogin(message, tab) {
  console.log("SessionSync: Handling LOGIN", message);

  const { hostname, url, email, timestamp } = message;
  const session = {
    site: hostname,
    email: email || 'unknown',
    active: true,
    lastLogin: timestamp,
    lastLogout: null,
    device: await this.getDeviceInfo(),
    tabId: tab?.id || null,
    url: url
  };

  this.sessions.set(hostname, session);
  await this.saveSessions();

  console.log('SessionSync: Login recorded for', hostname);
  this.syncWithFirebase(session);
  this.updateBadge();
}

async handleLogout(message, tab) {
  console.log("SessionSync: Handling LOGOUT", message);

  const { hostname, timestamp } = message;
  if (this.sessions.has(hostname)) {
    const session = this.sessions.get(hostname);
    session.active = false;
    session.lastLogout = timestamp;

    this.sessions.set(hostname, session);
    await this.saveSessions();

    console.log('SessionSync: Logout recorded for', hostname);
    this.syncWithFirebase(session);
    this.updateBadge();
  }
}

  
  async clearSiteCookies(hostname) {
    try {
      const cookies = await chrome.cookies.getAll({ domain: hostname });
      
      for (const cookie of cookies) {
        await chrome.cookies.remove({
          url: `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`,
          name: cookie.name
        });
      }
      
      console.log(`SessionSync: Cleared ${cookies.length} cookies for ${hostname}`);
    } catch (error) {
      console.error('SessionSync: Error clearing cookies:', error);
    }
  }
  
  async reloadSiteTabs(hostname) {
    try {
      const tabs = await chrome.tabs.query({ url: `*://${hostname}/*` });
      
      for (const tab of tabs) {
        chrome.tabs.reload(tab.id);
      }
    } catch (error) {
      console.error('SessionSync: Error reloading tabs:', error);
    }
  }
  
  async syncWithFirebase(session) {
    if (!this.firebaseInitialized) {
      console.log('SessionSync: Firebase not initialized, skipping sync');
      return;
    }
    
    try {
      // Here you would sync with Firebase Firestore
      console.log('SessionSync: Would sync session with Firebase:', session);
      
      // Example Firestore operation:
      // await db.collection('sessions').doc(session.site).set(session);
    } catch (error) {
      console.error('SessionSync: Firebase sync error:', error);
    }
  }
  
  async getDeviceInfo() {
    const platformInfo = await chrome.runtime.getPlatformInfo();
    return `Chrome/${chrome.runtime.getManifest().version} (${platformInfo.os})`;
  }
  
  updateBadge() {
    const activeSessions = Array.from(this.sessions.values()).filter(s => s.active);
    const count = activeSessions.length;
    
    chrome.action.setBadgeText({
      text: count > 0 ? count.toString() : ''
    });
    
    chrome.action.setBadgeBackgroundColor({
      color: count > 0 ? '#4CAF50' : '#F44336'
    });
  }
  
  // Public method to get sessions for popup
  getSessions() {
    return Array.from(this.sessions.values());
  }
}

// Initialize the session manager
const sessionManager = new SessionManager();

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('SessionSync: Extension installed');
  }
});

