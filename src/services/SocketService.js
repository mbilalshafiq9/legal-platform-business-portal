import io from 'socket.io-client';

// Get socket URL from environment variables
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'https://legalplatform.co:4000';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.listeners = new Map();
    this.connect(); // Connect on instantiation
  }

  // Initialize socket connection
  connect() {
    if (this.socket && this.socket.connected) return;

    // Disconnect existing if any (to be safe)
    if (this.socket) {
      this.socket.disconnect();
    }

    const socketOptions = {
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['websocket', 'polling'], // Allow polling fallback
      path: '/socket.io',
      autoConnect: true,
      forceNew: true // Force new connection
    };

    this.socket = io(SOCKET_URL, socketOptions);

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      this.connected = true;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.connected = false;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.connected = false;
      if (reason === 'io server disconnect') {
        this.socket.connect();
      }
    });
  }

  // Subscribe to an event
  subscribe(event, callback) {
    if (!this.socket || !this.socket.connected) {
      this.connect();
    }
    
    // Check if socket is actually initialized before calling on
    if (this.socket) {
        this.socket.on(event, callback);
    } else {
        // Retry after short delay if socket not ready
        setTimeout(() => this.subscribe(event, callback), 500);
        return () => {}; // Return dummy unsubscribe
    }

    // Return unsubscribe function
    return () => {
      if (this.socket) {
        this.socket.off(event, callback);
      }
    };
  }

  // Emit an event
  emit(event, data, callback) {
    if (!this.socket || !this.socket.connected) {
      this.connect();
    }
    
    if (this.socket) {
        return this.socket.emit(event, data, callback);
    }
  }
  
  // Get connection status (alias for backward compatibility)
  isConnected() {
    return this.checkConnection();
  }

  // Get connection status
  checkConnection() {
    return this.connected && this.socket && this.socket.connected;
  }
  
  // Get socket instance
  getSocket() {
    return this.socket;
  }
}

// Create a singleton instance
const socketServiceInstance = new SocketService();

export default socketServiceInstance;