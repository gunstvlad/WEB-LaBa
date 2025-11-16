// frontend/js/cart.js
class CartManager {
    constructor() {
        this.cartItems = [];
        this.loadCart();
    }
    
    async loadCart() {
        const token = getAuthToken();
        if (!token) {
            this.showEmptyCart('Для просмотра корзины необходимо авторизоваться');
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
            } else {
                this.showEmptyCart('Корзина пуста');
            }
        } catch (error) {
            console.error('Ошибка загрузки корзины:', error);
            this.showEmptyCart('Ошибка загрузки корзины');
        }
    }
    
    async addToCart(productId, quantity = 1) {
        const token = getAuthToken();
        if (!token) {
            alert('Для добавления в корзину необходимо авторизоваться');
            return false;
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
                await this.loadCart(); // Перезагружаем корзину
                return true;
            } else {
                alert('Ошибка добавления в корзину');
                return false;
            }
        } catch (error) {
            console.error('Ошибка добавления в корзину:', error);
            alert('Ошибка добавления в корзину');
            return false;
        }
    }
    
    async updateQuantity(itemId, newQuantity) {
        if (newQuantity < 1) {
            await this.removeFromCart(itemId);
            return;
        }
        
        const token = getAuthToken();
        try {
            const response = await fetch(`${API_BASE}/cart/${itemId}?quantity=${newQuantity}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                await this.loadCart();
            }
        } catch (error) {
            console.error('Ошибка обновления количества:', error);
        }
    }
    
    async removeFromCart(itemId) {
        const token = getAuthToken();
        try {
            const response = await fetch(`${API_BASE}/cart/${itemId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                await this.loadCart();
            }
        } catch (error) {
            console.error('Ошибка удаления из корзины:', error);
        }
    }
    
    renderCart() {
        const container = document.getElementById('cart-items');
        const totalElement = document.getElementById('cart-total');
        const checkoutBtn = document.getElementById('checkout-btn');
        
        if (this.cartItems.length === 0) {
            this.showEmptyCart('Корзина пуста');
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
                <img src="${item.product.image_url || './img/placeholder.jpg'}" 
                     alt="${item.product.name}" 
                     class="cart-item-image">
                <div class="cart-item-details">
                    <h3 style="margin: 0 0 10px 0;">${item.product.name}</h3>
                    <p style="margin: 0 0 5px 0; color: var(--muted);">${item.product.description || ''}</p>
                    <p style="margin: 0 0 10px 0; font-weight: bold;">Цена: ${item.product.price} руб.</p>
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="cart.updateQuantity(${item.id}, ${item.quantity - 1})">-</button>
                        <span style="font-weight: bold; min-width: 30px; text-align: center;">${item.quantity}</span>
                        <button class="quantity-btn" onclick="cart.updateQuantity(${item.id}, ${item.quantity + 1})">+</button>
                    </div>
                    <p style="margin: 10px 0 0 0; font-size: 1.2em; font-weight: bold;">
                        Сумма: ${itemTotal} руб.
                    </p>
                </div>
                <button class="remove-btn" onclick="cart.removeFromCart(${item.id})">Удалить</button>
            `;
            container.appendChild(itemElement);
        });
        
        totalElement.innerHTML = `
            <div>Общая сумма: <strong>${total} руб.</strong></div>
            <div style="font-size: 0.8em; color: var(--muted); margin-top: 10px;">
                Товаров в корзине: ${this.cartItems.length}
            </div>
        `;
        checkoutBtn.style.display = 'block';
        
        // Обработчик для кнопки оформления заказа
        checkoutBtn.onclick = () => {
            alert('Функция оформления заказа в разработке!');
        };
    }
    
    showEmptyCart(message) {
        const container = document.getElementById('cart-items');
        container.innerHTML = `
            <div class="empty-cart">
                <h3>${message}</h3>
                <p>Перейдите в каталог, чтобы добавить товары в корзину</p>
                <a href="catalog.html" class="nav-btn" style="margin-top: 20px;">Перейти в каталог</a>
            </div>
        `;
        document.getElementById('cart-total').innerHTML = '';
        document.getElementById('checkout-btn').style.display = 'none';
    }
}

// Инициализация корзины
const cart = new CartManager();