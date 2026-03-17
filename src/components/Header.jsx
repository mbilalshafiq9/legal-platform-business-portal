import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthService from "../services/AuthService";
import blank from "../assets/images/notification-profile.png";
import ApiService from "../services/ApiService";
import { toast } from "react-toastify";
import moment from "moment";
import { NavLink } from "react-router-dom";
import LogoutModal from "./LogoutModal";
import SocketService from "../services/SocketService";
import { motion, AnimatePresence } from "framer-motion";
import { initFirebaseMessaging } from "../services/firebaseMessaging";
import "../assets/css/profile-dropdown.css";
import "../assets/css/dark-mode.css";
import "../assets/css/dark-mode-animations.css";

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user] = useState(() => {
    try {
      const userStr = localStorage.getItem("loggedUser");
      if (userStr && userStr !== "undefined" && userStr.startsWith("{")) {
        return JSON.parse(userStr);
      }
    } catch (e) {
      console.error("Error parsing loggedUser in Header", e);
    }
    return null;
  });
  
  // Get user picture with fallback
  const getUserPicture = (user) => {
    return user?.picture || blank;
  };
  const getInitials = (fullName) => {
    if (!fullName || typeof fullName !== "string") return "";
    const parts = fullName.trim().split(/\s+/);
    const first = parts[0]?.[0] || "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
  };
 
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] =
    useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(
    localStorage.getItem("darkMode") === "true" || false
  );
  const [showNotificationPermission, setShowNotificationPermission] = useState(false);
  const profileDropdownTimeoutRef = useRef(null);
  const notificationDropdownTimeoutRef = useRef(null);
  const [headerAvatarError, setHeaderAvatarError] = useState(false);
  const [dropdownAvatarError, setDropdownAvatarError] = useState(false);

  // Check if we're on the Ask Question page
  const isAskQuestionPage =
    location.pathname.includes("/companies") ||
    location.pathname.includes("/ask-question");

  // Check if we're on the Chat page
  const isChatPage =
    location.pathname.includes("/users") ||
    location.pathname.includes("/messages") ||
    location.pathname.includes("/chat");

  // Check if we're on the My Lawyers page
  const isMyLawyersPage =
    location.pathname.includes("/jobs") ||
    location.pathname.includes("/my-lawyers");

  // Check if we're on the My Cases page
  const isMyCasesPage = location.pathname.includes("/my-cases");

  // Check if we're on the Lawyers page
  const isLawyersPage = location.pathname.includes("/lawyers");

  // Check if we're on the Notifications page
  const isNotificationsPage = location.pathname.includes("/notifications");

  // Check if we're on the Case Details page
  const isCaseDetailsPage =
    location.pathname.includes("/my-cases/") &&
    location.pathname !== "/my-cases";

  // Check if we're on the Employees page
  const isEmployeesPage = location.pathname.includes("/employees");

  // Check if we're on the Employee Details page (My Account)
  const isEmployeeDetailsPage =
    location.pathname.includes("/my-account/") ||
    location.pathname.includes("/employees/");
  const isAccountPage = location.pathname.includes("/account");

  const logout = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = () => {
    setShowLogoutModal(false);
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  const handleProfileClick = () => {
    navigate("/account");
    setShowProfileDropdown(false);
  };

  // Handle profile dropdown with delay to prevent closing when moving cursor to dropdown
  const handleProfileDropdownEnter = () => {
    // Clear any pending timeout
    if (profileDropdownTimeoutRef.current) {
      clearTimeout(profileDropdownTimeoutRef.current);
      profileDropdownTimeoutRef.current = null;
    }
    setShowProfileDropdown(true);
  };

  const handleProfileDropdownLeave = () => {
    // Add a small delay before closing to allow cursor to move to dropdown
    profileDropdownTimeoutRef.current = setTimeout(() => {
      setShowProfileDropdown(false);
      profileDropdownTimeoutRef.current = null;
    }, 200); // 200ms delay
  };

  // Handle notification dropdown with delay to prevent closing when moving cursor to dropdown
  const handleNotificationDropdownEnter = () => {
    // Clear any pending timeout
    if (notificationDropdownTimeoutRef.current) {
      clearTimeout(notificationDropdownTimeoutRef.current);
      notificationDropdownTimeoutRef.current = null;
    }
    setShowNotificationDropdown(true);
  };

  const handleNotificationDropdownLeave = () => {
    // Add a small delay before closing to allow cursor to move to dropdown
    notificationDropdownTimeoutRef.current = setTimeout(() => {
      setShowNotificationDropdown(false);
      notificationDropdownTimeoutRef.current = null;
    }, 200); // 200ms delay
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      
      if (profileDropdownTimeoutRef.current) {
        clearTimeout(profileDropdownTimeoutRef.current);
      }
      if (notificationDropdownTimeoutRef.current) {
        clearTimeout(notificationDropdownTimeoutRef.current);
      }
    };
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem("darkMode", newDarkMode.toString());
    
    // Create transition overlay effect
    const overlay = document.createElement('div');
    overlay.className = 'mode-transition-overlay';
    document.body.appendChild(overlay);
    
    // Apply dark mode class to body with smooth transition
    if (newDarkMode) {
      document.body.classList.add("dark-mode");
      document.body.style.transition = "background-color 0.3s ease, color 0.3s ease";
    } else {
      document.body.classList.remove("dark-mode");
      document.body.style.transition = "background-color 0.3s ease, color 0.3s ease";
    }
    
    // Add a temporary class for page transition effect
    document.body.classList.add("mode-transitioning");
    
    // Remove overlay and transition class after animation
    setTimeout(() => {
      document.body.classList.remove("mode-transitioning");
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }, 600);
  };

  useEffect(() => {
    if(!SocketService.checkConnection()){
      SocketService.connect();
      // Wait for connection before emitting
      setTimeout(() => {
        if (SocketService.checkConnection()) {
          SocketService.emit('user-connected', user);
        }
      }, 1000);
    } else {
      SocketService.emit('user-connected', user);
    }
    
    if(!user){
      navigate("/login");
    } else {
      // Fetch notifications on mount
      getNotifications();
      getProfile();
      
      // Check for notification permission
      if ("Notification" in window && Notification.permission === "default") {
        // Show permission request after a short delay
        setTimeout(() => {
          setShowNotificationPermission(true);
        }, 3000);
      }
    }
    // Apply dark mode on component mount
    if (isDarkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, [isDarkMode, user]);

  const handleNotificationPermission = async (allowed) => {
    
    if (allowed) {
      try {
        const token = await initFirebaseMessaging();
        if (token) {
          // Send token to backend
          await ApiService.request({
            method: "POST",
            url: "updateDeviceToken",
            data: { device_token: token }
          });
          toast.success("Notifications enabled!");
        } else {
          toast.info("Could not enable notifications. Please check your browser settings.");
        }
      } catch (error) {
        console.error("Error enabling notifications:", error);
      }
    }
    
    setShowNotificationPermission(false);
  };

  // Notification Permission Modal
  const NotificationPermissionModal = () => (
    <div 
      className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
      style={{ zIndex: 1060, backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-4 p-4 shadow-lg text-center"
        style={{ maxWidth: '400px', width: '90%' }}
      >
        <div className="mb-3">
          <div className="d-inline-flex align-items-center justify-content-center bg-light rounded-circle p-3 mb-3">
            <i className="bi bi-bell-fill text-primary fs-2"></i>
          </div>
          <h4 className="fw-bold mb-2">Enable Notifications</h4>
          <p className="text-muted mb-4">
            Stay updated with real-time alerts for messages, case updates, and lawyer responses.
          </p>
        </div>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-light flex-fill fw-semibold py-2"
            onClick={() => handleNotificationPermission(false)}
          >
            Not Now
          </button>
          <button 
            className="btn btn-primary flex-fill fw-semibold py-2"
            onClick={() => handleNotificationPermission(true)}
          >
            Allow
          </button>
        </div>
      </motion.div>
    </div>
  );

  const getNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const response = await ApiService.request({
        method: "GET",
        url: "getNotifications",
      });
      const data = response.data;
      if (data.status && data.data.notifications) {
        // Transform notifications to match component format
        const transformedNotifications = data.data.notifications.slice(0, 10).map((notification) => {
          const createdAt = notification.created_at ? new Date(notification.created_at) : new Date();
          const now = new Date();
          const diffInMs = now - createdAt;
          const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
          const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
          const diffInDays = Math.floor(diffInHours / 24);

          let timeAgo = "";
          if (diffInDays > 0) {
            timeAgo = `${diffInDays} day${diffInDays > 1 ? 's' : ''}`;
          } else if (diffInHours > 0) {
            timeAgo = `${diffInHours} hour${diffInHours > 1 ? 's' : ''}`;
          } else if (diffInMinutes > 0) {
            timeAgo = `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`;
          } else {
            timeAgo = "Just now";
          }

          // Extract picture from data field if it exists
          let picture = blank;
          if (notification.data && typeof notification.data === 'object') {
            picture = notification.data.picture || blank;
          }

          return {
            id: notification.id,
            message: notification.message || "",
            time: timeAgo,
            avatar: picture,
            read_at: notification.read_at,
            created_at: notification.created_at,
          };
        });

        setNotifications(transformedNotifications);
        
        // Calculate unread count (notifications without read_at)
        const unread = transformedNotifications.filter(n => !n.read_at).length;
        setUnreadCount(unread);
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoadingNotifications(false);
    }
  };
  const getProfile = async () => {
    try {
      const response = await ApiService.request({
        method: "GET",
        url: "getProfile",
      });
      const data = response.data;
      if (data.status) {

        setUnreadChatCount(data.data.chat_unread);
        // setUnreadCount(data.data.unread_notifications);
      } else {
        setUnreadChatCount(0);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const clearAllNotifications = async () => {
    try {
      const response = await ApiService.request({
        method: "POST",
        url: "clearAllNotifications",
      });
      const data = response.data;
      if (data.status) {
        setNotifications([]);
        setUnreadCount(0);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Error clearing notifications:", error);
      toast.error("Failed to clear notifications");
    }
  };

  // Notification Dropdown Component
  const NotificationDropdown = () => (
    <div
      className="notification-dropdown position-absolute bg-white shadow-lg rounded-3 border"
      style={{
        top: "100%",
        right: "0",
        width: "320px",
        maxHeight: "300px",
        zIndex: 1050,
        marginTop: "10px",
      }}
      onMouseEnter={handleNotificationDropdownEnter}
      onMouseLeave={handleNotificationDropdownLeave}
    >
      <div
        className="notification-list"
        style={{ maxHeight: "200px", overflowY: "auto" }}
      >
        {loadingNotifications ? (
          <div className="d-flex justify-content-center align-items-center p-3">
            <div className="spinner-border spinner-border-sm text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : notifications.length > 0 ? (
          notifications.map((notification, index) => (
            <div
              key={notification.id}
              className={`notification-item p-2 border-bottom ${!notification.read_at ? 'bg-light' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={async () => {
                // Mark as read if not already read
                if (!notification.read_at) {
                  try {
                    await ApiService.request({
                      method: "POST",
                      url: "markasReadNotification",
                      data: { notification_id: notification.id }
                    });
                    // Update local state
                    setNotifications(prev => 
                      prev.map(n => 
                        n.id === notification.id 
                          ? { ...n, read_at: new Date().toISOString() }
                          : n
                      )
                    );
                    // Update unread count
                    setUnreadCount(prev => Math.max(0, prev - 1));
                  } catch (error) {
                    console.error("Error marking notification as read:", error);
                  }
                }
              }}
            >
              <div className="d-flex align-items-start">
                <div className="symbol symbol-30px me-2">
                  <img
                    src={notification.avatar}
                    alt="Notification"
                    className="rounded-circle"
                    style={{ width: "30px", height: "30px", objectFit: "cover" }}
                    onError={(e) => {
                      e.target.src = blank;
                    }}
                  />
                </div>
                <div className="flex-grow-1">
                  <p
                    className={`mb-1 fs-8 ${!notification.read_at ? 'fw-bold' : 'text-dark'}`}
                    style={{ lineHeight: "1.3", fontSize: "12px" }}
                  >
                    {notification.message}
                  </p>
                  <small className="text-muted fs-9" style={{ fontSize: "10px" }}>
                    {notification.time}
                  </small>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-3 text-center text-muted">
            <small>No notifications</small>
          </div>
        )}
      </div>
      <div className="p-2 text-center border-top">
        <NavLink
          to="/notifications"
          className="btn bg-black text-white btn-sm w-100"
          onClick={() => setShowNotificationDropdown(false)}
          style={{ fontSize: "12px", padding: "4px 8px" }}
        >
          See All
        </NavLink>
      </div>
    </div>
  );

  // Profile Dropdown Component
  const ProfileDropdown = () => (
    <div
      className="profile-dropdown position-absolute bg-white shadow-lg rounded-3 border"
      style={{
        top: "100%",
        right: "0",
        width: "275px",
        zIndex: 1050,
        marginTop: "5px",
      }}
      onMouseEnter={handleProfileDropdownEnter}
      onMouseLeave={handleProfileDropdownLeave}
    >
      <div className="p-3">
        <div className="d-flex align-items-center mb-3">
          <div className="symbol symbol-50px me-3 d-flex align-items-center justify-content-center" style={{ width: "50px", height: "50px" }}>
            {(!user?.picture || String(user?.picture).toLowerCase().includes("blank")) ? (
              <div className="rounded-circle d-flex align-items-center justify-content-center bg-light text-white" style={{ width: "50px", height: "50px" }}>
                <span className="fw-bold text-dark" style={{ fontSize: "1rem" }}>{getInitials(user?.name)}</span>
              </div>
            ) : (
              <img
                src={getUserPicture(user)}
                onError={() => setDropdownAvatarError(true)}
                alt="Profile"
                className="rounded-circle"
                style={{ width: "50px", height: "50px", objectFit: "cover" }}
              />
            )}
          </div>
          <div className="flex-grow-1">
            <div className="fw-bold text-dark fs-5 mb-1">{user.name}</div>
            <div className="text-muted fs-7">{user.email}</div>
          </div>
        </div>
        <div className="separator my-3"></div>
        <div className="d-flex flex-column gap-2">
          <button
            onClick={handleProfileClick}
            className="btn btn-transparent text-start p-2 text-muted"
            style={{ fontSize: "14px" }}
          >
            Account Settings
          </button>
          <button
            onClick={logout}
            className="btn btn-transparent text-start p-2 text-muted"
            style={{ fontSize: "14px" }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );

  // Determine the page title and subtitle based on the current path
  const getPageDetails = () => {
    if (isAskQuestionPage) return { title: "Post question", subtitle: "Post Connect and Solve" };
    if (isChatPage) return { title: "Messages", subtitle: "Quick, Clear and concise communications." };
    if (isMyLawyersPage) return { title: "My Lawyers", subtitle: "Stay updated with your legal team anytime." };
    if (isMyCasesPage) return { title: "My Cases", subtitle: "View all your cases and connect with interested lawyers." };
    if (isLawyersPage) return { title: "Lawyers", subtitle: "Search, compare, and connect with verified lawyers instantly." };
    if (isNotificationsPage) return { title: "Notifications", subtitle: "Listing notifications" };
    if (isCaseDetailsPage) return { title: "Case Summary", subtitle: "Detail" };
    if (isEmployeeDetailsPage) return { title: "My Account", subtitle: "View and manage account information." };
    if (isEmployeesPage) return { title: "Team", subtitle: "Add your team members and send invites." };
    if (isAccountPage) return { title: "Account", subtitle: "Manage profile, email, and security." };
    
    // Default for Dashboard or unknown pages
    return { title: "Dashboard", subtitle: "Monitor your cases and messages." };
  };

  const { title, subtitle } = getPageDetails();

  return (
    <div
      id="kt_app_header"
      className="app-header modern-header-container"
      data-aos="fade-down"
    >
      <div className="d-flex justify-content-between align-items-center w-100 px-lg-5">
        <div className="d-flex align-items-center">
          {/* Mobile menu toggle */}
          <div
            className="d-flex align-items-center d-lg-none me-3"
            title="Show sidebar menu"
          >
            <div
              className="btn btn-icon btn-active-color-primary w-35px h-35px"
              id="kt_app_sidebar_mobile_toggle"
            >
              <i className="bi bi-list text-gray-600 fs-1"></i>
            </div>
          </div>
          <div>
            <h1 className="fw-bold text-dark fs-2 mb-1">{title}</h1>
            <p className="text-gray-600 fs-6 mb-0">{subtitle}</p>
          </div>
        </div>

        <div className="d-flex align-items-center gap-3">
          {/* Dark Mode Toggle */}
          <motion.div 
            className="modern-icon-container dark-mode-toggle"
            onClick={toggleDarkMode}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <AnimatePresence mode="wait">
              <motion.i
                key={isDarkMode ? "sun" : "moon"}
                className={`modern-icon ${isDarkMode ? 'bi bi-sun' : 'bi bi-moon'}`}
                initial={{ rotate: -180, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 180, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              />
            </AnimatePresence>
          </motion.div>

          {/* Messages Icon */}
          <NavLink to="/chat" className="text-decoration-none">
            <div className="modern-icon-container position-relative">
              <i className="bi bi-chat-dots text-gray-600 fs-4"></i>
              {unreadChatCount > 0 && (
                <span 
                  className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-black"
                  style={{ fontSize: "0.6rem" }}
                >
                  {unreadChatCount > 9 ? '9+' : unreadChatCount}
                </span>
              )}
            </div>
          </NavLink>
          
          {/* Notifications Icon */}
          <div
            className="modern-icon-container position-relative"
            onMouseEnter={handleNotificationDropdownEnter}
            onMouseLeave={handleNotificationDropdownLeave}
          >
            <i className="bi bi-bell text-gray-600 fs-4"></i>
            {unreadCount > 0 && (
              <span
                className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-black"
                style={{ fontSize: "0.6rem" }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
            {showNotificationDropdown && <NotificationDropdown />}
          </div>

          {/* User Profile */}
          <div 
            className="symbol symbol-40px position-relative"
            onMouseEnter={handleProfileDropdownEnter}
            onMouseLeave={handleProfileDropdownLeave}
          >
            <div className="symbol-label text-white rounded-circle cursor-pointer d-flex align-items-center justify-content-center w-50px h-50px">
              {(!user?.picture || String(user?.picture).toLowerCase().includes("blank")) ? (
                <span className="fw-bold text-dark " style={{ fontSize: "1rem" }}>{getInitials(user?.name)}</span>
              ) : (
                <img
                  src={getUserPicture(user)}
                  onError={() => setHeaderAvatarError(true)}
                  className="w-40px h-40px rounded-circle"
                  alt="Profile"
                />
              )}
            </div>
            {showProfileDropdown && <ProfileDropdown />}
          </div>
        </div>
      </div>

      {/* Logout Modal */}
      <LogoutModal
        show={showLogoutModal}
        onClose={handleLogoutCancel}
        onConfirm={handleLogoutConfirm}
      />
      
      {/* Notification Permission Modal */}
      {showNotificationPermission && <NotificationPermissionModal />}
    </div>
  );
};

export default Header;
