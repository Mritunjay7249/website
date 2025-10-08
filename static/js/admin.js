// Current state
let products = [];
let orders = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    loadAdminData();
});

function initializeEventListeners() {
    // Logout functionality
    document.getElementById('admin-logout').addEventListener('click', logout);

    // Admin functionality
    document.getElementById('add-user-btn').addEventListener('click', showAddUserModal);
    document.getElementById('close-add-user').addEventListener('click', closeAddUserModal);
    document.getElementById('cancel-add-user').addEventListener('click', closeAddUserModal);
    document.getElementById('confirm-add-user').addEventListener('click', addNewUser);

    // Tab functionality
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            
            this.parentElement.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(content => content.classList.remove('active'));
            document.querySelector(`#${tab}-tab`).classList.add('active');
            
            if (tab === 'system-analytics') {
                loadSystemAnalytics();
            }
        });
    });
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
        
        if (response.status === 401) {
            // Unauthorized - redirect to login
            window.location.href = '/';
            return { success: false, message: 'Please login again' };
        }
        
        if (response.status === 403) {
            // Forbidden - show access denied
            showNotification('Access denied. Admin role required.', 'error');
            return { success: false, message: 'Access denied' };
        }
        
        return await response.json();
    } catch (error) {
        showNotification('Network error: ' + error.message, 'error');
        return { success: false, message: 'Network error' };
    }
}

async function loadProducts() {
    const data = await apiCall('/api/products');
    if (data && Array.isArray(data)) {
        products = data;
    } else {
        products = [];
    }
}

async function loadOrders() {
    const data = await apiCall('/api/orders');
    if (data && Array.isArray(data)) {
        orders = data;
    } else {
        orders = [];
    }
}

// Admin Functions
async function loadAdminData() {
    const [usersData, statsData, commissionData] = await Promise.all([
        apiCall('/api/admin/users'),
        apiCall('/api/admin/stats'),
        apiCall('/api/admin/commission')
    ]);
    
    if (statsData.success) {
        const stats = statsData.stats;
        document.getElementById('total-buyers').textContent = stats.total_buyers;
        document.getElementById('total-sellers').textContent = stats.total_sellers;
        document.getElementById('total-orders-admin').textContent = stats.total_orders;
        document.getElementById('total-revenue-admin').textContent = stats.total_revenue.toFixed(2);
    }
    
    if (commissionData.success) {
        document.getElementById('total-commission-admin').textContent = commissionData.total_commission.toFixed(2);
    }
    
    loadUserManagementTable(usersData);
}

function loadUserManagementTable(users) {
    const tableBody = document.getElementById('user-table-body');
    tableBody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.username}</td>
            <td>
                <span class="role-badge role-${user.role}">
                    <i class="fas fa-${user.role === 'admin' ? 'user-shield' : user.role === 'seller' ? 'tractor' : 'store'}"></i>
                    ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </span>
            </td>
            <td>
                <span class="status-badge status-${user.status?.toLowerCase() || 'active'}">
                    ${user.status || 'Active'}
                </span>
            </td>
            <td>${user.joinDate}</td>
            <td class="action-buttons">
                <button class="btn btn-secondary btn-sm edit-user" data-username="${user.username}">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-primary btn-sm remove-user" data-username="${user.username}">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    document.querySelectorAll('.edit-user').forEach(btn => {
        btn.addEventListener('click', function() {
            const username = this.getAttribute('data-username');
            editUser(username);
        });
    });
    
    document.querySelectorAll('.remove-user').forEach(btn => {
        btn.addEventListener('click', function() {
            const username = this.getAttribute('data-username');
            removeUser(username);
        });
    });
}

function showAddUserModal() {
    document.getElementById('add-user-modal').classList.add('active');
}

function closeAddUserModal() {
    document.getElementById('add-user-modal').classList.remove('active');
    document.getElementById('new-username').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('new-role').value = 'buyer';
}

async function addNewUser() {
    const username = document.getElementById('new-username').value;
    const password = document.getElementById('new-password').value;
    const role = document.getElementById('new-role').value;
    
    if (!username || !password) {
        showNotification('Please fill all fields', 'error');
        return;
    }
    
    const data = await apiCall('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ username, password, role })
    });
    
    if (data.success) {
        showNotification('User added successfully!', 'success');
        closeAddUserModal();
        loadAdminData();
    } else {
        showNotification(data.message, 'error');
    }
}

function editUser(username) {
    showNotification(`Edit functionality for ${username} would be implemented here`, 'info');
}

async function removeUser(username) {
    if (confirm(`Are you sure you want to remove user ${username}?`)) {
        const data = await apiCall(`/api/admin/users/${username}`, {
            method: 'DELETE'
        });
        
        if (data.success) {
            showNotification('User removed successfully', 'success');
            loadAdminData();
        } else {
            showNotification(data.message, 'error');
        }
    }
}

function loadSystemAnalytics() {
    // Simplified analytics - in real app, fetch from API
    const paidOrders = orders.filter(o => o.payment_status === 'completed');
    const topProducts = [...products]
        .sort((a, b) => {
            const aSales = paidOrders.filter(o => o.productId === a.id).reduce((sum, o) => sum + o.quantity, 0);
            const bSales = paidOrders.filter(o => o.productId === b.id).reduce((sum, o) => sum + o.quantity, 0);
            return bSales - aSales;
        })
        .slice(0, 3);

    document.getElementById('top-products').innerHTML = topProducts.length > 0 ? 
        topProducts.map(product => {
            const sales = paidOrders.filter(o => o.productId === product.id).reduce((sum, o) => sum + o.quantity, 0);
            const revenue = paidOrders.filter(o => o.productId === product.id).reduce((sum, o) => sum + o.total, 0);
            return `
                <div style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
                    <div style="font-weight: 600; margin-bottom: 4px;">${product.name}</div>
                    <div style="display: flex; justify-content: space-between; color: var(--text-gray); font-size: 14px;">
                        <span>${sales} kg sold</span>
                        <span style="color: var(--primary-green); font-weight: 600;">₹${revenue}</span>
                    </div>
                </div>
            `;
        }).join('') :
        '<p style="text-align: center; color: var(--text-gray); padding: 20px;">No sales data available</p>';

    const recentActivity = paidOrders.slice(-3).reverse();
    document.getElementById('recent-activity').innerHTML = recentActivity.length > 0 ?
        recentActivity.map(order => `
            <div style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
                <div style="font-weight: 600;">${order.buyer} purchased ${order.productName}</div>
                <div style="color: var(--text-gray); font-size: 14px;">${order.order_date} • ${order.quantity} kg • ₹${order.total}</div>
                <div style="color: var(--gold); font-size: 12px; margin-top: 4px;">Commission: ₹${order.commission || 0}</div>
            </div>
        `).join('') :
        '<p style="text-align: center; color: var(--text-gray); padding: 20px;">No recent activity</p>';
}

// Utility Functions
async function logout() {
    try {
        await fetch('/logout');
        window.location.href = '/';
    } catch (error) {
        window.location.href = '/';
    }
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