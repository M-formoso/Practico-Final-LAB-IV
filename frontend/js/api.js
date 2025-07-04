// ==========================================
// API MANAGER - api.js
// ==========================================

class ApiManager {
    constructor() {
        this.config = {
            BASE_URL: 'http://localhost:8001',  // ← PUERTO CORREGIDO
            DEVELOPMENT_MODE: false,
            TIMEOUT: 10000,
            RETRY_ATTEMPTS: 3,
            RETRY_DELAY: 1000
        };

        this.endpoints = {
            // Autenticación
            LOGIN: '/auth/login',
            REGISTER: '/auth/register',
            LOGOUT: '/auth/logout',
            REFRESH: '/auth/refresh',
            VERIFY: '/auth/verify',

            // Eventos
            EVENTS: '/events',
            EVENT_DETAIL: '/events/{id}',
            EVENT_REGISTER: '/events/{id}/register',
            EVENT_UNREGISTER: '/events/{id}/unregister',

            // Usuario
            USER_PROFILE: '/user/profile',
            USER_EVENTS: '/user/events',
            USER_HISTORY: '/user/history',

            // Admin
            ADMIN_EVENTS: '/admin/events',
            ADMIN_USERS: '/admin/users',
            ADMIN_STATS: '/admin/stats',
            ADMIN_REPORTS: '/admin/reports',

            // Dashboard - AGREGADO
            DASHBOARD: '/dashboard',
            DASHBOARD_STATS: '/dashboard/stats'
        };

        this.init();
    }

    init() {
        this.setupInterceptors();
        console.log('🌐 API Manager inicializado con URL:', this.config.BASE_URL);
    }

    // ==========================================
    // MÉTODOS HTTP BÁSICOS
    // ==========================================

    async get(endpoint, options = {}) {
        return await this.request(endpoint, {
            method: 'GET',
            ...options
        });
    }

    async post(endpoint, data = null, options = {}) {
        return await this.request(endpoint, {
            method: 'POST',
            body: data ? JSON.stringify(data) : null,
            ...options
        });
    }

    async put(endpoint, data = null, options = {}) {
        return await this.request(endpoint, {
            method: 'PUT',
            body: data ? JSON.stringify(data) : null,
            ...options
        });
    }

    async delete(endpoint, options = {}) {
        return await this.request(endpoint, {
            method: 'DELETE',
            ...options
        });
    }

    // ==========================================
    // MÉTODO PRINCIPAL DE REQUEST
    // ==========================================

    async request(endpoint, options = {}) {
        const url = this.buildUrl(endpoint);
        const config = this.buildRequestConfig(options);

        try {
            // En modo desarrollo, usar datos mock si está disponible
            if (this.config.DEVELOPMENT_MODE) {
                const mockResponse = await this.getMockResponse(endpoint, options);
                if (mockResponse) {
                    await this.delay(300); // Simular latencia de red
                    return mockResponse;
                }
            }

            const response = await this.executeRequest(url, config);
            return await this.handleResponse(response);

        } catch (error) {
            return this.handleError(error, endpoint, options);
        }
    }

    // ==========================================
    // CONSTRUCCIÓN DE REQUEST
    // ==========================================

    buildUrl(endpoint) {
        // Si el endpoint ya es una URL completa, usarla directamente
        if (endpoint.startsWith('http')) {
            return endpoint;
        }

        // Construir URL relativa
        const baseUrl = this.config.BASE_URL.replace(/\/$/, '');
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        return `${baseUrl}${cleanEndpoint}`;
    }

    buildRequestConfig(options) {
        const config = {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...this.getAuthHeaders(),
                ...options.headers
            },
            ...options
        };

        // Agregar timeout
        if (this.config.TIMEOUT) {
            config.signal = AbortSignal.timeout(this.config.TIMEOUT);
        }

        return config;
    }

    getAuthHeaders() {
        if (typeof window !== 'undefined' && window.auth) {
            return window.auth.getAuthHeaders();
        }
        return {};
    }

    // ==========================================
    // EJECUCIÓN Y MANEJO DE RESPUESTAS
    // ==========================================

    async executeRequest(url, config) {
        let lastError;

        for (let attempt = 1; attempt <= this.config.RETRY_ATTEMPTS; attempt++) {
            try {
                console.log(`🌐 [Intento ${attempt}] ${config.method} ${url}`);
                
                const response = await fetch(url, config);
                
                // Si la respuesta es exitosa o es un error de cliente (4xx), no reintentar
                if (response.ok || (response.status >= 400 && response.status < 500)) {
                    return response;
                }

                throw new Error(`HTTP ${response.status}: ${response.statusText}`);

            } catch (error) {
                lastError = error;
                
                if (attempt < this.config.RETRY_ATTEMPTS) {
                    console.warn(`⚠️ Intento ${attempt} falló, reintentando en ${this.config.RETRY_DELAY}ms...`);
                    await this.delay(this.config.RETRY_DELAY * attempt);
                } else {
                    console.error(`❌ Todos los intentos fallaron para ${url}`);
                }
            }
        }

        throw lastError;
    }

    async handleResponse(response) {
        const result = {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            ok: response.ok
        };

        try {
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                result.data = await response.json();
            } else {
                result.data = await response.text();
            }
        } catch (error) {
            console.warn('⚠️ Error parseando respuesta:', error);
            result.data = null;
        }

        if (!response.ok) {
            throw new EventProApiError(
                result.data?.message || result.statusText || 'Error en la petición',
                result.status,
                result.data
            );
        }

        return result;
    }

    handleError(error, endpoint, options) {
        console.error(`❌ Error en API [${options.method || 'GET'} ${endpoint}]:`, error);

        // Manejar diferentes tipos de errores
        if (error.name === 'AbortError') {
            throw new EventProApiError('Timeout: La petición tardó demasiado', 408);
        }

        if (error instanceof EventProApiError) {
            throw error;
        }

        if (error.message.includes('Failed to fetch')) {
            throw new EventProApiError('Error de conexión: Verifica tu conexión a internet', 0);
        }

        throw new EventProApiError(error.message || 'Error desconocido', 500);
    }

    // ==========================================
    // RESPUESTAS MOCK PARA DESARROLLO
    // ==========================================

    async getMockResponse(endpoint, options) {
        const method = options.method || 'GET';
        const mockKey = `${method} ${endpoint}`;

        // Mock responses para diferentes endpoints
        const mockResponses = {
            'GET /dashboard/stats': {
                ok: true,
                status: 200,
                data: this.getMockDashboardStats()
            },
            'GET /events': {
                ok: true,
                status: 200,
                data: this.getMockEvents()
            },
            'GET /user/events': {
                ok: true,
                status: 200,
                data: this.getMockUserEvents()
            },
            'GET /user/profile': {
                ok: true,
                status: 200,
                data: this.getMockUserProfile()
            },
            'GET /admin/stats': {
                ok: true,
                status: 200,
                data: this.getMockAdminStats()
            }
        };

        return mockResponses[mockKey] || null;
    }

    getMockDashboardStats() {
        return {
            total_events: 15,
            active_inscriptions: 127,
            average_rating: 8.5,
            popular_event: {
                title: "Conferencia Tech 2024",
                id: 1
            }
        };
    }

    getMockEvents() {
        return [
            {
                id: 1,
                titulo: "Conferencia de Tecnología 2025",
                descripcion: "Las últimas tendencias en desarrollo web y mobile",
                fecha: "2025-07-15",
                hora: "09:00",
                ubicacion: "Centro de Convenciones",
                capacidad: 100,
                inscritos: 45,
                categoria: "Tecnología",
                organizador: "TechCorp",
                precio: 0,
                estado: "activo"
            },
            {
                id: 2,
                titulo: "Workshop de React Avanzado",
                descripcion: "Aprende hooks avanzados, Context API y optimización",
                fecha: "2025-07-20",
                hora: "14:00",
                ubicacion: "Aula Virtual",
                capacidad: 30,
                inscritos: 30,
                categoria: "Programación",
                organizador: "DevAcademy",
                precio: 50,
                estado: "completo"
            }
        ];
    }

    getMockUserEvents() {
        return [
            {
                id: 1,
                titulo: "Conferencia de Tecnología 2025",
                fecha: "2025-07-15",
                estado: "confirmado",
                fechaInscripcion: "2025-06-15"
            }
        ];
    }

    getMockUserProfile() {
        return {
            id: 2,
            nombre: "Cliente Demo",
            email: "cliente@eventpro.com",
            rol: "Cliente",
            fechaRegistro: "2025-01-01"
        };
    }

    getMockAdminStats() {
        return {
            totalEventos: 25,
            totalUsuarios: 150,
            eventosActivos: 8,
            inscripcionesTotales: 320
        };
    }

    // ==========================================
    // MÉTODOS DE CONVENIENCIA
    // ==========================================

    // Dashboard - CORREGIDO
    async getDashboardStats() {
        try {
            console.log('🌐 Llamando a /dashboard/stats...');
            const response = await this.get('/dashboard/stats');
            console.log('✅ Respuesta dashboard stats:', response);
            return response;
        } catch (error) {
            console.error('❌ Error en getDashboardStats:', error);
            throw error;
        }
    }

    // Eventos
    async getEvents(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        const endpoint = params ? `/events/?${params}` : '/events/';  // Con barra al final
        return await this.get(endpoint);
    }

    async getEvent(id) {
        const endpoint = this.endpoints.EVENT_DETAIL.replace('{id}', id);
        return await this.get(endpoint);
    }

    async registerForEvent(eventId) {
        const endpoint = this.endpoints.EVENT_REGISTER.replace('{id}', eventId);
        return await this.post(endpoint);
    }

    async unregisterFromEvent(eventId) {
        const endpoint = this.endpoints.EVENT_UNREGISTER.replace('{id}', eventId);
        return await this.delete(endpoint);
    }

    // Usuario
    async getUserProfile() {
        return await this.get(this.endpoints.USER_PROFILE);
    }

    async updateUserProfile(data) {
        return await this.put(this.endpoints.USER_PROFILE, data);
    }

    async getUserEvents() {
        return await this.get(this.endpoints.USER_EVENTS);
    }

    async getUserHistory() {
        return await this.get(this.endpoints.USER_HISTORY);
    }

    // Admin
    async getAdminStats() {
        return await this.get(this.endpoints.ADMIN_STATS);
    }

    async getAdminUsers(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        const endpoint = params ? `${this.endpoints.ADMIN_USERS}?${params}` : this.endpoints.ADMIN_USERS;
        return await this.get(endpoint);
    }

    // ==========================================
    // INTERCEPTORES
    // ==========================================

    setupInterceptors() {
        // Interceptor para requests
        this.onRequest = (config) => {
            console.log(`🚀 Request: ${config.method} ${config.url}`);
            return config;
        };

        // Interceptor para responses
        this.onResponse = (response) => {
            console.log(`✅ Response: ${response.status} ${response.statusText}`);
            return response;
        };

        // Interceptor para errores
        this.onError = (error) => {
            console.error(`❌ API Error:`, error);
            return Promise.reject(error);
        };
    }

    // ==========================================
    // UTILIDADES
    // ==========================================

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    isOnline() {
        return navigator.onLine;
    }

    getNetworkStatus() {
        return {
            online: navigator.onLine,
            connection: navigator.connection || navigator.mozConnection || navigator.webkitConnection
        };
    }
}

// ==========================================
// CLASE DE ERROR PERSONALIZADA - RENOMBRADA
// ==========================================

class EventProApiError extends Error {
    constructor(message, status = 500, data = null) {
        super(message);
        this.name = 'EventProApiError';
        this.status = status;
        this.data = data;
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            status: this.status,
            data: this.data
        };
    }
}

// ==========================================
// INSTANCIA GLOBAL
// ==========================================

const api = new ApiManager();

// Exportar para uso en otros archivos
window.api = api;
window.EventProApiError = EventProApiError;

// Para entornos que soporten módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { api, EventProApiError };
}

// ==========================================
// HELPERS GLOBALES
// ==========================================

// Función para hacer requests simples
async function apiCall(endpoint, options = {}) {
    try {
        return await api.request(endpoint, options);
    } catch (error) {
        console.error('Error en apiCall:', error);
        throw error;
    }
}

// Función para verificar conexión
function checkConnection() {
    return api.isOnline();
}

console.log('🌐 Sistema API cargado correctamente');