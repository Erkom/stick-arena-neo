// Login and Registration View Component
class AuthView {
  constructor() {
    this.isLoginMode = true;
    this.container = document.createElement('div');
    this.container.className = 'auth-container';
    this.errorMessage = '';
    this.onLoginSuccess = null;
  }

  // Set callback for successful login
  setLoginSuccessCallback(callback) {
    this.onLoginSuccess = callback;
  }

  // Switch between login and registration forms
  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    this.render();
  }

  // Handle form submission
  async handleSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const data = {};
    
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }
    
    try {
      const endpoint = this.isLoginMode ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      // Check if the API endpoint is available (will fail if database is not connected)
      if (response.ok) {
        const result = await response.json();
        
        if (result.success) {
          // Store token and user info
          localStorage.setItem('token', result.token);
          localStorage.setItem('user', JSON.stringify(result.user));
          
          // Authenticate the socket connection
          socketManager.emit('authenticate', { token: result.token });
          
          // Call login success callback
          if (this.onLoginSuccess) {
            this.onLoginSuccess(result.user);
          }
        } else {
          this.errorMessage = result.message;
          this.render();
        }
      } else {
        // If the API is not available, enter offline/guest mode
        console.warn('Auth API not available, using guest mode');
        this.handleGuestLogin();
      }
    } catch (error) {
      console.error('Auth error:', error);
      // If there's a connection error, offer to continue as guest
      this.errorMessage = 'Database connection error. Try as a guest instead.';
      this.render();
    }
  }

  // Handle guest login (offline mode)
  handleGuestLogin() {
    const guestUsername = `Guest${Math.floor(Math.random() * 10000)}`;
    
    // Create a guest user object
    const guestUser = {
      username: guestUsername,
      isGuest: true
    };
    
    // Authenticate socket with guest username
    socketManager.emit('authenticate', { guestUsername });
    
    // Call login success callback
    if (this.onLoginSuccess) {
      this.onLoginSuccess(guestUser);
    }
  }

  // Render the auth view
  render() {
    this.container.innerHTML = `
      <h2 class="auth-title">${this.isLoginMode ? 'Login' : 'Register'}</h2>
      <form id="authForm">
        <div class="form-group">
          <input type="text" class="form-control" name="username" placeholder="Username" required>
        </div>
        ${!this.isLoginMode ? `
          <div class="form-group">
            <input type="email" class="form-control" name="email" placeholder="Email">
          </div>
        ` : ''}
        <div class="form-group">
          <input type="password" class="form-control" name="password" placeholder="Password" required>
        </div>
        ${this.errorMessage ? `<div class="error-message">${this.errorMessage}</div>` : ''}
        <button type="submit" class="btn btn-primary btn-block">
          ${this.isLoginMode ? 'Login' : 'Register'}
        </button>
      </form>
      <div class="auth-links">
        <a href="#" id="toggleAuthMode">
          ${this.isLoginMode ? 'Need an account? Register' : 'Already have an account? Login'}
        </a>
      </div>
      <div class="auth-links">
        <a href="#" id="quickPlay">Play as Guest</a>
      </div>
    `;
    
    // Add event listeners
    const form = this.container.querySelector('#authForm');
    form.addEventListener('submit', this.handleSubmit.bind(this));
    
    const toggleLink = this.container.querySelector('#toggleAuthMode');
    toggleLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.toggleMode();
    });
    
    const quickPlayLink = this.container.querySelector('#quickPlay');
    quickPlayLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.handleGuestLogin();
    });
    
    return this.container;
  }
}

// Export the auth view
window.AuthView = AuthView;