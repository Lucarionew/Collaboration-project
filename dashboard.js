// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, limit, where, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
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

// Store activities and additional emails
let activities = [];
let additionalEmails = [];

// Elements
const profileName = document.querySelector('.profile-info h2');
const profileEmail = document.querySelector('.profile-info p');
const userAvatar = document.getElementById('userAvatar');
const editProfileBtn = document.getElementById('editProfileBtn');
const profileModal = document.getElementById('profileModal');
const closeModal = profileModal.querySelector('.close');
const usernameInput = document.getElementById('username');
const profilePicInput = document.getElementById('profilePic');
const previewAvatar = document.getElementById('previewAvatar');
const primaryEmail = document.getElementById('primaryEmail');
const additionalEmailsList = document.getElementById('additionalEmailsList');
const newEmailInput = document.getElementById('newEmail');
const addEmailBtn = document.getElementById('addEmailBtn');
const profileForm = document.getElementById('profileForm');
let tempAdditionalEmails = [];

// Initialize dashboard after auth
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Set profile name, email & avatar
        profileName.textContent = user.displayName || user.email.split('@')[0];
        profileEmail.textContent = user.email;
        userAvatar.src = user.photoURL || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';

        // Load user data and activities
        await loadUserData(user);
        fetchActivitiesFromFirestore();
    } else {
        // Redirect if not logged in
        window.location.href = "login.html";
    }
});

// Load user data from Firestore
async function loadUserData(user) {
    try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            additionalEmails = userDoc.data().additionalEmails || [];
        } else {
            await setDoc(userDocRef, { additionalEmails: [] });
            additionalEmails = [];
        }
        tempAdditionalEmails = [...additionalEmails];
        renderAdditionalEmails();
    } catch (error) {
        console.error("Error loading user data:", error);
        showNotification('Failed to load user data', 'warning');
    }
}

// Fetch activities from Firestore
async function fetchActivitiesFromFirestore() {
    try {
        const user = auth.currentUser;
        const allEmails = [user.email, ...additionalEmails];
        if (allEmails.length === 0) {
            console.warn("No emails available for fetching activities");
            return;
        }

        const sessionsRef = collection(db, "sessions");
        const q = query(sessionsRef, where("email", "in", allEmails), orderBy("timestamp", "desc"), limit(50));
        const snapshot = await getDocs(q);

        activities = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                website: data.site || 'Unknown',
                device: data.device || 'Unknown',
                email: data.email || user.email,
                time: new Date(data.timestamp?.seconds * 1000 || data.lastLogin || Date.now()).toISOString(),
                status: data.active ? "safe" : "unsafe"
            };
        });

        renderActivities();
        updateStats();
    } catch (error) {
        console.error("Error fetching sessions:", error);
        showNotification('Failed to fetch activities', 'warning');
    }
}

// Render activities table
function renderActivities() {
    const tableBody = document.getElementById('activityTableBody');
    tableBody.innerHTML = '';

    activities.forEach(activity => {
        const row = createActivityRow(activity);
        tableBody.appendChild(row);
    });
}

// Create a table row for an activity
function createActivityRow(activity) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><div class="website-name">${activity.website}</div></td>
        <td><div class="device-info">${activity.device}</div></td>
        <td><div class="email-info">${activity.email}</div></td>
        <td><div class="time-info">${formatTime(activity.time)}</div></td>
        <td>
            <span class="status-badge status-${activity.status}">
                ${activity.status}
            </span>
        </td>
        <td>
            <div class="action-buttons">
                ${activity.status === 'pending' ? `
                    <button class="action-btn btn-safe" onclick="markAsSafe('${activity.id}')">Safe</button>
                    <button class="action-btn btn-unsafe" onclick="markAsUnsafe('${activity.id}')">Unsafe</button>
                ` : ''}
                <button class="action-btn btn-logout" onclick="forceLogout('${activity.id}')">Logout</button>
            </div>
        </td>
    `;
    return row;
}

// Format time
function formatTime(timeString) {
    const date = new Date(timeString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffInHours < 1) {
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));
        return `${diffInMinutes} min ago`;
    } else if (diffInHours < 24) {
        return `${diffInHours}h ago`;
    } else {
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}

// Mark as safe
window.markAsSafe = function(id) {
    const activity = activities.find(a => a.id === id);
    if (activity) {
        activity.status = 'safe';
        renderActivities();
        updateStats();
        showNotification('Activity marked as safe', 'success');
    }
};

// Mark as unsafe
window.markAsUnsafe = function(id) {
    const activity = activities.find(a => a.id === id);
    if (activity) {
        activity.status = 'unsafe';
        renderActivities();
        updateStats();
        showNotification('Activity marked as unsafe', 'warning');
    }
};

// Force logout
window.forceLogout = function(id) {
    const activity = activities.find(a => a.id === id);
    if (activity) {
        showNotification(`Force logout initiated for ${activity.website}`, 'info');
        console.log(`Force logout for activity ${id} on ${activity.website}`);
    }
};

// Update stats
function updateStats() {
    const totalActivities = activities.length;
    const safeActivities = activities.filter(a => a.status === 'safe').length;
    const pendingActivities = activities.filter(a => a.status === 'pending').length;
    const unsafeActivities = activities.filter(a => a.status === 'unsafe').length;

    document.getElementById('totalActivities').textContent = totalActivities;
    document.getElementById('safeActivities').textContent = safeActivities;
    document.getElementById('pendingActivities').textContent = pendingActivities;
    document.getElementById('unsafeActivities').textContent = unsafeActivities;
}

// Refresh button
window.refreshActivities = function() {
    const refreshBtn = document.querySelector('.refresh-btn');
    refreshBtn.style.opacity = '0.7';
    refreshBtn.style.pointerEvents = 'none';
    fetchActivitiesFromFirestore().then(() => {
        showNotification('Activities refreshed', 'success');
        refreshBtn.style.opacity = '1';
        refreshBtn.style.pointerEvents = 'auto';
    });
};

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification { position: fixed; top: 20px; right: 20px; z-index: 1000; min-width: 300px; background: white; border-radius: 8px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1); border-left: 4px solid #667eea; animation: slideIn 0.3s ease-out;}
            .notification-success { border-left-color: #10b981; }
            .notification-warning { border-left-color: #f59e0b; }
            .notification-info { border-left-color: #3b82f6; }
            .notification-content { padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; }
            .notification-close { background: none; border: none; font-size: 20px; cursor: pointer; color: #666; padding: 0; margin-left: 15px; }
            @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        `;
        document.head.appendChild(style);
    }
    document.body.appendChild(notification);
    setTimeout(() => {
        if (notification.parentElement) notification.remove();
    }, 3000);
}

// Edit Profile Modal Handlers
editProfileBtn.addEventListener('click', () => {
    const user = auth.currentUser;
    if (user) {
        usernameInput.value = user.displayName || user.email.split('@')[0];
        primaryEmail.textContent = user.email;
        tempAdditionalEmails = [...additionalEmails];
        renderAdditionalEmails();
        previewAvatar.src = user.photoURL || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
        previewAvatar.style.display = user.photoURL ? 'block' : 'none';
        profileModal.style.display = 'block';
    }
});

closeModal.addEventListener('click', () => {
    profileModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === profileModal) {
        profileModal.style.display = 'none';
    }
});

addEmailBtn.addEventListener('click', () => {
    const email = newEmailInput.value.trim();
    const user = auth.currentUser;
    if (email && isValidEmail(email) && !tempAdditionalEmails.includes(email) && email !== user.email) {
        tempAdditionalEmails.push(email);
        renderAdditionalEmails();
        newEmailInput.value = '';
        showNotification('Email added to list', 'success');
    } else {
        showNotification('Invalid, duplicate, or primary email', 'warning');
    }
});

function renderAdditionalEmails() {
    additionalEmailsList.innerHTML = '';
    tempAdditionalEmails.forEach(email => {
        const div = document.createElement('div');
        div.textContent = email;
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', () => {
            tempAdditionalEmails = tempAdditionalEmails.filter(e => e !== email);
            renderAdditionalEmails();
            showNotification('Email removed from list', 'info');
        });
        div.appendChild(removeBtn);
        additionalEmailsList.appendChild(div);
    });
}

profilePicInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            previewAvatar.src = e.target.result;
            previewAvatar.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
});

profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    const newName = usernameInput.value.trim();
    let newPhotoURL = user.photoURL;
    const file = profilePicInput.files[0];

    try {
        if (file) {
            const storageRef = ref(storage, `profile_pics/${user.uid}`);
            await uploadBytes(storageRef, file);
            newPhotoURL = await getDownloadURL(storageRef);
        }

        await updateProfile(user, { displayName: newName, photoURL: newPhotoURL });

        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, { additionalEmails: tempAdditionalEmails }, { merge: true });

        additionalEmails = [...tempAdditionalEmails];

        // Update UI
        profileName.textContent = newName || user.email.split('@')[0];
        profileEmail.textContent = user.email;
        userAvatar.src = newPhotoURL || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';

        profileModal.style.display = 'none';
        showNotification('Profile updated successfully', 'success');

        // Refresh activities to reflect updated email list
        fetchActivitiesFromFirestore();
    } catch (error) {
        console.error("Error updating profile:", error);
        showNotification('Failed to update profile', 'warning');
    }
});

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
