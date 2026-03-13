import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import notificationProfile from "../../assets/images/notification-profile.png";
import logo from "../../assets/images/logo.png";
import ApiService from "../../services/ApiService";
import { toast } from "react-toastify";

const List = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAsRead, setMarkingAsRead] = useState(null);
  const [clearingAll, setClearingAll] = useState(false);

  // Format time to relative time (e.g., "1 hour ago", "2 days ago")
  const formatRelativeTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) {
      return "Just now";
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days !== 1 ? "s" : ""} ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    }
  };

  // Fetch notifications from API
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await ApiService.request({
        method: "GET",
        url: "getNotifications",
      });

      const data = response.data;
      if (data.status && data.data && data.data.notifications) {
        // Transform API notifications to match component format
        const transformedNotifications = data.data.notifications.map((notification) => {
          // Use logo for all notifications instead of user picture
          return {
            id: notification.id,
            name: notification.title || "Notification",
            message: notification.message || "",
            time: formatRelativeTime(notification.created_at),
            isUnread: !notification.is_read,
            avatar: logo,
            rawData: notification,
          };
        });

        setNotifications(transformedNotifications);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error("Failed to load notifications");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const handleMarkAsRead = async (notificationId) => {
    if (markingAsRead === notificationId) return;

    try {
      setMarkingAsRead(notificationId);
      const response = await ApiService.request({
        method: "POST",
        url: "markasReadNotification",
        data: { notification_id: notificationId },
      });

      const data = response.data;
      if (data.status) {
        // Update local state
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.id === notificationId
              ? { ...notif, isUnread: false }
              : notif
          )
        );
      } else {
        toast.error(data.message || "Failed to mark notification as read");
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast.error("Failed to mark notification as read");
    } finally {
      setMarkingAsRead(null);
    }
  };

  // Clear all notifications
  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to clear all notifications?")) {
      return;
    }

    try {
      setClearingAll(true);
      const response = await ApiService.request({
        method: "POST",
        url: "clearAllNotifications",
      });

      const data = response.data;
      if (data.status) {
        setNotifications([]);
        toast.success(data.message || "All notifications cleared successfully");
      } else {
        toast.error(data.message || "Failed to clear notifications");
      }
    } catch (error) {
      console.error("Error clearing notifications:", error);
      toast.error("Failed to clear notifications");
    } finally {
      setClearingAll(false);
    }
  };

  // Handle notification click - mark as read and navigate if needed
  const handleNotificationClick = async (notification) => {
    // Mark as read if unread
    if (notification.isUnread) {
      await handleMarkAsRead(notification.id);
    }

    // Navigate based on notification data type
    const notificationData = notification.rawData?.data || {};
    if (notificationData.type === "chat" && notificationData.id) {
      navigate(`/chat`);
    } else if (notificationData.type === "case" && notificationData.id) {
      navigate(`/my-cases`);
    } else if (notificationData.type === "question" && notificationData.id) {
      navigate(`/post-question`);
    }
  };

  // Fetch notifications on component mount
  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <div className="d-flex flex-column flex-column-fluid notification-header">
      <div id="kt_app_content" className="app-content flex-column-fluid">
        <div id="kt_app_content_container" className="app-container container-xxl">
          {/* Header with Clear All button */}
          <div className="d-flex justify-content-between align-items-center mb-4 mt-4">
            <h2 className="fw-bold text-dark mb-0">Notifications</h2>
            {notifications.length > 0 && (
              <button
                className="btn btn-sm btn-light"
                onClick={handleClearAll}
                disabled={clearingAll}
              >
                {clearingAll ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Clearing...
                  </>
                ) : (
                  "Clear All"
                )}
              </button>
            )}
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : notifications.length === 0 ? (
            // Empty State
            <div className="d-flex flex-column align-items-center justify-content-center text-center py-5" style={{ minHeight: "400px" }}>
              <div className="mb-3">
                <i className="bi bi-bell-slash" style={{ fontSize: "4rem", color: "#ccc" }}></i>
              </div>
              <h5 className="text-muted mb-2">No Notifications</h5>
              <p className="text-muted mb-0">You don't have any notifications yet.</p>
            </div>
          ) : (
            // Notifications List
            <div className="row">
              <div className="col-12">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`card mb-3 shadow-sm ${notification.isUnread ? 'border-start border-primary border-3' : ''}`}
                    style={{
                      borderRadius: "12px",
                      backgroundColor: notification.isUnread ? "#f8f9fa" : "#ffffff",
                      border: notification.isUnread ? "none" : "1px solid #e0e0e0",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onClick={() => handleNotificationClick(notification)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#f0f0f0";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = notification.isUnread ? "#f8f9fa" : "#ffffff";
                    }}
                  >
                    <div className="card-body p-4">
                      <div className="d-flex align-items-start">
                        {/* Avatar with unread indicator */}
                        <div className="position-relative me-3">
                          <img
                            src={notification.avatar}
                            alt={notification.name}
                            className="rounded-circle"
                            style={{ width: "48px", height: "48px", objectFit: "cover" }}
                            onError={(e) => {
                              e.target.src = notificationProfile;
                            }}
                          />
                          {notification.isUnread && (
                            <div
                              className="position-absolute top-0 end-0"
                              style={{
                                width: "12px",
                                height: "12px",
                                backgroundColor: "#E44A33",
                                borderRadius: "50%",
                                border: "2px solid white",
                              }}
                            ></div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-fill">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <h6 className={`fw-bold mb-0 ${notification.isUnread ? 'text-dark' : 'text-black'}`}>
                              {notification.name}
                            </h6>
                            <span className="fs-7" style={{ color: "#8C8C8C" }}>
                              {notification.time}
                            </span>
                          </div>
                          <p className="mb-0" style={{ lineHeight: "1.5", color: "#646464" }}>
                            {notification.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default List;
