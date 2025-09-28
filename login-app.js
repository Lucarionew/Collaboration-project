// Import Firebase config + services
import { app } from "./firebase-config.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider 
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { getFirestore, setDoc, doc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

// --------------------
// Signup form handler (Email/Password)
// --------------------
const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("signup-username").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;

    if (!name || !email || !password) {
      alert("Please fill all fields.");
      return;
    }

    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      
      // Save additional profile info to Firestore
      await setDoc(doc(db, "users", userCred.user.uid), {
        name: name,
        email: email,
        createdAt: new Date()
      });

      console.log("User signed up:", userCred.user.uid);
      alert(`Welcome ${name}!`);
      window.location.href = "dashboard.html";
    } catch (err) {
      console.error("Signup error:", err);
      alert(err.message);
    }
  });
}

// --------------------
// Login form handler (Email/Password)
// --------------------
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;

    if (!email || !password) {
      alert("Please enter email and password.");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log("User logged in:", email);
      window.location.href = "dashboard.html";
    } catch (err) {
      console.error("Login error:", err);
      alert(err.message);
    }
  });
}

// --------------------
// Google login button
// --------------------
const googleLoginBtn = document.getElementById("googleLoginBtn");
if (googleLoginBtn) {
  googleLoginBtn.addEventListener("click", async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log("Google login:", user);

      // Save user info in Firestore if not exists
      await setDoc(doc(db, "users", user.uid), {
        name: user.displayName || "",
        email: user.email,
        createdAt: new Date()
      }, { merge: true }); // merge:true avoids overwriting existing data

      window.location.href = "dashboard.html";
    } catch (err) {
      console.error("Google login error:", err);
      alert(err.message);
    }
  });
}

// --------------------
// Google signup button
// --------------------
const googleSignupBtn = document.getElementById("googleSignupBtn");
if (googleSignupBtn) {
  googleSignupBtn.addEventListener("click", async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log("Google signup:", user);

      // Save user info in Firestore if not exists
      await setDoc(doc(db, "users", user.uid), {
        name: user.displayName || "",
        email: user.email,
        createdAt: new Date()
      }, { merge: true });

      window.location.href = "dashboard.html";
    } catch (err) {
      console.error("Google signup error:", err);
      alert(err.message);
    }
  });
}
