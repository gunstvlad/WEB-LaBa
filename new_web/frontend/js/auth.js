// frontend/js/auth.js
console.log('🔐 AUTH: Загружается auth.js');

class AuthManager {
  constructor() {
    console.log('🔐 AUTH: Инициализация AuthManager');
    this.apiBase = 'http://localhost:8001/api';
    this.isAuthenticated = false;
    this.userData = null;
    
    this.init();
  }

  async init() {
    console.log('🔐 AUTH: Начало инициализации');
    await this.checkAuth();
    this.bindEvents();
    this.setupModalHandlers();
    console.log('✅ AUTH: Инициализация завершена');
  }

  bindEvents() {
    window.openAuthModal = () => this.openAuthModal();
    window.closeAuthModal = () => this.closeAuthModal();
  }

  async checkAuth() {
    console.log('🔐 AUTH: Проверка авторизации');
    
    try {
      const savedAuth = localStorage.getItem('mebeldom_auth');
      
      if (!savedAuth) {
        console.log('🔐 AUTH: Нет сохраненных данных авторизации');
        this.setUnauthenticated();
        return;
      }

      const userData = JSON.parse(savedAuth);
      console.log('🔐 AUTH: Найдены сохраненные данные:', userData);

      // Проверяем наличие токена
      if (!userData.token && !userData.access_token) {
        console.warn('🔐 AUTH: В сохраненных данных нет токена');
        this.setUnauthenticated();
        return;
      }

      // Проверяем валидность токена на сервере
      const token = userData.token || userData.access_token;
      const isValid = await this.validateToken(token);
      
      if (isValid) {
        console.log('✅ AUTH: Токен валиден, пользователь авторизован');
        this.setAuthenticated(userData);
      } else {
        console.warn('❌ AUTH: Токен невалиден');
        this.setUnauthenticated();
      }

    } catch (error) {
      console.error('🔐 AUTH: Ошибка при проверке авторизации:', error);
      this.setUnauthenticated();
    }
  }

  async validateToken(token) {
    try {
      const response = await fetch(`${this.apiBase}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const userInfo = await response.json();
        console.log('✅ AUTH: Токен валиден, пользователь:', userInfo.email);
        return true;
      }
      
      // Если сервер вернул ошибку, токен невалиден
      console.warn('❌ AUTH: Токен невалиден, статус:', response.status);
      return false;
      
    } catch (error) {
      console.error('🔐 AUTH: Ошибка проверки токена:', error);
      // При ошибке сети считаем токен невалидным
      return false;
    }
  }

  setAuthenticated(userData) {
    this.isAuthenticated = true;
    this.userData = userData;
    localStorage.setItem('mebeldom_auth', JSON.stringify(userData));
    this.renderAuth();
    
    // Обновляем корзину после авторизации
    this.updateCartAfterAuth();
  }

  setUnauthenticated() {
    this.isAuthenticated = false;
    this.userData = null;
    localStorage.removeItem('mebeldom_auth');
    this.renderAuth();
  }

  renderAuth() {
    const authControls = document.getElementById('authControls');
    if (!authControls) {
      console.error('❌ AUTH: Элемент authControls не найден');
      return;
    }

    authControls.innerHTML = '';
    
    if (this.isAuthenticated && this.userData) {
      this.renderAuthenticatedUI(authControls);
    } else {
      this.renderUnauthenticatedUI(authControls);
    }
  }

  renderAuthenticatedUI(container) {
    const displayName = this.userData.full_name || 
                       this.userData.name || 
                       this.userData.email || 
                       'Пользователь';
    
    console.log('🔐 AUTH: Рендерим интерфейс для:', displayName);

    const userInfo = document.createElement('div');
    userInfo.className = 'user-info';
    userInfo.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
    `;

    const name = document.createElement('span');
    name.className = 'username';
    name.textContent = displayName;
    name.style.cssText = `
      color: var(--brand-red);
      font-weight: 600;
      font-size: 14px;
    `;

    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'auth-ghost';
    logoutBtn.textContent = 'Выйти';
    logoutBtn.style.cssText = `
      padding: 8px 16px;
      border: 1px solid var(--brand-red);
      background: transparent;
      color: var(--brand-red);
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s ease;
    `;

    logoutBtn.addEventListener('mouseenter', () => {
      logoutBtn.style.background = 'var(--brand-red)';
      logoutBtn.style.color = 'white';
    });

    logoutBtn.addEventListener('mouseleave', () => {
      logoutBtn.style.background = 'transparent';
      logoutBtn.style.color = 'var(--brand-red)';
    });

    logoutBtn.addEventListener('click', () => {
      console.log('🔐 AUTH: Пользователь нажал выход');
      this.logout();
    });

    userInfo.appendChild(name);
    userInfo.appendChild(logoutBtn);
    container.appendChild(userInfo);

    console.log('✅ AUTH: Интерфейс авторизованного пользователя отрисован');
  }

  renderUnauthenticatedUI(container) {
    console.log('🔐 AUTH: Рендерим кнопку входа');

    const loginBtn = document.createElement('button');
    loginBtn.className = 'auth-ghost';
    loginBtn.textContent = 'Войти';
    loginBtn.style.cssText = `
      padding: 8px 16px;
      border: 1px solid var(--brand-red);
      background: transparent;
      color: var(--brand-red);
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s ease;
    `;

    loginBtn.addEventListener('mouseenter', () => {
      loginBtn.style.background = 'var(--brand-red)';
      loginBtn.style.color = 'white';
    });

    loginBtn.addEventListener('mouseleave', () => {
      loginBtn.style.background = 'transparent';
      loginBtn.style.color = 'var(--brand-red)';
    });

    loginBtn.addEventListener('click', () => {
      console.log('🔐 AUTH: Открытие модального окна авторизации');
      this.openAuthModal();
    });

    container.appendChild(loginBtn);
  }

  openAuthModal() {
    const authModal = document.getElementById('authModal');
    if (!authModal) {
      console.error('❌ AUTH: Модальное окно авторизации не найдено');
      return;
    }

    console.log('🔐 AUTH: Открываем модальное окно авторизации');
    
    // Сбрасываем формы
    this.resetAuthForms();
    
    // Показываем форму входа по умолчанию
    this.switchAuthTab('login');
    
    authModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  closeAuthModal() {
    const authModal = document.getElementById('authModal');
    if (authModal) {
      console.log('🔐 AUTH: Закрываем модальное окно авторизации');
      authModal.classList.remove('active');
      document.body.style.overflow = 'auto';
      this.resetAuthForms();
    }
  }

  resetAuthForms() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) loginForm.reset();
    if (registerForm) registerForm.reset();
    
    // Сбрасываем ошибки
    this.clearFormErrors();
  }

  clearFormErrors() {
    document.querySelectorAll('.form-error').forEach(error => error.remove());
    document.querySelectorAll('.form-input').forEach(input => {
      input.classList.remove('error');
    });
  }

  switchAuthTab(tabName) {
    console.log('🔐 AUTH: Переключаем на таб:', tabName);
    
    const tabs = document.querySelectorAll('.auth-modal-tab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    if (loginForm && registerForm) {
      loginForm.style.display = tabName === 'login' ? 'block' : 'none';
      registerForm.style.display = tabName === 'register' ? 'block' : 'none';
    }
    
    this.clearFormErrors();
  }

  async login(credentials) {
    console.log('🔐 AUTH: Попытка входа для:', credentials.email);
    
    try {
      const response = await fetch(`${this.apiBase}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
      });

      const responseData = await response.json();
      console.log('🔐 AUTH: Ответ сервера:', responseData);

      if (response.ok) {
        if (!responseData.access_token) {
          throw new Error('В ответе отсутствует токен авторизации');
        }

        console.log('✅ AUTH: Успешный вход');
        
        const userData = {
          email: credentials.email,
          full_name: responseData.user?.full_name || 
                    responseData.user?.name || 
                    credentials.email.split('@')[0],
          token: responseData.access_token,
          ...responseData.user
        };
        
        this.setAuthenticated(userData);
        this.closeAuthModal();
        this.showNotification('Вы успешно вошли в систему!', 'success');
        return true;
        
      } else {
        const errorMessage = responseData.detail || 
                            responseData.message || 
                            'Неверные учетные данные';
        throw new Error(errorMessage);
      }
      
    } catch (error) {
      console.error('❌ AUTH: Ошибка входа:', error);
      this.showNotification(error.message, 'error');
      return false;
    }
  }

  async register(userData) {
    console.log('🔐 AUTH: Попытка регистрации для:', userData.email);
    
    try {
      // Валидация паролей
      if (userData.password !== userData.confirmPassword) {
        throw new Error('Пароли не совпадают');
      }

      if (userData.password.length < 6) {
        throw new Error('Пароль должен содержать минимум 6 символов');
      }

      const response = await fetch(`${this.apiBase}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          full_name: userData.name
        })
      });

      const responseData = await response.json();
      console.log('🔐 AUTH: Ответ регистрации:', responseData);

      if (response.ok) {
        console.log('✅ AUTH: Успешная регистрация');
        
        // Автоматический вход после регистрации
        const loginSuccess = await this.login({
          email: userData.email,
          password: userData.password
        });
        
        if (loginSuccess) {
          this.showNotification('Регистрация прошла успешно! Вы вошли в систему.', 'success');
        } else {
          this.showNotification('Регистрация прошла успешно! Теперь вы можете войти в систему.', 'success');
          this.switchAuthTab('login');
        }
        return true;
        
      } else {
        const errorMessage = responseData.detail || 
                            responseData.message || 
                            'Не удалось зарегистрироваться';
        throw new Error(errorMessage);
      }
      
    } catch (error) {
      console.error('❌ AUTH: Ошибка регистрации:', error);
      this.showNotification(error.message, 'error');
      return false;
    }
  }

  logout() {
    console.log('🔐 AUTH: Выход из системы');
    
    this.setUnauthenticated();
    this.showNotification('Вы вышли из системы', 'info');
    
    // Обновляем страницу для сброса состояния
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }

  async updateCartAfterAuth() {
    // Обновляем корзину после авторизации
    if (typeof window.cartManager !== 'undefined') {
      await window.cartManager.loadCart();
    } else if (typeof window.cart !== 'undefined') {
      await window.cart.loadCart();
    }
  }

  getAuthToken() {
    return this.isAuthenticated ? (this.userData.token || this.userData.access_token) : null;
  }

  isUserAuthenticated() {
    return this.isAuthenticated;
  }

  getUserData() {
    return this.userData;
  }

  showNotification(message, type = 'info') {
    // Удаляем существующие уведомления
    const existingNotifications = document.querySelectorAll('.auth-notification');
    existingNotifications.forEach(notification => notification.remove());

    const notification = document.createElement('div');
    notification.className = `auth-notification ${type}`;
    notification.textContent = message;
    
    const backgroundColor = type === 'success' ? '#4CAF50' : 
                           type === 'error' ? '#f44336' : 
                           '#2196F3';
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${backgroundColor};
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      z-index: 10000;
      animation: slideInRight 0.3s ease;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 4000);
  }

  setupModalHandlers() {
    const authModal = document.getElementById('authModal');
    const authModalTabs = document.querySelectorAll('.auth-modal-tab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    // Закрытие модального окна
    if (authModal) {
      authModal.addEventListener('click', (e) => {
        if (e.target === authModal) {
          this.closeAuthModal();
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && authModal.classList.contains('active')) {
          this.closeAuthModal();
        }
      });
    }

    // Переключение табов
    authModalTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchAuthTab(tab.dataset.tab);
      });
    });

    // Обработка формы входа
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        if (!email || !password) {
          this.showNotification('Заполните все поля', 'error');
          return;
        }

        const submitBtn = loginForm.querySelector('.form-submit');
        const originalText = submitBtn.textContent;
        
        submitBtn.textContent = 'Вход...';
        submitBtn.disabled = true;
        
        try {
          await this.login({ email, password });
        } finally {
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
        }
      });
    }

    // Обработка формы регистрации
    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('registerName').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;
        const privacyPolicy = document.getElementById('privacyPolicy');
        const dataStorage = document.getElementById('dataStorage');
        
        // Валидация
        if (!name || !email || !password || !confirmPassword) {
          this.showNotification('Заполните все поля', 'error');
          return;
        }
        
        if (!privacyPolicy?.checked || !dataStorage?.checked) {
          this.showNotification('Необходимо согласие со всеми условиями', 'error');
          return;
        }

        const submitBtn = registerForm.querySelector('.form-submit');
        const originalText = submitBtn.textContent;
        
        submitBtn.textContent = 'Регистрация...';
        submitBtn.disabled = true;
        
        try {
          await this.register({ name, email, password, confirmPassword });
        } finally {
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
        }
      });

      // Маска для телефона
      const phoneInput = document.getElementById('registerPhone');
      if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
          let value = e.target.value.replace(/\D/g, '');
          if (value.startsWith('7') || value.startsWith('8')) {
            value = value.substring(1);
          }
          
          let formattedValue = '+7 (';
          if (value.length > 0) formattedValue += value.substring(0, 3);
          if (value.length > 3) formattedValue += ') ' + value.substring(3, 6);
          if (value.length > 6) formattedValue += '-' + value.substring(6, 8);
          if (value.length > 8) formattedValue += '-' + value.substring(8, 10);
          
          e.target.value = formattedValue;
        });
      }
    }
  }
}

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', function() {
  console.log('🔐 AUTH: DOM загружен, инициализация AuthManager');
  window.auth = new AuthManager();
});

// Глобальные функции для доступа из HTML
window.openAuthModal = () => window.auth?.openAuthModal();
window.closeAuthModal = () => window.auth?.closeAuthModal();