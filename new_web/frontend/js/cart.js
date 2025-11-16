// frontend/js/cart.js
const API_BASE = 'http://localhost:8001/api'; // Замените на ваш URL бэкенда

class CartManager {
    constructor() {
        this.cartItems = [];
        this.updateCartCounter();
    }
    
    async loadCart() {
        const token = getAuthToken();
        if (!token) {
            this.showAuthRequired();
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
            } else if (response.status === 404) {
                this.showEmptyCart('Корзина пуста');
            } else {
                this.showEmptyCart('Ошибка загрузки корзины');
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
            openAuthModal();
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
                const newItem = await response.json();
                // Обновляем локальное состояние
                const existingIndex = this.cartItems.findIndex(item => 
                    item.id === newItem.id
                );
                if (existingIndex >= 0) {
                    this.cartItems[existingIndex] = newItem;
                } else {
                    this.cartItems.push(newItem);
                }
                
                this.updateCartCounter();
                return true;
            } else {
                const error = await response.json();
                alert(`Ошибка добавления в корзину: ${error.detail}`);
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
                const updatedItem = await response.json();
                // Обновляем локальное состояние
                const index = this.cartItems.findIndex(item => item.id === itemId);
                if (index >= 0) {
                    this.cartItems[index] = updatedItem;
                }
                this.renderCart();
                this.updateCartCounter();
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
                // Удаляем из локального состояния
                this.cartItems = this.cartItems.filter(item => item.id !== itemId);
                this.renderCart();
                this.updateCartCounter();
            }
        } catch (error) {
            console.error('Ошибка удаления из корзины:', error);
        }
    }
    
    async clearCart() {
        const token = getAuthToken();
        if (!token) return;
        
        try {
            // Удаляем все элементы по одному (или можно добавить endpoint для очистки всей корзины)
            for (const item of this.cartItems) {
                await this.removeFromCart(item.id);
            }
        } catch (error) {
            console.error('Ошибка очистки корзины:', error);
        }
    }
    
    renderCart() {
        const container = document.getElementById('cart-items');
        const itemsCountElement = document.getElementById('items-count');
        const subtotalElement = document.getElementById('subtotal');
        const totalElement = document.getElementById('total');
        const checkoutBtn = document.getElementById('checkout-btn');
        
        if (this.cartItems.length === 0) {
            this.showEmptyCart('Корзина пуста');
            return;
        }
        
        let total = 0;
        let itemsCount = 0;
        
        container.innerHTML = '';
        
        this.cartItems.forEach(item => {
            const itemTotal = item.product.price * item.quantity;
            total += itemTotal;
            itemsCount += item.quantity;
            
            const itemElement = document.createElement('div');
            itemElement.className = 'cart-item';
            itemElement.innerHTML = `
                <div class="cart-item-image">
                    ${item.product.image_url ? 
                        `<img src="${item.product.image_url}" alt="${item.product.name}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">` : 
                        'Изображение'
                    }
                </div>
                <div class="cart-item-details">
                    <h3>${item.product.name}</h3>
                    <div class="cart-item-price">${item.product.price.toLocaleString('ru-RU')} ₽</div>
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="cart.updateQuantity(${item.id}, ${item.quantity - 1})">-</button>
                        <input type="text" class="quantity-input" value="${item.quantity}" readonly>
                        <button class="quantity-btn" onclick="cart.updateQuantity(${item.id}, ${item.quantity + 1})">+</button>
                        <button class="remove-btn" onclick="cart.removeFromCart(${item.id})">Удалить</button>
                    </div>
                </div>
            `;
            container.appendChild(itemElement);
        });
        
        // Обновляем правую колонку
        itemsCountElement.textContent = `${itemsCount} шт.`;
        subtotalElement.textContent = `${total.toLocaleString('ru-RU')} ₽`;
        totalElement.textContent = `${total.toLocaleString('ru-RU')} ₽`;
        
        checkoutBtn.style.display = 'block';
    }
    
    showEmptyCart(message) {
        const container = document.getElementById('cart-items');
        const itemsCountElement = document.getElementById('items-count');
        const subtotalElement = document.getElementById('subtotal');
        const totalElement = document.getElementById('total');
        const checkoutBtn = document.getElementById('checkout-btn');
        
        container.innerHTML = `
            <div class="empty-cart">
                <h3>${message}</h3>
                <p>Добавьте товары из каталога</p>
                <a href="catalog.html" class="nav-btn" style="margin-top: 20px; display: inline-block;">Перейти в каталог</a>
            </div>
        `;
        
        // Обнуляем правую колонку
        itemsCountElement.textContent = '0 шт.';
        subtotalElement.textContent = '0 ₽';
        totalElement.textContent = '0 ₽';
        checkoutBtn.style.display = 'none';
    }
    
    showAuthRequired() {
        const container = document.getElementById('cart-items');
        const itemsCountElement = document.getElementById('items-count');
        const subtotalElement = document.getElementById('subtotal');
        const totalElement = document.getElementById('total');
        const checkoutBtn = document.getElementById('checkout-btn');
        
        container.innerHTML = `
            <div class="auth-required">
                <h3>Необходима авторизация</h3>
                <p>Для просмотра корзины необходимо войти в систему</p>
                <button class="nav-btn" onclick="openAuthModal()" style="margin-top: 20px;">Войти или зарегистрироваться</button>
            </div>
        `;
        
        // Обнуляем правую колонку
        itemsCountElement.textContent = '0 шт.';
        subtotalElement.textContent = '0 ₽';
        totalElement.textContent = '0 ₽';
        checkoutBtn.style.display = 'none';
    }
    
    updateCartCounter() {
        const count = this.cartItems.reduce((total, item) => total + item.quantity, 0);
        const cartButtons = document.querySelectorAll('.nav-btn[data-page="cart"]');
        
        cartButtons.forEach(button => {
            if (count > 0) {
                button.textContent = `Корзина (${count})`;
            } else {
                button.textContent = 'Корзина';
            }
        });
    }
    
    // Метод для получения текущего состояния корзины
    getCartState() {
        return {
            items: this.cartItems,
            total: this.cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0),
            count: this.cartItems.reduce((sum, item) => sum + item.quantity, 0)
        };
    }
}

// Инициализация глобального объекта корзины
const cart = new CartManager();