// frontend/js/catalog.js
console.log('📚 CATALOG: Загружается catalog.js');

class CatalogManager {
  constructor() {
    console.log('📚 CATALOG: Инициализация CatalogManager');
    this.apiBase = 'http://localhost:8001/api';
    this.products = [];
    this.currentCategory = 'all';
    this.searchQuery = '';
    
    this.init();
  }

  async init() {
    await this.loadProducts();
    this.setupEventListeners();
    console.log('✅ CATALOG: CatalogManager инициализирован');
  }

  async loadProducts() {
    try {
      console.log('📚 CATALOG: Загрузка товаров из API...');
      const response = await fetch(`${this.apiBase}/products`);
      
      if (response.ok) {
        this.products = await response.json();
        console.log('📚 CATALOG: Успешно загружено товаров:', this.products.length);
        this.renderProducts();
      } else {
        console.error('❌ CATALOG: Ошибка загрузки товаров:', response.status);
        this.showError('Не удалось загрузить товары. Попробуйте обновить страницу.');
      }
    } catch (error) {
      console.error('❌ CATALOG: Ошибка сети:', error);
      this.showError('Ошибка соединения. Проверьте подключение к интернету.');
    }
  }

renderProducts() {
  const container = document.getElementById('productsGrid');
  if (!container) {
    console.error('❌ CATALOG: Контейнер productsGrid не найден');
    return;
  }

  container.innerHTML = '';

  if (this.products.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--muted);">
        <h3>Товары не найдены</h3>
        <p>Попробуйте изменить поисковый запрос или выбрать другую категорию</p>
      </div>
    `;
    return;
  }

  // Фильтруем товары по категории и поисковому запросу
  let filteredProducts = this.products;
  
  // Фильтрация по категории
  if (this.currentCategory !== 'all') {
    filteredProducts = filteredProducts.filter(product => 
      product.category === this.currentCategory
    );
  }
  
  // Фильтрация по поисковому запросу
  if (this.searchQuery) {
    filteredProducts = filteredProducts.filter(product => 
      product.name.toLowerCase().includes(this.searchQuery) ||
      (product.description && product.description.toLowerCase().includes(this.searchQuery))
    );
  }

  // Обновляем счетчик найденных товаров
  this.updateSearchResults(filteredProducts.length);

  // Рендерим отфильтрованные товары
  filteredProducts.forEach(product => {
    const productCard = document.createElement('div');
    productCard.className = 'product-card';
    
    productCard.innerHTML = `
      <div class="product-image">
        <img src="${this.fixImageUrl(product.image_url)}" alt="${product.name}" 
             onerror="this.onerror=null; this.src='./img/placeholder.jpg';">
      </div>
      <div class="product-content">
        <h3 class="product-title">${product.name}</h3>
        <div class="product-price">${product.price.toLocaleString('ru-RU')} ₽</div>
        <p class="product-description">${product.description ? this.truncateDescription(product.description) : ''}</p>
        <div class="product-actions">
          <button class="product-more" data-product-id="${product.id}">Подробнее</button>
          <button class="product-add-to-cart" data-product-id="${product.id}" 
                  ${!product.in_stock ? 'disabled' : ''}>
            ${!product.in_stock ? 'Нет в наличии' : 'В корзину'}
          </button>
        </div>
      </div>
    `;
    
    container.appendChild(productCard);
  });

  this.attachProductEvents();
}

  truncateDescription(description, maxLength = 100) {
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength) + '...';
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

  attachProductEvents() {
    console.log('🔗 CATALOG: Прикрепляем обработчики событий к товарам');
    
    // Обработчики для кнопок "В корзину"
    document.querySelectorAll('.product-add-to-cart').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        console.log('🛒 CATALOG: Нажата кнопка "В корзину"', e.target.dataset.productId);
        const productId = parseInt(e.target.dataset.productId);
        const product = this.products.find(p => p.id === productId);
        
        if (product && !product.in_stock) {
          alert('Этот товар временно отсутствует в наличии');
          return;
        }

        // ПРОВЕРКА КОРЗИНЫ - ИСПРАВЛЕННАЯ
        if (typeof window.cartManager === 'undefined') {
          console.error('❌ CATALOG: CartManager не доступен, проверяем window.cart...');
          if (typeof window.cart === 'undefined') {
            console.error('❌ CATALOG: Корзина не доступна');
            alert('Система корзины не загружена. Пожалуйста, обновите страницу.');
            return;
          } else {
            console.log('✅ CATALOG: Используем window.cart');
          }
        }

        const originalText = e.target.textContent;
        e.target.textContent = 'Добавляем...';
        e.target.disabled = true;

        try {
          // ИСПРАВЛЕННЫЙ ВЫЗОВ - пробуем оба варианта
          let success = false;
          if (typeof window.cartManager !== 'undefined') {
            success = await window.cartManager.addToCart(productId, 1);
          } else if (typeof window.cart !== 'undefined') {
            success = await window.cart.addToCart(productId, 1);
          }
          
          if (success) {
            e.target.textContent = '✓ В корзине';
            setTimeout(() => {
              e.target.textContent = originalText;
              e.target.disabled = false;
            }, 2000);
          } else {
            e.target.textContent = originalText;
            e.target.disabled = false;
          }
        } catch (error) {
          console.error('❌ CATALOG: Ошибка при добавлении в корзину:', error);
          e.target.textContent = originalText;
          e.target.disabled = false;
          alert('Произошла ошибка при добавлении в корзину');
        }
      });
    });

    // Обработчики для кнопок "Подробнее"
    document.querySelectorAll('.product-more').forEach(btn => {
      btn.addEventListener('click', (e) => {
        console.log('📖 CATALOG: Нажата кнопка "Подробнее"', e.target.dataset.productId);
        const productId = parseInt(e.target.dataset.productId);
        this.showProductDetails(productId);
      });
    });
  }

  showProductDetails(productId) {
    console.log('🔍 CATALOG: Показываем детали товара', productId);
    const product = this.products.find(p => p.id === productId);
    if (product) {
      console.log('✅ CATALOG: Товар найден', product.name);
      this.openProductModal(product);
    } else {
      console.error('❌ CATALOG: Товар не найден', productId);
    }
  }

  openProductModal(product) {
    console.log('🪟 CATALOG: Открываем модальное окно для товара', product.name);
    
    // Используем существующее модальное окно из HTML
    const modal = document.getElementById('productModal');
    const modalContent = document.getElementById('modalContent');
    
    if (!modal || !modalContent) {
      console.error('❌ CATALOG: Модальное окно не найдено');
      return;
    }

    modalContent.innerHTML = `
      <div class="modal-image">
        <img src="${this.fixImageUrl(product.image_url)}" alt="${product.name}">
      </div>
      <div class="modal-info">
        <div class="modal-header">
          <h2 class="modal-title">${product.name}</h2>
          <div class="modal-price">${product.price.toLocaleString('ru-RU')} ₽</div>
          <p class="modal-description">${product.description || 'Описание отсутствует'}</p>
        </div>
        
        <div class="modal-features">
          <h3 class="features-title">Характеристики</h3>
          <ul class="features-list">
            <li class="feature-item">Категория: ${this.getCategoryName(product.category)}</li>
            <li class="feature-item">Наличие: ${product.in_stock ? 'В наличии' : 'Нет в наличии'}</li>
            ${product.features ? product.features.map(feature => `<li class="feature-item">${feature}</li>`).join('') : ''}
          </ul>
        </div>
        
        <div class="modal-actions">
          <button class="btn-primary" id="modalAddToCart" data-product-id="${product.id}" 
                  ${!product.in_stock ? 'disabled' : ''}>
            ${product.in_stock ? 'Добавить в корзину' : 'Нет в наличии'}
          </button>
          <button class="btn-secondary">В избранное</button>
        </div>
      </div>
    `;

    // Обработчик для кнопки в модальном окне - ИСПРАВЛЕННЫЙ
    const addToCartBtn = document.getElementById('modalAddToCart');
    if (addToCartBtn && product.in_stock) {
      addToCartBtn.addEventListener('click', async () => {
        console.log('🛒 CATALOG MODAL: Нажата кнопка "В корзину" в модалке', product.id);
        
        // ПРОВЕРКА КОРЗИНЫ - ИСПРАВЛЕННАЯ
        if (typeof window.cartManager === 'undefined' && typeof window.cart === 'undefined') {
          alert('Система корзины не загружена');
          return;
        }

        const originalText = addToCartBtn.textContent;
        addToCartBtn.textContent = 'Добавляем...';
        addToCartBtn.disabled = true;

        try {
          // ИСПРАВЛЕННЫЙ ВЫЗОВ - пробуем оба варианта
          let success = false;
          if (typeof window.cartManager !== 'undefined') {
            success = await window.cartManager.addToCart(product.id, 1);
          } else if (typeof window.cart !== 'undefined') {
            success = await window.cart.addToCart(product.id, 1);
          }
          
          if (success) {
            addToCartBtn.textContent = '✓ Добавлено!';
            setTimeout(() => {
              this.closeProductModal();
            }, 1500);
          } else {
            addToCartBtn.textContent = originalText;
            addToCartBtn.disabled = false;
          }
        } catch (error) {
          console.error('❌ CATALOG MODAL: Ошибка при добавлении в корзину:', error);
          addToCartBtn.textContent = originalText;
          addToCartBtn.disabled = false;
        }
      });
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    console.log('✅ CATALOG: Модальное окно открыто');
  }

  closeProductModal() {
    console.log('🪟 CATALOG: Закрываем модальное окно');
    const modal = document.getElementById('productModal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = 'auto';
    }
  }

  getCategoryName(category) {
    const categoryNames = {
      'sofa': 'Диваны',
      'wardrobe': 'Шкафы',
      'bed': 'Кровати'
    };
    return categoryNames[category] || category;
  }

  setupEventListeners() {
    console.log('🔗 CATALOG: Настраиваем обработчики событий');
    
    // Фильтрация по категориям через вкладки
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const category = e.target.dataset.category;
        console.log('🏷️ CATALOG: Выбрана категория', category);
        this.filterByCategory(category);
        
        // Обновляем активную вкладку
        tabs.forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
      });
    });

    // Поиск товаров
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        console.log('🔍 CATALOG: Поисковый запрос', e.target.value);
        this.searchProducts(e.target.value);
      });
    }

    // Закрытие модального окна
    const modalClose = document.getElementById('modalClose');
    const productModal = document.getElementById('productModal');
    
    if (modalClose) {
      modalClose.addEventListener('click', () => {
        this.closeProductModal();
      });
    }
    
    if (productModal) {
      productModal.addEventListener('click', (e) => {
        if (e.target === productModal) {
          this.closeProductModal();
        }
      });
    }

    // Закрытие по ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeProductModal();
      }
    });

    console.log('✅ CATALOG: Все обработчики событий настроены');
  }

  filterByCategory(category) {
    this.currentCategory = category;
    this.renderProducts();
  }

  searchProducts(query) {
    this.searchQuery = query.toLowerCase().trim();
    this.renderProducts();
  }

  updateSearchResults(count) {
    const searchResults = document.getElementById('searchResults');
    const searchCount = document.getElementById('searchCount');
    
    if (searchResults && searchCount) {
      if (this.searchQuery) {
        searchResults.classList.remove('hidden');
        searchCount.textContent = count;
      } else {
        searchResults.classList.add('hidden');
      }
    }
  }

  showError(message) {
    const container = document.getElementById('productsGrid');
    if (container) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--muted);">
          <h3>Ошибка загрузки</h3>
          <p>${message}</p>
          <button onclick="window.catalog.loadProducts()" style="margin-top: 16px; padding: 10px 20px; background: var(--brand-red); color: white; border: none; border-radius: 6px; cursor: pointer;">
            Попробовать снова
          </button>
        </div>
      `;
    }
  }
}

// Инициализация каталога при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
  console.log('📚 CATALOG: DOM загружен, инициализация каталога');
  window.catalog = new CatalogManager();
});