import React, { useEffect, useState } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import AuthService from "../services/AuthService";
import logo from "../assets/images/whiteLogo.png";
import LogoutModal from "./LogoutModal";

const Sidebar = () => {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [permissions, setPermissions] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('permissions');
      if (stored) {
        setPermissions(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error parsing permissions:", error);
    }
  }, []);

  const hasPermission = (key) => {
      console.log(permissions);

    // If no permissions are stored, assume full access (regular user)
    if (!permissions || permissions.length === 0) return true;
    return permissions.some(p => p.key === key);
  };

  const logout = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = () => {
    setShowLogoutModal(false);
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  const toggleDropdown = (dropdownId) => {
    setOpenDropdown(openDropdown === dropdownId ? null : dropdownId); // Toggle the dropdown
  };

  const toggleSidebarCollapse = () => {
    setIsCollapsed(!isCollapsed);
    // Close dropdown when collapsing
    if (!isCollapsed) {
      setOpenDropdown(null);
      document.body.classList.add('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-collapsed');
    }
  };

  useEffect(() => {
    initializeSidebar();

    // Add window resize listener for mobile responsiveness
    const handleResize = () => {
      if (window.innerWidth > 991) {
        setIsMobileOpen(false);
        document.body.classList.remove('sidebar-open');
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cleanupSidebar();
      window.removeEventListener('resize', handleResize);
    };
  });

  // Handle initial state and cleanup
  useEffect(() => {
    // Set initial state
    if (isCollapsed) {
      document.body.classList.add('sidebar-collapsed');
      // Close dropdown when collapsing
      setOpenDropdown(null);
    } else {
      document.body.classList.remove('sidebar-collapsed');
    }

    // Cleanup on unmount
    return () => {
      document.body.classList.remove('sidebar-collapsed');
    };
  }, [isCollapsed]);

  const initializeSidebar = () => {
    const button = document.getElementById("kt_app_sidebar_mobile_toggle");
    if (button) {
      button.addEventListener("click", toggleSidebar);
    }

    const menuLinks = document.querySelectorAll(".menu-link");
    menuLinks.forEach((link) => {
      link.addEventListener("click", hideSidebar);
    });
  };

  const toggleSidebar = () => {
    const sidebar = document.getElementById("kt_app_sidebar");
    console.log(sidebar);
    
    if (window.innerWidth <= 991) {
      // Mobile behavior
      setIsMobileOpen(!isMobileOpen);
      if (!isMobileOpen) {
        sidebar.classList.add('show');
        document.body.classList.add('sidebar-open');
      } else {
        sidebar.classList.remove('show');
        document.body.classList.remove('sidebar-open');
      }
    } else {
      // Desktop behavior
      sidebar.style.display =
        sidebar.style.display === "block" ? "none" : "block";
    }
  };

  const hideSidebar = () => {
    const sidebar = document.getElementById("kt_app_sidebar");
    if (window.innerWidth <= 991) {
      // Mobile behavior
      setIsMobileOpen(false);
      sidebar.classList.remove('show');
      document.body.classList.remove('sidebar-open');
    } else {
      // Desktop behavior
      sidebar.style.display = "none";
    }
  };

  const cleanupSidebar = () => {
    const button = document.getElementById("kt_app_sidebar_mobile_toggle");
    if (button) {
      button.removeEventListener("click", toggleSidebar);
    }

    const menuLinks = document.querySelectorAll(".menu-link");
    menuLinks.forEach((link) => {
      link.removeEventListener("click", hideSidebar);
    });
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="sidebar-backdrop show"
          onClick={hideSidebar}
        ></div>
      )}

      <div
        id="kt_app_sidebar"
        className={`app-sidebar flex-column ${isCollapsed ? "collapsed" : ""} ${isMobileOpen ? "show" : ""}`}
        data-kt-drawer="true"
        data-kt-drawer-name="app-sidebar"
        data-kt-drawer-activate="{default: true, lg: false}"
        data-kt-drawer-overlay="true"
        data-kt-drawer-width={isCollapsed ? "80px" : "265px"}
        data-kt-drawer-direction="start"
        data-kt-drawer-toggle="#kt_app_sidebar_mobile_toggle"
        style={{
          width: isCollapsed ? "80px" : "265px",
          backgroundColor: "black",
        }}
      >
      <div
        className="app-sidebar-logo px-6 d-flex justify-content-center align-items-center position-relative"
        style={{ backgroundColor: "black", height: "100px" }}
        id="kt_app_sidebar_logo"
      >
        <NavLink to="/dashboard">
          <img
            alt="Logo"
            src={logo}
            className={`text-center ${
              isCollapsed
                ? "app-sidebar-logo-minimize"
                : "app-sidebar-logo-default"
            }`}
            style={{
              maxWidth: isCollapsed ? "80px" : "270px",
              maxHeight: isCollapsed ? "40px" : "50px",
              transition: "all 0.3s ease",
              display: "block",
            }}
          />
        </NavLink>

        {/* Collapse/Expand Toggle Button */}
        <button
          id="kt_app_sidebar_toggle"
          className="btn btn-icon sidebar-toggle-btn btn-sm position-absolute top-50 end-0 translate-middle-y me-1"
          onClick={toggleSidebarCollapse}
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            color: "white",
            width: "25px",
            height: "25px",
            borderRadius: "6px",
          }}
        >
          <i
            className={`bi bi-chevron-left text-white transition-all ${
              isCollapsed ? "rotate-180" : ""
            }`}
            style={{ fontSize: "10px" }}
          ></i>
        </button>
      </div>

      <div className="app-sidebar-menu overflow-auto  flex-column-fluid" style={{ height: "calc(100vh - 100px)" }}>
        <div
          id="kt_app_sidebar_menu_wrapper"
          className="app-sidebar-wrapper hover-scroll-overlay-y my-5"
        >
          <div
            className="menu menu-column menu-rounded menu-sub-indention px-3"
            id="#kt_app_sidebar_menu"
            data-kt-menu="true"
            data-kt-menu-expand="false"
          >
            {hasPermission('view_dashboard') && (
            <div className="menu-item">
              <NavLink to="/dashboard" className="menu-link portal-nav-hover">
                <span className="menu-icon">
                  <span className="svg-icon svg-icon-2">
                    <i className="bi bi-house-door-fill fs-5"></i>
                  </span>
                </span>
                <span className="menu-title fs-6">Dashboard</span>
              </NavLink>
            </div>
            )}

            {hasPermission('view_post_question') && (
            <div className="menu-item">
              <NavLink to="/ask-question" className="menu-link portal-nav-hover">
                <span className="menu-icon">
                  <i class="bi bi-question-circle"></i>
                </span>
                <span className="menu-title fs-6">Post Question</span>
              </NavLink>
            </div>
            )}

            {hasPermission('view_my_lawyers') && (
            <div className="menu-item">
              <NavLink to="/my-lawyers" className="menu-link portal-nav-hover">
                <span className="menu-icon">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="fs-5"
                  >
                    {/* Person silhouette */}
                    <circle cx="12" cy="7" r="2.5" fill="none" />
                    <path d="M12 9.5v4" />
                    <path d="M8 15l1 1" />
                    <path d="M16 15l-1 1" />
                    <path d="M9 16h6" />
                    <path d="M9 16l-1 1" />
                    <path d="M15 16l1 1" />
                    <path d="M8 17h8" />
                    {/* Scales of justice */}
                    <path d="M6 4l-1 1" />
                    <path d="M18 4l1 1" />
                    <path d="M5 5h14" />
                    <path d="M5 5l-1 1" />
                    <path d="M19 5l1 1" />
                    <path d="M4 6h2" />
                    <path d="M18 6h2" />
                    <path d="M5 7v1" />
                    <path d="M19 7v1" />
                    <path d="M4 8h2" />
                    <path d="M18 8h2" />
                  </svg>
                </span>
                <span className="menu-title fs-6">My Lawyers</span>
              </NavLink>
            </div>
            )}

            {hasPermission('view_lawyers') && (
            <div className="menu-item">
              <NavLink to="/lawyers" className="menu-link portal-nav-hover">
                <span className="menu-icon">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="fs-5"
                  >
                    {/* Person silhouette */}
                    <circle cx="12" cy="7" r="2.5" fill="none" />
                    <path d="M12 9.5v4" />
                    <path d="M8 15l1 1" />
                    <path d="M16 15l-1 1" />
                    <path d="M9 16h6" />
                    <path d="M9 16l-1 1" />
                    <path d="M15 16l1 1" />
                    <path d="M8 17h8" />
                    {/* Scales of justice */}
                    <path d="M6 4l-1 1" />
                    <path d="M18 4l1 1" />
                    <path d="M5 5h14" />
                    <path d="M5 5l-1 1" />
                    <path d="M19 5l1 1" />
                    <path d="M4 6h2" />
                    <path d="M18 6h2" />
                    <path d="M5 7v1" />
                    <path d="M19 7v1" />
                    <path d="M4 8h2" />
                    <path d="M18 8h2" />
                  </svg>
                </span>
                <span className="menu-title fs-6">Lawyers</span>
              </NavLink>
            </div>
            )}

            {hasPermission('view_chat') && (
            <div className="menu-item">
              <NavLink to="/chat" className="menu-link portal-nav-hover">
                <span className="menu-icon">
                  <i class="bi bi-chat-left-dots"></i>
                </span>
                <span className="menu-title fs-6">Chat</span>
              </NavLink>
            </div>
            )}

            {hasPermission('view_my_cases') && (
            <div className="menu-item">
              <NavLink end to="/my-cases" className="menu-link portal-nav-hover">
                <span className="menu-icon">
                  <i className="bi bi-briefcase-fill"></i>
                </span>
                <span className="menu-title fs-6">My Cases</span>
              </NavLink>
            </div>
            )}

            {hasPermission('manage_team') && (
            <div className="menu-item">
              <NavLink end to="/employees" className="menu-link portal-nav-hover">
                <span className="menu-icon">
                  <i className="bi bi-person-lines-fill"></i>
                </span>
                <span className="menu-title fs-6">Teams</span>
              </NavLink>
            </div>
            )}

            {hasPermission('manage_account') && (
            <div className="menu-item">
              <NavLink to="/account" className="menu-link portal-nav-hover">
                <span className="menu-icon">
                  <i className="bi bi-file-earmark-text"></i>
                </span>
                <span className="menu-title fs-6">Account Settings</span>
              </NavLink>
            </div>
            )}

            {/* Help & Support - Simple sidebar Nav-link */}
            {hasPermission('view_help_support') && (
            <div className="menu-item">
              <NavLink to="/help-support" className="menu-link portal-nav-hover" onClick={hideSidebar}>
                <span className="menu-icon">
                  <i class="bi bi-headset"></i>
                </span>
                <span className="menu-title fs-6">Help & Support</span>
              </NavLink>
            </div>
            )}
          </div>
        </div>
      </div>

      {/* Logout Modal */}
      <LogoutModal
        show={showLogoutModal}
        onClose={handleLogoutCancel}
        onConfirm={handleLogoutConfirm}
      />
      </div>
    </>
  );
};

export default Sidebar;
