from flask import Flask, render_template, request, jsonify, send_from_directory
import os
import json
import uuid
from datetime import datetime, timedelta
from werkzeug.utils import secure_filename

app = Flask(__name__, template_folder='templates', static_folder='static')
app.config['SECRET_KEY'] = 'mtd-store-secret-key-2024'
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

# Create necessary directories
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs('static/images', exist_ok=True)
os.makedirs('data', exist_ok=True)

# Data files
PRODUCTS_FILE = 'data/products.json'
ORDERS_FILE = 'data/orders.json'
USERS_FILE = 'data/users.json'
UPI_FILE = 'data/upi_mapping.json'

# Allowed file extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def load_json(file_path, default=[]):
    try:
        with open(file_path, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default

def save_json(file_path, data):
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=2)

class DataStore:
    def __init__(self):
        self.products = load_json(PRODUCTS_FILE)
        self.orders = load_json(ORDERS_FILE)
        self.additional_users = load_json(USERS_FILE, default=[])
        self.seller_upi_mapping = load_json(UPI_FILE, default={})
        
        # Initialize with sample data if empty
        if not self.products:
            self._initialize_sample_data()
    
    def _initialize_sample_data(self):
        sample_products = [
            {
                'id': 1, 'name': 'Fresh Tomatoes', 'price': 40, 'quantity': 50,
                'description': 'Organic, farm-fresh tomatoes with rich flavor and vibrant color. Perfect for salads and cooking.',
                'image': 'https://images.unsplash.com/photo-1546470427-e212b7d31075?w=400&h=300&fit=crop',
                'seller': 'Farmer Raj', 'sellerId': 'mrisell', 'category': 'vegetables'
            },
            {
                'id': 2, 'name': 'Premium Potatoes', 'price': 25, 'quantity': 100,
                'description': 'Fresh potatoes, perfect for various culinary preparations. High quality and long shelf life.',
                'image': 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&h=300&fit=crop',
                'seller': 'Farmer Singh', 'sellerId': 'mrisell', 'category': 'vegetables'
            },
            {
                'id': 3, 'name': 'Organic Onions', 'price': 30, 'quantity': 80,
                'description': 'Premium quality onions with strong flavor and long shelf life. Organically grown.',
                'image': 'https://images.unsplash.com/photo-1506813257165-9cee8b6e86a5?w=400&h=300&fit=crop',
                'seller': 'Veggie Farms', 'sellerId': 'mrisell', 'category': 'vegetables'
            },
            {
                'id': 4, 'name': 'Sweet Carrots', 'price': 60, 'quantity': 40,
                'description': 'Sweet and crunchy carrots, rich in vitamins and nutrients. Fresh from the farm.',
                'image': 'https://images.unsplash.com/photo-1445282768818-728615cc910a?w=400&h=300&fit=crop',
                'seller': 'Green Fields', 'sellerId': 'mrisell', 'category': 'vegetables'
            },
            {
                'id': 5, 'name': 'Bell Peppers', 'price': 80, 'quantity': 30,
                'description': 'Colorful bell peppers, great for salads and cooking. Rich in vitamin C.',
                'image': 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400&h=300&fit=crop',
                'seller': 'Organic Harvest', 'sellerId': 'mrisell', 'category': 'vegetables'
            },
            {
                'id': 6, 'name': 'Fresh Spinach', 'price': 35, 'quantity': 25,
                'description': 'Fresh leafy spinach, packed with iron and vitamins. Perfect for healthy meals.',
                'image': 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=300&fit=crop',
                'seller': 'Leafy Greens', 'sellerId': 'mrisell', 'category': 'leafy-greens'
            },
            {
                'id': 7, 'name': 'Cucumbers', 'price': 20, 'quantity': 60,
                'description': 'Crisp and refreshing cucumbers, perfect for salads and summer dishes.',
                'image': 'https://images.unsplash.com/photo-1449300079327-02f967c8f540?w=400&h=300&fit=crop',
                'seller': 'Fresh Farms', 'sellerId': 'mrisell', 'category': 'vegetables'
            },
            {
                'id': 8, 'name': 'Sweet Apples', 'price': 120, 'quantity': 35,
                'description': 'Sweet and juicy apples, direct from the orchard. Rich in fiber and antioxidants.',
                'image': 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&h=300&fit=crop',
                'seller': 'Orchard Fresh', 'sellerId': 'mrisell', 'category': 'fruits'
            }
        ]
        self.products = sample_products
        self.save_products()
    
    def save_products(self):
        save_json(PRODUCTS_FILE, self.products)
    
    def save_orders(self):
        save_json(ORDERS_FILE, self.orders)
    
    def save_users(self):
        save_json(USERS_FILE, self.additional_users)
    
    def save_upi_mapping(self):
        save_json(UPI_FILE, self.seller_upi_mapping)

# Global data store
data_store = DataStore()

# Main users (not stored in file)
MAIN_USERS = {
    "admin": {"username": "mritunjay", "password": "mritunjay123", "role": "admin", "joinDate": "2024-01-15"},
    "buyer": {"username": "mriby", "password": "123", "role": "buyer", "joinDate": "2024-02-01"},
    "seller": {"username": "mrisell", "password": "123", "role": "seller", "joinDate": "2024-01-20"}
}

@app.route('/')
def home():
    return render_template('index.html')

# API Routes
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    # Check main users
    for user in MAIN_USERS.values():
        if user['username'] == username and user['password'] == password:
            return jsonify({
                'success': True,
                'role': user['role'],
                'username': username,
                'message': f'Welcome back, {username}!'
            })
    
    # Check additional users
    for user in data_store.additional_users:
        if user['username'] == username and user['password'] == password:
            return jsonify({
                'success': True,
                'role': user['role'],
                'username': username,
                'message': f'Welcome back, {username}!'
            })
    
    return jsonify({'success': False, 'message': 'Invalid credentials'})

@app.route('/api/products', methods=['GET'])
def get_products():
    return jsonify(data_store.products)

@app.route('/api/products', methods=['POST'])
def add_product():
    try:
        data = request.get_json()
        new_product = {
            'id': len(data_store.products) + 1,
            'name': data.get('name'),
            'description': data.get('description'),
            'price': float(data.get('price')),
            'image': data.get('image', '/static/images/default-product.png'),
            'seller': data.get('seller'),
            'sellerId': data.get('sellerId'),
            'quantity': int(data.get('quantity')),
            'category': data.get('category', 'general'),
            'created_at': datetime.now().isoformat()
        }
        data_store.products.append(new_product)
        data_store.save_products()
        return jsonify({'success': True, 'product': new_product})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/products/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    try:
        data = request.get_json()
        product_found = False
        for product in data_store.products:
            if product['id'] == product_id:
                product.update({
                    'name': data.get('name', product['name']),
                    'description': data.get('description', product['description']),
                    'price': float(data.get('price', product['price'])),
                    'quantity': int(data.get('quantity', product['quantity'])),
                    'image': data.get('image', product['image'])
                })
                product_found = True
                data_store.save_products()
                return jsonify({'success': True, 'product': product})
        
        if not product_found:
            return jsonify({'success': False, 'message': 'Product not found'})
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    try:
        initial_length = len(data_store.products)
        data_store.products = [p for p in data_store.products if p['id'] != product_id]
        
        if len(data_store.products) < initial_length:
            data_store.save_products()
            return jsonify({'success': True, 'message': 'Product deleted successfully'})
        else:
            return jsonify({'success': False, 'message': 'Product not found'})
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/orders', methods=['GET'])
def get_orders():
    return jsonify(data_store.orders)

@app.route('/api/orders', methods=['POST'])
def create_order():
    try:
        data = request.get_json()
        new_order = {
            'id': len(data_store.orders) + 1,
            'productId': data.get('productId'),
            'productName': data.get('productName'),
            'productImage': data.get('productImage'),
            'buyer': data.get('buyer'),
            'seller': data.get('seller'),
            'quantity': int(data.get('quantity')),
            'price': float(data.get('price')),
            'total': float(data.get('total')),
            'status': 'Pending Payment',
            'payment_status': 'pending',
            'order_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'expected_delivery': (datetime.now() + timedelta(hours=24)).strftime('%Y-%m-%d %H:%M:%S')
        }
        data_store.orders.append(new_order)
        
        data_store.save_orders()
        return jsonify({'success': True, 'order': new_order})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/orders/user/<username>', methods=['GET'])
def get_user_orders(username):
    user_orders = [order for order in data_store.orders if order['buyer'] == username]
    return jsonify(user_orders)

@app.route('/api/orders/seller/<seller_id>', methods=['GET'])
def get_seller_orders(seller_id):
    seller_orders = [order for order in data_store.orders if order['seller'] == seller_id]
    return jsonify(seller_orders)

# UPI and Payment Routes
@app.route('/api/seller/upi', methods=['GET', 'POST'])
def seller_upi():
    if request.method == 'GET':
        seller_id = request.args.get('seller_id')
        upi_id = data_store.seller_upi_mapping.get(seller_id, '')
        return jsonify({'success': True, 'upi_id': upi_id})
    
    elif request.method == 'POST':
        data = request.get_json()
        seller_id = data.get('seller_id')
        upi_id = data.get('upi_id')
        
        if seller_id and upi_id:
            data_store.seller_upi_mapping[seller_id] = upi_id
            data_store.save_upi_mapping()
            return jsonify({'success': True, 'message': 'UPI ID updated successfully'})
        
        return jsonify({'success': False, 'message': 'Invalid data'})

@app.route('/api/payment/process', methods=['POST'])
def process_payment():
    try:
        data = request.get_json()
        order_id = data.get('order_id')
        amount = data.get('amount')
        seller_id = data.get('seller_id')
        
        # Calculate commission (5% to admin, 95% to seller)
        commission = amount * 0.05
        seller_amount = amount * 0.95
        
        # Generate transaction ID
        transaction_id = str(uuid.uuid4())[:8].upper()
        
        # Update order with payment info and reduce product quantity
        for order in data_store.orders:
            if order['id'] == order_id:
                order.update({
                    'payment_status': 'completed',
                    'transaction_id': transaction_id,
                    'commission': commission,
                    'seller_amount': seller_amount,
                    'payment_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    'expected_delivery': (datetime.now() + timedelta(hours=24)).strftime('%Y-%m-%d %H:%M:%S'),
                    'status': 'Processing'
                })
                
                # Update product quantity
                for product in data_store.products:
                    if product['id'] == order['productId']:
                        product['quantity'] -= order['quantity']
                        break
                
                break
        
        data_store.save_orders()
        data_store.save_products()
        
        return jsonify({
            'success': True,
            'transaction_id': transaction_id,
            'commission': commission,
            'seller_amount': seller_amount,
            'expected_delivery': (datetime.now() + timedelta(hours=24)).strftime('%Y-%m-%d %H:%M')
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/admin/commission', methods=['GET'])
def get_admin_commission():
    try:
        total_commission = sum(order.get('commission', 0) for order in data_store.orders 
                             if order.get('payment_status') == 'completed')
        return jsonify({'success': True, 'total_commission': total_commission})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/upload', methods=['POST'])
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'message': 'No file selected'})
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'message': 'No file selected'})
        
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_')
            filename = timestamp + filename
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            
            file_url = f'/uploads/{filename}'
            return jsonify({'success': True, 'file_url': file_url})
        
        return jsonify({'success': False, 'message': 'Invalid file type'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/admin/users', methods=['GET'])
def get_all_users():
    all_users = []
    for user in MAIN_USERS.values():
        all_users.append({
            'username': user['username'],
            'role': user['role'],
            'status': 'Active',
            'joinDate': user.get('joinDate', '2024-01-01')
        })
    for user in data_store.additional_users:
        all_users.append(user)
    return jsonify(all_users)

@app.route('/api/admin/users', methods=['POST'])
def add_user():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        role = data.get('role', 'buyer')
        
        all_usernames = [user['username'] for user in MAIN_USERS.values()] + \
                       [user['username'] for user in data_store.additional_users]
        
        if username in all_usernames:
            return jsonify({'success': False, 'message': 'Username already exists'})
        
        new_user = {
            'username': username,
            'password': password,
            'role': role,
            'status': 'Active',
            'joinDate': datetime.now().strftime('%Y-%m-%d')
        }
        
        data_store.additional_users.append(new_user)
        data_store.save_users()
        return jsonify({'success': True, 'user': new_user})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/admin/users/<username>', methods=['DELETE'])
def delete_user(username):
    try:
        if username in ['mritunjay', 'mriby', 'mrisell']:
            return jsonify({'success': False, 'message': 'Cannot delete demo users'})
        
        initial_length = len(data_store.additional_users)
        data_store.additional_users = [user for user in data_store.additional_users if user['username'] != username]
        
        if len(data_store.additional_users) < initial_length:
            data_store.save_users()
            return jsonify({'success': True, 'message': 'User deleted successfully'})
        else:
            return jsonify({'success': False, 'message': 'User not found'})
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/admin/stats', methods=['GET'])
def get_admin_stats():
    try:
        total_buyers = len([user for user in data_store.additional_users if user['role'] == 'buyer']) + 1
        total_sellers = len([user for user in data_store.additional_users if user['role'] == 'seller']) + 1
        total_orders = len(data_store.orders)
        total_revenue = sum(order['total'] for order in data_store.orders if order.get('payment_status') == 'completed')
        
        return jsonify({
            'success': True,
            'stats': {
                'total_buyers': total_buyers,
                'total_sellers': total_sellers,
                'total_orders': total_orders,
                'total_revenue': total_revenue
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

if __name__ == '__main__':
    print("🚀 Starting MTD Store Application...")
    print("📍 Access the website at: http://localhost:5000")
    print("\n🔑 Demo Credentials:")
    print("   👨‍💼 Admin:    mritunjay / mritunjay123")
    print("   🛒 Buyer:     mriby / 123")
    print("   👨‍🌾 Seller:    mrisell / 123")
    print("\n✨ Features:")
    print("   ✅ Modern responsive design")
    print("   ✅ Image upload & URL support for products")
    print("   ✅ Order tracking and management")
    print("   ✅ Sales analytics for sellers")
    print("   ✅ User management for admins")
    print("   ✅ Data persistence with JSON storage")
    print("   ✅ UPI Payment System with 5% commission")
    print("   ✅ 24-hour delivery tracking")
    app.run(debug=True, host='0.0.0.0', port=5000)