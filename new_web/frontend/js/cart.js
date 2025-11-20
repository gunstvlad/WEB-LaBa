// frontend/js/cart.js
console.log('🛒 CART: Загружается cart.js');

class CartManager {
  constructor() {
    console.log('🛒 CART: Инициализация CartManager');
    this.apiBase = 'http://localhost:8001/api';
    this.cartItems = [];
    this.isReady = false;
    this.isUpdating = false;
    
    this.init();
  }

  async init() {
    try {
      this.bindEvents();
      await this.loadCart();
      this.isReady = true;
      console.log('✅ CART: CartManager готов к работе');
    } catch (error) {
      console.error('❌ CART: Ошибка инициализации:', error);
    }
  }

  bindEvents() {
    const clearCartBtn = document.getElementById('clear-cart-btn');
    if (clearCartBtn) {
      console.log('🔗 CART: Привязываем обработчик для очистки корзины');
      clearCartBtn.addEventListener('click', () => {
        this.handleClearCart();
      });
    }

    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        this.checkout();
      });
    }
  }

  async handleClearCart() {
    console.log('🗑️ CART: Начинаем очистку корзины');
    
    if (this.cartItems.length === 0) {
      this.showNotification('Корзина уже пуста');
      return;
    }

    if (confirm('Вы уверены, что хотите очистить корзину? Все товары будут удалены.')) {
      await this.clearCart();
    }
  }

  async addToCart(productId, quantity = 1) {
    console.log('🛒 CART: addToCart', productId, quantity);

    const token = this.getAuthToken();
    
    if (!token) {
      alert('Для добавления в корзину необходимо авторизоваться');
      this.openAuthModal();
      return false;
    }

    try {
      const payload = { product_id: Number(productId), quantity: Number(quantity) };
      
      const resp = await fetch(`${this.apiBase}/cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (resp.ok) {
        await this.loadCart();
        this.showNotification('Товар добавлен в корзину');
        return true;
      } else {
        const error = await resp.text();
        console.error('🛒 CART: Server error', error);
        alert('Ошибка при добавлении в корзину');
        return false;
      }
    } catch (e) {
      console.error('🛒 CART: Network error', e);
      alert('Ошибка сети при добавлении в корзину');
      return false;
    }
  }

  async loadCart() {
    console.log('🛒 CART: loadCart');
    const token = this.getAuthToken();
    
    if (!token) {
      this.cartItems = [];
      this.renderCart();
      return;
    }

    try {
      const resp = await fetch(`${this.apiBase}/cart`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (resp.ok) {
        const items = await resp.json();
        console.log('🛒 CART: Получены данные корзины:', items);
        
        // Сохраняем порядок элементов при обновлении
        if (this.cartItems.length > 0 && items.length > 0) {
          const currentOrder = new Map(this.cartItems.map((item, index) => [item.id, index]));
          items.sort((a, b) => {
            const orderA = currentOrder.get(a.id) ?? Infinity;
            const orderB = currentOrder.get(b.id) ?? Infinity;
            return orderA - orderB;
          });
        }
        
        this.cartItems = items;
        this.renderCart();
        this.updateCartCounter();
      } else {
        console.warn('🛒 CART: Failed to load cart from server');
        this.cartItems = [];
        this.renderCart();
      }
    } catch (e) {
      console.warn('🛒 CART: Network error, cart is empty', e);
      this.cartItems = [];
      this.renderCart();
    }
  }

  async updateQuantity(itemId, newQuantity) {
    if (this.isUpdating) {
      console.log('⏳ CART: Обновление уже выполняется, пропускаем');
      return;
    }

    if (newQuantity < 1) {
      await this.removeFromCart(itemId);
      return;
    }

    const token = this.getAuthToken();
    if (!token) {
      alert('Необходима авторизация');
      return;
    }

    this.isUpdating = true;

    try {
      // Временно обновляем интерфейс для мгновенной обратной связи
      const item = this.cartItems.find(item => item.id == itemId);
      if (item) {
        const oldQuantity = item.quantity;
        item.quantity = newQuantity;
        
        // Обновляем только нужный элемент, не перерисовывая всю корзину
        this.updateCartItemElement(itemId);
        this.updateSummary();
        
        const resp = await fetch(`${this.apiBase}/cart/${itemId}?quantity=${newQuantity}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (resp.ok) {
          this.showNotification('Количество обновлено');
        } else {
          // Откатываем изменения при ошибке
          item.quantity = oldQuantity;
          this.updateCartItemElement(itemId);
          this.updateSummary();
          const error = await resp.text();
          console.error('🛒 CART: Server error updating quantity', error);
          alert('Ошибка при обновлении количества');
        }
      }
    } catch (e) {
      console.error('🛒 CART: Network error updating quantity', e);
      alert('Ошибка сети при обновлении количества');
    } finally {
      this.isUpdating = false;
    }
  }

  updateCartItemElement(itemId) {
    const item = this.cartItems.find(item => item.id == itemId);
    if (!item) return;

    const itemElement = document.querySelector(`[data-item-id="${itemId}"]`);
    if (!itemElement) return;

    const product = item.product || {};
    const price = Number(product.price || 0);
    const quantity = Number(item.quantity || 1);
    const total = price * quantity;

    // Обновляем только необходимые элементы
    const quantityElement = itemElement.querySelector('.quantity');
    const totalElement = itemElement.querySelector('.item-total');

    if (quantityElement) quantityElement.textContent = quantity;
    if (totalElement) totalElement.textContent = `${total.toLocaleString('ru-RU')} ₽`;
  }

  async removeFromCart(itemId) {
    const token = this.getAuthToken();
    if (!token) {
      alert('Необходима авторизация');
      return;
    }

    try {
      const resp = await fetch(`${this.apiBase}/cart/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (resp.ok) {
        await this.loadCart();
        this.showNotification('Товар удален из корзины');
      } else {
        const error = await resp.text();
        console.error('🛒 CART: Server error removing item', error);
        alert('Ошибка при удалении товара');
      }
    } catch (e) {
      console.error('🛒 CART: Network error removing item', e);
      alert('Ошибка сети при удалении товара');
    }
  }

  async clearCart() {
    console.log('🗑️ CART: Выполняем очистку корзины через API');
    
    const token = this.getAuthToken();
    if (!token) {
      alert('Необходима авторизация');
      return;
    }

    try {
      const resp = await fetch(`${this.apiBase}/cart/clear`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (resp.ok) {
        console.log('✅ CART: Корзина успешно очищена на сервере');
        await this.loadCart();
        this.showNotification('Корзина очищена');
      } else {
        const error = await resp.text();
        console.error('🛒 CART: Server error clearing cart', error);
        
        // Если сервер возвращает ошибку из-за неправильного пути, пробуем альтернативный метод
        if (error.includes('int_parsing') && error.includes('clear')) {
          console.log('🔄 CART: Пробуем альтернативный метод очистки корзины');
          await this.clearCartAlternative();
        } else {
          alert('Ошибка при очистке корзины');
        }
      }
    } catch (e) {
      console.error('🛒 CART: Network error clearing cart', e);
      alert('Ошибка сети при очистке корзины');
    }
  }

  async clearCartAlternative() {
    // Альтернативный метод: удаляем все товары по одному
    const token = this.getAuthToken();
    if (!token) return;

    try {
      const deletePromises = this.cartItems.map(item => 
        fetch(`${this.apiBase}/cart/${item.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      );

      await Promise.all(deletePromises);
      await this.loadCart();
      this.showNotification('Корзина очищена');
    } catch (e) {
      console.error('🛒 CART: Alternative clear cart failed', e);
      alert('Ошибка при очистке корзины');
    }
  }

  checkout() {
    if (this.cartItems.length === 0) {
      alert('Корзина пуста');
      return;
    }

    const total = this.calculateTotal();
    alert(`Заказ оформлен! Сумма заказа: ${total.toLocaleString('ru-RU')} ₽\nСпасибо за покупку!`);
    this.clearCart();
  }

  calculateTotal() {
    return this.cartItems.reduce((total, item) => {
      const price = Number(item.product?.price || 0);
      const quantity = Number(item.quantity || 1);
      return total + (price * quantity);
    }, 0);
  }

  updateSummary() {
    const itemsCount = this.cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
    const subtotal = this.calculateTotal();
    const total = subtotal;

    const itemsCountElement = document.getElementById('items-count');
    const subtotalElement = document.getElementById('subtotal');
    const totalElement = document.getElementById('total');

    if (itemsCountElement) itemsCountElement.textContent = `${itemsCount} шт.`;
    if (subtotalElement) subtotalElement.textContent = `${subtotal.toLocaleString('ru-RU')} ₽`;
    if (totalElement) totalElement.textContent = `${total.toLocaleString('ru-RU')} ₽`;
  }

  // В cart.js замените функцию getAuthToken на:
getAuthToken() {
  // Используем глобальный объект auth если доступен
  if (window.auth && window.auth.getAuthToken) {
    const token = window.auth.getAuthToken();
    console.log('🛒 CART: Токен из auth manager:', token ? 'есть' : 'нет');
    return token;
  }
  
  // Fallback на localStorage
  const raw = localStorage.getItem('mebeldom_auth');
  if (!raw) {
    console.log('🛒 CART: Токен не найден в localStorage');
    return null;
  }
  
  try {
    const user = JSON.parse(raw);
    const token = user.token || user.access_token;
    console.log('🛒 CART: Токен из localStorage:', token ? 'есть' : 'нет');
    return token;
  } catch {
    console.log('🛒 CART: Ошибка парсинга токена из localStorage');
    return null;
  }
}

  showNotification(message) {
    const existingNotifications = document.querySelectorAll('.cart-notification');
    existingNotifications.forEach(notification => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    });

    const notification = document.createElement('div');
    notification.className = 'cart-notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--brand-red);
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      z-index: 10000;
      animation: slideInRight 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  openAuthModal() {
    if (window.openAuthModal) {
      window.openAuthModal();
    } else {
      alert('Требуется авторизация');
    }
  }

  updateCartCounter() {
    const count = this.cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
    const cartButtons = document.querySelectorAll('.nav-btn[data-page="cart"]');
    
    cartButtons.forEach(btn => {
      let counter = btn.querySelector('.cart-counter');
      if (!counter) {
        counter = document.createElement('span');
        counter.className = 'cart-counter';
        counter.style.cssText = `
          margin-left: 8px;
          background: var(--brand-red);
          color: white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
        `;
        btn.appendChild(counter);
      }
      
      counter.textContent = count;
      counter.style.display = count > 0 ? 'inline-flex' : 'none';
    });
    
    return count;
  }

  fixImageUrl(imageUrl) {
    if (!imageUrl) return './img/placeholder.jpg';
    
    if (imageUrl.startsWith('/')) {
      return '.' + imageUrl;
    }
    
    if (imageUrl.startsWith('./')) {
      return imageUrl;
    }
    
    if (!imageUrl.startsWith('http') && !imageUrl.startsWith('./') && !imageUrl.startsWith('/')) {
      return './' + imageUrl;
    }
    
    return imageUrl;
  }

  addCartImageStyles() {
    if (document.getElementById('cart-image-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'cart-image-styles';
    style.textContent = `
      .cart-item .item-image {
        width: 120px;
        height: 120px;
        flex-shrink: 0;
        border-radius: 8px;
        overflow: hidden;
        background: #f8f9fa;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #e9ecef;
      }
      
      .cart-item .item-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      
      .cart-item .item-image img[src*="placeholder"] {
        object-fit: contain;
        padding: 20px;
        background: #f8f9fa;
      }
      
      .cart-item {
        display: flex;
        gap: 16px;
        padding: 20px;
        border: 1px solid #f1f5f9;
        border-radius: 12px;
        margin-bottom: 16px;
        background: white;
        align-items: flex-start;
        transition: all 0.3s ease;
        position: relative;
      }

      .cart-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
        border-color: #e2e8f0;
      }
      
      .item-details {
        flex: 1;
        min-width: 0;
      }
      
      .item-name {
        margin: 0 0 8px 0;
        font-size: 1.1rem;
        font-weight: 600;
        color: #2d3748;
      }
      
      .item-description {
        margin: 0 0 8px 0;
        color: #718096;
        font-size: 0.9rem;
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      
      .item-price {
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--brand-red);
      }
      
      .item-controls {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 12px;
      }
      
      .quantity-controls {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #f8f9fa;
        border-radius: 6px;
        padding: 4px;
      }
      
      .quantity-btn {
        width: 32px;
        height: 32px;
        border: none;
        background: white;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 1.1rem;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        transition: all 0.2s;
      }
      
      .quantity-btn:hover {
        background: var(--brand-red);
        color: white;
      }

      .quantity-btn:disabled {
        background: #e2e8f0;
        color: #a0aec0;
        cursor: not-allowed;
      }
      
      .quantity {
        min-width: 40px;
        text-align: center;
        font-weight: 600;
      }
      
      .item-total {
        font-size: 1.2rem;
        font-weight: 700;
        color: #2d3748;
      }
      
      .remove-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 8px;
        border-radius: 4px;
        font-size: 1.2rem;
        transition: all 0.2s;
      }
      
      .remove-btn:hover {
        background: #fee2e2;
        color: #dc2626;
      }

      .clear-cart-btn {
        background: var(--brand-red);
        color: white;
        border: none;
        padding: 18px 32px;
        border-radius: 12px;
        cursor: pointer;
        font-size: 18px;
        font-weight: 600;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(var(--brand-red-rgb), 0.3);
      }

      .clear-cart-btn:hover {
        background: #b3151a;
        transform: translateY(-3px);
        box-shadow: 0 8px 25px rgba(var(--brand-red-rgb), 0.4);
      }

      .clear-cart-btn:active {
        transform: translateY(-1px);
      }

      .checkout-btn {
        background: var(--brand-red);
        color: white;
        border: none;
        padding: 18px 32px;
        border-radius: 12px;
        cursor: pointer;
        font-size: 18px;
        font-weight: 600;
        margin-top: 25px;
        width: 100%;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(var(--brand-red-rgb), 0.3);
      }

      .checkout-btn:hover {
        background: #b3151a;
        transform: translateY(-3px);
        box-shadow: 0 8px 25px rgba(var(--brand-red-rgb), 0.4);
      }

      .checkout-btn:active {
        transform: translateY(-1px);
      }

      .cart-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 25px;
        padding-bottom: 20px;
        border-bottom: 2px solid #f1f5f9;
      }

      .cart-title {
        font-size: 28px;
        font-weight: 700;
        color: var(--text);
        margin: 0;
      }

      .empty-cart {
        text-align: center;
        padding: 80px 40px;
        color: var(--muted);
      }

      .empty-cart h3 {
        color: var(--text);
        margin-bottom: 16px;
        font-size: 24px;
        font-weight: 600;
      }

      .empty-cart p {
        font-size: 16px;
        margin-bottom: 30px;
        line-height: 1.5;
      }
    `;
    
    document.head.appendChild(style);
  }

  renderCart() {
    const container = document.getElementById('cart-items');
    const checkoutBtn = document.getElementById('checkout-btn');
    const clearCartBtn = document.getElementById('clear-cart-btn');
    
    if (!container) {
      console.warn('🛒 CART: Контейнер корзины не найден');
      return;
    }

    this.addCartImageStyles();

    container.innerHTML = '';
    
    if (this.cartItems.length === 0) {
      container.innerHTML = `
        <div class="empty-cart">
          <h3>Ваша корзина пуста</h3>
          <p>Добавьте товары из каталога</p>
          <a href="catalog.html" class="nav-btn">Перейти в каталог</a>
        </div>
      `;
      if (checkoutBtn) checkoutBtn.style.display = 'none';
      if (clearCartBtn) clearCartBtn.style.display = 'none';
      this.updateSummary();
      return;
    }

    if (checkoutBtn) {
      checkoutBtn.style.display = 'block';
      checkoutBtn.disabled = false;
    }
    
    if (clearCartBtn) {
      clearCartBtn.style.display = 'block';
      clearCartBtn.disabled = false;
    }

    this.cartItems.forEach(item => {
      const product = item.product || {};
      const price = Number(product.price || 0);
      const quantity = Number(item.quantity || 1);
      const total = price * quantity;
      
      const fixedImageUrl = this.fixImageUrl(product.image_url);

      const cartItemElement = document.createElement('div');
      cartItemElement.className = 'cart-item';
      cartItemElement.setAttribute('data-item-id', item.id);
      cartItemElement.innerHTML = `
        <div class="item-image">
          <img src="${fixedImageUrl}" alt="${product.name}" 
               onerror="this.onerror=null; this.src='./img/placeholder.jpg';">
        </div>
        
        <div class="item-details">
          <h3 class="item-name">${product.name || `Товар ${item.product_id}`}</h3>
          <p class="item-description">${product.description || ''}</p>
          <div class="item-price">${price.toLocaleString('ru-RU')} ₽</div>
        </div>
        
        <div class="item-controls">
          <div class="quantity-controls">
            <button class="quantity-btn minus" data-item-id="${item.id}" ${this.isUpdating ? 'disabled' : ''}>-</button>
            <span class="quantity">${quantity}</span>
            <button class="quantity-btn plus" data-item-id="${item.id}" ${this.isUpdating ? 'disabled' : ''}>+</button>
          </div>
          
          <div class="item-total">
            ${total.toLocaleString('ru-RU')} ₽
          </div>
          
          <button class="remove-btn" data-item-id="${item.id}" title="Удалить товар" ${this.isUpdating ? 'disabled' : ''}>
            🗑️
          </button>
        </div>
      `;
      
      container.appendChild(cartItemElement);
    });

    container.querySelectorAll('.quantity-btn.minus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (this.isUpdating) return;
        const itemId = e.target.dataset.itemId;
        const item = this.cartItems.find(item => item.id == itemId);
        if (item) {
          this.updateQuantity(itemId, item.quantity - 1);
        }
      });
    });

    container.querySelectorAll('.quantity-btn.plus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (this.isUpdating) return;
        const itemId = e.target.dataset.itemId;
        const item = this.cartItems.find(item => item.id == itemId);
        if (item) {
          this.updateQuantity(itemId, item.quantity + 1);
        }
      });
    });

    container.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (this.isUpdating) return;
        const itemId = e.target.dataset.itemId;
        this.removeFromCart(itemId);
      });
    });

    this.updateSummary();
  }
}

document.addEventListener('DOMContentLoaded', function() {
  console.log('🛒 CART: DOM загружен, создаем CartManager');
  window.cart = new CartManager();
});