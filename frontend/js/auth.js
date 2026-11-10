// frontend/js/auth.js
const auth = {
    init() {
        const token = localStorage.getItem('token');
        if (token) {
            api.setToken(token);
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (user.role) {
                this.showMainApp(user);
            } else {
                this.showLogin();
            }
        } else {
            this.showLogin();
        }

        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        document.getElementById('showRegisterBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegister();
        });

        document.getElementById('showLoginBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showLogin();
        });

        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.logout();
        });
    },

    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const data = await api.login(username, password);
            api.setToken(data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            this.showMainApp(data.user);
        } catch (error) {
            alert('Login failed: ' + error.message);
        }
    },

    async handleRegister() {
        const userData = {
            username: document.getElementById('reg_username').value,
            password: document.getElementById('reg_password').value,
            first_name: document.getElementById('reg_firstname').value,
            last_name: document.getElementById('reg_lastname').value,
            date_of_birth: document.getElementById('reg_dob').value,
            gender: document.getElementById('reg_gender').value,
            address: document.getElementById('reg_address').value,
            contact_number: document.getElementById('reg_contact').value,
            email: document.getElementById('reg_email').value,
        };

        try {
            await api.register(userData);
            alert('Registration successful! Please login.');
            this.showLogin();
        } catch (error) {
            alert('Registration failed: ' + error.message);
        }
    },

    showLogin() {
        document.getElementById('loginSection').classList.add('active');
        document.getElementById('registerSection').classList.remove('active');
        document.getElementById('mainApp').classList.remove('active');
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
    },

    showRegister() {
        document.getElementById('loginSection').classList.remove('active');
        document.getElementById('registerSection').classList.add('active');
        document.getElementById('mainApp').classList.remove('active');
    },

    showMainApp(user) {
        document.getElementById('loginSection').classList.remove('active');
        document.getElementById('registerSection').classList.remove('active');
        document.getElementById('mainApp').classList.add('active');

        document.getElementById('userInfo').innerHTML = `
            <i class="fas fa-user-circle"></i> ${user.username}<br>
            <small>${user.role === 'admin' ? 'Administrator' : 'Patient'}</small>
        `;

        // Setup navigation based on role
        const navMenu = document.getElementById('navMenu');
        navMenu.innerHTML = `
            <li data-view="dashboard"><i class="fas fa-tachometer-alt"></i><span>Dashboard</span></li>
            <li data-view="appointments"><i class="fas fa-calendar-check"></i><span>Appointments</span></li>
            <li data-view="medical-records"><i class="fas fa-notes-medical"></i><span>Medical Records</span></li>
            ${user.role === 'admin' ? `
                <li data-view="patients"><i class="fas fa-users"></i><span>Patients</span></li>
                <li data-view="doctors"><i class="fas fa-user-md"></i><span>Doctors</span></li>
                <li data-view="reports"><i class="fas fa-chart-bar"></i><span>Reports</span></li>
            ` : ''}
            <li data-view="settings"><i class="fas fa-cog"></i><span>Account Settings</span></li>
        `;

        window.currentUser = user;
        this.initNavigation();
        app.loadView('dashboard');
    },

    initNavigation() {
        document.querySelectorAll('.nav-menu li').forEach(item => {
            item.addEventListener('click', () => {
                const view = item.dataset.view;
                app.loadView(view);
                document.querySelectorAll('.nav-menu li').forEach(li => li.classList.remove('active'));
                item.classList.add('active');
                document.getElementById('pageTitle').innerText = item.querySelector('span').innerText;
            });
        });
    },

    logout() {
        api.setToken(null);
        localStorage.removeItem('user');
        this.showLogin();
    }
};