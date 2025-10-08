// Current state for seller
let products = [];
let orders = [];
let uploadedImage = null;
let editUploadedImage = null;

// DOM Elements
const sellerDashboard = document.getElementById('seller-dashboard');
const upiManagementPage = document.getElementById('upi-management-page');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    loadSellerData();
});

function initializeEventListeners() {
    // Logout functionality
    document.getElementById('seller-logout').addEventListener('click', logout);
    document.getElementById('upi-logout').addEventListener('click', logout);

    // Navigation
    document.getElementById('view-sales').addEventListener('click', () => switchSellerTab('sales-analytics'));
    document.getElementById('view-products').addEventListener('click', () => switchSellerTab('my-products'));
    document.getElementById('view-upi-settings').addEventListener('click', showUpiManagement);
    document.getElementById('back-to-seller-dash').addEventListener('click', () => showPage('seller-dashboard'));

    // Seller functionality - Add Product
    document.getElementById('upload-image-btn').addEventListener('click', triggerImageUpload);
    document.getElementById('product-image').addEventListener('change', handleImageUpload);
    document.getElementById('product-image-url').addEventListener('input', handleAddImageUrlChange);
    document.getElementById('add-product').addEventListener('click', addProduct);

    // Seller functionality - Edit Product
    document.getElementById('edit-upload-image-btn').addEventListener('click', triggerEditImageUpload);
    document.getElementById('edit-product-image').addEventListener('change', handleEditImageUpload);
    document.getElementById('edit-product-image-url').addEventListener('input', handleEditImageUrlChange);
    document.getElementById('close-edit-product').addEventListener('click', closeEditProductModal);
    document.getElementById('cancel-edit-product').addEventListener('click', closeEditProductModal);
    document.getElementById('save-product').addEventListener('click', updateProduct);

    // UPI Management
    document.getElementById('save-upi-id').addEventListener('click', updateUpiId);

    // Tab functionality
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            
            this.parentElement.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(content => content.classList.remove('active'));
            document.querySelector(`#${tab}-tab`).classList.add('active');
            
            if (tab === 'my-products') {
                loadSellerProducts();
            } else if (tab === 'sales-analytics') {
                loadSellerAnalytics();
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
            showNotification('Access denied. Seller role required.', 'error');
            return { success: false, message: 'Access denied' };
        }
        
        return await response.json();
    } catch (error) {
        showNotification('Network error: ' + error.message, 'error');
        return { success: false, message: 'Network error' };
    }
}

async function loadSellerData() {
    await Promise.all([
        loadProducts(),
        loadOrders()
    ]);
    loadSellerProducts();
    
    // Set current username
    const userData = await apiCall('/api/current_user');
    if (userData.success) {
        document.getElementById('seller-username-display').textContent = userData.user;
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

function showPage(pageId) {
    sellerDashboard.style.display = 'none';
    upiManagementPage.style.display = 'none';
    
    document.getElementById(pageId).style.display = 'block';
}

function switchSellerTab(tab) {
    const tabBtn = document.querySelector(`.seller-tabs .tab-btn[data-tab="${tab}"]`);
    if (tabBtn) tabBtn.click();
}

// Product Management Functions
function triggerImageUpload() {
    document.getElementById('product-image').click();
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            uploadedImage = e.target.result;
            document.getElementById('image-preview').innerHTML = 
                `<img src="${uploadedImage}" alt="Product Image" style="width: 100%; height: 100%; object-fit: cover;">`;
            // Clear URL input when uploading file
            document.getElementById('product-image-url').value = '';
        };
        reader.readAsDataURL(file);
    }
}

function handleAddImageUrlChange(event) {
    const url = event.target.value;
    if (url) {
        // Validate URL format
        if (isValidUrl(url)) {
            document.getElementById('image-preview').innerHTML = 
                `<img src="${url}" alt="Product Image" style="width: 100%; height: 100%; object-fit: cover;" 
                      onerror="this.onerror=null; this.style.display='none'; document.querySelector('#image-preview i').style.display='block'; document.querySelector('#image-preview span').style.display='block';">
                 <i class="fas fa-image" style="display: none;"></i>
                 <span style="display: none;">Invalid image URL</span>`;
            // Clear uploaded image when using URL
            uploadedImage = null;
            document.getElementById('product-image').value = '';
        }
    } else {
        // Reset preview if URL is cleared
        document.getElementById('image-preview').innerHTML = 
            '<i class="fas fa-image"></i><span>No image selected</span>';
    }
}

async function addProduct() {
    const name = document.getElementById('product-name').value;
    const description = document.getElementById('product-description').value;
    const price = parseInt(document.getElementById('product-price').value);
    const quantity = parseInt(document.getElementById('product-quantity').value);
    const imageUrl = document.getElementById('product-image-url').value;
    
    if (!name || !description || !price || !quantity) {
        showNotification('Please fill all required fields', 'error');
        return;
    }
    
    if (price <= 0 || quantity <= 0) {
        showNotification('Price and quantity must be positive numbers', 'error');
        return;
    }
    
    // Determine which image to use (priority: uploaded image > URL > default)
    let finalImage = '/static/images/default-product.png';
    if (uploadedImage) {
        finalImage = uploadedImage;
    } else if (imageUrl && isValidUrl(imageUrl)) {
        finalImage = imageUrl;
    }
    
    const productData = {
        name: name,
        description: description,
        price: price,
        image: finalImage,
        seller: '', // Will be set by server from session
        sellerId: '', // Will be set by server from session
        quantity: quantity,
        category: "general"
    };
    
    const data = await apiCall('/api/products', {
        method: 'POST',
        body: JSON.stringify(productData)
    });
    
    if (data.success) {
        // Clear form
        document.getElementById('product-name').value = '';
        document.getElementById('product-description').value = '';
        document.getElementById('product-price').value = '';
        document.getElementById('product-quantity').value = '';
        document.getElementById('product-image-url').value = '';
        document.getElementById('image-preview').innerHTML = 
            '<i class="fas fa-image"></i><span>No image selected</span>';
        uploadedImage = null;
        document.getElementById('product-image').value = '';
        
        showNotification('Product added successfully!', 'success');
        await loadProducts();
        loadSellerProducts();
    } else {
        showNotification(data.message, 'error');
    }
}

// Edit Product Functions
function triggerEditImageUpload() {
    document.getElementById('edit-product-image').click();
}

function handleEditImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            editUploadedImage = e.target.result;
            document.getElementById('edit-image-preview').innerHTML = 
                `<img src="${editUploadedImage}" alt="Product Image" style="width: 100%; height: 100%; object-fit: cover;">`;
            // Clear URL input when uploading file
            document.getElementById('edit-product-image-url').value = '';
        };
        reader.readAsDataURL(file);
    }
}

function handleEditImageUrlChange(event) {
    const url = event.target.value;
    if (url) {
        // Validate URL format
        if (isValidUrl(url)) {
            document.getElementById('edit-image-preview').innerHTML = 
                `<img src="${url}" alt="Product Image" style="width: 100%; height: 100%; object-fit: cover;" 
                      onerror="this.onerror=null; this.style.display='none'; document.querySelector('#edit-image-preview i').style.display='block'; document.querySelector('#edit-image-preview span').style.display='block';">`
        }
    } else {
        // Reset preview if URL is cleared
        document.getElementById('edit-image-preview').innerHTML = 
            '<i class="fas fa-image"></i><span>No image selected</span>';
    }
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

async function loadSellerProducts() {
    const userData = await apiCall('/api/current_user');
    if (!userData.success) return;
    
    const sellerProducts = products.filter(p => p.sellerId === userData.user);
    const productsGrid = document.getElementById('seller-products');
    
    if (sellerProducts.length === 0) {
        productsGrid.innerHTML = `
            <div class="card">
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-boxes" style="font-size: 64px; color: var(--text-gray); margin-bottom: 16px;"></i>
                    <h3>No Products Added</h3>
                    <p>You haven't added any products yet.</p>
                </div>
            </div>
        `;
        return;
    }
    
    productsGrid.innerHTML = '';
    sellerProducts.forEach(product => {
        const productOrders = orders.filter(o => o.productId === product.id && o.payment_status === 'completed');
        const totalSold = productOrders.reduce((sum, order) => sum + order.quantity, 0);
        const revenue = productOrders.reduce((sum, order) => sum + order.total, 0);
        
        const productCard = document.createElement('div');
        productCard.className = 'card product-card';
        productCard.innerHTML = `
            <div class="product-image">
                ${product.image ? 
                    `<img src="${product.image}" alt="${product.name}" 
                          onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                          style="width: 100%; height: 100%; object-fit: cover;">
                     <div style="display: none; align-items: center; justify-content: center; width: 100%; height: 100%; background: linear-gradient(135deg, #f0fdf4, #dcfce7);">
                         <i class="fas fa-seedling" style="font-size: 48px; color: var(--primary-green);"></i>
                     </div>` :
                    `<i class="fas fa-seedling"></i>`
                }
            </div>
            <div class="product-details">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description}</p>
                <div class="product-price">₹${product.price} per kg</div>
                <div class="product-meta">
                    <span><i class="fas fa-box"></i> ${product.quantity} kg available</span>
                    <span><i class="fas fa-chart-line"></i> ${totalSold} kg sold</span>
                </div>
                <div class="product-meta">
                    <span><i class="fas fa-shopping-cart"></i> ${productOrders.length} orders</span>
                    <span style="color: var(--primary-green); font-weight: 600;">
                        ₹${revenue} revenue
                    </span>
                </div>
                <div class="product-actions">
                    <button class="btn btn-secondary btn-sm edit-product" data-id="${product.id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-danger btn-sm delete-product" data-id="${product.id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
        productsGrid.appendChild(productCard);
    });
    
    // Add event listeners for edit and delete buttons
    document.querySelectorAll('.edit-product').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-id'));
            showEditProductModal(productId);
        });
    });
    
    document.querySelectorAll('.delete-product').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-id'));
            deleteProduct(productId);
        });
    });
}

function showEditProductModal(productId) {
    const product = products.find(p => p.id === productId);
    if (product) {
        document.getElementById('edit-product-id').value = product.id;
        document.getElementById('edit-product-name').value = product.name;
        document.getElementById('edit-product-description').value = product.description;
        document.getElementById('edit-product-price').value = product.price;
        document.getElementById('edit-product-quantity').value = product.quantity;
        
        // Set image preview
        if (product.image) {
            document.getElementById('edit-product-image-url').value = product.image;
            document.getElementById('edit-image-preview').innerHTML = 
                `<img src="${product.image}" alt="${product.name}" 
                      style="width: 100%; height: 100%; object-fit: cover;"
                      onerror="this.onerror=null; this.style.display='none'; document.querySelector('#edit-image-preview i').style.display='block'; document.querySelector('#edit-image-preview span').style.display='block';">`;
        } else {
            document.getElementById('edit-product-image-url').value = '';
            document.getElementById('edit-image-preview').innerHTML = 
                '<i class="fas fa-image"></i><span>No image selected</span>';
        }
        
        // Reset uploaded image
        editUploadedImage = null;
        document.getElementById('edit-product-image').value = '';
        
        document.getElementById('edit-product-modal').classList.add('active');
    }
}


// UPI Management
async function showUpiManagement() {
    const userData = await apiCall('/api/current_user');
    if (!userData.success) return;
    
    const upiData = await apiCall(`/api/seller/upi?seller_id=${userData.user}`);
    document.getElementById('current-upi').textContent = upiData.upi_id || 'Not set';
    document.getElementById('new-upi-id').value = upiData.upi_id || '';
    
    // Hide seller dashboard and show UPI management
    document.getElementById('seller-dashboard').style.display = 'none';
    document.getElementById('upi-management-page').style.display = 'block';
}

// Add this event listener in initializeEventListeners
document.getElementById('back-to-seller-from-upi').addEventListener('click', () => {
    document.getElementById('upi-management-page').style.display = 'none';
    document.getElementById('seller-dashboard').style.display = 'block';
});
function closeEditProductModal() {
    document.getElementById('edit-product-modal').classList.remove('active');
    document.getElementById('edit-product-image-url').value = '';
    document.getElementById('edit-image-preview').innerHTML = 
        '<i class="fas fa-image"></i><span>No image selected</span>';
    editUploadedImage = null;
    document.getElementById('edit-product-image').value = '';
}

async function updateProduct() {
    const productId = parseInt(document.getElementById('edit-product-id').value);
    const name = document.getElementById('edit-product-name').value;
    const description = document.getElementById('edit-product-description').value;
    const price = parseInt(document.getElementById('edit-product-price').value);
    const quantity = parseInt(document.getElementById('edit-product-quantity').value);
    const imageUrl = document.getElementById('edit-product-image-url').value;
    
    if (!name || !description || !price || !quantity) {
        showNotification('Please fill all required fields', 'error');
        return;
    }
    
    // Determine which image to use (priority: uploaded image > URL > existing image)
    let finalImage = '';
    if (editUploadedImage) {
        finalImage = editUploadedImage;
    } else if (imageUrl && isValidUrl(imageUrl)) {
        finalImage = imageUrl;
    } else {
        // Keep existing image if no new image provided
        const existingProduct = products.find(p => p.id === productId);
        finalImage = existingProduct ? existingProduct.image : '';
    }
    
    const productData = {
        name: name,
        description: description,
        price: price,
        quantity: quantity,
        image: finalImage
    };
    
    const data = await apiCall(`/api/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify(productData)
    });
    
    if (data.success) {
        showNotification('Product updated successfully!', 'success');
        closeEditProductModal();
        await loadProducts();
        loadSellerProducts();
    } else {
        showNotification(data.message, 'error');
    }
}

async function deleteProduct(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
        const data = await apiCall(`/api/products/${productId}`, {
            method: 'DELETE'
        });
        
        if (data.success) {
        showNotification('Product deleted successfully', 'success');
            await loadProducts();
            loadSellerProducts();
        } else {
            showNotification(data.message, 'error');
        }
    }
}

async function loadSellerAnalytics() {
    const userData = await apiCall('/api/current_user');
    if (!userData.success) return;
    
    const sellerProducts = products.filter(p => p.sellerId === userData.user);
    const sellerOrders = orders.filter(o => o.seller === userData.user && o.payment_status === 'completed');
    
    const totalRevenue = sellerOrders.reduce((sum, order) => sum + order.total, 0);
    const totalCommission = sellerOrders.reduce((sum, order) => sum + (order.commission || 0), 0);
    const netRevenue = totalRevenue - totalCommission;
    
    document.getElementById('total-orders').textContent = sellerOrders.length;
    document.getElementById('total-revenue').textContent = totalRevenue.toFixed(2);
    document.getElementById('products-listed').textContent = sellerProducts.length;
    document.getElementById('total-commission').textContent = totalCommission.toFixed(2);
    document.getElementById('net-revenue').textContent = netRevenue.toFixed(2);
    
    const ordersList = document.getElementById('seller-orders');
    const recentOrders = sellerOrders.slice(-5).reverse();
    
    if (recentOrders.length === 0) {
        ordersList.innerHTML = '<p style="text-align: center; color: var(--text-gray); padding: 20px;">No orders yet</p>';
        return;
    }
    
    ordersList.innerHTML = '';
    recentOrders.forEach(order => {
        const orderElement = document.createElement('div');
        orderElement.className = 'order-item';
        orderElement.innerHTML = `
            <div class="order-item-image">
                ${order.productImage ? 
                    `<img src="${order.productImage}" alt="${order.productName}" 
                          style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">` :
                    `<i class="fas fa-seedling"></i>`
                }
            </div>
            <div class="order-item-details">
                <div class="order-item-name">${order.productName}</div>
                <div class="order-item-meta">
                    <div>Buyer: ${order.buyer}</div>
                    <div>Date: ${order.order_date}</div>
                    <div>Status: <span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span></div>
                </div>
            </div>
            <div class="order-item-meta" style="text-align: right;">
                <div>${order.quantity} kg</div>
                <div class="order-item-price">₹${order.total}</div>
                <div style="font-size: 12px; color: var(--text-gray);">Commission: ₹${order.commission || 0}</div>
            </div>
        `;
        ordersList.appendChild(orderElement);
    });
}

// UPI Management
async function showUpiManagement() {
    const userData = await apiCall('/api/current_user');
    if (!userData.success) return;
    
    const upiData = await apiCall(`/api/seller/upi?seller_id=${userData.user}`);
    document.getElementById('current-upi').textContent = upiData.upi_id || 'Not set';
    document.getElementById('new-upi-id').value = upiData.upi_id || '';
    
    showPage('upi-management-page');
}

async function updateUpiId() {
    const newUpiId = document.getElementById('new-upi-id').value;
    
    if (!newUpiId) {
        showNotification('Please enter a valid UPI ID', 'error');
        return;
    }
    
    // Basic UPI validation
    if (!newUpiId.includes('@')) {
        showNotification('Please enter a valid UPI ID (e.g., yourname@upi)', 'error');
        return;
    }
    
    const userData = await apiCall('/api/current_user');
    if (!userData.success) return;
    
    const data = await apiCall('/api/seller/upi', {
        method: 'POST',
        body: JSON.stringify({
            seller_id: userData.user,
            upi_id: newUpiId
        })
    });
    
    if (data.success) {
        showNotification('UPI ID updated successfully!', 'success');
        setTimeout(() => {
            showPage('seller-dashboard');
        }, 1500);
    } else {
        showNotification('Failed to update UPI ID: ' + data.message, 'error');
    }
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