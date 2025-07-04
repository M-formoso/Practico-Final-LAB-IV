// ==========================================
// DASHBOARD DE USUARIO - user-dashboard.js
// ==========================================

class UserDashboard {
    constructor() {
        this.config = {
            DEVELOPMENT_MODE: true,
            REFRESH_INTERVAL: 30000, // 30 segundos
            ITEMS_PER_PAGE: 6
        };

        this.state = {
            currentUser: null,
            currentSection: 'dashboard',
            currentMyEventsTab: 'active',
            events: [],
            myEvents: [],
            registrationHistory: [],
            filters: {
                search: '',
                category: '',
                date: ''
            }
        };

        this.mockEvents = [
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
                estado: "activo",
                imagen: "https://via.placeholder.com/400x200?text=Tech+Conference"
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
                estado: "completo",
                imagen: "https://via.placeholder.com/400x200?text=React+Workshop"
            },
            {
                id: 3,
                titulo: "Networking Empresarial",
                descripcion: "Conecta con otros profesionales del sector",
                fecha: "2025-07-25",
                hora: "18:00",
                ubicacion: "Hotel Business Center",
                capacidad: 80,
                inscritos: 23,
                categoria: "Networking",
                organizador: "Business Network",
                precio: 25,
                estado: "activo",
                imagen: "https://via.placeholder.com/400x200?text=Networking"
            },
            {
                id: 4,
                titulo: "Curso de Marketing Digital",
                descripcion: "Estrategias modernas de marketing online",
                fecha: "2025-08-01",
                hora: "10:00",
                ubicacion: "Aula 205 - Universidad",
                capacidad: 50,
                inscritos: 12,
                categoria: "Marketing",
                organizador: "Marketing Pro",
                precio: 75,
                estado: "activo",
                imagen: "https://via.placeholder.com/400x200?text=Marketing+Course"
            },
            {
                id: 5,
                titulo: "Hackathon 48h",
                descripcion: "Competencia de programación de 48 horas",
                fecha: "2025-08-10",
                hora: "09:00",
                ubicacion: "Campus Tecnológico",
                capacidad: 60,
                inscritos: 38,
                categoria: "Competencia",
                organizador: "Code Challenge",
                precio: 0,
                estado: "activo",
                imagen: "https://via.placeholder.com/400x200?text=Hackathon"
            }
        ];

        this.mockUserEvents = [
            {
                eventoId: 1,
                fechaInscripcion: "2025-06-15",
                estado: "confirmado"
            },
            {
                eventoId: 3,
                fechaInscripcion: "2025-06-20",
                estado: "confirmado"
            }
        ];

        this.init();
    }

    // ==========================================
    // INICIALIZACIÓN
    // ==========================================

    init() {
        this.bindEvents();
        this.setupAuthListener();
        console.log('📊 Dashboard de usuario inicializado');
    }

    bindEvents() {
        // Navegación
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                this.switchSection(section);
            });
        });

        // Botón de logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Filtros y búsqueda
        const searchInput = document.getElementById('searchEvents');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }

        const categoryFilter = document.getElementById('filterCategory');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => this.handleCategoryFilter(e.target.value));
        }

        const dateFilter = document.getElementById('filterDate');
        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => this.handleDateFilter(e.target.value));
        }

        // Perfil
        const saveProfileBtn = document.getElementById('saveProfileBtn');
        if (saveProfileBtn) {
            saveProfileBtn.addEventListener('click', () => this.saveProfile());
        }
    }

    setupAuthListener() {
        window.addEventListener('authenticationVerified', (event) => {
            this.currentUser = event.detail.user;
            this.loadDashboard();
        });
    }

    // ==========================================
    // CARGA INICIAL DEL DASHBOARD
    // ==========================================

    async loadDashboard() {
        try {
            this.showLoading(true);
            
            // Cargar datos del usuario
            this.updateUserInfo();
            
            // Cargar datos iniciales
            await Promise.all([
                this.loadEvents(),
                this.loadMyEvents(),
                this.loadCategories(),
                this.loadStats()
            ]);

            // Cargar sección actual
            this.switchSection(this.state.currentSection);
            
            this.showLoading(false);
            this.showToast('Dashboard cargado correctamente', 'success');
            
        } catch (error) {
            console.error('Error cargando dashboard:', error);
            this.showLoading(false);
            this.showToast('Error al cargar el dashboard', 'error');
        }
    }

    updateUserInfo() {
        if (!this.state.currentUser) return;

        // Actualizar información del usuario en el header
        const userNameElements = document.querySelectorAll('#userName, #welcomeUser');
        userNameElements.forEach(el => {
            if (el) el.textContent = this.state.currentUser.nombre;
        });

        const userAvatar = document.getElementById('userAvatar');
        if (userAvatar && this.state.currentUser.avatar) {
            userAvatar.src = this.state.currentUser.avatar;
        }

        // Actualizar perfil
        this.updateProfileForm();
    }

    updateProfileForm() {
        const profileName = document.getElementById('profileName');
        const profileEmail = document.getElementById('profileEmail');
        const profileRole = document.getElementById('profileRole');

        if (profileName) profileName.value = this.state.currentUser.nombre || '';
        if (profileEmail) profileEmail.value = this.state.currentUser.email || '';
        if (profileRole) profileRole.value = this.state.currentUser.rol || '';
    }

    // ==========================================
    // NAVEGACIÓN ENTRE SECCIONES
    // ==========================================

    switchSection(sectionName) {
        // Actualizar navegación
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[data-section="${sectionName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Mostrar sección
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        this.state.currentSection = sectionName;

        // Cargar contenido específico
        switch (sectionName) {
            case 'dashboard':
                this.loadDashboardContent();
                break;
            case 'events':
                this.loadAvailableEvents();
                break;
            case 'my-events':
                this.loadMyEventsSection();
                break;
            case 'history':
                this.loadHistorySection();
                break;
            case 'profile':
                this.loadProfileSection();
                break;
        }
    }

    // ==========================================
    // CARGA DE DATOS
    // ==========================================

    async loadEvents() {
        try {
            if (this.config.DEVELOPMENT_MODE) {
                // Simular delay de red
                await this.delay(500);
                this.state.events = [...this.mockEvents];
            } else {
                // Llamada real a la API
                const response = await auth.makeAuthenticatedRequest('/api/events');
                this.state.events = await response.json();
            }
        } catch (error) {
            console.error('Error cargando eventos:', error);
            this.state.events = [];
        }
    }

    async loadMyEvents() {
        try {
            if (this.config.DEVELOPMENT_MODE) {
                await this.delay(300);
                
                // Combinar eventos del usuario con datos completos
                this.state.myEvents = this.mockUserEvents.map(userEvent => {
                    const event = this.mockEvents.find(e => e.id === userEvent.eventoId);
                    return {
                        ...event,
                        fechaInscripcion: userEvent.fechaInscripcion,
                        estadoInscripcion: userEvent.estado
                    };
                }).filter(Boolean);
                
                this.state.registrationHistory = [...this.state.myEvents];
            } else {
                const response = await auth.makeAuthenticatedRequest('/api/user/events');
                this.state.myEvents = await response.json();
            }
        } catch (error) {
            console.error('Error cargando mis eventos:', error);
            this.state.myEvents = [];
        }
    }

    async loadCategories() {
        try {
            const categories = [...new Set(this.state.events.map(event => event.categoria))];
            this.populateCategoryFilter(categories);
        } catch (error) {
            console.error('Error cargando categorías:', error);
        }
    }

    async loadStats() {
        try {
            const stats = {
                myActiveEvents: this.state.myEvents.filter(e => new Date(e.fecha) >= new Date()).length,
                totalRegistrations: this.state.myEvents.length,
                availableEvents: this.state.events.filter(e => e.estado === 'activo').length
            };

            this.updateStatsCards(stats);
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
        }
    }

    // ==========================================
    // CONTENIDO DEL DASHBOARD PRINCIPAL
    // ==========================================

    loadDashboardContent() {
        this.loadUpcomingEvents();
    }

    loadUpcomingEvents() {
        const container = document.getElementById('upcomingEventsContainer');
        if (!container) return;

        const upcomingEvents = this.state.myEvents
            .filter(event => new Date(event.fecha) >= new Date())
            .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
            .slice(0, 3);

        if (upcomingEvents.length === 0) {
            container.innerHTML = this.getEmptyStateHTML('No tienes eventos próximos', 'calendar');
            return;
        }

        container.innerHTML = upcomingEvents.map(event => this.generateEventCardHTML(event, 'upcoming')).join('');
    }

    updateStatsCards(stats) {
        const elements = {
            myActiveEvents: document.getElementById('myActiveEvents'),
            totalRegistrations: document.getElementById('totalRegistrations'),
            availableEvents: document.getElementById('availableEvents')
        };

        Object.keys(elements).forEach(key => {
            if (elements[key]) {
                elements[key].textContent = stats[key] || 0;
            }
        });
    }

    // ==========================================
    // EVENTOS DISPONIBLES
    // ==========================================

    loadAvailableEvents() {
        const container = document.getElementById('availableEventsGrid');
        if (!container) return;

        const filteredEvents = this.getFilteredEvents();
        
        if (filteredEvents.length === 0) {
            container.innerHTML = this.getEmptyStateHTML('No se encontraron eventos', 'search');
            return;
        }

        container.innerHTML = filteredEvents.map(event => this.generateEventCardHTML(event, 'available')).join('');
    }

    getFilteredEvents() {
        return this.state.events.filter(event => {
            const matchesSearch = !this.state.filters.search || 
                event.titulo.toLowerCase().includes(this.state.filters.search.toLowerCase()) ||
                event.descripcion.toLowerCase().includes(this.state.filters.search.toLowerCase());

            const matchesCategory = !this.state.filters.category || 
                event.categoria === this.state.filters.category;

            const matchesDate = !this.state.filters.date || 
                event.fecha === this.state.filters.date;

            return matchesSearch && matchesCategory && matchesDate;
        });
    }

    populateCategoryFilter(categories) {
        const select = document.getElementById('filterCategory');
        if (!select) return;

        const currentValue = select.value;
        select.innerHTML = '<option value="">Todas las categorías</option>';
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            select.appendChild(option);
        });

        select.value = currentValue;
    }

    // ==========================================
    // MIS EVENTOS
    // ==========================================

    loadMyEventsSection() {
        this.switchMyEventsTab(this.state.currentMyEventsTab);
    }

    switchMyEventsTab(tabName) {
        // Actualizar botones de tab
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        this.state.currentMyEventsTab = tabName;

        // Cargar contenido del tab
        const container = document.getElementById('myEventsContainer');
        if (!container) return;

        let events = [];
        const now = new Date();

        switch (tabName) {
            case 'active':
                events = this.state.myEvents.filter(e => new Date(e.fecha) >= now);
                break;
            case 'upcoming':
                events = this.state.myEvents.filter(e => {
                    const eventDate = new Date(e.fecha);
                    const diffDays = (eventDate - now) / (1000 * 60 * 60 * 24);
                    return diffDays >= 0 && diffDays <= 7;
                });
                break;
            case 'past':
                events = this.state.myEvents.filter(e => new Date(e.fecha) < now);
                break;
        }

        if (events.length === 0) {
            const emptyMessages = {
                active: 'No tienes eventos activos',
                upcoming: 'No tienes eventos en los próximos 7 días',
                past: 'No tienes eventos pasados'
            };
            container.innerHTML = this.getEmptyStateHTML(emptyMessages[tabName], 'calendar-times');
            return;
        }

        container.innerHTML = events.map(event => this.generateEventCardHTML(event, 'registered')).join('');
    }

    // ==========================================
    // HISTORIAL
    // ==========================================

    loadHistorySection() {
        const container = document.getElementById('historyContainer');
        if (!container) return;

        if (this.state.registrationHistory.length === 0) {
            container.innerHTML = this.getEmptyStateHTML('No tienes historial de inscripciones', 'history');
            return;
        }

        const sortedHistory = this.state.registrationHistory
            .sort((a, b) => new Date(b.fechaInscripcion) - new Date(a.fechaInscripcion));

        container.innerHTML = sortedHistory.map(event => this.generateHistoryItemHTML(event)).join('');
    }

    // ==========================================
    // PERFIL
    // ==========================================

    loadProfileSection() {
        this.updateProfileForm();
    }

    async saveProfile() {
        try {
            const profileData = {
                nombre: document.getElementById('profileName').value,
                email: document.getElementById('profileEmail').value
            };

            if (!profileData.nombre.trim() || !profileData.email.trim()) {
                this.showToast('Por favor completa todos los campos', 'warning');
                return;
            }

            this.showLoading(true);

            if (this.config.DEVELOPMENT_MODE) {
                await this.delay(1000);
                // Actualizar usuario local
                this.state.currentUser.nombre = profileData.nombre;
                this.state.currentUser.email = profileData.email;
                this.updateUserInfo();
            } else {
                // Llamada real a la API
                await auth.makeAuthenticatedRequest('/api/user/profile', {
                    method: 'PUT',
                    body: JSON.stringify(profileData)
                });
            }

            this.showLoading(false);
            this.showToast('Perfil actualizado correctamente', 'success');

        } catch (error) {
            console.error('Error guardando perfil:', error);
            this.showLoading(false);
            this.showToast('Error al guardar el perfil', 'error');
        }
    }

    // ==========================================
    // MANEJO DE EVENTOS
    // ==========================================

    async registerForEvent(eventId) {
        try {
            const event = this.state.events.find(e => e.id === eventId);
            if (!event) return;

            // Verificar si ya está inscrito
            const alreadyRegistered = this.state.myEvents.some(e => e.id === eventId);
            if (alreadyRegistered) {
                this.showToast('Ya estás inscrito en este evento', 'warning');
                return;
            }

            // Verificar capacidad
            if (event.inscritos >= event.capacidad) {
                this.showToast('Este evento ya está completo', 'warning');
                return;
            }

            this.showLoading(true);

            if (this.config.DEVELOPMENT_MODE) {
                await this.delay(1000);
                
                // Simular inscripción exitosa
                event.inscritos += 1;
                this.state.myEvents.push({
                    ...event,
                    fechaInscripcion: new Date().toISOString().split('T')[0],
                    estadoInscripcion: 'confirmado'
                });
                
                this.state.registrationHistory = [...this.state.myEvents];
            } else {
                // Llamada real a la API
                await auth.makeAuthenticatedRequest(`/api/events/${eventId}/register`, {
                    method: 'POST'
                });
            }

            this.showLoading(false);
            this.showToast('Te has inscrito correctamente al evento', 'success');
            
            // Recargar datos
            await this.loadStats();
            this.refreshCurrentSection();

        } catch (error) {
            console.error('Error en inscripción:', error);
            this.showLoading(false);
            this.showToast('Error al inscribirse en el evento', 'error');
        }
    }

    async unregisterFromEvent(eventId) {
        try {
            const event = this.state.myEvents.find(e => e.id === eventId);
            if (!event) return;

            if (!confirm('¿Estás seguro de que quieres cancelar tu inscripción?')) {
                return;
            }

            this.showLoading(true);

            if (this.config.DEVELOPMENT_MODE) {
                await this.delay(1000);
                
                // Simular cancelación exitosa
                const originalEvent = this.state.events.find(e => e.id === eventId);
                if (originalEvent) {
                    originalEvent.inscritos -= 1;
                }
                
                this.state.myEvents = this.state.myEvents.filter(e => e.id !== eventId);
            } else {
                // Llamada real a la API
                await auth.makeAuthenticatedRequest(`/api/events/${eventId}/unregister`, {
                    method: 'DELETE'
                });
            }

            this.showLoading(false);
            this.showToast('Inscripción cancelada correctamente', 'success');
            
            // Recargar datos
            await this.loadStats();
            this.refreshCurrentSection();

        } catch (error) {
            console.error('Error cancelando inscripción:', error);
            this.showLoading(false);
            this.showToast('Error al cancelar la inscripción', 'error');
        }
    }

    showEventDetails(eventId) {
        const event = this.state.events.find(e => e.id === eventId) || 
                     this.state.myEvents.find(e => e.id === eventId);
        
        if (!event) return;

        const modal = document.getElementById('eventModal');
        const title = document.getElementById('modalEventTitle');
        const content = document.getElementById('modalEventContent');

        if (!modal || !title || !content) return;

        title.textContent = event.titulo;
        content.innerHTML = this.generateEventDetailsHTML(event);
        
        modal.classList.add('active');
    }

    // ==========================================
    // MANEJO DE FILTROS
    // ==========================================

    handleSearch(searchTerm) {
        this.state.filters.search = searchTerm;
        if (this.state.currentSection === 'events') {
            this.loadAvailableEvents();
        }
    }

    handleCategoryFilter(category) {
        this.state.filters.category = category;
        if (this.state.currentSection === 'events') {
            this.loadAvailableEvents();
        }
    }

    handleDateFilter(date) {
        this.state.filters.date = date;
        if (this.state.currentSection === 'events') {
            this.loadAvailableEvents();
        }
    }

    // ==========================================
    // GENERACIÓN DE HTML
    // ==========================================

    generateEventCardHTML(event, type = 'available') {
        const isRegistered = this.state.myEvents.some(e => e.id === event.id);
        const isPast = new Date(event.fecha) < new Date();
        const isFull = event.inscritos >= event.capacidad;
        
        let statusBadge = '';
        let actionButtons = '';

        switch (type) {
            case 'available':
                if (isFull) {
                    statusBadge = '<span class="status-badge status-full">Completo</span>';
                } else if (isRegistered) {
                    statusBadge = '<span class="status-badge status-registered">Inscrito</span>';
                } else {
                    statusBadge = '<span class="status-badge status-available">Disponible</span>';
                }

                if (isRegistered) {
                    actionButtons = `
                        <button class="btn btn-danger" onclick="userDashboard.unregisterFromEvent(${event.id})">
                            <i class="fas fa-times"></i> Cancelar Inscripción
                        </button>
                    `;
                } else if (!isFull) {
                    actionButtons = `
                        <button class="btn btn-primary" onclick="userDashboard.registerForEvent(${event.id})">
                            <i class="fas fa-plus"></i> Inscribirse
                        </button>
                    `;
                } else {
                    actionButtons = `
                        <button class="btn btn-primary" disabled>
                            <i class="fas fa-ban"></i> Completo
                        </button>
                    `;
                }
                break;

            case 'registered':
                if (isPast) {
                    statusBadge = '<span class="status-badge status-past">Finalizado</span>';
                } else {
                    statusBadge = '<span class="status-badge status-registered">Confirmado</span>';
                    actionButtons = `
                        <button class="btn btn-danger" onclick="userDashboard.unregisterFromEvent(${event.id})">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                    `;
                }
                break;

            case 'upcoming':
                statusBadge = '<span class="status-badge status-registered">Próximamente</span>';
                break;
        }

        const formatDate = (dateStr) => {
            const date = new Date(dateStr);
            return date.toLocaleDateString('es-ES', { 
                day: '2-digit', 
                month: 'short' 
            });
        };

        const formatPrice = (price) => {
            return price === 0 ? 'Gratis' : `$${price}`;
        };

        return `
            <div class="event-card">
                <div class="event-header">
                    <div class="event-date">
                        ${formatDate(event.fecha)}
                    </div>
                    <div class="event-title">${event.titulo}</div>
                    <div class="event-category">${event.categoria}</div>
                    ${statusBadge}
                </div>
                <div class="event-body">
                    <p class="event-description">${event.descripcion}</p>
                    <div class="event-details">
                        <div class="event-detail">
                            <i class="fas fa-clock"></i>
                            <span>${event.hora}</span>
                        </div>
                        <div class="event-detail">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${event.ubicacion}</span>
                        </div>
                        <div class="event-detail">
                            <i class="fas fa-users"></i>
                            <span>${event.inscritos}/${event.capacidad} inscritos</span>
                        </div>
                        <div class="event-detail">
                            <i class="fas fa-tag"></i>
                            <span>${formatPrice(event.precio)}</span>
                        </div>
                        <div class="event-detail">
                            <i class="fas fa-building"></i>
                            <span>${event.organizador}</span>
                        </div>
                    </div>
                    <div class="event-actions">
                        <button class="btn btn-primary" onclick="userDashboard.showEventDetails(${event.id})" style="flex: none; margin-right: auto;">
                            <i class="fas fa-info-circle"></i> Detalles
                        </button>
                        ${actionButtons}
                    </div>
                </div>
            </div>
        `;
    }

    generateHistoryItemHTML(event) {
        const formatDate = (dateStr) => {
            const date = new Date(dateStr);
            return date.toLocaleDateString('es-ES', { 
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        };

        const getStatusClass = (estado) => {
            return estado === 'confirmado' ? 'status-registered' : 'status-past';
        };

        return `
            <div class="history-item">
                <div class="history-info">
                    <div class="history-event">${event.titulo}</div>
                    <div class="history-date">
                        Inscrito el ${formatDate(event.fechaInscripcion)} - 
                        Evento: ${formatDate(event.fecha)}
                    </div>
                </div>
                <div class="history-status">
                    <span class="status-badge ${getStatusClass(event.estadoInscripcion)}">
                        ${event.estadoInscripcion === 'confirmado' ? 'Confirmado' : 'Finalizado'}
                    </span>
                </div>
            </div>
        `;
    }

    generateEventDetailsHTML(event) {
        const formatDate = (dateStr) => {
            const date = new Date(dateStr);
            return date.toLocaleDateString('es-ES', { 
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        };

        const formatPrice = (price) => {
            return price === 0 ? 'Evento gratuito' : `Precio: $${price}`;
        };

        const isRegistered = this.state.myEvents.some(e => e.id === event.id);
        const availableSpots = event.capacidad - event.inscritos;

        return `
            <div class="event-details-modal">
                <div class="event-detail">
                    <i class="fas fa-info-circle"></i>
                    <strong>Descripción:</strong>
                </div>
                <p style="margin: 0.5rem 0 1rem 0; line-height: 1.6;">${event.descripcion}</p>
                
                <div class="event-detail">
                    <i class="fas fa-calendar"></i>
                    <span>${formatDate(event.fecha)}</span>
                </div>
                
                <div class="event-detail">
                    <i class="fas fa-clock"></i>
                    <span>Hora: ${event.hora}</span>
                </div>
                
                <div class="event-detail">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>Ubicación: ${event.ubicacion}</span>
                </div>
                
                <div class="event-detail">
                    <i class="fas fa-building"></i>
                    <span>Organizador: ${event.organizador}</span>
                </div>
                
                <div class="event-detail">
                    <i class="fas fa-tag"></i>
                    <span>${formatPrice(event.precio)}</span>
                </div>
                
                <div class="event-detail">
                    <i class="fas fa-users"></i>
                    <span>Capacidad: ${event.inscritos}/${event.capacidad} inscritos</span>
                </div>
                
                <div class="event-detail">
                    <i class="fas fa-ticket-alt"></i>
                    <span>Lugares disponibles: ${availableSpots}</span>
                </div>
                
                <div class="event-detail">
                    <i class="fas fa-folder"></i>
                    <span>Categoría: ${event.categoria}</span>
                </div>
                
                ${isRegistered ? `
                    <div style="margin-top: 1rem; padding: 1rem; background: #e8f5e8; border-radius: 8px; border-left: 4px solid #4caf50;">
                        <i class="fas fa-check-circle" style="color: #4caf50;"></i>
                        <strong style="color: #2e7d32;">Ya estás inscrito en este evento</strong>
                    </div>
                ` : ''}
            </div>
        `;
    }

    getEmptyStateHTML(message, icon = 'info-circle') {
        return `
            <div class="empty-state">
                <i class="fas fa-${icon}"></i>
                <h3>${message}</h3>
            </div>
        `;
    }

    // ==========================================
    // UTILIDADES
    // ==========================================

    refreshCurrentSection() {
        this.switchSection(this.state.currentSection);
    }

    handleLogout() {
        if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
            auth.logout();
        }
    }

    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.style.display = show ? 'flex' : 'none';
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) {
            console.log(`[${type.toUpperCase()}] ${message}`);
            return;
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${this.getToastIcon(type)}"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);
    }

    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || icons.info;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ==========================================
    // AUTO-ACTUALIZACIÓN
    // ==========================================

    startAutoRefresh() {
        setInterval(async () => {
            if (document.visibilityState === 'visible') {
                try {
                    await this.loadStats();
                    console.log('🔄 Dashboard actualizado automáticamente');
                } catch (error) {
                    console.error('Error en auto-actualización:', error);
                }
            }
        }, this.config.REFRESH_INTERVAL);
    }

    // ==========================================
    // EXPORTAR FUNCIONES GLOBALES
    // ==========================================

    // Funciones que se llamarán desde el HTML
    exportGlobalFunctions() {
        window.switchSection = (section) => this.switchSection(section);
        window.switchMyEventsTab = (tab) => this.switchMyEventsTab(tab);
        window.closeEventModal = () => this.closeEventModal();
    }

    closeEventModal() {
        const modal = document.getElementById('eventModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }
}

// ==========================================
// FUNCIONES GLOBALES ADICIONALES
// ==========================================

// Función para cerrar modal (llamada desde HTML)
function closeEventModal() {
    const modal = document.getElementById('eventModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Función para cambiar de pestaña en mis eventos (llamada desde HTML)
function switchMyEventsTab(tabName) {
    if (window.userDashboard) {
        window.userDashboard.switchMyEventsTab(tabName);
    }
}

// Función para cambiar de sección (llamada desde HTML)
function switchSection(sectionName) {
    if (window.userDashboard) {
        window.userDashboard.switchSection(sectionName);
    }
}

// ==========================================
// INICIALIZACIÓN
// ==========================================

// Crear instancia global del dashboard
let userDashboard;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando Dashboard de Usuario...');
    
    // Crear instancia del dashboard
    userDashboard = new UserDashboard();
    
    // Exportar a window para acceso global
    window.userDashboard = userDashboard;
    
    // Exportar funciones globales
    userDashboard.exportGlobalFunctions();
    
    // Iniciar auto-actualización después de un delay
    setTimeout(() => {
        userDashboard.startAutoRefresh();
    }, 10000); // Esperar 10 segundos antes de iniciar auto-refresh
});

// ==========================================
// MANEJO DE EVENTOS GLOBALES
// ==========================================

// Cerrar modal al hacer clic fuera
document.addEventListener('click', function(e) {
    const modal = document.getElementById('eventModal');
    if (modal && e.target === modal) {
        closeEventModal();
    }
});

// Manejar tecla ESC para cerrar modal
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeEventModal();
    }
});

// ==========================================
// NOTIFICACIÓN DE ESTADO
// ==========================================

console.log('📊 Sistema de Dashboard de Usuario cargado correctamente');

// ==========================================
// FUNCIONES DE UTILIDAD PARA DEPURACIÓN
// ==========================================

// Función para obtener estadísticas del dashboard (útil para debugging)
function getDashboardStats() {
    if (!window.userDashboard) {
        console.log('Dashboard no inicializado');
        return;
    }

    const dashboard = window.userDashboard;
    return {
        usuario: dashboard.state.currentUser?.nombre || 'No autenticado',
        seccionActual: dashboard.state.currentSection,
        totalEventos: dashboard.state.events.length,
        misEventos: dashboard.state.myEvents.length,
        filtrosActivos: dashboard.state.filters,
        modoDesarrollo: dashboard.config.DEVELOPMENT_MODE
    };
}

// Función para simular eventos adicionales (útil para testing)
function addMockEvents(count = 5) {
    if (!window.userDashboard) {
        console.log('Dashboard no inicializado');
        return;
    }

    const categories = ['Tecnología', 'Marketing', 'Networking', 'Educación', 'Entretenimiento'];
    const locations = ['Centro de Convenciones', 'Aula Virtual', 'Hotel Business', 'Campus Universidad', 'Auditorio Principal'];
    
    for (let i = 0; i < count; i++) {
        const newEvent = {
            id: window.userDashboard.state.events.length + i + 1,
            titulo: `Evento Demo ${i + 1}`,
            descripcion: `Descripción del evento demo número ${i + 1}`,
            fecha: new Date(Date.now() + (i + 1) * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            hora: `${9 + (i % 8)}:00`,
            ubicacion: locations[i % locations.length],
            capacidad: 50 + (i * 10),
            inscritos: Math.floor(Math.random() * 30),
            categoria: categories[i % categories.length],
            organizador: `Organizador ${i + 1}`,
            precio: i % 3 === 0 ? 0 : (i + 1) * 25,
            estado: 'activo',
            imagen: `https://via.placeholder.com/400x200?text=Evento+${i + 1}`
        };
        
        window.userDashboard.state.events.push(newEvent);
    }
    
    console.log(`✅ Agregados ${count} eventos de prueba`);
    window.userDashboard.refreshCurrentSection();
}

// Función para limpiar datos de prueba
function clearMockData() {
    if (!window.userDashboard) {
        console.log('Dashboard no inicializado');
        return;
    }

    window.userDashboard.state.events = [...window.userDashboard.mockEvents];
    window.userDashboard.state.myEvents = [];
    window.userDashboard.state.registrationHistory = [];
    
    console.log('🧹 Datos de prueba limpiados');
    window.userDashboard.refreshCurrentSection();
}

// Exportar funciones de utilidad
window.getDashboardStats = getDashboardStats;
window.addMockEvents = addMockEvents;
window.clearMockData = clearMockData;