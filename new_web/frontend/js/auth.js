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

  init() {
    this.checkAuth();
    this.bindEvents();
  }

  bindEvents() {
    // Глобальная функция для открытия модального окна
    window.openAuthModal = () => this.openAuthModal();
  }

  async checkAuth() {
    const savedAuth = localStorage.getItem('mebeldom_auth');
    if (savedAuth) {
      try {
        const userData = JSON.parse(savedAuth);
        this.isAuthenticated = true;
        this.userData = userData;
        console.log('🔐 AUTH: Пользователь авторизован', userData);
      } catch (error) {
        console.error('🔐 AUTH: Ошибка парсинга данных авторизации', error);
        this.logout();
      }
    }
    this.renderAuth();
  }

  renderAuth() {
    const authControls = document.getElementById('authControls');
    if (!authControls) return;

    authControls.innerHTML = '';
    
    if (this.isAuthenticated && this.userData) {
      // Используем full_name из данных пользователя, если есть
      const displayName = this.userData.full_name || this.userData.name || this.userData.email || 'Пользователь';
      
      const name = document.createElement('span');
      name.className = 'username';
      name.textContent = displayName;
      name.style.color = 'var(--brand-red)';
      name.style.fontWeight = '600';
      name.style.marginRight = '8px';

      const btn = document.createElement('button');
      btn.className = 'auth-ghost';
      btn.textContent = 'Выйти';
      btn.addEventListener('click', () => {
        this.logout();
      });

      authControls.appendChild(name);
      authControls.appendChild(btn);
    } else {
      const btn = document.createElement('button');
      btn.className = 'auth-ghost';
      btn.textContent = 'Войти';
      btn.addEventListener('click', () => {
        this.openAuthModal();
      });
      authControls.appendChild(btn);
    }
  }

  openAuthModal() {
    const authModal = document.getElementById('authModal');
    if (authModal) {
      authModal.classList.add('active');
      
      // Сбрасываем формы
      const loginForm = document.getElementById('loginForm');
      const registerForm = document.getElementById('registerForm');
      if (loginForm) loginForm.reset();
      if (registerForm) registerForm.reset();
      
      this.switchAuthTab('login');
    }
  }

  closeAuthModal() {
    const authModal = document.getElementById('authModal');
    if (authModal) {
      authModal.classList.remove('active');
    }
  }

  switchAuthTab(tabName) {
    const authModalTabs = document.querySelectorAll('.auth-modal-tab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    authModalTabs.forEach(tab => {
      if (tab.dataset.tab === tabName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
    
    if (loginForm && registerForm) {
      if (tabName === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
      } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
      }
    }
  }

  async login(credentials) {
    try {
      console.log('🔐 AUTH: Отправка запроса на вход', credentials);
      
      const response = await fetch(`${this.apiBase}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔐 AUTH: Успешный вход', data);
        
        // Сохраняем данные пользователя с правильной структурой
        const userData = {
          email: credentials.email,
          full_name: data.user?.name || credentials.email.split('@')[0],
          token: data.access_token,
          ...data.user
        };
        
        this.isAuthenticated = true;
        this.userData = userData;
        localStorage.setItem('mebeldom_auth', JSON.stringify(userData));
        this.renderAuth();
        this.closeAuthModal();
        
        // Показываем уведомление об успешном входе
        this.showNotification('Вы успешно вошли в систему!');
        return true;
      } else {
        const errorData = await response.json();
        console.error('🔐 AUTH: Ошибка входа', errorData);
        alert(`Ошибка входа: ${errorData.detail || 'Неверные учетные данные'}`);
        return false;
      }
    } catch (error) {
      console.error('🔐 AUTH: Ошибка сети при входе', error);
      alert('Ошибка сети при входе в систему');
      return false;
    }
  }

  async register(userData) {
    try {
      console.log('🔐 AUTH: Отправка запроса на регистрацию', userData);
      
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

      if (response.ok) {
        const data = await response.json();
        console.log('🔐 AUTH: Успешная регистрация', data);
        
        // Автоматически входим после регистрации
        const loginSuccess = await this.login({
          email: userData.email,
          password: userData.password
        });
        
        if (loginSuccess) {
          this.showNotification('Регистрация прошла успешно! Вы вошли в систему.');
        }
        return true;
      } else {
        const errorData = await response.json();
        console.error('🔐 AUTH: Ошибка регистрации', errorData);
        alert(`Ошибка регистрации: ${errorData.detail || 'Не удалось зарегистрироваться'}`);
        return false;
      }
    } catch (error) {
      console.error('🔐 AUTH: Ошибка сети при регистрации', error);
      alert('Ошибка сети при регистрации');
      return false;
    }
  }

  logout() {
    this.isAuthenticated = false;
    this.userData = null;
    localStorage.removeItem('mebeldom_auth');
    this.renderAuth();
    console.log('🔐 AUTH: Пользователь вышел из системы');
    this.showNotification('Вы вышли из системы');
  }

  getAuthToken() {
    if (this.isAuthenticated && this.userData) {
      return this.userData.token;
    }
    return null;
  }

  isUserAuthenticated() {
    return this.isAuthenticated;
  }

  getUserData() {
    return this.userData;
  }

  showNotification(message) {
    // Удаляем существующие уведомления
    const existingNotifications = document.querySelectorAll('.auth-notification');
    existingNotifications.forEach(notification => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    });

    const notification = document.createElement('div');
    notification.className = 'auth-notification';
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
}

// Инициализация глобального объекта auth
document.addEventListener('DOMContentLoaded', function() {
  console.log('🔐 AUTH: DOM загружен, создаем AuthManager');
  window.auth = new AuthManager();
  
  // Привязываем обработчики событий для модального окна
  const authModal = document.getElementById('authModal');
  const authModalTabs = document.querySelectorAll('.auth-modal-tab');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  if (authModal) {
    // Закрытие модального окна при клике вне его
    authModal.addEventListener('click', (e) => {
      if (e.target === authModal) {
        window.auth.closeAuthModal();
      }
    });

    // Закрытие по ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && authModal.classList.contains('active')) {
        window.auth.closeAuthModal();
      }
    });
  }

  if (authModalTabs) {
    authModalTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        window.auth.switchAuthTab(tab.dataset.tab);
      });
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      
      if (email && password) {
        await window.auth.login({ email, password });
      } else {
        alert('Пожалуйста, заполните все поля');
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const name = document.getElementById('registerName').value;
      const email = document.getElementById('registerEmail').value;
      const password = document.getElementById('registerPassword').value;
      const confirmPassword = document.getElementById('registerConfirmPassword').value;
      const privacyPolicy = document.getElementById('privacyPolicy').checked;
      const dataStorage = document.getElementById('dataStorage').checked;
      
      if (!name || !email || !password || !confirmPassword) {
        alert('Пожалуйста, заполните все поля');
        return;
      }
      
      if (password !== confirmPassword) {
        alert('Пароли не совпадают');
        return;
      }
      
      if (!privacyPolicy || !dataStorage) {
        alert('Необходимо согласие со всеми условиями');
        return;
      }
      
      await window.auth.register({ name, email, password });
    });

    // Маска для телефона (если нужно)
    const registerPhoneInput = document.getElementById('registerPhone');
    if (registerPhoneInput) {
      registerPhoneInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.startsWith('7') || value.startsWith('8')) {
          value = value.substring(1);
        }
        
        let formattedValue = '+7 (';
        if (value.length > 0) {
          formattedValue += value.substring(0, 3);
        }
        if (value.length > 3) {
          formattedValue += ') ' + value.substring(3, 6);
        }
        if (value.length > 6) {
          formattedValue += '-' + value.substring(6, 8);
        }
        if (value.length > 8) {
          formattedValue += '-' + value.substring(8, 10);
        }
        
        e.target.value = formattedValue;
      });
    }
  }
});