import { db } from "./firebase-config.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

sendLoginEvent() {
  const email = this.extractEmail();
  const data = {
    hostname: this.hostname,
    url: this.url,
    email: email,
    timestamp: Date.now()
  };
  console.log("SessionSync: Sending LOGIN event", data);

  chrome.runtime.sendMessage({ type: 'LOGIN', ...data });

  // Optional: Direct Firestore sync from content script
  if (db) {
    addDoc(collection(db, "sessions"), { ...data, device: navigator.userAgent, timestamp: serverTimestamp() })
      .then(() => console.log('SessionSync: LOGIN saved from content script'))
      .catch(err => console.error('SessionSync: Firestore LOGIN error', err));
  }
}

sendLogoutEvent() {
  const data = {
    hostname: this.hostname,
    url: this.url,
    timestamp: Date.now()
  };
  console.log("SessionSync: Sending LOGOUT event", data);

  chrome.runtime.sendMessage({ type: 'LOGOUT', ...data });

  if (db) {
    addDoc(collection(db, "sessions"), { ...data, device: navigator.userAgent, active: false, timestamp: serverTimestamp() })
      .then(() => console.log('SessionSync: LOGOUT saved from content script'))
      .catch(err => console.error('SessionSync: Firestore LOGOUT error', err));
  }
}
