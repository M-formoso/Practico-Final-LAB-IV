// ==========================================
// EVENTOS MANAGER - events.js
// ==========================================

class EventsManager {
    constructor() {
        this.config = {
            DEVELOPMENT_MODE: true,
            AUTO_REFRESH: true,
            REFRESH_INTERVAL: 30000, // 30 segundos
            CACHE_DURATION: 5 * 60 * 1000 // 5 minutos
        };

        this.cache = {
            events: null,
            categories: null,
            lastUpdate: null
        };

        this.listeners = {
            eventRegistered: [],
            eventUnregistered: [],
            eventCreated: [],
            eventUpdated: [],
            eventDeleted: []
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        console.log('📅 Events Manager inicializado');
    }

    // ==========================================
    // GESTIÓN DE EVENTOS
    // ==========================================

    async getEvents(filters = {}, useCache = true) {
        try {
            // Verificar cache
            if (useCache && this.isCacheValid()) {
                console.log('📋 Usando eventos desde cache');
                return this.filterEvents(this.cache.events, filters);
            }

            console.log('🔄 Obteniendo eventos del servidor...');
            
            const response = await api.getEvents(filters);
            const events = response.data;

            // Actualizar cache
            this.updateCache('events', events);

            return events;

        } catch (error) {
            console.error('Error obteniendo eventos:', error);
            
            // Si hay datos en cache, usarlos como fallback
            if (this.cache.events) {
                console.log('⚠️ Usando cache como fallback');
                return this.filterEvents(this.cache.events, filters);
            }

            throw error;
        }
    }

    async getEvent(eventId) {
        try {
            const response = await api.getEvent(eventId);
            return response.data;
        } catch (error) {
            console.error(`Error obteniendo evento ${eventId}:`, error);
            throw error;
        }
    }

    async createEvent(eventData) {
        try {
            const response = await api.post('/admin/events', eventData);
            const newEvent = response.data;

            // Actualizar cache
            if (this.cache.events) {
                this.cache.events.push(newEvent);
            }

            // Notificar listeners
            this.emit('eventCreated', newEvent);

            return newEvent;

        } catch (error) {
            console.error('Error creando evento:', error);
            throw error;
        }
    }

    async updateEvent(eventId, eventData) {
        try {
            const response = await api.put(`/admin/events/${eventId}`, eventData);
            const updatedEvent = response.data;

            // Actualizar cache
            if (this.cache.events) {
                const index = this.cache.events.findIndex(e => e.id === eventId);
                if (index !== -1) {
                    this.cache.events[index] = updatedEvent;
                }
            }

            // Notificar listeners
            this.emit('eventUpdated', updatedEvent);

            return updatedEvent;

        } catch (error) {
            console.error(`Error actualizando evento ${eventId}:`, error);
            throw error;
        }
    }

    async deleteEvent(eventId) {
        try {
            await api.delete(`/admin/events/${eventId}`);

            // Actualizar cache
            if (this.cache.events) {
                this.cache.events = this.cache.events.filter(e => e.id !== eventId);
            }

            // Notificar listeners
            this.emit('eventDeleted', { id: eventId });

            return true;

        } catch (error) {
            console.error(`Error eliminando evento ${eventId}:`, error);
            throw error;
        }
    }

    // ==========================================
    // INSCRIPCIONES
    // ==========================================

    async registerForEvent(eventId) {
        try {
            const response = await api.registerForEvent(eventId);
            
            // Actualizar cache - incrementar contador de inscritos
            if (this.cache.events) {
                const event = this.cache.events.find(e => e.id === eventId);
                if (event) {
                    event.inscritos += 1;
                }
            }

            // Notificar listeners
            this.emit('eventRegistered', { eventId, data: response.data });

            return response.data;

        } catch (error) {
            console.error(`Error inscribiéndose al evento ${eventId}:`, error);
            throw error;
        }
    }

    async unregisterFromEvent(eventId) {
        try {
            const response = await api.unregisterFromEvent(eventId);
            
            // Actualizar cache - decrementar contador de inscritos
            if (this.cache.events) {
                const event = this.cache.events.find(e => e.id === eventId);
                if (event && event.inscritos > 0) {
                    event.inscritos -= 1;
                }
            }

            // Notificar listeners
            this.emit('eventUnregistered', { eventId, data: response.data });

            return response.data;

        } catch (error) {
            console.error(`Error cancelando inscripción al evento ${eventId}:`, error);
            throw error;
        }
    }

    // ==========================================
    // CATEGORÍAS
    // ==========================================

    async getCategories(useCache = true) {
        try {
            if (useCache && this.cache.categories) {
                return this.cache.categories;
            }

            const events = await this.getEvents({}, useCache);
            const categories = [...new Set(events.map(event => event.categoria))].sort();

            this.updateCache('categories', categories);
            return categories;

        } catch (error) {
            console.error('Error obteniendo categorías:', error);
            return [];
        }
    }

    // ==========================================
    // FILTRADO Y BÚSQUEDA
    // ==========================================

    filterEvents(events, filters = {}) {
        if (!events || !Array.isArray(events)) {
            return [];
        }

        return events.filter(event => {
            // Filtro por búsqueda de texto
            if (filters.search) {
                const searchTerm = filters.search.toLowerCase();
                const searchableText = `${event.titulo} ${event.descripcion} ${event.organizador}`.toLowerCase();
                if (!searchableText.includes(searchTerm)) {
                    return false;
                }
            }

            // Filtro por categoría
            if (filters.categoria && event.categoria !== filters.categoria) {
                return false;
            }

            // Filtro por fecha
            if (filters.fecha && event.fecha !== filters.fecha) {
                return false;
            }

            // Filtro por estado
            if (filters.estado && event.estado !== filters.estado) {
                return false;
            }

            // Filtro por rango de fechas
            if (filters.fechaDesde || filters.fechaHasta) {
                const eventDate = new Date(event.fecha);
                
                if (filters.fechaDesde && eventDate < new Date(filters.fechaDesde)) {
                    return false;
                }
                
                if (filters.fechaHasta && eventDate > new Date(filters.fechaHasta)) {
                    return false;
                }
            }

            // Filtro por precio
            if (filters.precioMax !== undefined && event.precio > filters.precioMax) {
                return false;
            }

            if (filters.precioMin !== undefined && event.precio < filters.precioMin) {
                return false;
            }

            // Filtro por disponibilidad
            if (filters.soloDisponibles && event.inscritos >= event.capacidad) {
                return false;
            }

            return true;
        });
    }

    searchEvents(query, events = null) {
        const eventsToSearch = events || this.cache.events || [];
        return this.filterEvents(eventsToSearch, { search: query });
    }

    sortEvents(events, sortBy = 'fecha', order = 'asc') {
        if (!events || !Array.isArray(events)) {
            return [];
        }

        return [...events].sort((a, b) => {
            let valueA = a[sortBy];
            let valueB = b[sortBy];

            // Manejar fechas
            if (sortBy === 'fecha') {
                valueA = new Date(valueA);
                valueB = new Date(valueB);
            }

            // Manejar strings
            if (typeof valueA === 'string') {
                valueA = valueA.toLowerCase();
                valueB = valueB.toLowerCase();
            }

            if (order === 'desc') {
                return valueB > valueA ? 1 : valueB < valueA ? -1 : 0;
            } else {
                return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
            }
        });
    }

    // ==========================================
    // ESTADÍSTICAS
    // ==========================================

    getEventStats(events = null) {
        const eventsToAnalyze = events || this.cache.events || [];

        return {
            total: eventsToAnalyze.length,
            activos: eventsToAnalyze.filter(e => e.estado === 'activo').length,
            completos: eventsToAnalyze.filter(e => e.inscritos >= e.capacidad).length,
            proximos: eventsToAnalyze.filter(e => new Date(e.fecha) >= new Date()).length,
            pasados: eventsToAnalyze.filter(e => new Date(e.fecha) < new Date()).length,
            totalInscritos: eventsToAnalyze.reduce((sum, e) => sum + e.inscritos, 0),
            capacidadTotal: eventsToAnalyze.reduce((sum, e) => sum + e.capacidad, 0),
            categorias: [...new Set(eventsToAnalyze.map(e => e.categoria))].length,
            promedioPrecio: eventsToAnalyze.length > 0 
                ? eventsToAnalyze.reduce((sum, e) => sum + e.precio, 0) / eventsToAnalyze.length 
                : 0
        };
    }

    // ==========================================
    // CACHÉ
    // ==========================================

    updateCache(key, data) {
        this.cache[key] = data;
        this.cache.lastUpdate = Date.now();
    }

    isCacheValid() {
        if (!this.cache.lastUpdate || !this.cache.events) {
            return false;
        }

        return (Date.now() - this.cache.lastUpdate) < this.config.CACHE_DURATION;
    }

    clearCache() {
        this.cache = {
            events: null,
            categories: null,
            lastUpdate: null
        };
        console.log('🗑️ Cache de eventos limpiado');
    }

    // ==========================================
    // SISTEMA DE EVENTOS
    // ==========================================

    on(eventName, callback) {
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }
        this.listeners[eventName].push(callback);
    }

    off(eventName, callback) {
        if (this.listeners[eventName]) {
            this.listeners[eventName] = this.listeners[eventName].filter(cb => cb !== callback);
        }
    }

    emit(eventName, data) {
        if (this.listeners[eventName]) {
            this.listeners[eventName].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error en listener de ${eventName}:`, error);
                }
            });
        }
    }

    setupEventListeners() {
        // Auto-refresh si está habilitado
        if (this.config.AUTO_REFRESH) {
            setInterval(() => {
                if (document.visibilityState === 'visible') {
                    this.refreshEvents();
                }
            }, this.config.REFRESH_INTERVAL);
        }

        // Escuchar cambios de visibilidad para refrescar
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && !this.isCacheValid()) {
                this.refreshEvents();
            }
        });
    }

    async refreshEvents() {
        try {
            console.log('🔄 Refrescando eventos...');
            await this.getEvents({}, false); // Force refresh
        } catch (error) {
            console.error('Error refrescando eventos:', error);
        }
    }

    // ==========================================
    // UTILIDADES
    // ==========================================

    formatEventDate(dateString, includeTime = false) {
        const date = new Date(dateString);
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };

        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }

        return date.toLocaleDateString('es-ES', options);
    }

    isEventUpcoming(event, daysAhead = 7) {
        const eventDate = new Date(event.fecha);
        const now = new Date();
        const diffTime = eventDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays >= 0 && diffDays <= daysAhead;
    }

    isEventFull(event) {
        return event.inscritos >= event.capacidad;
    }

    getAvailableSpots(event) {
        return Math.max(0, event.capacidad - event.inscritos);
    }

    calculateOccupancyRate(event) {
        return event.capacidad > 0 ? (event.inscritos / event.capacidad) * 100 : 0;
    }

    getEventsByCategory() {
        const events = this.cache.events || [];
        const categories = {};

        events.forEach(event => {
            if (!categories[event.categoria]) {
                categories[event.categoria] = [];
            }
            categories[event.categoria].push(event);
        });

        return categories;
    }

    // ==========================================
    // VALIDACIONES
    // ==========================================

    validateEventData(eventData) {
        const errors = [];

        if (!eventData.titulo || eventData.titulo.trim().length < 3) {
            errors.push('El título debe tener al menos 3 caracteres');
        }

        if (!eventData.descripcion || eventData.descripcion.trim().length < 10) {
            errors.push('La descripción debe tener al menos 10 caracteres');
        }

        if (!eventData.fecha) {
            errors.push('La fecha es requerida');
        } else {
            const eventDate = new Date(eventData.fecha);
            const now = new Date();
            if (eventDate <= now) {
                errors.push('La fecha debe ser futura');
            }
        }

        if (!eventData.hora) {
            errors.push('La hora es requerida');
        }

        if (!eventData.ubicacion || eventData.ubicacion.trim().length < 3) {
            errors.push('La ubicación debe tener al menos 3 caracteres');
        }

        if (!eventData.capacidad || eventData.capacidad < 1) {
            errors.push('La capacidad debe ser mayor a 0');
        }

        if (!eventData.categoria || eventData.categoria.trim().length < 2) {
            errors.push('La categoría es requerida');
        }

        if (eventData.precio < 0) {
            errors.push('El precio no puede ser negativo');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // ==========================================
    // EXPORTACIÓN DE DATOS
    // ==========================================

    exportEventsToCSV(events = null) {
        const eventsToExport = events || this.cache.events || [];
        
        if (eventsToExport.length === 0) {
            throw new Error('No hay eventos para exportar');
        }

        const headers = ['ID', 'Título', 'Descripción', 'Fecha', 'Hora', 'Ubicación', 'Capacidad', 'Inscritos', 'Categoría', 'Organizador', 'Precio', 'Estado'];
        
        const csvContent = [
            headers.join(','),
            ...eventsToExport.map(event => [
                event.id,
                `"${event.titulo}"`,
                `"${event.descripcion}"`,
                event.fecha,
                event.hora,
                `"${event.ubicacion}"`,
                event.capacidad,
                event.inscritos,
                `"${event.categoria}"`,
                `"${event.organizador}"`,
                event.precio,
                event.estado
            ].join(','))
        ].join('\n');

        return csvContent;
    }

    downloadEventsCSV(events = null, filename = 'eventos.csv') {
        try {
            const csvContent = this.exportEventsToCSV(events);
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', filename);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (error) {
            console.error('Error exportando eventos:', error);
            throw error;
        }
    }

    // ==========================================
    // FUNCIONES DE DESARROLLO/DEBUG
    // ==========================================

    getDebugInfo() {
        return {
            config: this.config,
            cache: {
                hasEvents: !!this.cache.events,
                eventCount: this.cache.events?.length || 0,
                hasCategories: !!this.cache.categories,
                categoryCount: this.cache.categories?.length || 0,
                lastUpdate: this.cache.lastUpdate ? new Date(this.cache.lastUpdate).toISOString() : null,
                cacheValid: this.isCacheValid()
            },
            listeners: Object.keys(this.listeners).reduce((acc, key) => {
                acc[key] = this.listeners[key].length;
                return acc;
            }, {}),
            stats: this.getEventStats()
        };
    }

    generateMockEvents(count = 10) {
        const categories = ['Tecnología', 'Marketing', 'Networking', 'Educación', 'Salud', 'Entretenimiento', 'Deportes', 'Arte'];
        const locations = ['Centro de Convenciones', 'Aula Virtual', 'Hotel Business', 'Campus Universidad', 'Auditorio Principal', 'Sala de Conferencias', 'Centro Cultural'];
        const organizers = ['TechCorp', 'DevAcademy', 'Business Network', 'Universidad Tech', 'Marketing Pro', 'Health Institute', 'Cultural Center'];

        const mockEvents = [];
        
        for (let i = 1; i <= count; i++) {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 90) + 1); // 1-90 días en el futuro
            
            mockEvents.push({
                id: Date.now() + i,
                titulo: `Evento Mock ${i}`,
                descripcion: `Descripción detallada del evento mock número ${i}. Este es un evento generado automáticamente para pruebas.`,
                fecha: futureDate.toISOString().split('T')[0],
                hora: `${9 + Math.floor(Math.random() * 8)}:${Math.random() < 0.5 ? '00' : '30'}`,
                ubicacion: locations[Math.floor(Math.random() * locations.length)],
                capacidad: 20 + Math.floor(Math.random() * 180), // 20-200
                inscritos: Math.floor(Math.random() * 50),
                categoria: categories[Math.floor(Math.random() * categories.length)],
                organizador: organizers[Math.floor(Math.random() * organizers.length)],
                precio: Math.random() < 0.3 ? 0 : Math.floor(Math.random() * 200) + 10, // 30% gratis, resto 10-210
                estado: Math.random() < 0.9 ? 'activo' : 'completo',
                imagen: `https://via.placeholder.com/400x200?text=Evento+${i}`
            });
        }

        return mockEvents;
    }

    addMockEventsToCache(count = 10) {
        const mockEvents = this.generateMockEvents(count);
        
        if (this.cache.events) {
            this.cache.events.push(...mockEvents);
        } else {
            this.cache.events = mockEvents;
        }
        
        this.cache.lastUpdate = Date.now();
        console.log(`✅ Agregados ${count} eventos mock al cache`);
        
        return mockEvents;
    }
}

// ==========================================
// INSTANCIA GLOBAL
// ==========================================

const eventsManager = new EventsManager();

// Exportar para uso en otros archivos
window.eventsManager = eventsManager;
window.events = eventsManager; // Alias más corto

// Para entornos que soporten módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = eventsManager;
}

// ==========================================
// HELPERS GLOBALES
// ==========================================

// Función para obtener eventos
async function getEvents(filters = {}) {
    return await eventsManager.getEvents(filters);
}

// Función para inscribirse a un evento
async function registerForEvent(eventId) {
    return await eventsManager.registerForEvent(eventId);
}

// Función para cancelar inscripción
async function unregisterFromEvent(eventId) {
    return await eventsManager.unregisterFromEvent(eventId);
}

// Función para obtener categorías
async function getEventCategories() {
    return await eventsManager.getCategories();
}

// Función para buscar eventos
function searchEvents(query, events = null) {
    return eventsManager.searchEvents(query, events);
}

// Función para obtener estadísticas
function getEventStats(events = null) {
    return eventsManager.getEventStats(events);
}

// ==========================================
// FUNCIONES DE UTILIDAD PARA DEBUG
// ==========================================

// Función para obtener información de debug
function getEventsDebugInfo() {
    return eventsManager.getDebugInfo();
}

// Función para generar eventos de prueba
function addMockEvents(count = 10) {
    return eventsManager.addMockEventsToCache(count);
}

// Función para limpiar cache
function clearEventsCache() {
    eventsManager.clearCache();
}

// Función para refrescar eventos
async function refreshEvents() {
    return await eventsManager.refreshEvents();
}

// Exportar funciones de utilidad
window.getEvents = getEvents;
window.registerForEvent = registerForEvent;
window.unregisterFromEvent = unregisterFromEvent;
window.getEventCategories = getEventCategories;
window.searchEvents = searchEvents;
window.getEventStats = getEventStats;
window.getEventsDebugInfo = getEventsDebugInfo;
window.addMockEvents = addMockEvents;
window.clearEventsCache = clearEventsCache;
window.refreshEvents = refreshEvents;

console.log('📅 Sistema de Eventos cargado correctamente');