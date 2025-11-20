// frontend/js/cart.js
console.log('🛒 CART: Загружается cart.js');

class CartManager {
  constructor() {
    console.log('🛒 CART: Инициализация CartManager');
    this.apiBase = 'http://localhost:8001/api';
    this.cartItems = [];
    this.isReady = false;
    
    this.init();
  }

  async init() {
    try {
      await this.loadCart();
      this.isReady = true;
      console.log('✅ CART: CartManager готов к работе');
    } catch (error) {
      console.error('❌ CART: Ошибка инициализации:', error);
    }
  }

  async addToCart(productId, quantity = 1) {
    console.log('🛒 CART: addToCart', productId, quantity);

    // Проверяем авторизацию
    if (!this.getAuthToken()) {
      alert('Для добавления в корзину необходимо авторизоваться');
      this.openAuthModal();
      return false;
    }

    // Используем локальное хранилище для демо
    this.addToLocalCart(productId, quantity);
    return true;
  }

  addToLocalCart(productId, quantity = 1) {
    // Получаем информацию о товаре из каталога
    const product = this.getProductFromCatalog(productId);
    if (!product) {
      console.error('Товар не найден в каталоге');
      return false;
    }

    // Проверяем, есть ли товар уже в корзине
    const existingItem = this.cartItems.find(item => item.product_id === productId);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      this.cartItems.push({
        id: Date.now(), // Временный ID
        product_id: productId,
        quantity: quantity,
        product: product
      });
    }

    this.saveLocal();
    this.renderCart();
    this.showNotification('Товар добавлен в корзину');
    return true;
  }

  getProductFromCatalog(productId) {
    // Заглушки для демо
    const demoProducts = [
      { id: 1, name: "Диван Aurora", price: 89900, description: "Элегантный диван с высокой спинкой и удобными подлокотниками", category: "sofa", image_url: "./img/sofa1.png" },
      { id: 2, name: "Диван Luna", price: 124500, description: "Роскошный диван премиум-класса с механизмом трансформации", category: "sofa", image_url: "./img/sofa2.png" },
      { id: 3, name: "Диван Cosmo", price: 76300, description: "Стильный трехместный диван в современном стиле", category: "sofa", image_url: "./img/sofa3.png" },
      { id: 4, name: "Шкаф-купе Milano", price: 45200, description: "Вместительный шкаф-купе с зеркальными дверями", category: "wardrobe", image_url: "./img/wardrobe1.png" },
      { id: 5, name: "Шкаф Vienna", price: 38700, description: "Классический распашной шкаф из массива дуба", category: "wardrobe", image_url: "./img/wardrobe2.png" },
      { id: 6, name: "Шкаф Modern", price: 67900, description: "Угловой шкаф-гардеробная с системой купэ", category: "wardrobe", image_url: "./img/wardrobe3.png" },
      { id: 7, name: "Кровать Valencia", price: 68700, description: "Кровать двуспальная с ортопедическим основанием", category: "bed", image_url: "./img/bed1.png" },
      { id: 8, name: "Кровать Oslo", price: 52400, description: "Минималистичная кровать из натурального дерева", category: "bed", image_url: "./img/bed2.png" },
      { id: 9, name: "Кровать Imperial", price: 95800, description: "Роскошная кровать с высоким мягким изголовьем", category: "bed", image_url: "./img/bed3.png" }
    ];

    return demoProducts.find(p => p.id === productId);
  }

  async loadCart() {
    console.log('🛒 CART: loadCart');
    this.loadCartFromLocalStorage();
  }

  updateQuantity(itemId, newQuantity) {
    if (newQuantity < 1) {
      this.removeFromCart(itemId);
      return;
    }

    const item = this.cartItems.find(item => item.id == itemId);
    if (item) {
      item.quantity = newQuantity;
      this.saveLocal();
      this.renderCart();
    }
  }

  removeFromCart(itemId) {
    this.cartItems = this.cartItems.filter(item => item.id != itemId);
    this.saveLocal();
    this.renderCart();
    this.showNotification('Товар удален из корзины');
  }

  clearCart() {
    this.cartItems = [];
    this.saveLocal();
    this.renderCart();
    this.showNotification('Корзина очищена');
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

    document.getElementById('items-count').textContent = `${itemsCount} шт.`;
    document.getElementById('subtotal').textContent = `${subtotal.toLocaleString('ru-RU')} ₽`;
    document.getElementById('total').textContent = `${total.toLocaleString('ru-RU')} ₽`;
  }

  getAuthToken() {
    const raw = localStorage.getItem('mebeldom_auth');
    if (!raw) return null;
    try {
      const user = JSON.parse(raw);
      return user.token || null;
    } catch {
      return null;
    }
  }

  showNotification(message) {
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

  saveLocal() {
    localStorage.setItem('mebeldom_cart', JSON.stringify(this.cartItems));
  }

  loadCartFromLocalStorage() {
    const raw = localStorage.getItem('mebeldom_cart');
    if (raw) {
      try {
        this.cartItems = JSON.parse(raw);
      } catch {
        this.cartItems = [];
      }
    } else {
      this.cartItems = [];
    }
    this.renderCart();
    this.updateCartCounter();
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

  renderCart() {
    const container = document.getElementById('cart-items');
    const checkoutBtn = document.getElementById('checkout-btn');
    const clearCartBtn = document.getElementById('clear-cart-btn');
    
    if (!container) return;

    container.innerHTML = '';
    
    if (this.cartItems.length === 0) {
      container.innerHTML = `
        <div class="empty-cart">
          <h3>Корзина пуста</h3>
          <p>Добавьте товары из каталога</p>
          <a href="catalog.html" class="nav-btn">Перейти в каталог</a>
        </div>
      `;
      if (checkoutBtn) checkoutBtn.style.display = 'none';
      this.updateSummary();
      return;
    }

    if (checkoutBtn) checkoutBtn.style.display = 'block';
    
    // Обработчик для кнопки очистки корзины
    if (clearCartBtn) {
      clearCartBtn.onclick = () => {
        if (confirm('Вы уверены, что хотите очистить корзину?')) {
          this.clearCart();
        }
      };
    }

    // Обработчик для кнопки оформления заказа
    if (checkoutBtn) {
      checkoutBtn.onclick = () => this.checkout();
    }

    this.cartItems.forEach(item => {
      const product = item.product || {};
      const price = Number(product.price || 0);
      const quantity = Number(item.quantity || 1);
      const total = price * quantity;

      const cartItemElement = document.createElement('div');
      cartItemElement.className = 'cart-item';
      cartItemElement.innerHTML = `
        <div class="item-image">
          <img src="${product.image_url || './img/placeholder.jpg'}" alt="${product.name}" 
               onerror="this.src='./img/placeholder.jpg'">
        </div>
        
        <div class="item-details">
          <h3 class="item-name">${product.name || `Товар ${item.product_id}`}</h3>
          <p class="item-description">${product.description || ''}</p>
          <div class="item-price">${price.toLocaleString('ru-RU')} ₽</div>
        </div>
        
        <div class="item-controls">
          <div class="quantity-controls">
            <button class="quantity-btn minus" data-item-id="${item.id}">-</button>
            <span class="quantity">${quantity}</span>
            <button class="quantity-btn plus" data-item-id="${item.id}">+</button>
          </div>
          
          <div class="item-total">
            ${total.toLocaleString('ru-RU')} ₽
          </div>
          
          <button class="remove-btn" data-item-id="${item.id}" title="Удалить товар">
            🗑️
          </button>
        </div>
      `;
      
      container.appendChild(cartItemElement);
    });

    // Добавляем обработчики для кнопок изменения количества и удаления
    container.querySelectorAll('.quantity-btn.minus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const itemId = e.target.dataset.itemId;
        const item = this.cartItems.find(item => item.id == itemId);
        if (item) {
          this.updateQuantity(itemId, item.quantity - 1);
        }
      });
    });

    container.querySelectorAll('.quantity-btn.plus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const itemId = e.target.dataset.itemId;
        const item = this.cartItems.find(item => item.id == itemId);
        if (item) {
          this.updateQuantity(itemId, item.quantity + 1);
        }
      });
    });

    container.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const itemId = e.target.dataset.itemId;
        this.removeFromCart(itemId);
      });
    });

    this.updateSummary();
  }
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
  console.log('🛒 CART: DOM загружен, создаем CartManager');
  window.cart = new CartManager();
});