// ==========================================
// SISTEMA DE AUTENTICACIÓN - auth.js
// ==========================================

class AuthSystem {
    constructor() {
        this.config = {
            API_BASE_URL: 'http://127.0.0.1:8001',
            DEVELOPMENT_MODE: true,
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
            let response;
            
            if (this.config.DEVELOPMENT_MODE) {
                response = await this.mockLogin(credentials);
            } else {
                response = await this.apiLogin(credentials);
            }

            if (response.success) {
                this.saveAuthData(response.data);
                return { success: true, user: response.data.user };
            } else {
                return { success: false, message: response.message };
            }
        } catch (error) {
            console.error('Error en login:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    async register(userData) {
        try {
            let response;
            
            if (this.config.DEVELOPMENT_MODE) {
                response = await this.mockRegister(userData);
            } else {
                response = await this.apiRegister(userData);
            }

            return response;
        } catch (error) {
            console.error('Error en registro:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    logout() {
        this.clearAuthData();
        this.redirectTo('/login.html');
        this.showNotification('Sesión cerrada correctamente', 'success');
    }

    // ==========================================
    // SIMULACIÓN DE BACKEND (DESARROLLO)
    // ==========================================

    async mockLogin(credentials) {
        // Simular delay de red
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
        await this.delay(1000);

        // Verificar si el email ya existe
        const existingUser = this.mockUsers.find(u => u.email === userData.email);
        
        if (existingUser) {
            return {
                success: false,
                message: 'Este email ya está registrado'
            };
        }

        // Simular creación exitosa
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
    // API CALLS REALES
    // ==========================================

    async apiLogin(credentials) {
        const response = await fetch(`${this.config.API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials)
        });

        const data = await response.json();

        if (response.ok) {
            return { success: true, data };
        } else {
            return { success: false, message: data.detail || 'Error en la autenticación' };
        }
    }

    async apiRegister(userData) {
        const response = await fetch(`${this.config.API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (response.ok) {
            return { success: true, data };
        } else {
            return { success: false, message: data.detail || 'Error al crear la cuenta' };
        }
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

        // También en sessionStorage como backup
        sessionStorage.setItem(this.config.TOKEN_KEY, JSON.stringify(tokenData));
        sessionStorage.setItem(this.config.USER_KEY, JSON.stringify(authData.user));

        console.log('✅ Datos de autenticación guardados');
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

            // Verificar si el token no ha expirado
            if (tokenData.expires_at < Date.now()) {
                this.clearAuthData();
                return null;
            }

            return {
                token: tokenData.token,
                user: userData,
                expires_at: tokenData.expires_at
            };
        } catch (error) {
            console.error('Error al obtener datos de auth:', error);
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

        // En modo desarrollo, confiar en el token local
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
            console.error('Error verificando token:', error);
            return { isAuthenticated: false };
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
            console.error('Error en verificación de token:', error);
            return false;
        }
    }

    requireAuth(allowedRoles = []) {
        return new Promise(async (resolve, reject) => {
            const auth = await this.checkAuth();
            
            if (!auth.isAuthenticated) {
                this.redirectTo('/login.html');
                reject(new Error('No autenticado'));
                return;
            }

            // Verificar roles si se especifican
            if (allowedRoles.length > 0 && !allowedRoles.includes(auth.user.rol)) {
                this.showNotification('No tienes permisos para acceder a esta página', 'error');
                this.redirectToDashboard(auth.user.rol);
                reject(new Error('Sin permisos'));
                return;
            }

            resolve(auth);
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
        this.redirectTo(dashboardUrl);
    }

    redirectTo(url) {
        // Verificar si ya estamos en la URL correcta
        if (window.location.pathname === url) return;

        window.location.href = url;
    }

    // ==========================================
    // AUTO-RENOVACIÓN DE TOKENS
    // ==========================================

    setupTokenRefresh() {
        setInterval(() => {
            const authData = this.getAuthData();
            if (authData) {
                const timeUntilExpiry = authData.expires_at - Date.now();
                
                // Si el token expira en menos de 5 minutos, intentar renovar
                if (timeUntilExpiry < this.config.REFRESH_THRESHOLD) {
                    this.refreshToken();
                }
            }
        }, 60000); // Verificar cada minuto
    }

    async refreshToken() {
        if (this.config.DEVELOPMENT_MODE) {
            // En desarrollo, simplemente extender la expiración
            const authData = this.getAuthData();
            if (authData) {
                this.saveAuthData({
                    access_token: authData.token,
                    expires_in: this.config.SESSION_TIMEOUT,
                    user: authData.user
                });
                console.log('🔄 Token renovado (modo desarrollo)');
            }
            return;
        }

        // En producción, hacer llamada al servidor
        try {
            const response = await fetch(`${this.config.API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.getToken()}`,
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.saveAuthData(data);
                console.log('🔄 Token renovado');
            } else {
                this.logout();
            }
        } catch (error) {
            console.error('Error renovando token:', error);
            this.logout();
        }
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
        // Crear notificación si no existe un sistema
        if (typeof showToast === 'function') {
            showToast(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    logSystemInfo() {
        if (this.config.DEVELOPMENT_MODE) {
            console.group('🔐 Sistema de Autenticación EventPro');
            console.log('📊 Estado:', this.config.DEVELOPMENT_MODE ? 'Desarrollo' : 'Producción');
            console.log('👥 Usuarios mock:', this.mockUsers.length);
            console.log('🔑 Usuario actual:', this.getCurrentUser()?.nombre || 'No autenticado');
            console.log('⏰ Timeout de sesión:', this.config.SESSION_TIMEOUT / (1000 * 60 * 60), 'horas');
            console.groupEnd();
        }
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

        // Si el token es inválido, cerrar sesión
        if (response.status === 401) {
            this.logout();
            throw new Error('Token inválido');
        }

        return response;
    }
}

// ==========================================
// INSTANCIA GLOBAL
// ==========================================

const auth = new AuthSystem();

// Exportar para uso en otros archivos
window.auth = auth;

// Para entornos que soporten módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = auth;
}

// ==========================================
// HELPERS GLOBALES
// ==========================================

// Función para proteger páginas
async function requireAuth(allowedRoles = []) {
    try {
        return await auth.requireAuth(allowedRoles);
    } catch (error) {
        console.error('Error en requireAuth:', error);
        throw error;
    }
}

// Función para obtener usuario actual
function getCurrentUser() {
    return auth.getCurrentUser();
}

// Función para hacer logout
function logout() {
    auth.logout();
}

// Función para verificar si está autenticado
async function isAuthenticated() {
    const authResult = await auth.checkAuth();
    return authResult.isAuthenticated;
}

// ==========================================
// AUTO-INICIALIZACIÓN EN DASHBOARDS
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    // Solo en dashboards, verificar autenticación automáticamente
    const isDashboard = window.location.pathname.includes('dashboard');
    
    if (isDashboard) {
        initializeDashboard();
    }
});

async function initializeDashboard() {
    try {
        const currentPage = window.location.pathname;
        let requiredRole = null;

        // Determinar rol requerido según la página
        if (currentPage.includes('admin-dashboard')) {
            requiredRole = 'Administrador';
        } else if (currentPage.includes('user-dashboard')) {
            requiredRole = 'Cliente';
        }

        // Verificar autenticación y rol
        const authData = await auth.requireAuth(requiredRole ? [requiredRole] : []);
        
        console.log('✅ Dashboard inicializado para:', authData.user.nombre);

        // Disparar evento personalizado para que el dashboard se configure
        window.dispatchEvent(new CustomEvent('authenticationVerified', { 
            detail: authData 
        }));

    } catch (error) {
        console.error('❌ Error inicializando dashboard:', error);
    }
}

console.log('🔐 Sistema de autenticación cargado');