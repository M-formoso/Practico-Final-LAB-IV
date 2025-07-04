// ==========================================
// ADMIN DASHBOARD - admin-dashboard.js
// ==========================================

class AdminDashboard {
    constructor() {
        this.currentSection = 'dashboard';
        this.currentEditingEvent = null;
        this.currentEditingCategory = null;
        this.eventsData = [];
        this.categoriesData = [];
        this.isLoading = false;
        this.config = {
            DEVELOPMENT_MODE: false, // ← CAMBIADO A PRODUCCIÓN
            API_BASE_URL: 'http://localhost:8001' // ← URL CORREGIDA
        };
    }

    // ==========================================
    // INICIALIZACIÓN
    // ==========================================

    async init() {
        try {
            console.log('🔧 Inicializando Admin Dashboard...');
            
            // Verificar autenticación como administrador
            await this.requireAuth(['Administrador']);
            
            this.setupUI();
            this.setupEventListeners();
            await this.loadInitialData();
            
            console.log('✅ Admin Dashboard inicializado correctamente');
        } catch (error) {
            console.error('❌ Error inicializando admin dashboard:', error);
            this.redirectToLogin();
        }
    }

    async requireAuth(allowedRoles = []) {
        try {
            if (typeof auth === 'undefined') {
                throw new Error('Sistema de autenticación no disponible');
            }
            
            return await auth.requireAuth(allowedRoles);
        } catch (error) {
            console.error('Error en autenticación:', error);
            this.redirectToLogin();
            throw error;
        }
    }

    redirectToLogin() {
        window.location.href = 'login.html';
    }

    setupUI() {
        const user = this.getCurrentUser();
        if (user) {
            // Configurar información del usuario
            document.getElementById('userName').textContent = user.nombre || 'Administrador';
            document.getElementById('welcomeUser').textContent = user.nombre || 'Administrador';
            document.getElementById('profileName').value = user.nombre || '';
            document.getElementById('profileEmail').value = user.email || '';
            
            // Configurar avatar si existe
            if (user.avatar) {
                document.getElementById('userAvatar').src = user.avatar;
            }
        }
    }

    getCurrentUser() {
        if (typeof auth !== 'undefined') {
            return auth.getCurrentUser();
        }
        
        // Fallback si auth.js no está disponible
        try {
            const userData = localStorage.getItem('userData');
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            return null;
        }
    }

    // ==========================================
    // EVENT LISTENERS
    // ==========================================

    setupEventListeners() {
        // Navegación entre secciones
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                this.switchSection(section);
            });
        });

        // Botones de creación
        const createEventBtn = document.getElementById('createEventBtn');
        const addEventBtn = document.getElementById('addEventBtn');
        const addCategoryBtn = document.getElementById('addCategoryBtn');

        if (createEventBtn) createEventBtn.addEventListener('click', () => this.openEventModal());
        if (addEventBtn) addEventBtn.addEventListener('click', () => this.openEventModal());
        if (addCategoryBtn) addCategoryBtn.addEventListener('click', () => this.openCategoryModal());
        
        // Modales
        const closeModal = document.getElementById('closeModal');
        const cancelBtn = document.getElementById('cancelBtn');
        
        if (closeModal) closeModal.addEventListener('click', () => this.closeEventModal());
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeEventModal());

        // Formularios
        const eventForm = document.getElementById('eventForm');
        const categoryForm = document.getElementById('categoryForm');
        
        if (eventForm) eventForm.addEventListener('submit', (e) => this.handleEventSubmit(e));
        if (categoryForm) categoryForm.addEventListener('submit', (e) => this.handleCategorySubmit(e));

        // Filtros de eventos
        const searchEvents = document.getElementById('searchEvents');
        const filterStatus = document.getElementById('filterStatus');
        const filterCategory = document.getElementById('filterCategory');
        const filterDate = document.getElementById('filterDate');

        if (searchEvents) searchEvents.addEventListener('input', () => this.filterEvents());
        if (filterStatus) filterStatus.addEventListener('change', () => this.filterEvents());
        if (filterCategory) filterCategory.addEventListener('change', () => this.filterEvents());
        if (filterDate) filterDate.addEventListener('change', () => this.filterEvents());

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());

        // Perfil
        const saveProfileBtn = document.getElementById('saveProfileBtn');
        if (saveProfileBtn) saveProfileBtn.addEventListener('click', () => this.saveProfile());

        // Cerrar modales al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                if (e.target.id === 'eventModal') {
                    this.closeEventModal();
                } else if (e.target.id === 'categoryModal') {
                    this.closeCategoryModal();
                }
            }
        });
    }

    // ==========================================
    // CARGA DE DATOS INICIAL
    // ==========================================

    async loadInitialData() {
        this.showLoading();
        try {
            await Promise.all([
                this.loadDashboardStats(),
                this.loadCategories()
            ]);
        } catch (error) {
            console.error('Error cargando datos iniciales:', error);
            this.showToast('Error al cargar datos del dashboard', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async loadDashboardStats() {
        try {
            console.log('📊 Cargando estadísticas del dashboard...');
            
            // Usar la API real
            const response = await api.getDashboardStats();
            
            console.log('📊 Respuesta recibida:', response);
            
            if (response && response.data) {
                console.log('✅ Actualizando dashboard con datos reales:', response.data);
                this.updateDashboardStats(response.data);
            } else {
                console.warn('⚠️ Respuesta sin datos válidos');
                throw new Error('No se recibieron datos válidos');
            }
        } catch (error) {
            console.error('❌ Error cargando estadísticas:', error);
            
            // Si falla la API, usar datos de fallback
            const fallbackStats = {
                total_events: 0,
                active_inscriptions: 0,
                average_rating: 0,
                popular_event: {
                    title: "Error al cargar",
                    id: null
                }
            };
            
            this.updateDashboardStats(fallbackStats);
            this.showToast('Error al cargar estadísticas del servidor. Mostrando datos por defecto.', 'warning');
        }
    }

    updateDashboardStats(stats) {
        console.log('🔄 Actualizando elementos del dashboard con:', stats);
        
        const totalEventsEl = document.getElementById('totalEvents');
        const totalActiveRegistrationsEl = document.getElementById('totalActiveRegistrations');
        const avgUsersPerEventEl = document.getElementById('avgUsersPerEvent');
        const topEventEl = document.getElementById('topEvent');

        if (totalEventsEl) {
            const totalEvents = stats.total_events || stats.total_eventos || 0;
            totalEventsEl.textContent = totalEvents;
            console.log('✅ Total events actualizado:', totalEvents);
        }
        
        if (totalActiveRegistrationsEl) {
            const activeInscriptions = stats.active_inscriptions || stats.inscripciones_activas || 0;
            totalActiveRegistrationsEl.textContent = activeInscriptions;
            console.log('✅ Active inscriptions actualizado:', activeInscriptions);
        }
        
        if (avgUsersPerEventEl) {
            const avg = stats.average_rating || stats.promedio_usuarios || 0;
            avgUsersPerEventEl.textContent = Number(avg).toFixed(1);
            console.log('✅ Average rating actualizado:', avg);
        }
        
        if (topEventEl) {
            const eventName = stats.popular_event?.title || stats.evento_mas_popular || 'Sin datos';
            topEventEl.textContent = eventName;
            console.log('✅ Top event actualizado:', eventName);
        }
        
        console.log('🎯 Dashboard actualizado completamente');
    }

    // ==========================================
    // NAVEGACIÓN ENTRE SECCIONES
    // ==========================================

    switchSection(sectionName) {
        console.log(`🔄 Cambiando a sección: ${sectionName}`);

        // Ocultar todas las secciones
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        // Mostrar la sección seleccionada
        const targetSection = document.getElementById(sectionName + '-section');
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Actualizar navegación
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeNavLink = document.querySelector(`[data-section="${sectionName}"]`);
        if (activeNavLink) {
            activeNavLink.classList.add('active');
        }

        this.currentSection = sectionName;

        // Cargar datos específicos de la sección
        switch (sectionName) {
            case 'events':
                this.loadEvents();
                break;
            case 'categories':
                this.loadCategories();
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
        }
    }

    // ==========================================
    // GESTIÓN DE EVENTOS
    // ==========================================

    async loadEvents() {
        this.showLoading();
        try {
            console.log('📅 Cargando eventos...');
            
            // Usar la API real
            const response = await api.getEvents();
            
            if (response && response.data) {
                this.eventsData = Array.isArray(response.data) ? response.data : [];
                console.log('✅ Eventos cargados:', this.eventsData.length);
            } else {
                this.eventsData = [];
            }
            
            this.renderEventsTable(this.eventsData);
        } catch (error) {
            console.error('❌ Error cargando eventos:', error);
            this.eventsData = [];
            this.renderEventsTable(this.eventsData);
            this.showToast('Error al cargar eventos del servidor', 'error');
        } finally {
            this.hideLoading();
        }
    }

    renderEventsTable(events) {
        const tbody = document.getElementById('eventsTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (events.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 2rem; color: #666;">
                        <i class="fas fa-calendar-times" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>
                        No hay eventos disponibles
                    </td>
                </tr>
            `;
            return;
        }

        events.forEach(event => {
            const row = document.createElement('tr');
            const status = this.getEventStatus(event.fecha_inicio, event.fecha_fin);
            const statusClass = `status-${status.toLowerCase().replace(' ', '-')}`;
            
            row.innerHTML = `
                <td>
                    <strong>${event.nombre || event.titulo || 'Sin nombre'}</strong>
                    <br>
                    <small style="color: #666;">${event.descripcion ? this.truncateText(event.descripcion, 50) : ''}</small>
                </td>
                <td>${event.categoria?.nombre || 'Sin categoría'}</td>
                <td>${this.formatDate(event.fecha_inicio || event.fecha)}</td>
                <td>${this.formatDate(event.fecha_fin || event.fecha)}</td>
                <td>${event.lugar || event.ubicacion || 'Sin ubicación'}</td>
                <td>${event.cupos || event.capacidad || 0}</td>
                <td>${event.inscripciones?.length || event.inscritos || 0}</td>
                <td><span class="status-badge ${statusClass}">${status}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-edit" onclick="adminDashboard.editEvent(${event.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="adminDashboard.deleteEvent(${event.id})" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    filterEvents() {
        const searchTerm = (document.getElementById('searchEvents')?.value || '').toLowerCase();
        const statusFilter = document.getElementById('filterStatus')?.value || '';
        const categoryFilter = document.getElementById('filterCategory')?.value || '';
        const dateFilter = document.getElementById('filterDate')?.value || '';

        let filteredEvents = this.eventsData.filter(event => {
            // Filtro por búsqueda
            const eventName = event.nombre || event.titulo || '';
            const eventDesc = event.descripcion || '';
            const matchesSearch = eventName.toLowerCase().includes(searchTerm) ||
                                eventDesc.toLowerCase().includes(searchTerm);
            
            // Filtro por estado
            const eventStatus = this.getEventStatus(event.fecha_inicio || event.fecha, event.fecha_fin || event.fecha).toLowerCase();
            const matchesStatus = !statusFilter || eventStatus.includes(statusFilter);
            
            // Filtro por categoría
            const matchesCategory = !categoryFilter || event.categoria_id == categoryFilter;
            
            // Filtro por fecha
            const eventDate = event.fecha_inicio || event.fecha;
            const eventEndDate = event.fecha_fin || event.fecha;
            const matchesDate = !dateFilter || 
                              (eventDate <= dateFilter && eventEndDate >= dateFilter);

            return matchesSearch && matchesStatus && matchesCategory && matchesDate;
        });

        this.renderEventsTable(filteredEvents);
    }

    // ==========================================
    // GESTIÓN DE CATEGORÍAS
    // ==========================================

    async loadCategories() {
        try {
            console.log('🏷️ Cargando categorías...');
            
            // Usar la API real para categorías
            const response = await api.get('/categories');
            
            if (response && response.data) {
                this.categoriesData = Array.isArray(response.data) ? response.data : [];
                console.log('✅ Categorías cargadas:', this.categoriesData.length);
            } else {
                // Si no hay endpoint de categorías, usar datos por defecto
                this.categoriesData = [
                    { id: 1, nombre: "Tecnología", descripcion: "Eventos de tecnología e innovación" },
                    { id: 2, nombre: "Educación", descripcion: "Eventos educativos y académicos" },
                    { id: 3, nombre: "Negocios", descripcion: "Eventos de negocios y emprendimiento" },
                    { id: 4, nombre: "Entretenimiento", descripcion: "Eventos de entretenimiento y cultura" }
                ];
            }
            
            this.renderCategoriesTable(this.categoriesData);
            this.updateCategorySelects(this.categoriesData);
        } catch (error) {
            console.error('❌ Error cargando categorías:', error);
            
            // Usar categorías por defecto en caso de error
            this.categoriesData = [
                { id: 1, nombre: "Tecnología", descripcion: "Eventos de tecnología e innovación" },
                { id: 2, nombre: "Educación", descripcion: "Eventos educativos y académicos" },
                { id: 3, nombre: "Negocios", descripcion: "Eventos de negocios y emprendimiento" },
                { id: 4, nombre: "Entretenimiento", descripcion: "Eventos de entretenimiento y cultura" }
            ];
            
            this.renderCategoriesTable(this.categoriesData);
            this.updateCategorySelects(this.categoriesData);
            this.showToast('Usando categorías por defecto', 'info');
        }
    }

    renderCategoriesTable(categories) {
        const tbody = document.getElementById('categoriesTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (categories.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 2rem; color: #666;">
                        <i class="fas fa-tags" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>
                        No hay categorías disponibles
                    </td>
                </tr>
            `;
            return;
        }

        categories.forEach(category => {
            const row = document.createElement('tr');
            const eventCount = this.eventsData.filter(e => e.categoria_id === category.id).length;
            
            row.innerHTML = `
                <td><strong>${category.nombre}</strong></td>
                <td>${category.descripcion || 'Sin descripción'}</td>
                <td>${eventCount}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-edit" onclick="adminDashboard.editCategory(${category.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="adminDashboard.deleteCategory(${category.id})" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    updateCategorySelects(categories) {
        const selects = [
            document.getElementById('filterCategory'),
            document.getElementById('eventCategory')
        ];

        selects.forEach(select => {
            if (!select) return;
            
            // Guardar el valor actual
            const currentValue = select.value;
            
            // Limpiar opciones existentes (excepto la primera)
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }

            // Agregar categorías
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.nombre;
                select.appendChild(option);
            });
            
            // Restaurar el valor si aún existe
            if (currentValue) {
                select.value = currentValue;
            }
        });
    }

    // ==========================================
    // MODALES Y FORMULARIOS (SIMPLIFICADOS)
    // ==========================================

    openEventModal(eventId = null) {
        const modal = document.getElementById('eventModal');
        if (modal) {
            modal.classList.add('active');
        }
    }

    closeEventModal() {
        const modal = document.getElementById('eventModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    openCategoryModal(categoryId = null) {
        const modal = document.getElementById('categoryModal');
        if (modal) {
            modal.classList.add('active');
        }
    }

    closeCategoryModal() {
        const modal = document.getElementById('categoryModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    async handleEventSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const eventData = {
            nombre: formData.get('nombre'),
            descripcion: formData.get('descripcion'),
            fecha_inicio: formData.get('fecha_inicio'),
            fecha_fin: formData.get('fecha_fin'),
            lugar: formData.get('lugar'),
            cupos: parseInt(formData.get('cupos')),
            categoria_id: parseInt(formData.get('categoria_id'))
        };

        console.log('📝 Enviando evento:', eventData);

        // Validación básica
        if (!this.validateEventData(eventData)) {
            return;
        }

        try {
            this.showLoading();
            console.log('🚀 Creando evento...');

            // Llamar a la API real
            const response = await api.post('/events/', eventData);
            
            if (response && response.ok) {
                console.log('✅ Evento creado exitosamente:', response.data);
                this.showToast('Evento creado exitosamente', 'success');
                
                // Cerrar modal y recargar datos
                this.closeEventModal();
                await this.loadEvents();
                await this.loadDashboardStats();
            } else {
                throw new Error(response?.data?.detail || 'Error al crear evento');
            }
        } catch (error) {
            console.error('❌ Error creando evento:', error);
            this.showToast(error.message || 'Error al crear evento', 'error');
        } finally {
            this.hideLoading();
        }
    }

    validateEventData(eventData) {
        const errors = [];

        if (!eventData.nombre || eventData.nombre.trim().length < 3) {
            errors.push('El nombre del evento debe tener al menos 3 caracteres');
        }

        if (!eventData.fecha_inicio) {
            errors.push('La fecha de inicio es requerida');
        }

        if (!eventData.fecha_fin) {
            errors.push('La fecha de fin es requerida');
        }

        if (eventData.fecha_inicio && eventData.fecha_fin && eventData.fecha_inicio > eventData.fecha_fin) {
            errors.push('La fecha de inicio no puede ser posterior a la fecha de fin');
        }

        if (!eventData.lugar || eventData.lugar.trim().length < 3) {
            errors.push('El lugar debe tener al menos 3 caracteres');
        }

        if (!eventData.cupos || eventData.cupos < 1) {
            errors.push('Los cupos deben ser al menos 1');
        }

        if (!eventData.categoria_id) {
            errors.push('Debe seleccionar una categoría');
        }

        if (errors.length > 0) {
            this.showToast(errors.join('. '), 'error');
            return false;
        }

        return true;
    }

    async handleCategorySubmit(e) {
        e.preventDefault();
        this.showToast('Función de crear/editar categorías en desarrollo', 'info');
    }

    editEvent(eventId) {
        this.openEventModal(eventId);
    }

    async deleteEvent(eventId) {
        if (confirm('¿Estás seguro de que deseas eliminar este evento?')) {
            this.showToast('Función de eliminar eventos en desarrollo', 'info');
        }
    }

    editCategory(categoryId) {
        this.openCategoryModal(categoryId);
    }

    async deleteCategory(categoryId) {
        if (confirm('¿Estás seguro de que deseas eliminar esta categoría?')) {
            this.showToast('Función de eliminar categorías en desarrollo', 'info');
        }
    }

    // ==========================================
    // ANALYTICS Y PERFIL
    // ==========================================

    async loadAnalytics() {
        console.log('📊 Cargando analytics...');
        this.showToast('Analytics en desarrollo', 'info');
    }

    async saveProfile() {
        this.showToast('Función de guardar perfil en desarrollo', 'info');
    }

    // ==========================================
    // UTILIDADES Y HELPERS
    // ==========================================

    getEventStatus(startDate, endDate) {
        if (!startDate) return 'Desconocido';
        
        const now = new Date();
        const start = new Date(startDate);
        const end = endDate ? new Date(endDate) : start;

        if (now < start) return 'Próximo';
        if (now >= start && now <= end) return 'En Curso';
        if (now > end) return 'Completado';
        return 'Desconocido';
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-AR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        } catch {
            return dateString;
        }
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        return text.length <= maxLength ? text : text.substring(0, maxLength) + '...';
    }

    logout() {
        if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
            if (typeof auth !== 'undefined') {
                auth.logout();
            } else {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = 'login.html';
            }
        }
    }

    // ==========================================
    // UI FEEDBACK
    // ==========================================

    showLoading() {
        this.isLoading = true;
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.style.display = 'flex';
        }
    }

    hideLoading() {
        this.isLoading = false;
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.style.display = 'none';
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) {
            console.log(`Toast ${type}: ${message}`);
            return;
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        toast.innerHTML = `
            <i class="${icons[type] || icons.info}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 5000);

        toast.addEventListener('click', () => {
            toast.remove();
        });
    }
}

// ==========================================
// INICIALIZACIÓN AUTOMÁTICA
// ==========================================

let adminDashboard = null;

document.addEventListener('DOMContentLoaded', function() {
    if (!window.location.pathname.includes('admin-dashboard')) {
        return;
    }

    console.log('🔧 Iniciando Admin Dashboard...');

    if (typeof auth === 'undefined') {
        console.error('❌ auth.js debe cargarse antes que admin-dashboard.js');
        return;
    }

    // Inicializar dashboard
    setTimeout(() => {
        adminDashboard = new AdminDashboard();
        adminDashboard.init();
        window.adminDashboard = adminDashboard;
    }, 1000);
});

// ==========================================
// FUNCIONES GLOBALES PARA HTML
// ==========================================

window.switchSection = function(section) {
    if (adminDashboard) {
        adminDashboard.switchSection(section);
    }
};

window.closeEventModal = function() {
    if (adminDashboard) {
        adminDashboard.closeEventModal();
    }
};

window.closeCategoryModal = function() {
    if (adminDashboard) {
        adminDashboard.closeCategoryModal();
    }
};

// ==========================================
// ESTILOS ADICIONALES
// ==========================================

const adminStyles = document.createElement('style');
adminStyles.textContent = `
    .status-próximo { background: #e3f2fd; color: #1976d2; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.8rem; font-weight: 500; }
    .status-en-curso { background: #e8f5e8; color: #388e3c; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.8rem; font-weight: 500; }
    .status-completado { background: #f3e5f5; color: #7b1fa2; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.8rem; font-weight: 500; }
    .status-desconocido { background: #f5f5f5; color: #666; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.8rem; font-weight: 500; }

    .action-buttons {
        display: flex;
        gap: 0.5rem;
        justify-content: center;
    }

    .btn-icon {
        background: none;
        border: none;
        padding: 0.5rem;
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.3s ease;
        color: #666;
    }

    .btn-edit { color: #2196f3; }
    .btn-delete { color: #f44336; }

    .btn-icon:hover {
        background: rgba(0, 0, 0, 0.1);
        transform: scale(1.1);
    }

    .toast {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: #333;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        margin-bottom: 1rem;
        animation: slideInToast 0.3s ease;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .toast.success { background: #4caf50; }
    .toast.error { background: #f44336; }
    .toast.warning { background: #ff9800; }
    .toast.info { background: #2196f3; }

    @keyframes slideInToast {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }

    .modal.active {
        display: flex !important;
        align-items: center;
        justify-content: center;
    }

    #loadingSpinner {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    }

    .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;

document.head.appendChild(adminStyles);

console.log('📊 Admin Dashboard System configurado para producción');