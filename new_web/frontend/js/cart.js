// frontend/js/cart.js
class CartManager {
    constructor() {
        this.cartItems = [];
        this.loadCart();
    }
    
    async loadCart() {
        const token = getAuthToken();
        if (!token) {
            this.showEmptyCart();
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE}/cart`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                this.cartItems = await response.json();
                this.renderCart();
            }
        } catch (error) {
            console.error('Ошибка загрузки корзины:', error);
        }
    }
    
    async addToCart(productId, quantity = 1) {
        const token = getAuthToken();
        if (!token) {
            alert('Для добавления в корзину необходимо авторизоваться');
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE}/cart`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    product_id: productId,
                    quantity: quantity
                })
            });
            
            if (response.ok) {
                this.loadCart(); // Перезагружаем корзину
            }
        } catch (error) {
            console.error('Ошибка добавления в корзину:', error);
        }
    }
    
    renderCart() {
        const container = document.getElementById('cart-items');
        const totalElement = document.getElementById('cart-total');
        
        if (this.cartItems.length === 0) {
            this.showEmptyCart();
            return;
        }
        
        let total = 0;
        container.innerHTML = '';
        
        this.cartItems.forEach(item => {
            const itemTotal = item.product.price * item.quantity;
            total += itemTotal;
            
            const itemElement = document.createElement('div');
            itemElement.className = 'cart-item';
            itemElement.innerHTML = `
                <img src="${item.product.image_url}" alt="${item.product.name}" class="cart-item-image">
                <div class="cart-item-details">
                    <h3>${item.product.name}</h3>
                    <p>Цена: ${item.product.price} руб.</p>
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="cart.updateQuantity(${item.id}, ${item.quantity - 1})">-</button>
                        <span>${item.quantity}</span>
                        <button class="quantity-btn" onclick="cart.updateQuantity(${item.id}, ${item.quantity + 1})">+</button>
                    </div>
                    <p>Сумма: ${itemTotal} руб.</p>
                </div>
                <button class="remove-btn" onclick="cart.removeFromCart(${item.id})">Удалить</button>
            `;
            container.appendChild(itemElement);
        });
        
        totalElement.textContent = `Итого: ${total} руб.`;
        document.getElementById('checkout-btn').style.display = 'block';
    }
    
    showEmptyCart() {
        document.getElementById('cart-items').innerHTML = '<p>Корзина пуста</p>';
        document.getElementById('cart-total').textContent = '';
        document.getElementById('checkout-btn').style.display = 'none';
    }
}

const cart = new CartManager();