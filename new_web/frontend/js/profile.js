// frontend/js/profile.js
class ProfileManager {
    constructor() {
        this.apiBase = 'http://localhost:8001/api';
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadProfileData();
    }

    bindEvents() {
        // Обновляем данные профиля при изменении авторизации
        if (window.auth) {
            setInterval(() => {
                if (window.auth.isUserAuthenticated()) {
                    this.loadProfileData();
                }
            }, 2000);
        }
    }

    async loadProfileData() {
        if (!window.auth || !window.auth.isUserAuthenticated()) {
            return;
        }

        try {
            await Promise.all([
                this.loadOrders(),
                this.loadWishlist()
            ]);
        } catch (error) {
            console.error('Ошибка загрузки данных профиля:', error);
        }
    }

    async loadOrders() {
        try {
            const response = await fetch(`${this.apiBase}/orders/`, {
                headers: {
                    'Authorization': `Bearer ${window.auth.getAuthToken()}`
                }
            });

            if (response.ok) {
                const orders = await response.json();
                this.renderOrders(orders);
            }
        } catch (error) {
            console.error('Ошибка загрузки заказов:', error);
        }
    }

    renderOrders(orders) {
        const ordersContainer = document.getElementById('ordersList');
        
        if (!orders || orders.length === 0) {
            ordersContainer.innerHTML = '<p style="color: var(--muted);">У вас пока нет заказов</p>';
            return;
        }

        ordersContainer.innerHTML = orders.map(order => `
            <div class="order-card">
                <div class="order-header">
                    <div class="order-info">
                        <strong>Заказ #${order.id}</strong>
                        <span class="order-status ${order.status}">${this.getStatusText(order.status)}</span>
                    </div>
                    <div class="order-dates">
                        <small>Создан: ${new Date(order.created_at).toLocaleDateString('ru-RU')}</small>
                        <div class="order-total">${order.total_amount} ₽</div>
                    </div>
                </div>
                <div class="order-items">
                    ${order.items.map(item => `
                        <div class="order-item">
                            <span class="item-name">${item.product_name}</span>
                            <span class="item-quantity">${item.quantity} шт.</span>
                            <span class="item-price">${item.product_price} ₽</span>
                        </div>
                    `).join('')}
                </div>
                <div class="order-address">
                    <strong>Адрес доставки:</strong> ${order.shipping_address}
                </div>
            </div>
        `).join('');
    }

    async loadWishlist() {
        try {
            const response = await fetch(`${this.apiBase}/wishlist/`, {
                headers: {
                    'Authorization': `Bearer ${window.auth.getAuthToken()}`
                }
            });

            if (response.ok) {
                const wishlist = await response.json();
                this.renderWishlist(wishlist);
            }
        } catch (error) {
            console.error('Ошибка загрузки избранного:', error);
        }
    }

    renderWishlist(wishlist) {
        const wishlistContainer = document.getElementById('wishlistContainer');
        
        if (!wishlist || wishlist.length === 0) {
            wishlistContainer.innerHTML = '<p style="color: var(--muted);">У вас пока нет избранных товаров</p>';
            return;
        }

        wishlistContainer.innerHTML = `
            <div class="wishlist-grid">
                ${wishlist.map(product => `
                    <div class="wishlist-item" data-id="${product.id}">
                        <div class="wishlist-item-image">
                            <img src="${product.image_url || './img/placeholder.jpg'}" alt="${product.name}">
                        </div>
                        <div class="wishlist-item-info">
                            <h4 class="wishlist-item-name">${product.name}</h4>
                            <div class="wishlist-item-price">${product.price} ₽</div>
                            <div class="wishlist-item-category">${this.getCategoryName(product.category)}</div>
                        </div>
                        <div class="wishlist-item-actions">
                            <button class="wishlist-remove-btn" onclick="profileManager.removeFromWishlist(${product.id})">
                                ❌ Удалить
                            </button>
                            <button class="wishlist-add-to-cart-btn" onclick="profileManager.addToCartFromWishlist(${product.id})">
                                🛒 В корзину
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    async removeFromWishlist(productId) {
        try {
            const response = await fetch(`${this.apiBase}/wishlist/${productId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${window.auth.getAuthToken()}`
                }
            });

            if (response.ok) {
                this.loadWishlist();
            } else {
                alert('Ошибка при удалении из избранного');
            }
        } catch (error) {
            console.error('Ошибка удаления из избранного:', error);
            alert('Ошибка при удалении из избранного');
        }
    }

    async addToCartFromWishlist(productId) {
        try {
            const response = await fetch(`${this.apiBase}/cart/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.auth.getAuthToken()}`
                },
                body: JSON.stringify({
                    product_id: productId,
                    quantity: 1
                })
            });

            if (response.ok) {
                alert('Товар добавлен в корзину!');
            } else {
                alert('Ошибка при добавлении в корзину');
            }
        } catch (error) {
            console.error('Ошибка добавления в корзину:', error);
            alert('Ошибка при добавлении в корзину');
        }
    }

    getStatusText(status) {
        const statusMap = {
            'pending': 'Ожидает подтверждения',
            'confirmed': 'Подтвержден',
            'shipped': 'Отправлен',
            'delivered': 'Доставлен',
            'cancelled': 'Отменен'
        };
        return statusMap[status] || status;
    }

    getCategoryName(category) {
        const categoryMap = {
            'sofa': 'Диваны',
            'bed': 'Кровати',
            'wardrobe': 'Шкафы'
        };
        return categoryMap[category] || category;
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    window.profileManager = new ProfileManager();
});