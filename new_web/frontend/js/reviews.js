// frontend/js/reviews.js
class ReviewsManager {
    constructor() {
        this.reviews = [];
        this.loadReviews();
        this.setupReviewForm();
    }
    
    async loadReviews() {
        try {
            const response = await fetch(`${API_BASE}/reviews`);
            if (response.ok) {
                this.reviews = await response.json();
                this.renderReviews();
            }
        } catch (error) {
            console.error('Ошибка загрузки отзывов:', error);
        }
    }
    
    renderReviews() {
        const container = document.getElementById('reviews-container');
        container.innerHTML = '';
        
        this.reviews.forEach(review => {
            const reviewElement = document.createElement('div');
            reviewElement.className = 'review-item';
            reviewElement.style.cssText = 'border: 1px solid #e2e8f0; padding: 15px; margin-bottom: 15px; border-radius: 8px;';
            
            const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
            
            reviewElement.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <strong>${review.user_name}</strong>
                    <span style="color: #f59e0b;">${stars}</span>
                </div>
                <p>${review.text}</p>
                <small style="color: #6b7280;">${new Date(review.created_at).toLocaleDateString()}</small>
            `;
            
            container.appendChild(reviewElement);
        });
    }
    
    setupReviewForm() {
        const currentUser = getCurrentUser();
        const formContainer = document.getElementById('add-review-form');
        
        if (currentUser) {
            formContainer.style.display = 'block';
            
            document.getElementById('review-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const rating = document.getElementById('review-rating').value;
                const text = document.getElementById('review-text').value;
                
                try {
                    const response = await fetch(`${API_BASE}/reviews`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${getAuthToken()}`
                        },
                        body: JSON.stringify({
                            rating: parseInt(rating),
                            text: text
                        })
                    });
                    
                    if (response.ok) {
                        document.getElementById('review-text').value = '';
                        this.loadReviews(); // Перезагружаем отзывы
                        alert('Отзыв добавлен!');
                    }
                } catch (error) {
                    console.error('Ошибка добавления отзыва:', error);
                }
            });
        }
    }
}

// Инициализируем при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new ReviewsManager();
});