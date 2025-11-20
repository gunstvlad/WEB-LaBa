// frontend/js/catalog.js
console.log('📚 CATALOG: Загружается catalog.js');

class CatalogManager {
  constructor() {
    console.log('📚 CATALOG: Инициализация CatalogManager');
    this.apiBase = 'http://localhost:8001/api';
    this.products = [];
    this.init();
  }

  async init() {
    await this.loadProducts();
    this.setupEventListeners();
  }

  async loadProducts() {
    try {
      const response = await fetch(`${this.apiBase}/products`);
      if (response.ok) {
        this.products = await response.json();
        this.renderProducts();
      } else {
        console.error('Ошибка загрузки товаров');
        // Fallback на локальные товары если API недоступно
        this.loadLocalProducts();
      }
    } catch (error) {
      console.error('Ошибка сети:', error);
      this.loadLocalProducts();
    }
  }

  loadLocalProducts() {
    // Fallback данные на случай недоступности API
    this.products = [
      {
        id: 1,
        name: "Диван Aurora",
        price: 89900,
        description: "Элегантный диван с высокой спинкой и удобными подлокотниками.",
        category: "sofa",
        image_url: "./img/sofa1.png",
        in_stock: true
      },
      {
        id: 2,
        name: "Диван Luna",
        price: 124500,
        description: "Роскошный диван премиум-класса с механизмом трансформации.",
        category: "sofa", 
        image_url: "./img/sofa2.png",
        in_stock: true
      },
      {
        id: 3,
        name: "Диван Cosmo",
        price: 76300,
        description: "Стильный трехместный диван в современном стиле.",
        category: "sofa",
        image_url: "./img/sofa3.png",
        in_stock: true
      },
      {
        id: 4,
        name: "Шкаф-купе Milano",
        price: 45200,
        description: "Вместительный шкаф-купе с зеркальными дверями.",
        category: "wardrobe",
        image_url: "./img/wardrobe1.png",
        in_stock: true
      },
      {
        id: 5,
        name: "Шкаф классический Vienna",
        price: 38700,
        description: "Классический распашной шкаф из массива дуба.",
        category: "wardrobe",
        image_url: "./img/wardrobe2.png",
        in_stock: true
      },
      {
        id: 6,
        name: "Шкаф-гардеробная Modern",
        price: 67900,
        description: "Угловой шкаф-гардеробная с системой купэ.",
        category: "wardrobe",
        image_url: "./img/wardrobe3.png",
        in_stock: false
      },
      {
        id: 7,
        name: "Кровать Valencia",
        price: 68700,
        description: "Кровать двуспальная с ортопедическим основанием.",
        category: "bed",
        image_url: "./img/bed1.png",
        in_stock: true
      },
      {
        id: 8,
        name: "Кровать Oslo",
        price: 52400,
        description: "Минималистичная кровать из натурального дерева.",
        category: "bed",
        image_url: "./img/bed2.png",
        in_stock: true
      },
      {
        id: 9,
        name: "Кровать Imperial",
        price: 95800,
        description: "Роскошная кровать с высоким мягким изголовьем.",
        category: "bed",
        image_url: "./img/bed3.png",
        in_stock: true
      }
    ];
    this.renderProducts();
  }

  renderProducts() {
    const container = document.getElementById('products-container');
    if (!container) {
      console.warn('📚 CATALOG: products-container не найден');
      return;
    }

    container.innerHTML = '';

    if (this.products.length === 0) {
      container.innerHTML = '<div class="no-products">Товары не найдены</div>';
      return;
    }

    this.products.forEach(product => {
      const productElement = document.createElement('div');
      productElement.className = 'product-card';
      productElement.innerHTML = `
        <div class="product-image">
          <img src="${product.image_url || './img/placeholder.jpg'}" 
               alt="${product.name}" 
               onerror="this.src='./img/placeholder.jpg'">
          ${!product.in_stock ? '<div class="out-of-stock">Нет в наличии</div>' : ''}
        </div>
        <div class="product-info">
          <h3 class="product-name">${product.name}</h3>
          <p class="product-description">${product.description ? product.description.substring(0, 100) + '...' : ''}</p>
          <div class="product-price">${product.price.toLocaleString('ru-RU')} ₽</div>
          <div class="product-actions">
            <button class="add-to-cart-btn" 
                    data-product-id="${product.id}"
                    ${!product.in_stock ? 'disabled' : ''}>
              ${!product.in_stock ? 'Нет в наличии' : 'В корзину'}
            </button>
            <button class="view-details-btn" data-product-id="${product.id}">
              Подробнее
            </button>
          </div>
        </div>
      `;
      container.appendChild(productElement);
    });

    this.attachProductEvents();
  }

  attachProductEvents() {
    // Обработчики для кнопок "В корзину"
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const productId = e.target.dataset.productId;
        const product = this.products.find(p => p.id == productId);
        
        if (product && !product.in_stock) {
          alert('Этот товар временно отсутствует в наличии');
          return;
        }

        // Проверяем доступность корзины
        if (typeof window.cart === 'undefined') {
          console.error('❌ Корзина не доступна');
          alert('Система корзины не загружена. Пожалуйста, обновите страницу.');
          return;
        }

        e.target.textContent = 'Добавляем...';
        e.target.disabled = true;

        try {
          const success = await window.cart.addToCart(productId, 1);
          
          if (success) {
            e.target.textContent = '✓ В корзине';
            setTimeout(() => {
              e.target.textContent = 'В корзину';
              e.target.disabled = false;
            }, 2000);
          } else {
            e.target.textContent = 'В корзину';
            e.target.disabled = false;
          }
        } catch (error) {
          console.error('Ошибка при добавлении в корзину:', error);
          e.target.textContent = 'В корзину';
          e.target.disabled = false;
          alert('Произошла ошибка при добавлении в корзину');
        }
      });
    });

    // Обработчики для кнопок "Подробнее"
    document.querySelectorAll('.view-details-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const productId = e.target.dataset.productId;
        this.showProductDetails(productId);
      });
    });
  }

  showProductDetails(productId) {
    const product = this.products.find(p => p.id == productId);
    if (product) {
      // Открываем модальное окно с деталями товара
      this.openProductModal(product);
    }
  }

  openProductModal(product) {
    // Создаем модальное окно для товара
    const modal = document.createElement('div');
    modal.className = 'product-modal-overlay';
    modal.innerHTML = `
      <div class="product-modal">
        <button class="modal-close">&times;</button>
        <div class="modal-content">
          <div class="modal-image">
            <img src="${product.image_url || './img/placeholder.jpg'}" alt="${product.name}">
          </div>
          <div class="modal-info">
            <h2>${product.name}</h2>
            <div class="modal-price">${product.price.toLocaleString('ru-RU')} ₽</div>
            <p class="modal-description">${product.description}</p>
            <div class="modal-actions">
              <button class="add-to-cart-modal-btn" data-product-id="${product.id}">
                ${product.in_stock ? 'Добавить в корзину' : 'Нет в наличии'}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Обработчики для модального окна
    modal.querySelector('.modal-close').addEventListener('click', () => {
      modal.remove();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // Обработчик для кнопки в модальном окне
    const addToCartBtn = modal.querySelector('.add-to-cart-modal-btn');
    if (addToCartBtn && product.in_stock) {
      addToCartBtn.addEventListener('click', async () => {
        if (typeof window.cart === 'undefined') {
          alert('Система корзины не загружена');
          return;
        }

        addToCartBtn.textContent = 'Добавляем...';
        addToCartBtn.disabled = true;

        try {
          const success = await window.cart.addToCart(product.id, 1);
          if (success) {
            addToCartBtn.textContent = '✓ Добавлено!';
            setTimeout(() => {
              modal.remove();
            }, 1500);
          } else {
            addToCartBtn.textContent = 'Добавить в корзину';
            addToCartBtn.disabled = false;
          }
        } catch (error) {
          addToCartBtn.textContent = 'Добавить в корзину';
          addToCartBtn.disabled = false;
        }
      });
    }
  }

  setupEventListeners() {
    // Фильтрация по категориям
    const filterButtons = document.querySelectorAll('.category-filter');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const category = e.target.dataset.category;
        this.filterByCategory(category);
        
        // Обновляем активную кнопку
        filterButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
      });
    });

    // Поиск товаров
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchProducts(e.target.value);
      });
    }
  }

  filterByCategory(category) {
    if (category === 'all') {
      this.renderProducts();
    } else {
      const filtered = this.products.filter(product => product.category === category);
      this.renderFilteredProducts(filtered);
    }
  }

  searchProducts(query) {
    const filtered = this.products.filter(product => 
      product.name.toLowerCase().includes(query.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(query.toLowerCase()))
    );
    this.renderFilteredProducts(filtered);
  }

  renderFilteredProducts(filteredProducts) {
    const container = document.getElementById('products-container');
    if (!container) return;

    if (filteredProducts.length === 0) {
      container.innerHTML = '<div class="no-products">Товары не найдены</div>';
      return;
    }

    container.innerHTML = '';
    filteredProducts.forEach(product => {
      const productElement = document.createElement('div');
      productElement.className = 'product-card';
      productElement.innerHTML = `
        <div class="product-image">
          <img src="${product.image_url || './img/placeholder.jpg'}" 
               alt="${product.name}" 
               onerror="this.src='./img/placeholder.jpg'">
          ${!product.in_stock ? '<div class="out-of-stock">Нет в наличии</div>' : ''}
        </div>
        <div class="product-info">
          <h3 class="product-name">${product.name}</h3>
          <p class="product-description">${product.description ? product.description.substring(0, 100) + '...' : ''}</p>
          <div class="product-price">${product.price.toLocaleString('ru-RU')} ₽</div>
          <div class="product-actions">
            <button class="add-to-cart-btn" 
                    data-product-id="${product.id}"
                    ${!product.in_stock ? 'disabled' : ''}>
              ${!product.in_stock ? 'Нет в наличии' : 'В корзину'}
            </button>
          </div>
        </div>
      `;
      container.appendChild(productElement);
    });

    this.attachProductEvents();
  }
}

// Инициализация каталога при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
  console.log('📚 CATALOG: DOM загружен, инициализация каталога');
  window.catalog = new CatalogManager();
});