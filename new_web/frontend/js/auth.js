console.log('🔐 AUTH: Загружается auth.js');

class AuthManager {
    constructor() {
        console.log('🔐 AUTH: Конструктор AuthManager вызван');
        this.checkAuth();
    }

    checkAuth() {
        console.log('🔐 AUTH: Проверка авторизации');
        const savedAuth = localStorage.getItem('mebeldom_auth');
        if (savedAuth) {
            try {
                const userData = JSON.parse(savedAuth);
                console.log('🔐 AUTH: Пользователь авторизован:', userData.email);
                return true;
            } catch (e) {
                console.error('🔐 AUTH: Ошибка парсинга auth данных:', e);
                return false;
            }
        }
        console.log('🔐 AUTH: Пользователь не авторизован');
        return false;
    }

    getCurrentUser() {
        const savedAuth = localStorage.getItem('mebeldom_auth');
        if (savedAuth) {
            try {
                return JSON.parse(savedAuth);
            } catch (e) {
                console.error('🔐 AUTH: Ошибка получения пользователя:', e);
            }
        }
        return null;
    }

    saveUserWithToken({ email, name, access_token }) {
        const userWithToken = {
            email,
            name: name || email.split('@')[0],
            access_token,
            login_time: new Date().toISOString()
        };
        localStorage.setItem('mebeldom_auth', JSON.stringify(userWithToken));
        console.log('🔐 AUTH: Пользователь сохранен в localStorage', userWithToken.email);
        this.updateAuthUI();
    }

    logout() {
        console.log('🔐 AUTH: Выход пользователя');
        localStorage.removeItem('mebeldom_auth');
        // Не обязательно удалять корзину на логаут — но в проекте вы это делаете:
        localStorage.removeItem('mebeldom_cart');
        this.updateAuthUI();

        if (window.location.pathname.includes('cart.html')) {
            window.location.href = 'index.html';
        }
    }

    updateAuthUI() {
        console.log('🔐 AUTH: Обновление UI авторизации');
        const authControls = document.getElementById('authControls');
        if (!authControls) {
            console.log('🔐 AUTH: Элемент authControls не найден');
            return;
        }

        const userData = this.getCurrentUser();
        authControls.innerHTML = '';

        if (userData) {
            const name = document.createElement('span');
            name.className = 'username';
            name.textContent = userData.name || userData.email.split('@')[0];
            name.style.color = 'var(--brand-red)';
            name.style.fontWeight = '600';
            name.style.marginRight = '8px';
            name.style.maxWidth = '150px';
            name.style.overflow = 'hidden';
            name.style.textOverflow = 'ellipsis';
            name.style.whiteSpace = 'nowrap';

            const logoutBtn = document.createElement('button');
            logoutBtn.className = 'auth-ghost';
            logoutBtn.textContent = 'Выйти';
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });

            authControls.appendChild(name);
            authControls.appendChild(logoutBtn);

            console.log('🔐 AUTH: UI обновлен для авторизованного пользователя');
        } else {
            const loginBtn = document.createElement('button');
            loginBtn.className = 'auth-ghost';
            loginBtn.textContent = 'Войти';
            loginBtn.addEventListener('click', () => {
                this.openAuthModal();
            });

            authControls.appendChild(loginBtn);
            console.log('🔐 AUTH: UI обновлен для неавторизованного пользователя');
        }
    }

    openAuthModal() {
        console.log('🔐 AUTH: Открытие модального окна авторизации');
        const authModal = document.getElementById('authModal');
        if (!authModal) {
            console.error('🔐 AUTH: Модальное окно авторизации не найдено');
            alert('Ошибка: модальное окно авторизации недоступно');
            return;
        }
        authModal.classList.add('active');

        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        if (loginForm) loginForm.reset();
        if (registerForm) registerForm.reset();
        this.switchAuthTab('login');
        console.log('🔐 AUTH: Модальное окно открыто');
    }

    closeAuthModal() {
        console.log('🔐 AUTH: Закрытие модального окна авторизации');
        const authModal = document.getElementById('authModal');
        if (authModal) authModal.classList.remove('active');
    }

    switchAuthTab(tabName) {
        console.log('🔐 AUTH: Переключение на вкладку:', tabName);
        const authModalTabs = document.querySelectorAll('.auth-modal-tab');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        if (!authModalTabs.length || !loginForm || !registerForm) {
            console.error('🔐 AUTH: Элементы вкладок не найдены');
            return;
        }

        authModalTabs.forEach(tab => {
            if (tab.dataset.tab === tabName) tab.classList.add('active');
            else tab.classList.remove('active');
        });

        if (tabName === 'login') {
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
        } else {
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
        }
    }

    // login через API — сохраняет полученный access_token
    async handleLogin(email, password) {
        console.log('🔐 AUTH: handleLogin для', email);
        if (!email || !password) {
            alert('Пожалуйста, заполните все поля');
            return false;
        }

        try {
            const resp = await fetch('http://localhost:8001/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!resp.ok) {
                const txt = await resp.text();
                console.error('🔐 AUTH: Ошибка логина', resp.status, txt);
                alert('Неверный логин или пароль');
                return false;
            }

            const data = await resp.json();
            if (!data.access_token) {
                console.error('🔐 AUTH: В ответе нет access_token', data);
                alert('Сервер не выдал токен');
                return false;
            }

            this.saveUserWithToken({ email, name: data.user?.name || email.split('@')[0], access_token: data.access_token });
            this.closeAuthModal();
            alert('Вы успешно вошли в систему!');
            return true;
        } catch (e) {
            console.error('🔐 AUTH: Ошибка сети при логине', e);
            alert('Ошибка сети');
            return false;
        }
    }

    // register через API, затем логин
    async handleRegister(formData) {
        console.log('🔐 AUTH: Обработка регистрации для:', formData.email);
        const { name, phone, email, password, confirmPassword, privacyPolicy, dataStorage } = formData;

        if (!name || !phone || !email || !password || !confirmPassword) {
            alert('Пожалуйста, заполните все поля');
            return false;
        }
        if (password !== confirmPassword) {
            alert('Пароли не совпадают');
            return false;
        }
        if (!privacyPolicy || !dataStorage) {
            alert('Необходимо согласие со всеми условиями');
            return false;
        }

        try {
            // Формируем тело запроса в том виде, который ждёт сервер
            const payload = {
                full_name: name,      // <-- важно: full_name, а не name
                email: email,
                password: password,
                phone: phone          // если сервер не ожидает — он просто проигнорирует
            };

            const resp = await fetch('http://localhost:8001/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!resp.ok) {
                // Попытка аккуратно показать причину (422 -> JSON с detail)
                let message = `Ошибка регистрации: ${resp.status}`;
                try {
                    const data = await resp.json();
                    // FastAPI обычно возвращает detail: [{...}, ...] или message
                    if (data.detail) {
                        if (Array.isArray(data.detail)) {
                            message = data.detail.map(d => {
                                if (typeof d === 'string') return d;
                                if (d.loc && d.msg) return `${d.loc.join('.')} — ${d.msg}`;
                                return JSON.stringify(d);
                            }).join('\n');
                        } else if (typeof data.detail === 'string') {
                            message = data.detail;
                        } else {
                            message = JSON.stringify(data.detail);
                        }
                    } else if (data.message) {
                        message = data.message;
                    } else {
                        message = JSON.stringify(data);
                    }
                } catch (e) {
                    console.warn('🔐 AUTH: Не удалось распарсить тело ошибки', e);
                }
                console.error('🔐 AUTH: Ошибка регистрации', resp.status, message);
                alert(message);
                return false;
            }

            // После успешной регистрации — логинимся, чтобы получить токен
            const loginSuccess = await this.handleLogin(email, password);
            if (loginSuccess) {
                this.closeAuthModal();
                alert('Регистрация прошла успешно! Вы вошли в систему.');
                return true;
            }
            return false;
        } catch (e) {
            console.error('🔐 AUTH: Ошибка сети при регистрации', e);
            alert('Ошибка сети при регистрации');
            return false;
        }
    }

    // createMockToken оставлен как fallback, но не используется в нормальном flow
    createMockToken(email) {
        const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
        const payload = btoa(JSON.stringify({
            sub: email,
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24)
        }));
        return `${header}.${payload}.mock-signature`;
    }

    initEventListeners() {
        console.log('🔐 AUTH: Инициализация обработчиков событий');
        const authModal = document.getElementById('authModal');
        const authModalTabs = document.querySelectorAll('.auth-modal-tab');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        if (authModal) {
            authModal.addEventListener('click', (e) => {
                if (e.target === authModal) this.closeAuthModal();
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && authModal.classList.contains('active')) this.closeAuthModal();
            });
        }

        if (authModalTabs.length) {
            authModalTabs.forEach(tab => tab.addEventListener('click', () => this.switchAuthTab(tab.dataset.tab)));
        }

        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('loginEmail').value;
                const password = document.getElementById('loginPassword').value;
                await this.handleLogin(email, password);
            });
        }

        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = {
                    name: document.getElementById('registerName').value,
                    phone: document.getElementById('registerPhone').value,
                    email: document.getElementById('registerEmail').value,
                    password: document.getElementById('registerPassword').value,
                    confirmPassword: document.getElementById('registerConfirmPassword').value,
                    privacyPolicy: document.getElementById('privacyPolicy').checked,
                    dataStorage: document.getElementById('dataStorage').checked
                };
                await this.handleRegister(formData);
            });

            const registerPhoneInput = document.getElementById('registerPhone');
            if (registerPhoneInput) {
                registerPhoneInput.addEventListener('input', function (e) {
                    let value = e.target.value.replace(/\D/g, '');
                    if (value.startsWith('7') || value.startsWith('8')) value = value.substring(1);
                    let formattedValue = '+7 (';
                    if (value.length > 0) formattedValue += value.substring(0, 3);
                    if (value.length > 3) formattedValue += ') ' + value.substring(3, 6);
                    if (value.length > 6) formattedValue += '-' + value.substring(6, 8);
                    if (value.length > 8) formattedValue += '-' + value.substring(8, 10);
                    e.target.value = formattedValue;
                });
            }
        }

        console.log('🔐 AUTH: Обработчики событий инициализированы');
    }
}

console.log('🔐 AUTH: Создаем глобальный объект auth');
window.auth = new AuthManager();
window.openAuthModalGlobal = function () { window.auth.openAuthModal(); };

document.addEventListener('DOMContentLoaded', function () {
    console.log('🔐 AUTH: DOM загружен, инициализируем обработчики');
    window.auth.initEventListeners();
    window.auth.updateAuthUI();
});

console.log('🔐 AUTH: Модуль авторизации загружен');
