// frontend/js/cart.js
console.log('🛒 CART: Загружается cart.js — версия с локальными products');

const products = [
  { id: 1, name: "Диван Aurora", price: "89 900 ₽", description: "...", fullDescription: "...", category: "sofas", image: "./img/sofa1.png",  },
  { id: 2, name: "Диван Luna", price: "124 500 ₽", description: "...", fullDescription: "...", category: "sofas", image: "./img/sofa2.png",  },
  { id: 3, name: "Диван Cosmo", price: "76 300 ₽", description: "...", fullDescription: "...", category: "sofas", image: "./img/sofa3.png", },
  { id: 4, name: "Шкаф-купе Milano", price: "45 200 ₽", description: "...", fullDescription: "...", category: "wardrobes", image: "./img/wardrobe1.png", },
  { id: 5, name: "Шкаф классический Vienna", price: "38 700 ₽", description: "...", fullDescription: "...", category: "wardrobes", image: "./img/wardrobe2.png",  },
  { id: 6, name: "Шкаф-гардеробная Modern", price: "67 900 ₽", description: "...", fullDescription: "...", category: "wardrobes", image: "./img/wardrobe3.png",},
  { id: 7, name: "Кровать Valencia", price: "68 700 ₽", description: "...", fullDescription: "...", category: "beds", image: "./img/bed1.png",},
  { id: 8, name: "Кровать Oslo", price: "52 400 ₽", description: "...", fullDescription: "...", category: "beds", image: "./img/bed2.png"},
  { id: 9, name: "Кровать Imperial", price: "95 800 ₽", description: "...", fullDescription: "...", category: "beds", image: "./img/bed3.png" }
];
// NOTE: я оставил в products сокращённые description/feature для компактности,
// в вашем реальном файле используйте полный объект, который вы показали.

class CartManager {
  constructor() {
    console.log('🛒 CART: Инициализация CartManager');
    this.apiBase = 'http://localhost:8001/api';
    this.cartItems = [];
    this.loadCartFromLocalStorage();
    this.updateCartCounter();
  }

  // ---------- Helpers ----------
  parsePriceString(priceStr) {
    if (priceStr == null) return 0;
    // "89 900 ₽" -> 89900
    try {
      const cleaned = String(priceStr).replace(/[^\d,.\-]/g, '').replace(',', '.');
      return parseFloat(cleaned) || 0;
    } catch (e) {
      return 0;
    }
  }

  findProductInCatalog(productId) {
    const id = Number(productId);
    return products.find(p => Number(p.id) === id) || null;
  }

  normalizeServerItem(item) {
    // server item: { id, user_id, product_id, quantity, product? }
    const quantity = item.quantity ?? 1;
    const product = item.product ?? null;
    if (product && (product.price == null || product.price === "")) {
      product.price = product.price ?? 0;
    }
    // if missing product or missing price, fill from local catalog
    if (!product || !product.price) {
      const pinfo = this.findProductInCatalog(item.product_id);
      if (pinfo) {
        item.product = Object.assign({}, item.product || {}, {
          id: pinfo.id,
          name: pinfo.name,
          price: this.parsePriceString(pinfo.price),
          image_url: pinfo.image
        });
      } else {
        // fallback empty product
        item.product = item.product || { id: item.product_id, name: `Товар ${item.product_id}`, price: 0, image_url: null };
      }
    } else {
      // ensure numeric price
      item.product.price = typeof item.product.price === 'number' ? item.product.price : this.parsePriceString(item.product.price);
    }
    item.quantity = quantity;
    return item;
  }

  saveLocal() {
    localStorage.setItem('mebeldom_cart', JSON.stringify(this.cartItems));
  }

  // ---------- Core: Add / Load ----------
  async addToCart(productId, quantity = 1) {
    console.log('🛒 CART: addToCart', productId, quantity);
    const token = this.getAuthToken();
    if (!token) {
      alert('Для добавления в корзину необходимо авторизоваться');
      this.openAuthModal();
      return false;
    }

    const payload = { product_id: Number(productId), quantity: Number(quantity) };

    try {
      const resp = await fetch(`${this.apiBase}/cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const txt = await resp.text();
      console.log('🛒 CART: addToCart response', resp.status, txt);

      if (resp.ok) {
        // сервер вернул элемент корзины
        let newItem;
        try { newItem = JSON.parse(txt); } catch { newItem = null; }
        if (newItem) {
          const normalized = this.normalizeServerItem(newItem);
          // обновляем локальную копию
          const idx = this.cartItems.findIndex(i => i.id === normalized.id || i.product_id === normalized.product_id);
          if (idx >= 0) this.cartItems[idx] = normalized; else this.cartItems.push(normalized);
          this.saveLocal();
          await this.loadCart(); // синхронизируем с сервером
          return true;
        } else {
          // если ответ пустой или не JSON — fallback
          return this._localAddFromCatalog(productId, quantity);
        }
      } else {
        // сервер вернул ошибку
        return this._localAddFromCatalog(productId, quantity);
      }
    } catch (e) {
      console.warn('🛒 CART: network error, fallback to local', e);
      return this._localAddFromCatalog(productId, quantity);
    }
  }

  _localAddFromCatalog(productId, quantity = 1) {
    const pinfo = this.findProductInCatalog(productId);
    const mock = {
      id: Date.now(), // временный id
      product_id: Number(productId),
      quantity: Number(quantity),
      product: {
        id: pinfo ? pinfo.id : Number(productId),
        name: pinfo ? pinfo.name : `Товар ${productId}`,
        price: pinfo ? this.parsePriceString(pinfo.price) : 0,
        image_url: pinfo ? pinfo.image : null
      }
    };
    const idx = this.cartItems.findIndex(i => i.product_id === mock.product_id);
    if (idx >= 0) {
      this.cartItems[idx].quantity += mock.quantity;
    } else {
      this.cartItems.push(mock);
    }
    this.saveLocal();
    this.updateCartCounter();
    this.renderCart();
    return true;
  }

  async loadCart() {
    console.log('🛒 CART: loadCart');
    const token = this.getAuthToken();
    if (!token) {
      this.showAuthRequired();
      return;
    }
    try {
      const resp = await fetch(`${this.apiBase}/cart`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('🛒 CART: loadCart response', resp.status);
      if (resp.ok) {
        const items = await resp.json();
        // нормализуем все элементы
        this.cartItems = items.map(it => this.normalizeServerItem(it));
        this.saveLocal();
        this.renderCart();
        this.updateCartCounter();
      } else {
        console.warn('🛒 CART: server returned', resp.status, '— using local');
        this.loadCartFromLocalStorage();
        this.renderCart();
        this.updateCartCounter();
      }
    } catch (e) {
      console.warn('🛒 CART: network error on loadCart', e);
      this.loadCartFromLocalStorage();
      this.renderCart();
      this.updateCartCounter();
    }
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
  }

  // ---------- Update / Remove / Clear ----------
  async updateQuantity(itemId, newQuantity) {
    console.log('🛒 CART: updateQuantity', itemId, newQuantity);
    if (newQuantity < 1) return this.removeFromCart(itemId);
    const token = this.getAuthToken();
    if (!token) return;
    try {
      const resp = await fetch(`${this.apiBase}/cart/${itemId}?quantity=${newQuantity}`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` }});
      console.log('🛒 CART: updateQuantity status', resp.status);
      if (resp.ok) {
        await this.loadCart();
      } else {
        console.warn('🛒 CART: update failed, update local');
        const idx = this.cartItems.findIndex(i => i.id === itemId);
        if (idx >= 0) {
          this.cartItems[idx].quantity = newQuantity;
          this.saveLocal();
          this.renderCart();
          this.updateCartCounter();
        }
      }
    } catch (e) {
      console.warn('🛒 CART: network error updateQuantity', e);
    }
  }

  async removeFromCart(itemId) {
    console.log('🛒 CART: removeFromCart', itemId);
    const token = this.getAuthToken();
    if (!token) return;
    try {
      const resp = await fetch(`${this.apiBase}/cart/${itemId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }});
      console.log('🛒 CART: removeFromCart status', resp.status);
      if (resp.ok) {
        await this.loadCart();
      } else {
        // удалить локально
        this.cartItems = this.cartItems.filter(i => i.id !== itemId);
        this.saveLocal();
        this.renderCart();
        this.updateCartCounter();
      }
    } catch (e) {
      console.warn('🛒 CART: network error removeFromCart', e);
    }
  }

  async clearCart() {
    console.log('🛒 CART: clearCart');
    const token = this.getAuthToken();
    if (!token) return;
    try {
      const resp = await fetch(`${this.apiBase}/cart/clear`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }});
      console.log('🛒 CART: clearCart status', resp.status);
      if (resp.ok) {
        this.cartItems = [];
        this.saveLocal();
        this.renderCart();
        this.updateCartCounter();
      } else {
        console.warn('🛒 CART: clear failed on server, clearing local');
        this.cartItems = [];
        this.saveLocal();
        this.renderCart();
        this.updateCartCounter();
      }
    } catch (e) {
      console.warn('🛒 CART: network error clearCart', e);
    }
  }

  // ---------- Rendering ----------
  renderCart() {
    console.log('🛒 CART: renderCart');
    const container = document.getElementById('cart-items');
    if (!container) {
      console.warn('🛒 CART: cart-items container not found');
      return;
    }

    container.innerHTML = '';
    if (this.cartItems.length === 0) {
      container.innerHTML = `<div style="text-align:center;padding:40px;"><h3>Корзина пуста</h3><p>Добавьте товары из каталога</p><a href="catalog.html" class="nav-btn">Перейти в каталог</a></div>`;
      this._renderSummary();
      return;
    }

    this.cartItems.forEach(item => {
      const prod = item.product || {};
      const price = Number(prod.price || 0);
      const qty = Number(item.quantity || 0);
      const totalRow = price * qty;

      const el = document.createElement('div');
      el.className = 'cart-item';
      el.style.display = 'flex';
      el.style.gap = '12px';
      el.style.padding = '12px 0';
      el.innerHTML = `
        <div class="cart-item-image" style="width:80px;">
          ${prod.image_url ? `<img src="${prod.image_url}" alt="${prod.name || ''}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;">` : `<div style="width:80px;height:80px;background:#f0f0f0;border-radius:8px;display:flex;align-items:center;justify-content:center;">Изобр.</div>`}
        </div>
        <div style="flex:1;">
          <h3 style="margin:0 0 8px 0;">${prod.name || `Товар ${item.product_id || item.id}`}</h3>
          <div style="font-weight:700;color:var(--brand-red);margin-bottom:6px;">${price.toLocaleString('ru-RU')} ₽</div>
          <div style="color:#666;margin-bottom:8px;">Всего: ${totalRow.toLocaleString('ru-RU')} ₽</div>
          <div style="display:flex;gap:8px;align-items:center;">
            <button onclick="cart.updateQuantity(${item.id}, ${Math.max(0, qty - 1)})">-</button>
            <input readonly value="${qty}" style="width:40px;text-align:center;">
            <button onclick="cart.updateQuantity(${item.id}, ${qty + 1})">+</button>
            <button onclick="cart.removeFromCart(${item.id})" style="margin-left:12px;color:var(--brand-red)">Удалить</button>
          </div>
        </div>
      `;
      container.appendChild(el);
    });

    this._renderSummary();
  }

  _renderSummary() {
    const container = document.getElementById('cart-items');
    if (!container) return;

    // remove old summary if exists
    const old = document.getElementById('cart-summary');
    if (old) old.remove();

    const state = this.getCartState();
    const summary = document.createElement('div');
    summary.id = 'cart-summary';
    summary.style.borderTop = '1px solid #eee';
    summary.style.padding = '16px';
    summary.style.display = 'flex';
    summary.style.justifyContent = 'space-between';
    summary.innerHTML = `
      <div>Товаров: <strong>${state.count}</strong></div>
      <div style="text-align:right"><div>Итого</div><div style="font-weight:700;color:var(--brand-red);font-size:18px">${state.total.toLocaleString('ru-RU')} ₽</div></div>
    `;
    container.appendChild(summary);
  }

  // ---------- Utilities ----------
  updateCartCounter() {
    const count = this.cartItems.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
    const buttons = document.querySelectorAll('.nav-btn[data-page="cart"]');
    buttons.forEach(btn => {
      let span = btn.querySelector('.cart-counter');
      if (!span) {
        span = document.createElement('span');
        span.className = 'cart-counter';
        span.style.marginLeft = '8px';
        span.style.background = 'var(--brand-red)';
        span.style.color = 'white';
        span.style.borderRadius = '50%';
        span.style.width = '20px';
        span.style.height = '20px';
        span.style.display = 'inline-flex';
        span.style.alignItems = 'center';
        span.style.justifyContent = 'center';
        span.style.fontSize = '12px';
        btn.appendChild(span);
      }
      span.textContent = count;
      span.style.display = count > 0 ? 'inline-flex' : 'none';
    });
    return count;
  }

  getCartState() {
    const total = this.cartItems.reduce((sum, item) => {
      const price = Number(item.product?.price || 0);
      const qty = Number(item.quantity || 0);
      return sum + (price * qty);
    }, 0);
    const count = this.cartItems.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
    return { items: this.cartItems, total, count };
  }

  getAuthToken() {
    const raw = localStorage.getItem('mebeldom_auth');
    if (!raw) return null;
    try {
      const user = JSON.parse(raw);
      return user.access_token || null;
    } catch {
      return null;
    }
  }

  openAuthModal() {
    if (window.openAuthModalGlobal) window.openAuthModalGlobal();
    else alert('Требуется авторизация');
  }
}

// single global instance
window.cart = new CartManager();

// auto-load cart when page loads (if user logged in)
document.addEventListener('DOMContentLoaded', () => {
  // если пользователь авторизован — попытаемся загрузить с сервера
  const saved = localStorage.getItem('mebeldom_auth');
  if (saved) {
    try {
      const u = JSON.parse(saved);
      if (u && u.access_token) {
        // запрашиваем серверную корзину и синхронизируем
        window.cart.loadCart();
      } else {
        window.cart.renderCart();
      }
    } catch {
      window.cart.renderCart();
    }
  } else {
    window.cart.renderCart();
  }
});
