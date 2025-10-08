// DOM Elements
const loginPage = document.getElementById('login-page');
const loadingScreen = document.getElementById('loading-screen');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        loadingScreen.style.display = 'none';
        loginPage.style.display = 'flex';
        initializeEventListeners();
        
        // Check if user is already logged in
        checkCurrentUser();
    }, 2000);
});

function initializeEventListeners() {
    // Login functionality
    document.querySelectorAll('.login-option').forEach(option => {
        option.addEventListener('click', function() {
            const role = this.getAttribute('data-role');
            showLoginForm(role);
        });
    });

    // Login buttons
    document.getElementById('admin-login').addEventListener('click', adminLogin);
    document.getElementById('buyer-login').addEventListener('click', buyerLogin);
    document.getElementById('seller-login').addEventListener('click', sellerLogin);
}

async function checkCurrentUser() {
    try {
        const response = await fetch('/api/current_user');
        const data = await response.json();
        
        if (data.success && data.role) {
            // User is already logged in, redirect to their dashboard
            window.location.href = `/${data.role}`;
        }
    } catch (error) {
        // User is not logged in, show login page
        console.log('User not logged in');
    }
}

// API Functions
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(endpoint, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        return await response.json();
    } catch (error) {
        showNotification('Network error: ' + error.message, 'error');
        return { success: false, message: 'Network error' };
    }
}

async function loginUser(role, username, password) {
    const data = await apiCall('/api/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
    });
    
    if (data.success) {
        showNotification(data.message, 'success');
        // Redirect to the appropriate dashboard
        window.location.href = data.redirect_url;
    } else {
        showNotification(data.message, 'error');
    }
}

function adminLogin() {
    const username = document.getElementById('admin-username').value;
    const password = document.getElementById('admin-password').value;
    if (username && password) {
        loginUser('admin', username, password);
    } else {
        showNotification('Please enter username and password', 'error');
    }
}

function buyerLogin() {
    const username = document.getElementById('buyer-username').value;
    const password = document.getElementById('buyer-password').value;
    if (username && password) {
        loginUser('buyer', username, password);
    } else {
        showNotification('Please enter username and password', 'error');
    }
}

function sellerLogin() {
    const username = document.getElementById('seller-username').value;
    const password = document.getElementById('seller-password').value;
    if (username && password) {
        loginUser('seller', username, password);
    } else {
        showNotification('Please enter username and password', 'error');
    }
}

function showLoginForm(role) {
    document.querySelectorAll('.login-form').forEach(form => {
        form.classList.remove('active');
    });
    document.getElementById(`${role}-form`).classList.add('active');
}

function showNotification(message, type = 'info') {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'var(--primary-green)' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 16px 20px;
        border-radius: var(--border-radius);
        box-shadow: var(--shadow-lg);
        z-index: 1000;
        animation: slideInRight 0.3s ease;
        max-width: 400px;
    `;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 3000);
}