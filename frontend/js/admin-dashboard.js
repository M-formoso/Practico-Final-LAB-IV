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
            DEVELOPMENT_MODE: true, // Cambiar a false para usar API real
            API_BASE_URL: 'http://localhost:8000/api'
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
            if (this.config.DEVELOPMENT_MODE) {
                // Datos simulados para desarrollo
                const mockStats = {
                    total_eventos: 15,
                    inscripciones_activas: 127,
                    promedio_usuarios: 8.5,
                    evento_mas_popular: 'Conferencia Tech 2024'
                };
                this.updateDashboardStats(mockStats);
                return;
            }

            // Llamada real a la API
            const response = await this.makeAuthenticatedRequest('/dashboard/stats');
            if (response.ok) {
                const stats = await response.json();
                this.updateDashboardStats(stats);
            } else {
                throw new Error('Error al cargar estadísticas');
            }
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
            this.showToast('Error al cargar estadísticas', 'error');
        }
    }

    updateDashboardStats(stats) {
        const totalEventsEl = document.getElementById('totalEvents');
        const totalActiveRegistrationsEl = document.getElementById('totalActiveRegistrations');
        const avgUsersPerEventEl = document.getElementById('avgUsersPerEvent');
        const topEventEl = document.getElementById('topEvent');

        if (totalEventsEl) totalEventsEl.textContent = stats.total_eventos || 0;
        if (totalActiveRegistrationsEl) totalActiveRegistrationsEl.textContent = stats.inscripciones_activas || 0;
        if (avgUsersPerEventEl) avgUsersPerEventEl.textContent = (stats.promedio_usuarios || 0).toFixed(1);
        if (topEventEl) topEventEl.textContent = stats.evento_mas_popular || '-';
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
            if (this.config.DEVELOPMENT_MODE) {
                // Datos simulados para desarrollo
                this.eventsData = [
                    {
                        id: 1,
                        nombre: "Conferencia de Tecnología 2024",
                        descripcion: "La conferencia más importante del año sobre innovación tecnológica",
                        fecha_inicio: "2024-12-15",
                        fecha_fin: "2024-12-17",
                        lugar: "Centro de Convenciones Capital",
                        cupos: 200,
                        categoria_id: 1,
                        categoria: { id: 1, nombre: "Tecnología" },
                        inscripciones: Array(127).fill({})
                    },
                    {
                        id: 2,
                        nombre: "Workshop de Programación Web",
                        descripcion: "Aprende las últimas técnicas de desarrollo web",
                        fecha_inicio: "2024-12-20",
                        fecha_fin: "2024-12-20",
                        lugar: "Universidad Nacional",
                        cupos: 50,
                        categoria_id: 2,
                        categoria: { id: 2, nombre: "Educación" },
                        inscripciones: Array(35).fill({})
                    },
                    {
                        id: 3,
                        nombre: "Seminario de Marketing Digital",
                        descripcion: "Estrategias efectivas para el marketing online",
                        fecha_inicio: "2024-12-25",
                        fecha_fin: "2024-12-25",
                        lugar: "Hotel Plaza",
                        cupos: 80,
                        categoria_id: 3,
                        categoria: { id: 3, nombre: "Negocios" },
                        inscripciones: Array(15).fill({})
                    }
                ];
            } else {
                const response = await this.makeAuthenticatedRequest('/eventos');
                if (response.ok) {
                    this.eventsData = await response.json();
                } else {
                    throw new Error('Error al cargar eventos');
                }
            }
            
            this.renderEventsTable(this.eventsData);
        } catch (error) {
            console.error('Error cargando eventos:', error);
            this.showToast('Error al cargar eventos', 'error');
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
                    <strong>${event.nombre}</strong>
                    <br>
                    <small style="color: #666;">${event.descripcion ? this.truncateText(event.descripcion, 50) : ''}</small>
                </td>
                <td>${event.categoria?.nombre || 'Sin categoría'}</td>
                <td>${this.formatDate(event.fecha_inicio)}</td>
                <td>${this.formatDate(event.fecha_fin)}</td>
                <td>${event.lugar}</td>
                <td>${event.cupos}</td>
                <td>${event.inscripciones?.length || 0}</td>
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
            const matchesSearch = event.nombre.toLowerCase().includes(searchTerm) ||
                                (event.descripcion || '').toLowerCase().includes(searchTerm);
            
            // Filtro por estado
            const eventStatus = this.getEventStatus(event.fecha_inicio, event.fecha_fin).toLowerCase();
            const matchesStatus = !statusFilter || eventStatus.includes(statusFilter);
            
            // Filtro por categoría
            const matchesCategory = !categoryFilter || event.categoria_id == categoryFilter;
            
            // Filtro por fecha
            const matchesDate = !dateFilter || 
                              (event.fecha_inicio <= dateFilter && event.fecha_fin >= dateFilter);

            return matchesSearch && matchesStatus && matchesCategory && matchesDate;
        });

        this.renderEventsTable(filteredEvents);
    }

    // ==========================================
    // MODALES DE EVENTOS
    // ==========================================

    openEventModal(eventId = null) {
        this.currentEditingEvent = eventId;
        const modal = document.getElementById('eventModal');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('eventForm');

        if (!modal || !title || !form) return;

        if (eventId) {
            title.textContent = 'Editar Evento';
            const event = this.eventsData.find(e => e.id === eventId);
            if (event) {
                document.getElementById('eventName').value = event.nombre || '';
                document.getElementById('eventDescription').value = event.descripcion || '';
                document.getElementById('eventStartDate').value = event.fecha_inicio || '';
                document.getElementById('eventEndDate').value = event.fecha_fin || '';
                document.getElementById('eventLocation').value = event.lugar || '';
                document.getElementById('eventCapacity').value = event.cupos || '';
                document.getElementById('eventCategory').value = event.categoria_id || '';
            }
        } else {
            title.textContent = 'Crear Evento';
            form.reset();
        }

        modal.classList.add('active');
    }

    closeEventModal() {
        const modal = document.getElementById('eventModal');
        const form = document.getElementById('eventForm');
        
        if (modal) modal.classList.remove('active');
        if (form) form.reset();
        
        this.currentEditingEvent = null;
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

        // Validación básica
        if (!this.validateEventData(eventData)) {
            return;
        }

        try {
            this.showLoading();

            if (this.config.DEVELOPMENT_MODE) {
                // Simular guardado en desarrollo
                await this.delay(1000);
                
                if (this.currentEditingEvent) {
                    // Actualizar evento existente
                    const index = this.eventsData.findIndex(e => e.id === this.currentEditingEvent);
                    if (index !== -1) {
                        this.eventsData[index] = { 
                            ...this.eventsData[index], 
                            ...eventData,
                            categoria: this.categoriesData.find(c => c.id === eventData.categoria_id)
                        };
                    }
                    this.showToast('Evento actualizado exitosamente', 'success');
                } else {
                    // Crear nuevo evento
                    const newEvent = {
                        id: Math.max(...this.eventsData.map(e => e.id), 0) + 1,
                        ...eventData,
                        categoria: this.categoriesData.find(c => c.id === eventData.categoria_id),
                        inscripciones: []
                    };
                    this.eventsData.push(newEvent);
                    this.showToast('Evento creado exitosamente', 'success');
                }
                
                this.renderEventsTable(this.eventsData);
                await this.loadDashboardStats(); // Actualizar estadísticas
            } else {
                // Llamada real a la API
                const url = this.currentEditingEvent ? 
                    `/eventos/${this.currentEditingEvent}` : 
                    '/eventos';
                
                const method = this.currentEditingEvent ? 'PUT' : 'POST';

                const response = await this.makeAuthenticatedRequest(url, {
                    method: method,
                    body: JSON.stringify(eventData)
                });

                if (response.ok) {
                    this.showToast(
                        this.currentEditingEvent ? 'Evento actualizado exitosamente' : 'Evento creado exitosamente',
                        'success'
                    );
                    await this.loadEvents();
                    await this.loadDashboardStats();
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || 'Error al procesar evento');
                }
            }
            
            this.closeEventModal();
        } catch (error) {
            console.error('Error guardando evento:', error);
            this.showToast(error.message || 'Error al guardar evento', 'error');
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

    editEvent(eventId) {
        this.openEventModal(eventId);
    }

    async deleteEvent(eventId) {
        if (!confirm('¿Estás seguro de que deseas eliminar este evento? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            this.showLoading();

            if (this.config.DEVELOPMENT_MODE) {
                // Simular eliminación
                this.eventsData = this.eventsData.filter(e => e.id !== eventId);
                this.showToast('Evento eliminado exitosamente', 'success');
                this.renderEventsTable(this.eventsData);
                await this.loadDashboardStats();
            } else {
                const response = await this.makeAuthenticatedRequest(`/eventos/${eventId}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    this.showToast('Evento eliminado exitosamente', 'success');
                    await this.loadEvents();
                    await this.loadDashboardStats();
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || 'Error al eliminar evento');
                }
            }
        } catch (error) {
            console.error('Error eliminando evento:', error);
            this.showToast(error.message || 'Error al eliminar evento', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // ==========================================
    // GESTIÓN DE CATEGORÍAS
    // ==========================================

    async loadCategories() {
        try {
            if (this.config.DEVELOPMENT_MODE) {
                // Datos simulados para desarrollo
                this.categoriesData = [
                    { 
                        id: 1, 
                        nombre: "Tecnología", 
                        descripcion: "Eventos relacionados con tecnología e innovación",
                        eventos: []
                    },
                    { 
                        id: 2, 
                        nombre: "Educación", 
                        descripcion: "Eventos educativos y académicos",
                        eventos: []
                    },
                    { 
                        id: 3, 
                        nombre: "Negocios", 
                        descripcion: "Eventos de negocios y emprendimiento",
                        eventos: []
                    },
                    { 
                        id: 4, 
                        nombre: "Entretenimiento", 
                        descripcion: "Eventos de entretenimiento y cultura",
                        eventos: []
                    }
                ];
            } else {
                const response = await this.makeAuthenticatedRequest('/categorias');
                if (response.ok) {
                    this.categoriesData = await response.json();
                } else {
                    throw new Error('Error al cargar categorías');
                }
            }
            
            this.renderCategoriesTable(this.categoriesData);
            this.updateCategorySelects(this.categoriesData);
        } catch (error) {
            console.error('Error cargando categorías:', error);
            this.showToast('Error al cargar categorías', 'error');
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
            row.innerHTML = `
                <td><strong>${category.nombre}</strong></td>
                <td>${category.descripcion || 'Sin descripción'}</td>
                <td>${category.eventos?.length || 0}</td>
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

    openCategoryModal(categoryId = null) {
        this.currentEditingCategory = categoryId;
        const modal = document.getElementById('categoryModal');
        const title = document.getElementById('categoryModalTitle');
        const form = document.getElementById('categoryForm');

        if (!modal || !title || !form) return;

        if (categoryId) {
            title.textContent = 'Editar Categoría';
            const category = this.categoriesData.find(c => c.id === categoryId);
            if (category) {
                document.getElementById('categoryName').value = category.nombre || '';
                document.getElementById('categoryDescription').value = category.descripcion || '';
            }
        } else {
            title.textContent = 'Crear Categoría';
            form.reset();
        }

        modal.classList.add('active');
    }

    closeCategoryModal() {
        const modal = document.getElementById('categoryModal');
        const form = document.getElementById('categoryForm');
        
        if (modal) modal.classList.remove('active');
        if (form) form.reset();
        
        this.currentEditingCategory = null;
    }

    async handleCategorySubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const categoryData = {
            nombre: formData.get('nombre'),
            descripcion: formData.get('descripcion')
        };

        // Validación básica
        if (!categoryData.nombre || categoryData.nombre.trim().length < 2) {
            this.showToast('El nombre de la categoría debe tener al menos 2 caracteres', 'error');
            return;
        }

        try {
            this.showLoading();

            if (this.config.DEVELOPMENT_MODE) {
                // Simular guardado en desarrollo
                await this.delay(800);
                
                if (this.currentEditingCategory) {
                    // Actualizar categoría existente
                    const index = this.categoriesData.findIndex(c => c.id === this.currentEditingCategory);
                    if (index !== -1) {
                        this.categoriesData[index] = { 
                            ...this.categoriesData[index], 
                            ...categoryData 
                        };
                    }
                    this.showToast('Categoría actualizada exitosamente', 'success');
                } else {
                    // Crear nueva categoría
                    const newCategory = {
                        id: Math.max(...this.categoriesData.map(c => c.id), 0) + 1,
                        ...categoryData,
                        eventos: []
                    };
                    this.categoriesData.push(newCategory);
                    this.showToast('Categoría creada exitosamente', 'success');
                }
                
                this.renderCategoriesTable(this.categoriesData);
                this.updateCategorySelects(this.categoriesData);
            } else {
                // Llamada real a la API
                const url = this.currentEditingCategory ? 
                    `/categorias/${this.currentEditingCategory}` : 
                    '/categorias';
                
                const method = this.currentEditingCategory ? 'PUT' : 'POST';

                const response = await this.makeAuthenticatedRequest(url, {
                    method: method,
                    body: JSON.stringify(categoryData)
                });

                if (response.ok) {
                    this.showToast(
                        this.currentEditingCategory ? 'Categoría actualizada exitosamente' : 'Categoría creada exitosamente',
                        'success'
                    );
                    await this.loadCategories();
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || 'Error al procesar categoría');
                }
            }
            
            this.closeCategoryModal();
        } catch (error) {
            console.error('Error guardando categoría:', error);
            this.showToast(error.message || 'Error al guardar categoría', 'error');
        } finally {
            this.hideLoading();
        }
    }

    editCategory(categoryId) {
        this.openCategoryModal(categoryId);
    }

    async deleteCategory(categoryId) {
        if (!confirm('¿Estás seguro de que deseas eliminar esta categoría? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            this.showLoading();

            if (this.config.DEVELOPMENT_MODE) {
                // Verificar si la categoría tiene eventos asociados
                const categoryHasEvents = this.eventsData.some(e => e.categoria_id === categoryId);
                if (categoryHasEvents) {
                    this.showToast('No se puede eliminar una categoría que tiene eventos asociados', 'error');
                    return;
                }

                // Simular eliminación
                this.categoriesData = this.categoriesData.filter(c => c.id !== categoryId);
                this.showToast('Categoría eliminada exitosamente', 'success');
                this.renderCategoriesTable(this.categoriesData);
                this.updateCategorySelects(this.categoriesData);
            } else {
                const response = await this.makeAuthenticatedRequest(`/categorias/${categoryId}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    this.showToast('Categoría eliminada exitosamente', 'success');
                    await this.loadCategories();
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || 'Error al eliminar categoría');
                }
            }
        } catch (error) {
            console.error('Error eliminando categoría:', error);
            this.showToast(error.message || 'Error al eliminar categoría', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // ==========================================
    // ANALYTICS
    // ==========================================

    async loadAnalytics() {
        console.log('📊 Cargando analytics...');
        // TODO: Implementar carga de gráficos y reportes
        // Aquí puedes integrar librerías como Chart.js o D3.js
        this.showToast('Analytics en desarrollo', 'info');
    }

    // ==========================================
    // PERFIL DE USUARIO
    // ==========================================

    async saveProfile() {
        const nameEl = document.getElementById('profileName');
        const emailEl = document.getElementById('profileEmail');
        
        if (!nameEl || !emailEl) return;

        const userData = {
            nombre: nameEl.value.trim(),
            email: emailEl.value.trim()
        };

        // Validación básica
        if (!userData.nombre || userData.nombre.length < 2) {
            this.showToast('El nombre debe tener al menos 2 caracteres', 'error');
            return;
        }

        if (!this.isValidEmail(userData.email)) {
            this.showToast('Por favor ingresa un email válido', 'error');
            return;
        }

        try {
            this.showLoading();

            if (this.config.DEVELOPMENT_MODE) {
                // Simular actualización en desarrollo
                await this.delay(500);
                
                // Actualizar datos locales
                const currentUser = this.getCurrentUser();
                const updatedUser = { ...currentUser, ...userData };
                localStorage.setItem('userData', JSON.stringify(updatedUser));
                
                this.setupUI();
                this.showToast('Perfil actualizado exitosamente', 'success');
            } else {
                const response = await this.makeAuthenticatedRequest('/usuarios/perfil', {
                    method: 'PUT',
                    body: JSON.stringify(userData)
                });

                if (response.ok) {
                    const updatedUser = await response.json();
                    localStorage.setItem('userData', JSON.stringify(updatedUser));
                    this.setupUI();
                    this.showToast('Perfil actualizado exitosamente', 'success');
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || 'Error al actualizar perfil');
                }
            }
        } catch (error) {
            console.error('Error guardando perfil:', error);
            this.showToast(error.message || 'Error al actualizar perfil', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // ==========================================
    // UTILIDADES Y HELPERS
    // ==========================================

    async makeAuthenticatedRequest(endpoint, options = {}) {
        if (typeof auth !== 'undefined') {
            return await auth.makeAuthenticatedRequest(this.config.API_BASE_URL + endpoint, options);
        }

        // Fallback si auth.js no está disponible
        const token = localStorage.getItem('authToken');
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };

        return await fetch(this.config.API_BASE_URL + endpoint, {
            ...options,
            headers
        });
    }

    getEventStatus(startDate, endDate) {
        const now = new Date();
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (now < start) return 'Próximo';
        if (now >= start && now <= end) return 'En Curso';
        if (now > end) return 'Completado';
        return 'Desconocido';
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-AR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        return text.length <= maxLength ? text : text.substring(0, maxLength) + '...';
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    logout() {
        if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
            if (typeof auth !== 'undefined') {
                auth.logout();
            } else {
                // Fallback
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
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // Agregar icono según el tipo
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
        
        // Auto-remove después de 5 segundos
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 5000);

        // Agregar posibilidad de cerrar manualmente
        toast.addEventListener('click', () => {
            toast.remove();
        });
    }
}

// ==========================================
// INICIALIZACIÓN AUTOMÁTICA
// ==========================================

let adminDashboard = null;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Verificar que estamos en la página correcta
    if (!window.location.pathname.includes('admin-dashboard')) {
        return;
    }

    console.log('🔧 Iniciando Admin Dashboard...');

    // Verificar dependencias
    if (typeof auth === 'undefined') {
        console.error('❌ auth.js debe cargarse antes que admin-dashboard.js');
        return;
    }

    // Esperar a que auth.js verifique la autenticación
    window.addEventListener('authenticationVerified', function(event) {
        const authData = event.detail;
        
        if (authData.user.rol === 'Administrador') {
            adminDashboard = new AdminDashboard();
            adminDashboard.init();
            
            // Hacer disponible globalmente para debugging
            window.adminDashboard = adminDashboard;
        } else {
            console.error('❌ Acceso denegado: Usuario no es administrador');
            window.location.href = 'login.html';
        }
    });

    // Si auth.js aún no ha verificado, intentar verificar ahora
    if (typeof requireAuth === 'function') {
        requireAuth(['Administrador']).then(() => {
            if (!adminDashboard) {
                adminDashboard = new AdminDashboard();
                adminDashboard.init();
                window.adminDashboard = adminDashboard;
            }
        }).catch(error => {
            console.error('Error en autenticación:', error);
        });
    }
});

// ==========================================
// FUNCIONES GLOBALES PARA HTML
// ==========================================

// Estas funciones se llaman desde el HTML mediante onclick
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
// MANEJO DE ERRORES
// ==========================================

window.addEventListener('error', function(e) {
    console.error('Error en Admin Dashboard:', e.error);
    if (adminDashboard) {
        adminDashboard.showToast('Ha ocurrido un error inesperado', 'error');
    }
});

// ==========================================
// ESTILOS ADICIONALES
// ==========================================

const adminStyles = document.createElement('style');
adminStyles.textContent = `
    /* Estilos específicos para admin dashboard */
    .status-próximo { background: #e3f2fd; color: #1976d2; }
    .status-en-curso { background: #e8f5e8; color: #388e3c; }
    .status-completado { background: #f3e5f5; color: #7b1fa2; }
    .status-desconocido { background: #f5f5f5; color: #666; }

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

    @media (max-width: 768px) {
        .action-buttons {
            flex-direction: column;
            gap: 0.25rem;
        }
        
        .events-table {
            font-size: 0.8rem;
        }
        
        .events-table th,
        .events-table td {
            padding: 0.5rem;
        }
    }
`;

document.head.appendChild(adminStyles);

console.log('📊 Admin Dashboard System cargado correctamente');