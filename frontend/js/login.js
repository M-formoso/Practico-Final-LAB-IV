// ==========================================
// LOGIN SYSTEM - INTEGRADO CON AUTH
// ==========================================

class LoginSystem {
    constructor() {
        this.currentForm = 'login';
        this.isProcessing = false;
        this.alertTimeout = null;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkExistingAuth();
        this.showDevelopmentIndicator();
    }

    // ==========================================
    // EVENT LISTENERS
    // ==========================================

    setupEventListeners() {
        // Tabs de navegación
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        // Formularios
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));

        // Toggle de contraseñas
        document.querySelectorAll('.password-toggle').forEach(btn => {
            btn.addEventListener('click', () => this.togglePassword(btn.dataset.input));
        });

        // Botones demo
        document.querySelectorAll('.btn-demo').forEach(btn => {
            btn.addEventListener('click', () => this.fillDemoData(btn.dataset.role));
        });

        // Validación en tiempo real
        this.setupRealTimeValidation();

        // Atajos de teclado
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    setupRealTimeValidation() {
        // Email validation
        const emailInputs = document.querySelectorAll('input[type="email"]');
        emailInputs.forEach(input => {
            input.addEventListener('blur', this.validateEmailField);
            input.addEventListener('input', this.debounce(this.validateEmailField, 500));
        });

        // Password validation
        const passwordInput = document.getElementById('registerPassword');
        if (passwordInput) {
            passwordInput.addEventListener('input', this.debounce(this.validatePasswordStrength, 300));
        }

        // Confirm password validation
        const confirmPasswordInput = document.getElementById('confirmPassword');
        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', this.debounce(this.validatePasswordMatch, 300));
        }

        // Name validation
        const nameInput = document.getElementById('registerName');
        if (nameInput) {
            nameInput.addEventListener('blur', this.validateNameField);
        }
    }

    // ==========================================
    // MANEJO DE TABS
    // ==========================================

    switchTab(tabName) {
        if (this.isProcessing) return;

        this.currentForm = tabName;
        
        // Actualizar botones de tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Actualizar formularios
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.toggle('active', form.id === `${tabName}Form`);
        });

        // Limpiar estado
        this.clearAllAlerts();
        this.clearFormValidation();
        
        // Focus en primer input
        setTimeout(() => {
            const activeForm = document.querySelector('.auth-form.active');
            const firstInput = activeForm.querySelector('input');
            if (firstInput) firstInput.focus();
        }, 300);
    }

    // ==========================================
    // AUTENTICACIÓN - INTEGRADA CON AUTH.JS
    // ==========================================

    async handleLogin(e) {
        e.preventDefault();
        
        if (this.isProcessing) return;
        
        const form = e.target;
        const formData = new FormData(form);
        const loginData = {
            email: formData.get('email').trim(),
            password: formData.get('password')
        };

        // Validación básica
        if (!this.validateLoginForm(loginData)) return;

        try {
            this.setProcessing(true);
            this.setButtonLoading('loginForm', true);
            this.clearAllAlerts();

            // Usar el sistema de autenticación
            const result = await auth.login(loginData);

            if (result.success) {
                this.showAlert('Inicio de sesión exitoso. Redirigiendo...', 'success');
                
                // Redireccionar según el rol usando auth.js
                setTimeout(() => {
                    auth.redirectToDashboard(result.user.rol);
                }, 1500);
            } else {
                this.showAlert(result.message || 'Credenciales incorrectas', 'error');
            }
        } catch (error) {
            console.error('Error en login:', error);
            this.showAlert('Error de conexión. Verifica tu internet y vuelve a intentar.', 'error');
        } finally {
            this.setProcessing(false);
            this.setButtonLoading('loginForm', false);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        if (this.isProcessing) return;
        
        const form = e.target;
        const formData = new FormData(form);
        const registerData = {
            nombre: formData.get('name').trim(),
            email: formData.get('email').trim(),
            contraseña: formData.get('password'),
            rol: formData.get('role')
        };

        // Validación completa
        if (!this.validateRegisterForm(form, registerData)) return;

        try {
            this.setProcessing(true);
            this.setButtonLoading('registerForm', true);
            this.clearAllAlerts();

            // Usar el sistema de autenticación
            const result = await auth.register(registerData);

            if (result.success) {
                this.showAlert('Cuenta creada exitosamente. Ya puedes iniciar sesión.', 'success');
                form.reset();
                this.clearFormValidation();
                
                // Cambiar a tab de login
                setTimeout(() => {
                    this.switchTab('login');
                    
                    // Pre-llenar email en login
                    document.getElementById('loginEmail').value = registerData.email;
                }, 1500);
            } else {
                this.showAlert(result.message || 'Error al crear la cuenta', 'error');
            }
        } catch (error) {
            console.error('Error en registro:', error);
            this.showAlert('Error de conexión. Verifica tu internet y vuelve a intentar.', 'error');
        } finally {
            this.setProcessing(false);
            this.setButtonLoading('registerForm', false);
        }
    }

    // ==========================================
    // VERIFICACIÓN DE AUTENTICACIÓN EXISTENTE
    // ==========================================

    async checkExistingAuth() {
        try {
            const authResult = await auth.checkAuth();
            
            if (authResult.isAuthenticated) {
                console.log('Usuario ya autenticado, redirigiendo...');
                auth.redirectToDashboard(authResult.user.rol);
            }
        } catch (error) {
            console.log('No hay sesión activa');
        }
    }

    // ==========================================
    // CUENTAS DEMO
    // ==========================================

    fillDemoData(role) {
        if (this.currentForm !== 'login') {
            this.switchTab('login');
            setTimeout(() => this.fillDemoData(role), 300);
            return;
        }
        
        const emailInput = document.getElementById('loginEmail');
        const passwordInput = document.getElementById('loginPassword');
        
        let demoCredentials;
        if (role === 'admin') {
            demoCredentials = { email: 'admin@eventpro.com', password: 'admin123' };
        } else {
            demoCredentials = { email: 'cliente@eventpro.com', password: 'cliente123' };
        }
        
        // Animación de typing
        this.animateTyping(emailInput, demoCredentials.email, () => {
            this.animateTyping(passwordInput, demoCredentials.password, () => {
                this.showAlert(`Datos de ${role === 'admin' ? 'administrador' : 'cliente'} cargados`, 'success');
                
                // Limpiar después de un tiempo
                setTimeout(() => {
                    this.clearAllAlerts();
                }, 2000);
            });
        });
    }

    animateTyping(input, text, callback) {
        input.value = '';
        input.focus();
        
        let index = 0;
        const interval = setInterval(() => {
            input.value += text[index];
            index++;
            
            if (index >= text.length) {
                clearInterval(interval);
                if (callback) callback();
            }
        }, 100);
    }

    // ==========================================
    // VALIDACIONES
    // ==========================================

    validateLoginForm(loginData) {
        let isValid = true;

        // Validar email
        if (!loginData.email) {
            this.setFieldError('loginEmail', 'El email es requerido');
            isValid = false;
        } else if (!this.isValidEmail(loginData.email)) {
            this.setFieldError('loginEmail', 'Email inválido');
            isValid = false;
        } else {
            this.setFieldSuccess('loginEmail');
        }

        // Validar contraseña
        if (!loginData.password) {
            this.setFieldError('loginPassword', 'La contraseña es requerida');
            isValid = false;
        } else if (loginData.password.length < 3) {
            this.setFieldError('loginPassword', 'Contraseña muy corta');
            isValid = false;
        } else {
            this.setFieldSuccess('loginPassword');
        }

        return isValid;
    }

    validateRegisterForm(form, registerData) {
        let isValid = true;

        // Validar nombre
        if (!registerData.nombre || registerData.nombre.length < 2) {
            this.setFieldError('registerName', 'El nombre debe tener al menos 2 caracteres');
            isValid = false;
        } else {
            this.setFieldSuccess('registerName');
        }

        // Validar email
        if (!registerData.email) {
            this.setFieldError('registerEmail', 'El email es requerido');
            isValid = false;
        } else if (!this.isValidEmail(registerData.email)) {
            this.setFieldError('registerEmail', 'Email inválido');
            isValid = false;
        } else {
            this.setFieldSuccess('registerEmail');
        }

        // Validar contraseña
        const passwordStrength = this.getPasswordStrength(registerData.contraseña);
        if (!registerData.contraseña) {
            this.setFieldError('registerPassword', 'La contraseña es requerida');
            isValid = false;
        } else if (registerData.contraseña.length < 8) {
            this.setFieldError('registerPassword', 'La contraseña debe tener al menos 8 caracteres');
            isValid = false;
        } else if (passwordStrength < 2) {
            this.setFieldError('registerPassword', 'La contraseña es muy débil');
            isValid = false;
        } else {
            this.setFieldSuccess('registerPassword');
        }

        // Validar confirmación de contraseña
        const confirmPassword = form.querySelector('#confirmPassword').value;
        if (!confirmPassword) {
            this.setFieldError('confirmPassword', 'Confirma tu contraseña');
            isValid = false;
        } else if (registerData.contraseña !== confirmPassword) {
            this.setFieldError('confirmPassword', 'Las contraseñas no coinciden');
            isValid = false;
        } else {
            this.setFieldSuccess('confirmPassword');
        }

        // Validar rol
        if (!registerData.rol) {
            this.setFieldError('userRole', 'Selecciona un tipo de usuario');
            isValid = false;
        } else {
            this.setFieldSuccess('userRole');
        }

        // Validar términos
        const acceptTerms = form.querySelector('#acceptTerms').checked;
        if (!acceptTerms) {
            this.showAlert('Debes aceptar los términos y condiciones', 'error');
            isValid = false;
        }

        return isValid;
    }

    // Validaciones en tiempo real
    validateEmailField = (e) => {
        const input = e.target;
        const email = input.value.trim();
        const inputWrapper = input.closest('.input-wrapper') || input.closest('.select-wrapper');

        if (email && !this.isValidEmail(email)) {
            inputWrapper.classList.add('error');
            inputWrapper.classList.remove('success');
        } else if (email) {
            inputWrapper.classList.remove('error');
            inputWrapper.classList.add('success');
        } else {
            inputWrapper.classList.remove('error', 'success');
        }
    }

    validatePasswordStrength = (e) => {
        const input = e.target;
        const password = input.value;
        const strength = this.getPasswordStrength(password);
        const strengthContainer = document.querySelector('.password-strength');
        
        if (!strengthContainer) return;

        const strengthFill = strengthContainer.querySelector('.strength-fill');
        const strengthText = strengthContainer.querySelector('.strength-text');
        
        // Reset classes
        strengthContainer.className = 'password-strength';
        
        if (password.length === 0) {
            strengthFill.style.width = '0%';
            strengthText.textContent = '';
            return;
        }

        let strengthClass, strengthLabel, width;
        
        switch (strength) {
            case 0:
            case 1:
                strengthClass = 'strength-weak';
                strengthLabel = 'Muy débil';
                width = '25%';
                break;
            case 2:
                strengthClass = 'strength-fair';
                strengthLabel = 'Débil';
                width = '50%';
                break;
            case 3:
                strengthClass = 'strength-good';
                strengthLabel = 'Buena';
                width = '75%';
                break;
            case 4:
            default:
                strengthClass = 'strength-strong';
                strengthLabel = 'Fuerte';
                width = '100%';
                break;
        }
        
        strengthContainer.classList.add(strengthClass);
        strengthFill.style.width = width;
        strengthText.textContent = strengthLabel;
    }

    validatePasswordMatch = (e) => {
        const confirmInput = e.target;
        const passwordInput = document.getElementById('registerPassword');
        const confirmWrapper = confirmInput.closest('.input-wrapper');
        
        if (confirmInput.value && passwordInput.value !== confirmInput.value) {
            confirmWrapper.classList.add('error');
            confirmWrapper.classList.remove('success');
        } else if (confirmInput.value) {
            confirmWrapper.classList.remove('error');
            confirmWrapper.classList.add('success');
        } else {
            confirmWrapper.classList.remove('error', 'success');
        }
    }

    validateNameField = (e) => {
        const input = e.target;
        const name = input.value.trim();
        const inputWrapper = input.closest('.input-wrapper');

        if (name && name.length < 2) {
            inputWrapper.classList.add('error');
            inputWrapper.classList.remove('success');
        } else if (name) {
            inputWrapper.classList.remove('error');
            inputWrapper.classList.add('success');
        } else {
            inputWrapper.classList.remove('error', 'success');
        }
    }

    // ==========================================
    // UTILIDADES DE VALIDACIÓN
    // ==========================================

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    getPasswordStrength(password) {
        let strength = 0;
        
        // Longitud
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        
        // Complejidad
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        
        // Normalizar a 0-4
        return Math.min(4, Math.max(0, strength - 1));
    }

    // ==========================================
    // UI HELPERS
    // ==========================================

    setFieldError(fieldId, message) {
        const input = document.getElementById(fieldId);
        const wrapper = input.closest('.input-wrapper') || input.closest('.select-wrapper');
        
        wrapper.classList.add('error');
        wrapper.classList.remove('success');
        
        // Remover mensaje de error anterior
        const existingError = wrapper.parentNode.querySelector('.field-error');
        if (existingError) existingError.remove();
        
        // Agregar nuevo mensaje
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        wrapper.parentNode.appendChild(errorDiv);
    }

    setFieldSuccess(fieldId) {
        const input = document.getElementById(fieldId);
        const wrapper = input.closest('.input-wrapper') || input.closest('.select-wrapper');
        
        wrapper.classList.remove('error');
        wrapper.classList.add('success');
        
        // Remover mensaje de error
        const existingError = wrapper.parentNode.querySelector('.field-error');
        if (existingError) existingError.remove();
    }

    clearFormValidation() {
        // Remover clases de validación
        document.querySelectorAll('.input-wrapper, .select-wrapper').forEach(wrapper => {
            wrapper.classList.remove('error', 'success');
        });
        
        // Remover mensajes de error
        document.querySelectorAll('.field-error').forEach(error => {
            error.remove();
        });
        
        // Reset password strength
        const strengthContainer = document.querySelector('.password-strength');
        if (strengthContainer) {
            strengthContainer.className = 'password-strength';
            const strengthFill = strengthContainer.querySelector('.strength-fill');
            const strengthText = strengthContainer.querySelector('.strength-text');
            if (strengthFill) strengthFill.style.width = '0%';
            if (strengthText) strengthText.textContent = '';
        }
    }

    setButtonLoading(formId, isLoading) {
        const form = document.getElementById(formId);
        const button = form.querySelector('button[type="submit"]');
        
        if (isLoading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    setProcessing(processing) {
        this.isProcessing = processing;
        
        // Deshabilitar tabs durante el procesamiento
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.disabled = processing;
            btn.style.pointerEvents = processing ? 'none' : 'auto';
        });
    }

    // ==========================================
    // SISTEMA DE ALERTAS
    // ==========================================

    showAlert(message, type = 'info', autoDismiss = true) {
        const container = document.getElementById('alertContainer');
        
        // Crear elemento de alerta
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.innerHTML = `
            <i class="fas fa-${this.getAlertIcon(type)}"></i>
            <span>${message}</span>
            <button class="alert-close" onclick="this.parentNode.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Agregar al container
        container.appendChild(alert);
        
        // Auto-dismiss
        if (autoDismiss && type !== 'success') {
            setTimeout(() => {
                if (alert.parentNode) alert.remove();
            }, 5000);
        }
        
        // Scroll hacia la alerta
        alert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    clearAllAlerts() {
        const container = document.getElementById('alertContainer');
        container.innerHTML = '';
    }

    getAlertIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    // ==========================================
    // MANEJO DE CONTRASEÑAS
    // ==========================================

    togglePassword(inputId) {
        const input = document.getElementById(inputId);
        const button = document.querySelector(`[data-input="${inputId}"]`);
        const icon = button.querySelector('i');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.replace('fa-eye', 'fa-eye-slash');
            button.setAttribute('title', 'Ocultar contraseña');
        } else {
            input.type = 'password';
            icon.classList.replace('fa-eye-slash', 'fa-eye');
            button.setAttribute('title', 'Mostrar contraseña');
        }
        
        // Mantener focus en el input
        input.focus();
    }

    // ==========================================
    // ATAJOS DE TECLADO
    // ==========================================

    handleKeyboardShortcuts(e) {
        // Enter en formularios
        if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
            const activeForm = document.querySelector('.auth-form.active');
            if (activeForm && e.target.tagName === 'INPUT') {
                const submitButton = activeForm.querySelector('button[type="submit"]');
                if (submitButton && !submitButton.disabled) {
                    e.preventDefault();
                    submitButton.click();
                }
            }
        }
        
        // Cambio de tabs con Ctrl + Tab
        if (e.ctrlKey && e.key === 'Tab') {
            e.preventDefault();
            const newTab = this.currentForm === 'login' ? 'register' : 'login';
            this.switchTab(newTab);
        }
        
        // Demo shortcuts
        if (e.ctrlKey && e.shiftKey) {
            if (e.key === 'A') {
                e.preventDefault();
                this.fillDemoData('admin');
            } else if (e.key === 'C') {
                e.preventDefault();
                this.fillDemoData('client');
            }
        }
    }

    // ==========================================
    // INDICADOR DE MODO DESARROLLO
    // ==========================================

    showDevelopmentIndicator() {
        if (!auth.config.DEVELOPMENT_MODE) return;
        
        const indicator = document.createElement('div');
        indicator.className = 'dev-mode-indicator';
        indicator.innerHTML = '🚀 MODO DESARROLLO';
        indicator.title = 'Backend simulado activo';
        
        document.body.appendChild(indicator);
        
        // Log de información de desarrollo
        console.group('🛠️ Modo Desarrollo EventPro');
        console.log('📋 Usuarios disponibles:');
        console.table(auth.mockUsers.map(u => ({ 
            email: u.email, 
            password: u.contraseña,
            rol: u.rol 
        })));
        console.log('⌨️ Atajos:');
        console.log('  • Ctrl+Shift+A: Llenar datos de admin');
        console.log('  • Ctrl+Shift+C: Llenar datos de cliente');
        console.log('  • Ctrl+Tab: Cambiar entre tabs');
        console.log('💡 Para desactivar: auth.config.DEVELOPMENT_MODE = false');
        console.groupEnd();
    }

    // ==========================================
    // UTILIDADES GENERALES
    // ==========================================

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// ==========================================
// INICIALIZACIÓN
// ==========================================

// Esperar a que se cargue auth.js primero
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si auth está disponible
    if (typeof auth === 'undefined') {
        console.error('❌ auth.js debe cargarse antes que login.js');
        return;
    }

    // Inicializar sistema de login
    const loginSystem = new LoginSystem();
    
    // Hacer disponible globalmente para debugging
    window.loginSystem = loginSystem;
    
    console.log('🎉 Sistema de Login EventPro iniciado correctamente');
});

// ==========================================
// FUNCIONES GLOBALES PARA DEBUGGING
// ==========================================

window.EventProLogin = {
    // Utilidades de desarrollo
    dev: {
        clearStorage: () => {
            auth.clearAuthData();
            console.log('🗑️ Storage limpiado');
        },
        
        showMockUsers: () => {
            console.table(auth.mockUsers);
        },
        
        testAlert: (type = 'info') => {
            window.loginSystem.showAlert(`Prueba de alerta tipo ${type}`, type);
        },
        
        fillForm: (role) => {
            window.loginSystem.fillDemoData(role);
        },

        switchToProduction: () => {
            auth.config.DEVELOPMENT_MODE = false;
            console.log('🔄 Cambiado a modo producción - recarga la página');
        }
    },
    
    // Estado actual
    getState: () => ({
        currentForm: window.loginSystem.currentForm,
        isProcessing: window.loginSystem.isProcessing,
        authData: auth.getAuthData()
    })
};

// ==========================================
// ESTILOS ADICIONALES PARA VALIDACIÓN
// ==========================================

const additionalStyles = document.createElement('style');
additionalStyles.textContent = `
    .field-error {
        color: #ef4444;
        font-size: 0.8rem;
        margin-top: 0.5rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .input-wrapper.error input,
    .select-wrapper.error select {
        border-color: #ef4444;
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }

    .input-wrapper.success input,
    .select-wrapper.success select {
        border-color: #10b981;
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
    }

    .dev-mode-indicator {
        position: fixed;
        top: 1rem;
        right: 1rem;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        font-size: 0.75rem;
        font-weight: bold;
        z-index: 1000;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        animation: devPulse 2s ease-in-out infinite;
    }

    @keyframes devPulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.8; transform: scale(1.05); }
    }

    .alert-close {
        background: none;
        border: none;
        color: currentColor;
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 0.25rem;
        transition: background-color 0.2s;
    }

    .alert-close:hover {
        background: rgba(255, 255, 255, 0.1);
    }
`;

document.head.appendChild(additionalStyles);