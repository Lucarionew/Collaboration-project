// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import {
    getFirestore, collection, getDocs, query, orderBy, limit, doc, updateDoc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-storage.js";

// Firebase config
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
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

let activities = [];
let userData = {};
let emails = [];
const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const headerProfilePic = document.getElementById('headerProfilePic');
const DEFAULT_AVATAR = 'https://via.placeholder.com/45x45/21262d/8b949e?text=👤';

// Auth state check
onAuthStateChanged(auth, async (user) => {
    if (user) {
        profileEmail.textContent = user.email;
        await fetchUserProfile(user);
        fetchActivitiesFromFirestore();
    } else {
        window.location.href = "login-index.html";
    }
});

// Fetch user profile from Firestore
async function fetchUserProfile(user) {
    const userRef = doc(db, 'users', user.uid);
    try {
        const snap = await getDoc(userRef);
        if (snap.exists()) {
            userData = snap.data();
        } else {
            userData = {
                name: user.displayName || user.email,
                photoURL: user.photoURL || DEFAULT_AVATAR,
                emails: [user.email]
            };
            await setDoc(userRef, userData);
        }
        emails = userData.emails || [user.email];
        headerProfilePic.src = userData.photoURL || DEFAULT_AVATAR;
        profileName.textContent = userData.name;
        populateModal();
        renderEmails();
    } catch (error) {
        console.error("Error fetching user profile:", error);
        showNotification("Failed to load profile data", "warning");
    }
}

// Populate modal with current data
function populateModal() {
    document.getElementById('nameInput').value = userData.name || '';
    document.getElementById('currentPic').src = userData.photoURL || DEFAULT_AVATAR;
}

// Render emails in modal
function renderEmails() {
    const emailsList = document.getElementById('emailsList');
    emailsList.innerHTML = '';
    emails.forEach((email, i) => {
        const div = document.createElement('div');
        div.className = 'email-pill';
        div.innerHTML = `
            <span>${email}</span>
            <button type="button" class="remove-email-btn">×</button>
        `;
        const removeBtn = div.querySelector('.remove-email-btn');
        removeBtn.addEventListener('click', () => {
            emails.splice(i, 1);
            renderEmails();
        });
        emailsList.appendChild(div);
    });
}

// Fetch session data
async function fetchActivitiesFromFirestore() {
    try {
        const sessionsRef = collection(db, "sessions");
        const q = query(sessionsRef, orderBy("timestamp", "desc"), limit(50));
        const snapshot = await getDocs(q);

        activities = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                website: data.site,
                device: data.device,
                email: data.email,
                time: new Date(data.timestamp?.seconds * 1000 || data.lastLogin).toISOString(),
                status: data.active ? "active" : "inactive",
                deviceStatus: data.deviceStatus || "Untrusted"
            };
        });

        renderActivities();
        updateStats();
    } catch (error) {
        console.error("Error fetching sessions:", error);
    }
}

// Render table rows
function renderActivities() {
    const tableBody = document.getElementById('activityTableBody');
    tableBody.innerHTML = '';

    activities.forEach(activity => {
        const row = createActivityRow(activity);
        tableBody.appendChild(row);
    });
}

// Create row
function createActivityRow(activity) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><div class="website-name">${activity.website}</div></td>
        <td><div class="device-info">${activity.device}</div></td>
        <td><div class="email-info">${activity.email}</div></td>
        <td><div class="time-info">${formatTime(activity.time)}</div></td>
        <td>
            <span class="status-badge status-${activity.status}">
                ${activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
            </span>
        </td>
        <td>
            <select class="device-status-dropdown" data-id="${activity.id}">
                <option value="Trusted" ${activity.deviceStatus === "Trusted" ? "selected" : ""}>Trusted</option>
                <option value="Untrusted" ${activity.deviceStatus === "Untrusted" ? "selected" : ""}>Untrusted</option>
            </select>
        </td>
    `;
    return row;
}

// Handle dropdown change
document.addEventListener("change", async (event) => {
    if (event.target.classList.contains("device-status-dropdown")) {
        const id = event.target.getAttribute("data-id");
        const newStatus = event.target.value;
        await updateDeviceStatus(id, newStatus);
    }
});

// Update Firestore when device status changes
async function updateDeviceStatus(id, newStatus) {
    try {
        const ref = doc(db, "sessions", id);
        await updateDoc(ref, { deviceStatus: newStatus });

        const activity = activities.find(a => a.id === id);
        if (activity) activity.deviceStatus = newStatus;

        showNotification(`Device marked as ${newStatus}`, "success");
    } catch (error) {
        console.error("Error updating device status:", error);
        showNotification("Failed to update device status", "warning");
    }
}

// Format timestamp
function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString();
}

// Update stats
function updateStats() {
    const total = activities.length;
    const active = activities.filter(a => a.status === "active").length;
    const inactive = total - active;

    document.getElementById('totalLogins').textContent = total;
    document.getElementById('activeSessions').textContent = active;
    document.getElementById('inactiveSessions').textContent = inactive;
}

// Notification popup
function showNotification(message, type = "info") {
    const notification = document.getElementById("notification");
    notification.textContent = message;
    notification.className = `notification show ${type}`;
    setTimeout(() => {
        notification.className = "notification";
    }, 2500);
}

// Profile Modal Logic
const modal = document.getElementById('profileModal');
const editProfileBtn = document.getElementById('editProfileBtn');
const closeBtn = document.querySelector('.close');
const addEmailBtn = document.getElementById('addEmailBtn');
const profileForm = document.getElementById('profileForm');
const newEmailInput = document.getElementById('newEmailInput');

editProfileBtn.addEventListener('click', () => {
    populateModal();
    renderEmails();
    modal.style.display = 'block';
});

closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

addEmailBtn.addEventListener('click', () => {
    const email = newEmailInput.value.trim();
    if (email && !emails.includes(email)) {
        emails.push(email);
        renderEmails();
        newEmailInput.value = '';
    }
});

profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('nameInput').value.trim() || userData.name;
    let photoURL = userData.photoURL;
    const file = document.getElementById('picInput').files[0];

    if (file) {
        try {
            console.log("Starting upload for file:", file.name);
            const storageRef = ref(storage, `profile_pics/${auth.currentUser.uid}`);
            const uploadTask = await uploadBytes(storageRef, file);
            photoURL = await getDownloadURL(uploadTask.ref);
            console.log("Upload successful, new URL:", photoURL);
        } catch (error) {
            console.error("Upload error details:", error);
            if (error.code === 'storage/cors-error') {
                showNotification("Upload failed: CORS issue. Configure Firebase Storage CORS for localhost (see docs).", "warning");
            } else if (error.code === 'storage/unauthorized') {
                showNotification("Upload failed: Check Firebase Storage rules and auth.", "warning");
            } else {
                showNotification(`Upload failed: ${error.message}`, "warning");
            }
            // Fallback to default if upload fails
            photoURL = DEFAULT_AVATAR;
        }
    } else {
        // No file selected, use default
        photoURL = DEFAULT_AVATAR;
    }

    try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, {
            name,
            photoURL,
            emails
        });
        await updateProfile(auth.currentUser, { displayName: name, photoURL });
        userData.name = name;
        userData.photoURL = photoURL;
        headerProfilePic.src = photoURL;
        document.getElementById('currentPic').src = photoURL;
        showNotification("Profile updated successfully", "success");
        modal.style.display = 'none';
    } catch (error) {
        console.error("Profile update error:", error);
        showNotification(`Failed to update profile: ${error.message}`, "warning");
    }
});
