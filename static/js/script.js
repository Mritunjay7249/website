// Current state
let currentUser = null;
let currentRole = null;
let products = [];
let orders = [];
let currentOrderProduct = null;
let uploadedImage = null;
let editUploadedImage = null;

// DOM Elements
const loginPage = document.getElementById('login-page');
const buyerDashboard = document.getElementById('buyer-dashboard');
const sellerDashboard = document.getElementById('seller-dashboard');
const adminDashboard = document.getElementById('admin-dashboard');
const orderPage = document.getElementById('order-page');
const orderHistoryPage = document.getElementById('order-history-page');
const paymentPage = document.getElementById('payment-page');
const upiManagementPage = document.getElementById('upi-management-page');
const loadingScreen = document.getElementById('loading-screen');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        loadingScreen.style.display = 'none';
        loginPage.style.display = 'flex';
        initializeEventListeners();
        loadProducts();
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

    // Logout functionality
    document.getElementById('buyer-logout').addEventListener('click', logout);
    document.getElementById('seller-logout').addEventListener('click', logout);
    document.getElementById('admin-logout').addEventListener('click', logout);
    document.getElementById('order-logout').addEventListener('click', logout);
    document.getElementById('orders-logout').addEventListener('click', logout);
    document.getElementById('payment-logout').addEventListener('click', logout);
    document.getElementById('upi-logout').addEventListener('click', logout);

    // Navigation
    document.getElementById('back-to-products').addEventListener('click', () => showDashboard('buyer'));
    document.getElementById('back-to-products-from-orders').addEventListener('click', () => showDashboard('buyer'));
    document.getElementById('back-to-products-from-payment').addEventListener('click', () => showDashboard('buyer'));
    document.getElementById('view-orders').addEventListener('click', showOrderHistory);
    document.getElementById('view-sales').addEventListener('click', () => switchSellerTab('sales-analytics'));
    document.getElementById('view-products').addEventListener('click', () => switchSellerTab('my-products'));
    document.getElementById('view-upi-settings').addEventListener('click', showUpiManagement);

    // Order functionality
    document.getElementById('increase-quantity').addEventListener('click', increaseQuantity);
    document.getElementById('decrease-quantity').addEventListener('click', decreaseQuantity);
    document.getElementById('order-quantity').addEventListener('input', updateOrderTotal);
    document.getElementById('place-order').addEventListener('click', placeOrder);

    // Payment functionality
    document.getElementById('confirm-payment').addEventListener('click', processPayment);
    document.getElementById('cancel-payment').addEventListener('click', () => showDashboard('buyer'));

    // UPI Management
    document.getElementById('save-upi-id').addEventListener('click', updateUpiId);
    document.getElementById('back-to-seller').addEventListener('click', () => showDashboard('seller'));

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

    // Admin functionality
    document.getElementById('add-user-btn').addEventListener('click', showAddUserModal);
    document.getElementById('close-add-user').addEventListener('click', closeAddUserModal);
    document.getElementById('cancel-add-user').addEventListener('click', closeAddUserModal);
    document.getElementById('confirm-add-user').addEventListener('click', addNewUser);

    // Tab functionality
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            const container = this.closest('.dashboard');
            
            this.parentElement.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const tabContents = container.querySelectorAll('.tab-content');
            tabContents.forEach(content => content.classList.remove('active'));
            container.querySelector(`#${tab}-tab`).classList.add('active');
            
            if (tab === 'my-products') {
                loadSellerProducts();
            } else if (tab === 'sales-analytics') {
                loadSellerAnalytics();
            } else if (tab === 'system-analytics') {
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
        showNotification('Failed to load products', 'error');
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

async function loginUser(role, username, password) {
    const data = await apiCall('/api/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
    });
    
    if (data.success) {
        currentUser = username;
        currentRole = role;
        showDashboard(role);
        showNotification(data.message, 'success');
        
        // Load data for the specific role
        await loadProducts();
        await loadOrders();
        
        if (role === 'buyer') {
            await loadBuyerProducts();
        } else if (role === 'seller') {
            await loadSellerProducts();
        } else if (role === 'admin') {
            await loadAdminData();
        }
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

function showPage(pageId) {
    loginPage.style.display = 'none';
    buyerDashboard.style.display = 'none';
    sellerDashboard.style.display = 'none';
    adminDashboard.style.display = 'none';
    orderPage.style.display = 'none';
    orderHistoryPage.style.display = 'none';
    paymentPage.style.display = 'none';
    upiManagementPage.style.display = 'none';
    
    document.getElementById(pageId).style.display = 'block';
}

function showDashboard(role) {
    loginPage.style.display = 'none';
    buyerDashboard.style.display = 'none';
    sellerDashboard.style.display = 'none';
    adminDashboard.style.display = 'none';
    orderPage.style.display = 'none';
    orderHistoryPage.style.display = 'none';
    paymentPage.style.display = 'none';
    upiManagementPage.style.display = 'none';
    
    document.getElementById('buyer-username-display').textContent = currentUser;
    document.getElementById('seller-username-display').textContent = currentUser;
    document.getElementById('admin-username-display').textContent = currentUser;
    
    if (role === 'buyer') {
        buyerDashboard.style.display = 'block';
    } else if (role === 'seller') {
        sellerDashboard.style.display = 'block';
        switchSellerTab('add-product');
    } else if (role === 'admin') {
        adminDashboard.style.display = 'block';
        loadAdminData();
    }
}

function switchSellerTab(tab) {
    const tabBtn = document.querySelector(`.seller-tabs .tab-btn[data-tab="${tab}"]`);
    if (tabBtn) tabBtn.click();
}

// Product Management
async function loadBuyerProducts() {
    const productsGrid = document.getElementById('buyer-products');
    productsGrid.innerHTML = '';
    
    if (products.length === 0) {
        productsGrid.innerHTML = `
            <div class="card" style="text-align: center; padding: 40px;">
                <i class="fas fa-box-open" style="font-size: 64px; color: var(--text-gray); margin-bottom: 16px;"></i>
                <h3>No Products Available</h3>
                <p>Check back later for fresh products from our farmers.</p>
            </div>
        `;
        return;
    }
    
    products.forEach(product => {
        const availabilityClass = product.quantity === 0 ? 'availability-out' : 
                                product.quantity < 10 ? 'availability-low' : '';
        const availabilityText = product.quantity === 0 ? 'Out of Stock' : 
                               product.quantity < 10 ? 'Low Stock' : 'In Stock';
        
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
                ${product.quantity > 0 ? `<div class="product-badge ${availabilityClass}">${availabilityText}</div>` : ''}
            </div>
            <div class="product-details">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description}</p>
                <div class="product-price">₹${product.price} per kg</div>
                <div class="product-meta">
                    <span><i class="fas fa-user"></i> ${product.seller}</span>
                    <span><i class="fas fa-box"></i> ${product.quantity} kg available</span>
                </div>
                <button class="btn btn-primary" style="margin-top: 12px;" data-id="${product.id}" ${product.quantity === 0 ? 'disabled' : ''}>
                    <i class="fas fa-shopping-cart"></i> ${product.quantity === 0 ? 'Out of Stock' : 'Buy Now'}
                </button>
            </div>
        `;
        productsGrid.appendChild(productCard);
    });
    
    document.querySelectorAll('#buyer-products .btn:not([disabled])').forEach(button => {
        button.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-id'));
            currentOrderProduct = products.find(p => p.id === productId);
            showOrderPage();
        });
    });
}

function showOrderPage() {
    showPage('order-page');
    
    if (currentOrderProduct.image) {
        document.getElementById('order-product-image').innerHTML = 
            `<img src="${currentOrderProduct.image}" alt="${currentOrderProduct.name}" 
                  onerror="this.style.display='none'; document.querySelector('#order-product-image i').style.display='flex';"
                  style="width: 100%; height: 100%; object-fit: cover;">
             <i class="fas fa-seedling" style="display: none; font-size: 64px; color: var(--primary-green);"></i>`;
    } else {
        document.getElementById('order-product-image').innerHTML = '<i class="fas fa-seedling"></i>';
    }
    
    document.getElementById('order-product-name').textContent = currentOrderProduct.name;
    document.getElementById('order-product-description').textContent = currentOrderProduct.description;
    document.getElementById('order-product-price').textContent = `₹${currentOrderProduct.price} per kg`;
    document.getElementById('order-seller').textContent = currentOrderProduct.seller;
    document.getElementById('summary-price').textContent = `₹${currentOrderProduct.price}`;
    
    document.getElementById('order-quantity').value = 1;
    document.getElementById('order-quantity').max = currentOrderProduct.quantity;
    
    updateOrderTotal();
}

function increaseQuantity() {
    const quantityInput = document.getElementById('order-quantity');
    let quantity = parseInt(quantityInput.value);
    const maxQuantity = parseInt(quantityInput.max);
    
    if (quantity < maxQuantity) {
        quantityInput.value = quantity + 1;
        updateOrderTotal();
    }
}

function decreaseQuantity() {
    const quantityInput = document.getElementById('order-quantity');
    let quantity = parseInt(quantityInput.value);
    
    if (quantity > 1) {
        quantityInput.value = quantity - 1;
        updateOrderTotal();
    }
}

function updateOrderTotal() {
    const quantity = parseInt(document.getElementById('order-quantity').value);
    const total = quantity * currentOrderProduct.price;
    
    document.getElementById('order-total').textContent = total;
    document.getElementById('summary-quantity').textContent = `${quantity} kg`;
    document.getElementById('summary-price').textContent = `₹${currentOrderProduct.price}`;
}

async function placeOrder() {
    const quantity = parseInt(document.getElementById('order-quantity').value);
    
    if (quantity > currentOrderProduct.quantity) {
        showNotification(`Sorry, only ${currentOrderProduct.quantity} kg available.`, 'error');
        return;
    }
    
    if (quantity <= 0) {
        showNotification('Please select a valid quantity.', 'error');
        return;
    }
    
    const orderData = {
        productId: currentOrderProduct.id,
        productName: currentOrderProduct.name,
        productImage: currentOrderProduct.image,
        buyer: currentUser,
        seller: currentOrderProduct.seller,
        quantity: quantity,
        price: currentOrderProduct.price,
        total: quantity * currentOrderProduct.price
    };
    
    const data = await apiCall('/api/orders', {
        method: 'POST',
        body: JSON.stringify(orderData)
    });
    
    if (data.success) {
        showNotification('Order created! Proceeding to payment...', 'success');
        setTimeout(() => {
            showPaymentPage(data.order);
        }, 1000);
    } else {
        showNotification(data.message, 'error');
    }
}

// Payment functionality
async function showPaymentPage(order) {
    // Get seller UPI ID
    const upiData = await apiCall(`/api/seller/upi?seller_id=${order.seller}`);
    const sellerUpiId = upiData.upi_id || 'seller@upi';
    
    document.getElementById('payment-order-id').textContent = order.id;
    document.getElementById('payment-amount').textContent = order.total;
    document.getElementById('seller-upi-id').textContent = sellerUpiId;
    document.getElementById('commission-amount').textContent = (order.total * 0.05).toFixed(2);
    document.getElementById('seller-amount').textContent = (order.total * 0.95).toFixed(2);
    
    // Calculate delivery time (24 hours from now)
    const deliveryTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    document.getElementById('delivery-time').textContent = deliveryTime.toLocaleString();
    
    // Start countdown timer
    startDeliveryCountdown(deliveryTime);
    
    // Show payment page
    showPage('payment-page');
}

function startDeliveryCountdown(deliveryTime) {
    function updateCountdown() {
        const now = new Date();
        const diff = deliveryTime - now;
        
        if (diff <= 0) {
            document.getElementById('countdown-timer').innerHTML = '<div class="time-remaining">Delivery Due!</div>';
            return;
        }
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        document.getElementById('countdown-timer').innerHTML = `
            <div class="countdown-item">
                <div class="countdown-value">${hours.toString().padStart(2, '0')}</div>
                <div class="countdown-label">Hours</div>
            </div>
            <div class="countdown-item">
                <div class="countdown-value">${minutes.toString().padStart(2, '0')}</div>
                <div class="countdown-label">Minutes</div>
            </div>
            <div class="countdown-item">
                <div class="countdown-value">${seconds.toString().padStart(2, '0')}</div>
                <div class="countdown-label">Seconds</div>
            </div>
        `;
    }
    
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

async function processPayment() {
    const orderId = parseInt(document.getElementById('payment-order-id').textContent);
    const amount = parseFloat(document.getElementById('payment-amount').textContent);
    const sellerId = currentOrderProduct.sellerId;
    
    const paymentData = await apiCall('/api/payment/process', {
        method: 'POST',
        body: JSON.stringify({
            order_id: orderId,
            amount: amount,
            seller_id: sellerId
        })
    });
    
    if (paymentData.success) {
        showNotification('Payment successful! Order will be delivered within 24 hours.', 'success');
        
        // Update product quantities
        await loadProducts();
        await loadOrders();
        
        setTimeout(() => {
            showDashboard('buyer');
            loadBuyerProducts();
        }, 2000);
    } else {
        showNotification('Payment failed: ' + paymentData.message, 'error');
    }
}

function showOrderHistory() {
    showPage('order-history-page');
    loadOrderHistory();
}

async function loadOrderHistory() {
    const data = await apiCall(`/api/orders/user/${currentUser}`);
    const ordersContainer = document.getElementById('buyer-orders');
    
    if (!data || data.length === 0) {
        ordersContainer.innerHTML = `
            <div class="card">
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-shopping-bag" style="font-size: 64px; color: var(--text-gray); margin-bottom: 16px;"></i>
                    <h3>No Orders Yet</h3>
                    <p>You haven't placed any orders yet.</p>
                    <button class="btn btn-primary" id="start-shopping-btn">
                        <i class="fas fa-shopping-cart"></i> Start Shopping
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('start-shopping-btn').addEventListener('click', () => {
            showDashboard('buyer');
        });
        return;
    }
    
    ordersContainer.innerHTML = '';
    data.forEach(order => {
        const statusClass = `status-${order.status.toLowerCase().replace(' ', '-')}`;
        const paymentStatusClass = `payment-status-${order.payment_status === 'completed' ? 'paid' : 'pending'}`;
        
        const orderElement = document.createElement('div');
        orderElement.className = 'card order-item';
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
                    <div>Seller: ${order.seller}</div>
                    <div>Order Date: ${order.order_date}</div>
                    <div>Payment: <span class="status-badge ${paymentStatusClass}">${order.payment_status === 'completed' ? 'Paid' : 'Pending'}</span></div>
                    <div>Status: <span class="status-badge ${statusClass}">${order.status}</span></div>
                    ${order.expected_delivery ? `<div>Expected Delivery: ${order.expected_delivery}</div>` : ''}
                    ${order.transaction_id ? `<div>Transaction ID: ${order.transaction_id}</div>` : ''}
                </div>
            </div>
            <div class="order-item-meta" style="text-align: right;">
                <div>${order.quantity} kg</div>
                <div class="order-item-price">₹${order.total}</div>
            </div>
        `;
        ordersContainer.appendChild(orderElement);
    });
}

// Seller UPI Management
async function showUpiManagement() {
    const upiData = await apiCall(`/api/seller/upi?seller_id=${currentUser}`);
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
    
    const data = await apiCall('/api/seller/upi', {
        method: 'POST',
        body: JSON.stringify({
            seller_id: currentUser,
            upi_id: newUpiId
        })
    });
    
    if (data.success) {
        showNotification('UPI ID updated successfully!', 'success');
        setTimeout(() => {
            showDashboard('seller');
        }, 1500);
    } else {
        showNotification('Failed to update UPI ID: ' + data.message, 'error');
    }
}

// Seller Functions - Add Product
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
        seller: currentUser,
        sellerId: currentUser,
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

// Seller Functions - Edit Product
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
    const sellerProducts = products.filter(p => p.sellerId === currentUser);
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
    const sellerProducts = products.filter(p => p.sellerId === currentUser);
    const sellerOrders = orders.filter(o => o.seller === currentUser && o.payment_status === 'completed');
    
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
function logout() {
    currentUser = null;
    currentRole = null;
    
    showPage('login-page');
    document.querySelectorAll('.login-form').forEach(form => {
        form.classList.remove('active');
    });
    document.querySelectorAll('input').forEach(input => {
        input.value = '';
    });
    
    showNotification('Logged out successfully', 'success');
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