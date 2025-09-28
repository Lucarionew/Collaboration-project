import { db } from "./firebase-config.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.firebaseInitialized = false;
    this.init();
  }

  async init() {
    await this.loadSessions();
    await this.initializeFirebase();
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
      this.firebaseInitialized = true;
      this.setupFirebaseListeners();
    } catch (error) {
      console.error('SessionSync: Firebase initialization failed:', error);
    }
  }

  setupFirebaseListeners() {
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

      return true; // Required for async sendResponse
    });
  }

  async handleLogin(message, tab) {
    console.log("SessionSync: Handling LOGIN", message);
    const { hostname, url, email, timestamp, eventId } = message;
    if (!this.sessions.has(hostname) || (message.email !== null && message.email !== 'unknown@example.com')) {
      const session = {
        site: hostname,
        email: email || 'unknown@example.com', // Only fallback if email is null
        active: true,
        lastLogin: timestamp,
        lastLogout: null,
        device: await this.getDeviceInfo(),
        tabId: tab?.id || null,
        url: url
      };
      this.sessions.set(hostname, session);
      await this.saveSessions();
      this.syncWithFirebase(session);
      console.log(`SessionSync: Login recorded for ${hostname} (Event ID: ${eventId}) with email: ${email}`);
    } else {
      console.log(`SessionSync: Skipping update for ${hostname} (Event ID: ${eventId}) due to existing session or no new email`);
    }
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
      this.syncWithFirebase(session);
      this.updateBadge();
    }
  }

  async handleRemoteLogout(message) {
    console.log("SessionSync: Handling REMOTE_LOGOUT", message);
    const { hostname } = message;
    if (this.sessions.has(hostname)) {
      const session = this.sessions.get(hostname);
      session.active = false;
      session.lastLogout = Date.now();
      this.sessions.set(hostname, session);
      await this.saveSessions();
      this.syncWithFirebase(session);
      this.updateBadge();
      await this.clearSiteCookies(hostname);
      await this.reloadSiteTabs(hostname);
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
    if (!this.firebaseInitialized) return;
    try {
      await addDoc(collection(db, "sessions"), {
        ...session,
        timestamp: serverTimestamp()
      });
      console.log('SessionSync: Session synced to Firestore', session);
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
    chrome.action.setBadgeText({ text: count > 0 ? count.toString() : '' });
    chrome.action.setBadgeBackgroundColor({ color: count > 0 ? '#4CAF50' : '#F44336' });
  }
}

const sessionManager = new SessionManager();

chrome.runtime.onInstalled.addListener(() => {
  console.log('SessionSync: Extension installed');
});
