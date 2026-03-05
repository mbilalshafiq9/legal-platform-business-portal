import ApiService from './ApiService';
// import ToastService from '../services/ToastService';

class AuthService {

  constructor(router) {
    this.router = router; // Store the router instance
  }

  // User login - sends OTP to email
  async userLogin(email, language = 'en', deviceToken = null, is_company = 1) {
    try {
      const response = await ApiService.request({
        method: 'POST',
        url: 'login',
        data: { email, language, deviceToken, is_company },
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Verify OTP and get auth token
  async verifyOTP(email, otp, deviceToken = null) {
    try {
      const response = await ApiService.request({
        method: 'POST',
        url: 'verifyOTP',
        data: { email, otp, deviceToken },
      });

      if (response.data && response.data.status && response.data.data) {
        // Save user and auth token to localStorage
        var loggedUser = response.data.data.user;
        loggedUser.auth_token = response.data.data.auth_token;
        loggedUser.lastLogin = new Date().toISOString();
        
        localStorage.setItem('loggedUser', JSON.stringify(loggedUser));
        localStorage.setItem('isAuthenticated', 'true');
        
        return response.data;
      }
      
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Password based login
  async passwordLogin(email, password, deviceToken = null, is_company = 1) {
    try {
      const response = await ApiService.request({
        method: 'POST',
        url: 'password-login',
        data: { email, password, deviceToken, is_company },
      });

      if (response.data && response.data.status && response.data.data) {
        if (response.data.data.is_2fa_enabled) {
           return response.data;
        }

        // Save user and auth token to localStorage if not 2fa
        var loggedUser = response.data.data.user;
        if (response.data.data.is_team_member) {
          const team_member={
            id:response.data.data.team.id,
            name:response.data.data.team.name,
            email:response.data.data.team.email,
            role:response.data.data.team.role,
            picture:response.data.data.team?.picture,
            is_2fa_enabled:response.data.data.team?.is_2fa_enabled,
          };
            loggedUser = team_member;
        }
        loggedUser.auth_token = response.data.data.auth_token;
        loggedUser.lastLogin = new Date().toISOString();
        
    
        // Handle permissions
        let permissions = [];
        if (response.data.data.permissions) {
              permissions = response.data.data.permissions;
        }
        localStorage.setItem('permissions', JSON.stringify(permissions));
        
        localStorage.setItem('loggedUser', JSON.stringify(loggedUser));
        localStorage.setItem('isAuthenticated', 'true');
        
        return response.data;
      }
      
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Google login
  async googleLogin(name, email, googleId, deviceToken = null) {
    try {
      const response = await ApiService.request({
        method: 'POST',
        url: 'google-signin',
        data: { name, email, googleId, deviceToken },
      });

      if (response.data && response.data.status && response.data.data) {
        // Save user and auth token to localStorage
        var loggedUser = response.data.data.user;
        loggedUser.auth_token = response.data.data.auth_token;
        loggedUser.lastLogin = new Date().toISOString();
        
        localStorage.setItem('loggedUser', JSON.stringify(loggedUser));
        localStorage.setItem('isAuthenticated', 'true');
        
        return response.data;
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Legacy admin login method (keeping for backward compatibility)
  async login(email, password) {
    try {
      const response = await ApiService.request({
        method: 'POST',
        url: 'system-users/auth/login',
        data: { email, password },
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  logout() {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('loggedUser');
    window.location.href = process.env.REACT_APP_BASE_PATH + '/login';
  }
  
  isAuthenticated() {
    const user = this.getCurrentUser();
    const authStatus = localStorage.getItem('isAuthenticated');
    return !!(user && authStatus && user.auth_token);
  }

  getCurrentUser() {
    const userStr = localStorage.getItem('loggedUser');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }

  getAuthToken() {
    const user = this.getCurrentUser();
    return user ? user.auth_token : null;
  }
}

const authServiceInstance = new AuthService(/* pass your router instance here */);
export default authServiceInstance;
