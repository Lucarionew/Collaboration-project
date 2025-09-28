import { db } from "./firebase-config.js";  // Import Firestore
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.firebaseInitialized = false;
    this.init();
  }

  async init() {
    await this.loadSessions();
    this.firebaseInitialized = true;  // Firebase already imported
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
    this.syncWithFirebase(session);
    this.updateBadge();
  }

  async handleLogout(message, tab) {
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

  getSessions() {
    return Array.from(this.sessions.values());
  }
}

const sessionManager = new SessionManager();

chrome.runtime.onInstalled.addListener(() => {
  console.log('SessionSync: Extension installed');
});
