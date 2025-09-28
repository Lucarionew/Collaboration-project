/**
 * SessionSync Popup Script
 * Handles the popup interface and user interactions
 */

class PopupManager {
  constructor() {
    this.sessions = [];
    this.init();
  }
  
  async init() {
    // Load sessions
    await this.loadSessions();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Update UI
    this.updateUI();
    
    // Set up periodic refresh
    this.setupPeriodicRefresh();
    
    console.log('SessionSync: Popup initialized');
  }
  
  async loadSessions() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SESSIONS' });
      this.sessions = response || [];
    } catch (error) {
      console.error('SessionSync: Error loading sessions:', error);
      this.sessions = [];
    }
  }
  
  setupEventListeners() {
    // Open Dashboard button
    document.getElementById('openDashboard').addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://your-dashboard-url.com' });
      window.close();
    });
    
    // Refresh button
    document.getElementById('refreshSessions').addEventListener('click', async () => {
      await this.refreshSessions();
    });
  }
  
  async refreshSessions() {
    const refreshBtn = document.getElementById('refreshSessions');
    const originalText = refreshBtn.innerHTML;
    
    // Show loading state
    refreshBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="animation: spin 1s linear infinite;">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="31.416" stroke-dashoffset="31.416">
          <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
          <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
        </circle>
      </svg>
      Refreshing...
    `;
    
    // Reload sessions
    await this.loadSessions();
    this.updateUI();
    
    // Update last sync time
    this.updateLastSyncTime();
    
    // Reset button
    setTimeout(() => {
      refreshBtn.innerHTML = originalText;
    }, 1000);
  }
  
  updateUI() {
    this.updateStats();
    this.updateSessionsList();
    this.updateStatus();
  }
  
  updateStats() {
    const activeSessions = this.sessions.filter(s => s.active);
    const totalSites = this.sessions.length;
    
    document.getElementById('activeSessions').textContent = activeSessions.length;
    document.getElementById('totalSites').textContent = totalSites;
  }
  
  updateSessionsList() {
    const sessionsList = document.getElementById('sessionsList');
    
    if (this.sessions.length === 0) {
      sessionsList.innerHTML = this.getEmptyStateHTML();
      return;
    }
    
    // Sort sessions by last activity
    const sortedSessions = [...this.sessions].sort((a, b) => {
      const aTime = Math.max(a.lastLogin || 0, a.lastLogout || 0);
      const bTime = Math.max(b.lastLogin || 0, b.lastLogout || 0);
      return bTime - aTime;
    });
    
    sessionsList.innerHTML = sortedSessions
      .slice(0, 8) // Show only recent 8 sessions
      .map(session => this.getSessionItemHTML(session))
      .join('');
  }
  
  getSessionItemHTML(session) {
    const isActive = session.active;
    const statusClass = isActive ? 'active' : 'inactive';
    const statusText = isActive ? 'Active' : 'Inactive';
    
    const lastActivity = isActive ? session.lastLogin : session.lastLogout;
    const timeText = this.formatTimeAgo(lastActivity);
    
    return `
      <div class="session-item ${statusClass}">
        <div class="session-info">
          <div class="session-site">${this.formatSiteName(session.site)}</div>
          <div class="session-email">${session.email}</div>
          <div class="session-time">${timeText}</div>
        </div>
        <div class="session-status ${statusClass}">
          ${statusText}
        </div>
      </div>
    `;
  }
  
  getEmptyStateHTML() {
    return `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          <path d="M8 12h8" stroke="currentColor" stroke-width="2"/>
          <path d="M12 8v8" stroke="currentColor" stroke-width="2"/>
        </svg>
        <div>No sessions detected yet</div>
        <small>Browse websites and log in to start tracking sessions</small>
      </div>
    `;
  }
  
  updateStatus() {
    const statusIndicator = document.getElementById('statusIndicator');
    const activeSessions = this.sessions.filter(s => s.active).length;
    
    if (activeSessions > 0) {
      statusIndicator.innerHTML = `
        <span class="status-dot" style="background: #4CAF50;"></span>
        <span class="status-text">${activeSessions} active</span>
      `;
    } else {
      statusIndicator.innerHTML = `
        <span class="status-dot" style="background: #ff9800;"></span>
        <span class="status-text">No active sessions</span>
      `;
    }
  }
  
  updateLastSyncTime() {
    const lastSyncElement = document.getElementById('lastSync');
    const now = new Date();
    lastSyncElement.textContent = `Last sync: ${now.toLocaleTimeString()}`;
  }
  
  setupPeriodicRefresh() {
    // Refresh every 30 seconds
    setInterval(() => {
      this.loadSessions().then(() => {
        this.updateUI();
      });
    }, 30000);
  }
  
  formatSiteName(hostname) {
    // Remove www. and common subdomains for cleaner display
    return hostname
      .replace(/^www\./, '')
      .replace(/^(mail|m|mobile|app)\./, '')
      .split('.')[0]
      .charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
  }
  
  formatTimeAgo(timestamp) {
    if (!timestamp) return 'Unknown';
    
    const now = Date.now();
    const diff = now - timestamp;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});