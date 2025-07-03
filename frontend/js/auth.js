// ==========================================
// SISTEMA DE AUTENTICACIÓN - auth.js
// ==========================================

class AuthSystem {
    constructor() {
        this.config = {
            API_BASE_URL: 'http://localhost:8001',  // ← URL CORREGIDA
            DEVELOPMENT_MODE: false,  // ← CAMBIADO A PRODUCCIÓN
            TOKEN_KEY: 'authToken',
            USER_KEY: 'userData',
            SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 horas
            REFRESH_THRESHOLD: 5 * 60 * 1000 // 5 minutos antes del vencimiento
        };

        this.mockUsers = [
            {
                id: 1,
                nombre: "Administrador Demo",
                email: "admin@eventpro.com",
                contraseña: "admin123",
                rol: "Administrador",
                avatar: "https://via.placeholder.com/100?text=ADMIN"
            },
            {
                id: 2,
                nombre: "Cliente Demo",
                email: "cliente@eventpro.com",
                contraseña: "cliente123",
                rol: "Cliente",
                avatar: "https://via.placeholder.com/100?text=USER"
            }
        ];

        this.init();
    }

    init() {
        this.setupTokenRefresh();
        this.logSystemInfo();
    }

    // ==========================================
    // AUTENTICACIÓN
    // ==========================================

    async login(credentials) {
        try {
            console.log('🔐 Intentando login con:', credentials.email);
            
            let response;
            
            if (this.config.DEVELOPMENT_MODE) {
                response = await this.mockLogin(credentials);
            } else {
                response = await this.apiLogin(credentials);
            }

            if (response.success) {
                console.log('✅ Login exitoso para:', response.data.user.nombre);
                this.saveAuthData(response.data);
                return { success: true, user: response.data.user };
            } else {
                console.log('❌ Login fallido:', response.message);
                return { success: false, message: response.message };
            }
        } catch (error) {
            console.error('❌ Error en login:', error);
            return { success: false, message: 'Error de conexión con el servidor' };
        }
    }

    async register(userData) {
        try {
            console.log('📝 Intentando registro para:', userData.email);
            
            let response;
            
            if (this.config.DEVELOPMENT_MODE) {
                response = await this.mockRegister(userData);
            } else {
                response = await this.apiRegister(userData);
            }

            console.log('📝 Resultado del registro:', response.success);
            return response;
        } catch (error) {
            console.error('❌ Error en registro:', error);
            return { success: false, message: 'Error de conexión con el servidor' };
        }
    }

    logout() {
        console.log('👋 Cerrando sesión...');
        this.clearAuthData();
        this.redirectTo('/login.html');
        this.showNotification('Sesión cerrada correctamente', 'success');
    }

    // ==========================================
    // API CALLS REALES
    // ==========================================

    async apiLogin(credentials) {
        console.log('🌐 Llamando a API de login...');
        
        try {
            const response = await fetch(`${this.config.API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: credentials.email,
                    contraseña: credentials.password  // Backend espera 'contraseña'
                })
            });

            console.log('📡 Respuesta del servidor:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Login exitoso, datos recibidos:', data);
                
                // Verificar que tenemos los datos necesarios
                if (!data.access_token || !data.email) {
                    throw new Error('Respuesta del servidor incompleta');
                }
                
                // El backend devuelve: { access_token, token_type, user_id, email, role }
                return { 
                    success: true, 
                    data: {
                        access_token: data.access_token,
                        token_type: data.token_type || 'bearer',
                        expires_in: this.config.SESSION_TIMEOUT,
                        user: {
                            id: data.user_id || 1,
                            nombre: data.email ? data.email.split('@')[0] : 'Usuario', // Usar email como fallback
                            email: data.email,
                            rol: data.role || 'Cliente' // Backend devuelve 'role', frontend espera 'rol'
                        }
                    }
                };
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.log('❌ Error del servidor:', errorData);
                return { 
                    success: false, 
                    message: errorData.detail || 'Email o contraseña incorrectos' 
                };
            }
        } catch (error) {
            console.error('❌ Error en fetch:', error);
            return { 
                success: false, 
                message: 'Error de conexión con el servidor' 
            };
        }
    }

    async apiRegister(userData) {
        console.log('🌐 Llamando a API de registro...');
        
        const response = await fetch(`${this.config.API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                nombre: userData.nombre,
                email: userData.email,
                contraseña: userData.contraseña,
                rol: userData.rol
            })
        });

        console.log('📡 Respuesta del servidor:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Registro exitoso:', data);
            return { 
                success: true, 
                message: 'Usuario creado exitosamente',
                user: data
            };
        } else {
            const errorData = await response.json().catch(() => ({}));
            console.log('❌ Error del servidor:', errorData);
            return { 
                success: false, 
                message: errorData.detail || 'Error al crear la cuenta' 
            };
        }
    }

    // ==========================================
    // SIMULACIÓN DE BACKEND (DESARROLLO) - MANTENER PARA FALLBACK
    // ==========================================

    async mockLogin(credentials) {
        console.log('🧪 Usando mock login...');
        await this.delay(800);

        const user = this.mockUsers.find(u => 
            u.email === credentials.email && u.contraseña === credentials.password
        );

        if (user) {
            const token = this.generateMockToken();
            return {
                success: true,
                data: {
                    access_token: token,
                    token_type: 'bearer',
                    expires_in: this.config.SESSION_TIMEOUT,
                    user: {
                        id: user.id,
                        nombre: user.nombre,
                        email: user.email,
                        rol: user.rol,
                        avatar: user.avatar
                    }
                }
            };
        } else {
            return {
                success: false,
                message: 'Email o contraseña incorrectos'
            };
        }
    }

    async mockRegister(userData) {
        console.log('🧪 Usando mock register...');
        await this.delay(1000);

        const existingUser = this.mockUsers.find(u => u.email === userData.email);
        
        if (existingUser) {
            return {
                success: false,
                message: 'Este email ya está registrado'
            };
        }

        const newUser = {
            id: this.mockUsers.length + 1,
            nombre: userData.nombre,
            email: userData.email,
            contraseña: userData.contraseña,
            rol: userData.rol,
            avatar: `https://via.placeholder.com/100?text=${userData.nombre.charAt(0)}`
        };

        this.mockUsers.push(newUser);

        return {
            success: true,
            message: 'Usuario creado exitosamente',
            user: {
                id: newUser.id,
                nombre: newUser.nombre,
                email: newUser.email,
                rol: newUser.rol
            }
        };
    }

    // ==========================================
    // GESTIÓN DE TOKENS Y DATOS
    // ==========================================

    saveAuthData(authData) {
        const tokenData = {
            token: authData.access_token,
            expires_at: Date.now() + authData.expires_in,
            created_at: Date.now()
        };

        localStorage.setItem(this.config.TOKEN_KEY, JSON.stringify(tokenData));
        localStorage.setItem(this.config.USER_KEY, JSON.stringify(authData.user));

        sessionStorage.setItem(this.config.TOKEN_KEY, JSON.stringify(tokenData));
        sessionStorage.setItem(this.config.USER_KEY, JSON.stringify(authData.user));

        console.log('💾 Datos de autenticación guardados');
    }

    getAuthData() {
        try {
            const tokenStr = localStorage.getItem(this.config.TOKEN_KEY) || 
                           sessionStorage.getItem(this.config.TOKEN_KEY);
            const userStr = localStorage.getItem(this.config.USER_KEY) || 
                          sessionStorage.getItem(this.config.USER_KEY);

            if (!tokenStr || !userStr) return null;

            const tokenData = JSON.parse(tokenStr);
            const userData = JSON.parse(userStr);

            if (tokenData.expires_at < Date.now()) {
                console.log('⏰ Token expirado, limpiando datos...');
                this.clearAuthData();
                return null;
            }

            return {
                token: tokenData.token,
                user: userData,
                expires_at: tokenData.expires_at
            };
        } catch (error) {
            console.error('❌ Error al obtener datos de auth:', error);
            this.clearAuthData();
            return null;
        }
    }

    getCurrentUser() {
        const authData = this.getAuthData();
        return authData ? authData.user : null;
    }

    getToken() {
        const authData = this.getAuthData();
        return authData ? authData.token : null;
    }

    clearAuthData() {
        localStorage.removeItem(this.config.TOKEN_KEY);
        localStorage.removeItem(this.config.USER_KEY);
        sessionStorage.removeItem(this.config.TOKEN_KEY);
        sessionStorage.removeItem(this.config.USER_KEY);
        console.log('🗑️ Datos de autenticación eliminados');
    }

    // ==========================================
    // VERIFICACIÓN Y REDIRECCIÓN
    // ==========================================

    async checkAuth() {
        const authData = this.getAuthData();
        
        if (!authData) {
            return { isAuthenticated: false };
        }

        if (this.config.DEVELOPMENT_MODE) {
            return { 
                isAuthenticated: true, 
                user: authData.user,
                token: authData.token 
            };
        }

        // En producción, verificar con el servidor
        try {
            const isValid = await this.verifyTokenWithServer(authData.token);
            if (isValid) {
                return { 
                    isAuthenticated: true, 
                    user: authData.user,
                    token: authData.token 
                };
            } else {
                this.clearAuthData();
                return { isAuthenticated: false };
            }
        } catch (error) {
            console.error('❌ Error verificando token:', error);
            // En caso de error de red, mantener la sesión local
            return { 
                isAuthenticated: true, 
                user: authData.user,
                token: authData.token 
            };
        }
    }

    async verifyTokenWithServer(token) {
        try {
            const response = await fetch(`${this.config.API_BASE_URL}/auth/verify`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            });
            return response.ok;
        } catch (error) {
            console.error('❌ Error en verificación de token:', error);
            return false;
        }
    }

    requireAuth(allowedRoles = []) {
        return new Promise(async (resolve, reject) => {
            try {
                const auth = await this.checkAuth();
                
                if (!auth.isAuthenticated) {
                    console.log('🚫 No autenticado, redirigiendo al login...');
                    this.redirectTo('/login.html');
                    reject(new Error('No autenticado'));
                    return;
                }

                if (allowedRoles.length > 0 && !allowedRoles.includes(auth.user.rol)) {
                    console.log('🚫 Sin permisos, rol requerido:', allowedRoles, 'rol actual:', auth.user.rol);
                    this.showNotification('No tienes permisos para acceder a esta página', 'error');
                    this.redirectToDashboard(auth.user.rol);
                    reject(new Error('Sin permisos'));
                    return;
                }

                console.log('✅ Autenticación verificada para:', auth.user.nombre);
                resolve(auth);
            } catch (error) {
                console.error('❌ Error en requireAuth:', error);
                reject(error);
            }
        });
    }

    // ==========================================
    // REDIRECCIÓN INTELIGENTE
    // ==========================================

    redirectToDashboard(userRole) {
        const dashboards = {
            'Administrador': '/admin-dashboard.html',
            'Cliente': '/user-dashboard.html'
        };

        const dashboardUrl = dashboards[userRole] || '/user-dashboard.html';
        console.log('🎯 Redirigiendo a dashboard:', dashboardUrl);
        this.redirectTo(dashboardUrl);
    }

    redirectTo(url) {
        if (window.location.pathname === url) return;
        window.location.href = url;
    }

    // ==========================================
    // API PARA OTROS MÓDULOS
    // ==========================================

    getAuthHeaders() {
        const token = this.getToken();
        return token ? {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        } : {
            'Content-Type': 'application/json'
        };
    }

    async makeAuthenticatedRequest(url, options = {}) {
        const headers = this.getAuthHeaders();
        
        const response = await fetch(url, {
            ...options,
            headers: {
                ...headers,
                ...options.headers
            }
        });

        if (response.status === 401) {
            console.log('🚫 Token inválido, cerrando sesión...');
            this.logout();
            throw new Error('Token inválido');
        }

        return response;
    }

    // ==========================================
    // UTILIDADES
    // ==========================================

    generateMockToken() {
        return `mock_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    showNotification(message, type = 'info') {
        if (typeof showToast === 'function') {
            showToast(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    logSystemInfo() {
        console.group('🔐 Sistema de Autenticación EventPro');
        console.log('📊 Estado:', this.config.DEVELOPMENT_MODE ? 'Desarrollo' : 'Producción');
        console.log('🌐 API URL:', this.config.API_BASE_URL);
        console.log('🔑 Usuario actual:', this.getCurrentUser()?.nombre || 'No autenticado');
        console.groupEnd();
    }

    // ==========================================
    // AUTO-RENOVACIÓN DE TOKENS (SIMPLIFICADA)
    // ==========================================

    setupTokenRefresh() {
        setInterval(() => {
            const authData = this.getAuthData();
            if (authData) {
                const timeUntilExpiry = authData.expires_at - Date.now();
                
                if (timeUntilExpiry < this.config.REFRESH_THRESHOLD) {
                    console.log('⏰ Token próximo a expirar, renovando...');
                    this.refreshToken();
                }
            }
        }, 60000);
    }

    async refreshToken() {
        const authData = this.getAuthData();
        if (authData) {
            this.saveAuthData({
                access_token: authData.token,
                expires_in: this.config.SESSION_TIMEOUT,
                user: authData.user
            });
            console.log('🔄 Token renovado');
        }
    }
}

// ==========================================
// INSTANCIA GLOBAL
// ==========================================

const auth = new AuthSystem();
window.auth = auth;

// ==========================================
// HELPERS GLOBALES
// ==========================================

async function requireAuth(allowedRoles = []) {
    try {
        return await auth.requireAuth(allowedRoles);
    } catch (error) {
        console.error('❌ Error en requireAuth:', error);
        throw error;
    }
}

function getCurrentUser() {
    return auth.getCurrentUser();
}

function logout() {
    auth.logout();
}

async function isAuthenticated() {
    const authResult = await auth.checkAuth();
    return authResult.isAuthenticated;
}

// ==========================================
// AUTO-INICIALIZACIÓN EN DASHBOARDS
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    const isDashboard = window.location.pathname.includes('dashboard');
    
    if (isDashboard) {
        initializeDashboard();
    }
});

async function initializeDashboard() {
    try {
        const currentPage = window.location.pathname;
        let requiredRole = null;

        if (currentPage.includes('admin-dashboard')) {
            requiredRole = 'Administrador';
        } else if (currentPage.includes('user-dashboard')) {
            requiredRole = 'Cliente';
        }

        const authData = await auth.requireAuth(requiredRole ? [requiredRole] : []);
        
        console.log('✅ Dashboard inicializado para:', authData.user.nombre);

        window.dispatchEvent(new CustomEvent('authenticationVerified', { 
            detail: authData 
        }));

    } catch (error) {
        console.error('❌ Error inicializando dashboard:', error);
    }
}

console.log('🔐 Sistema de autenticación cargado (Modo Producción)');