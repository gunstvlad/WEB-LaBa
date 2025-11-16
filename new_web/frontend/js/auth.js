// frontend/js/auth.js
const API_BASE = "http://localhost:8001/api";

async function login(email, password) {
    const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
        throw new Error('Ошибка авторизации');
    }
    
    return await response.json();
}

async function register(userData) {
    const response = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
    });
    
    if (!response.ok) {
        throw new Error('Ошибка регистрации');
    }
    
    return await response.json();
}

function saveAuthData(userData) {
    localStorage.setItem('mebeldom_auth', JSON.stringify(userData));
}

function getAuthToken() {
    const authData = JSON.parse(localStorage.getItem('mebeldom_auth') || '{}');
    return authData.access_token;
}

function getCurrentUser() {
    return JSON.parse(localStorage.getItem('mebeldom_auth') || 'null');
}