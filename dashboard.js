// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

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

// Store activities
let activities = [];

// Elements
const profileName = document.querySelector('.profile-info h2');
const profileEmail = document.querySelector('.profile-info p');

// Initialize dashboard after auth
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Set profile name & email
        profileName.textContent = user.displayName || user.email;
        profileEmail.textContent = user.email;

        // Load activities
        fetchActivitiesFromFirestore();
    } else {
        // Redirect if not logged in
        window.location.href = "login.html";
    }
});

// Fetch activities from Firestore
async function fetchActivitiesFromFirestore() {
    try {
        const sessionsRef = collection(db, "sessions");
        const q = query(sessionsRef, orderBy("timestamp", "desc"), limit(50));
        const snapshot = await getDocs(q);

        activities = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                website: data.site,
                device: data.device,
                email: data.email,
                time: new Date(data.timestamp?.seconds * 1000 || data.lastLogin).toISOString(),
                status: data.active ? "safe" : "unsafe"
            };
        });

        renderActivities();
        updateStats();
    } catch (error) {
        console.error("Error fetching sessions:", error);
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
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
}

// Mark as safe
function markAsSafe(id) {
    const activity = activities.find(a => a.id === id);
    if (activity) {
        activity.status = 'safe';
        renderActivities();
        updateStats();
        showNotification('Activity marked as safe', 'success');
    }
}

// Mark as unsafe
function markAsUnsafe(id) {
    const activity = activities.find(a => a.id === id);
    if (activity) {
        activity.status = 'unsafe';
        renderActivities();
        updateStats();
        showNotification('Activity marked as unsafe', 'warning');
    }
}

// Force logout
function forceLogout(id) {
    const activity = activities.find(a => a.id === id);
    if (activity) {
        showNotification(`Force logout initiated for ${activity.website}`, 'info');
        console.log(`Force logout for activity ${id} on ${activity.website}`);
    }
}

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
function refreshActivities() {
    const refreshBtn = document.querySelector('.refresh-btn');
    refreshBtn.style.opacity = '0.7';
    refreshBtn.style.pointerEvents = 'none';
    fetchActivitiesFromFirestore().then(() => {
        showNotification('Activities refreshed', 'success');
        refreshBtn.style.opacity = '1';
        refreshBtn.style.pointerEvents = 'auto';
    });
}

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
    setTimeout(() => { if (notification.parentElement) notification.remove(); }, 3000);
}
