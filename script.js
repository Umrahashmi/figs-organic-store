// --- CONFIGURATION ---
const SHEET_ID = '1n1Pa9lFNxArphUW-v-qbKDdHdn7mruA0Ny00C4BGIf8'; 
const WHATSAPP_NUMBER = '919670485121'; 

const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

let products = [];
let cart = [];

const productsContainer = document.getElementById('productsContainer');
const categoryFilters = document.getElementById('categoryFilters');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');

const cartOverlay = document.getElementById('cartOverlay');
const cartSidebar = document.getElementById('cartSidebar');
const cartOpenBtn = document.getElementById('cartOpenBtn');
const cartCloseBtn = document.getElementById('cartCloseBtn');
const cartItemsContainer = document.getElementById('cartItems');
const cartCount = document.getElementById('cartCount');
const cartTotalValue = document.getElementById('cartTotalValue');
const checkoutBtn = document.getElementById('checkoutBtn');

async function init() {
    loadCart();
    await fetchProducts();
    setupEventListeners();
}

async function fetchProducts() {
    try {
        if (SHEET_ID === 'YOUR_GOOGLE_SHEET_ID_HERE') {
            productsContainer.innerHTML = '<div class="loading" style="color: red;">Please update YOUR_GOOGLE_SHEET_ID_HERE in script.js</div>';
            return;
        }

        const response = await fetch(SHEET_CSV_URL);
        const csvText = await response.text();
        
        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                products = results.data;
                renderProducts(products);
                generateCategoryFilters(products);
            }
        });
    } catch (error) {
        productsContainer.innerHTML = '<div class="loading">Error loading products. Ensure your Google Sheet is public.</div>';
        console.error('Error:', error);
    }
}

function renderProducts(productsToRender) {
    productsContainer.innerHTML = '';
    
    if (productsToRender.length === 0) {
        productsContainer.innerHTML = '<div class="loading">No products found.</div>';
        return;
    }

    productsToRender.forEach(product => {
        const name = product.Name || 'Unnamed Product';
        const price = parseFloat(product.Price) || 0;
        const category = product.Category || 'General';
        const desc = product.Description || '';
        const ingredients = product.Ingredients || '';
        const img = product.Image || 'https://via.placeholder.com/300x250?text=Figs+Organic';
        const id = product.ID || Math.random().toString(36).substr(2, 9);

        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${img}" alt="${name}" class="product-image" onerror="this.src='https://via.placeholder.com/300x250?text=Figs+Organic'">
            <div class="product-info">
                <span class="product-category">${category}</span>
                <h3 class="product-title">${name}</h3>
                <div class="product-price">₹${price.toFixed(2)}</div>
                <p class="product-desc">${desc}</p>
                ${ingredients ? `<div class="product-ingredients">Key Ingredients: ${ingredients}</div>` : ''}
                <button class="add-to-cart-btn" onclick="addToCart('${id}', '${name.replace(/'/g, "\\'")}', ${price}, '${img}')">Add to Basket</button>
            </div>
        `;
        productsContainer.appendChild(card);
    });
}

function generateCategoryFilters(data) {
    const categories = ['all', ...new Set(data.map(p => p.Category).filter(Boolean))];
    
    categoryFilters.innerHTML = '';
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `filter-btn ${cat === 'all' ? 'active' : ''}`;
        btn.dataset.category = cat;
        btn.innerText = cat.charAt(0).toUpperCase() + cat.slice(1);
        
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (cat === 'all') {
                renderProducts(products);
            } else {
                const filtered = products.filter(p => p.Category === cat);
                renderProducts(filtered);
            }
        });
        
        categoryFilters.appendChild(btn);
    });
}

function handleSearch() {
    const query = searchInput.value.toLowerCase();
    const filtered = products.filter(p => {
        return (p.Name && p.Name.toLowerCase().includes(query)) || 
               (p.Description && p.Description.toLowerCase().includes(query)) ||
               (p.Ingredients && p.Ingredients.toLowerCase().includes(query));
    });
    
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-category="all"]').classList.add('active');
    
    renderProducts(filtered);
}

function addToCart(id, name, price, img) {
    const existingItem = cart.find(item => item.id === id);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ id, name, price, img, quantity: 1 });
    }
    saveCart();
    updateCartUI();
    openCart();
}

function updateQuantity(id, change) {
    const itemIndex = cart.findIndex(item => item.id === id);
    if (itemIndex > -1) {
        cart[itemIndex].quantity += change;
        if (cart[itemIndex].quantity <= 0) {
            cart.splice(itemIndex, 1);
        }
        saveCart();
        updateCartUI();
    }
}

function updateCartUI() {
    cartItemsContainer.innerHTML = '';
    let total = 0;
    let count = 0;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align:center; color: var(--text-light); margin-top: 2rem;">Your basket is empty.</p>';
    }

    cart.forEach(item => {
        total += item.price * item.quantity;
        count += item.quantity;

        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.innerHTML = `
            <img src="${item.img}" class="cart-item-img" onerror="this.src='https://via.placeholder.com/60'">
            <div class="cart-item-details">
                <div class="cart-item-title">${item.name}</div>
                <div class="cart-item-price">₹${item.price.toFixed(2)}</div>
                <div class="cart-item-controls">
                    <button class="qty-btn" onclick="updateQuantity('${item.id}', -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="qty-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
                </div>
            </div>
            <div style="font-weight: bold;">₹${(item.price * item.quantity).toFixed(2)}</div>
        `;
        cartItemsContainer.appendChild(itemEl);
    });

    cartCount.innerText = count;
    cartTotalValue.innerText = `₹${total.toFixed(2)}`;
}

function saveCart() {
    localStorage.setItem('figsOrganicCart', JSON.stringify(cart));
}

function loadCart() {
    const savedCart = localStorage.getItem('figsOrganicCart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCartUI();
    }
}

function openCart() {
    cartOverlay.classList.add('active');
    cartSidebar.classList.add('active');
}

function closeCart() {
    cartOverlay.classList.remove('active');
    cartSidebar.classList.remove('active');
}

function processCheckout() {
    if (cart.length === 0) {
        alert("Your basket is empty!");
        return;
    }

    let message = "Hello Figs Organic, I would like to place an order:\n\n";
    let total = 0;

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        message += `• ${item.name}\n  Qty: ${item.quantity} | ₹${itemTotal}\n\n`;
    });

    message += `*Total Amount: ₹${total.toFixed(2)}*\n\nPlease confirm my order.`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
}

function setupEventListeners() {
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    cartOpenBtn.addEventListener('click', openCart);
    cartCloseBtn.addEventListener('click', closeCart);
    cartOverlay.addEventListener('click', closeCart);
    checkoutBtn.addEventListener('click', processCheckout);
}

document.addEventListener('DOMContentLoaded', init);