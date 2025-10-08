// Current state for buyer
let products = [];
let orders = [];
let currentOrderProduct = null;

// DOM Elements
const buyerDashboard = document.getElementById('buyer-dashboard');
const orderPage = document.getElementById('order-page');
const paymentPage = document.getElementById('payment-page');
const orderHistoryPage = document.getElementById('order-history-page');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    loadBuyerData();
});

function initializeEventListeners() {
    // Logout functionality
    document.getElementById('buyer-logout').addEventListener('click', logout);
    document.getElementById('order-logout').addEventListener('click', logout);
    document.getElementById('payment-logout').addEventListener('click', logout);
    document.getElementById('orders-logout').addEventListener('click', logout);

    // Navigation
    document.getElementById('back-to-products').addEventListener('click', () => showPage('buyer-dashboard'));
    document.getElementById('back-to-products-from-orders').addEventListener('click', () => showPage('buyer-dashboard'));
    document.getElementById('back-to-products-from-payment').addEventListener('click', () => showPage('buyer-dashboard'));
    document.getElementById('view-orders').addEventListener('click', showOrderHistory);

    // Order functionality
    document.getElementById('increase-quantity').addEventListener('click', increaseQuantity);
    document.getElementById('decrease-quantity').addEventListener('click', decreaseQuantity);
    document.getElementById('order-quantity').addEventListener('input', updateOrderTotal);
    document.getElementById('place-order').addEventListener('click', placeOrder);

    // Payment functionality
    document.getElementById('confirm-payment').addEventListener('click', processPayment);
    document.getElementById('cancel-payment').addEventListener('click', () => showPage('buyer-dashboard'));
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
            showNotification('Access denied. Buyer role required.', 'error');
            return { success: false, message: 'Access denied' };
        }
        
        return await response.json();
    } catch (error) {
        showNotification('Network error: ' + error.message, 'error');
        return { success: false, message: 'Network error' };
    }
}

async function loadBuyerData() {
    await Promise.all([
        loadProducts(),
        loadOrders()
    ]);
    loadBuyerProducts();
    
    // Set current username
    const userData = await apiCall('/api/current_user');
    if (userData.success) {
        document.getElementById('buyer-username-display').textContent = userData.user;
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

function showPage(pageId) {
    buyerDashboard.style.display = 'none';
    orderPage.style.display = 'none';
    paymentPage.style.display = 'none';
    orderHistoryPage.style.display = 'none';
    
    document.getElementById(pageId).style.display = 'block';
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
        buyer: '', // Will be set by server from session
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
            showPage('buyer-dashboard');
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
    const userData = await apiCall('/api/current_user');
    if (!userData.success) return;
    
    const data = await apiCall(`/api/orders/user/${userData.user}`);
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
            showPage('buyer-dashboard');
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