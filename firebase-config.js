// Firebase config module for extension
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCfFj25OSC9UQ6FwjmmcVXid-4ZcqM_pZQ",
  authDomain: "session-management-syste-f85fb.firebaseapp.com",
  projectId: "session-management-syste-f85fb",
  storageBucket: "session-management-syste-f85fb.firebasestorage.app",
  messagingSenderId: "159188709751",
  appId: "1:159188709751:web:70db4526ab13f7df5b7172",
  measurementId: "G-HEJFEZDMEF"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
