import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import Lottie from "lottie-react";

import notificationProfile from "../assets/images/notification-profile.png";

import postYourLegal from "../assets/images/postYourLegal.png";
import hireLawyer from "../assets/images/hireLawyer.png";
import createNewCase from "../assets/images/createNewCase.png";
import successAnimation from "../assets/images/Succes.json";
import noData from "../assets/images/no-data.png";
import profileIconAnimation from "../assets/images/profile-icon.json";

import { toast } from "react-toastify";
import ApiService from "../services/ApiService";
import CreateCaseModal from "../components/CreateCaseModal";
import AskQuestionOffcanvas from "../components/AskQuestionOffcanvas";
import "../assets/css/dashboard-hover-fixes.css";
import "../assets/css/siri-border-animation.css";
import "../assets/css/welcome-message.css";

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("active");
  const [showPostQuestion, setShowPostQuestion] = useState(false);
  const [showCreateCase, setShowCreateCase] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);
  const [displayedText, setDisplayedText] = useState("");

  // Dashboard data states
  const [userInfo, setUserInfo] = useState({ name: "", location: "" });
  const [recentQuestion, setRecentQuestion] = useState(null);
  const [lawyerResponses, setLawyerResponses] = useState([]);
  const [activeLawyers, setActiveLawyers] = useState([]);
  const [inactiveLawyers, setInactiveLawyers] = useState([]);
  const [cases, setCases] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Select states
  const [postQuestionJurisdiction, setPostQuestionJurisdiction] =
    useState(null);
  const [showPostQuestionJurisdictionDropdown, setShowPostQuestionJurisdictionDropdown] = useState(false);
  const [postQuestionText, setPostQuestionText] = useState("");
  const postQuestionJurisdictionRef = useRef(null);
  const [jurisdictionSearch, setJurisdictionSearch] = useState("");

  // Dynamic Options
  const [jurisdictionOptions, setJurisdictionOptions] = useState([]);

  const handleAddQuestionClick = () => {
    setShowPostQuestion(true);
  };

  const handleClosePostQuestion = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowPostQuestion(false);
      setIsClosing(false);
      setShowPostQuestionJurisdictionDropdown(false);
    }, 300); // Match animation duration
  };

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      // Don't set loading true here to avoid full page flicker on refresh
      const response = await ApiService.request({
        method: "GET",
        url: "getBusinessDashboard",
      });
      const data = response.data;
      if (data.status) {
        setUserInfo(data.data.user_info || { name: "", location: "" });
        setRecentQuestion(data.data.recent_question || null);
        setLawyerResponses(data.data.lawyer_responses || []);
        setActiveLawyers(data.data.active_lawyers || []);
        setInactiveLawyers(data.data.inactive_lawyers || []);
        setCases(data.data.cases || []);
        setNotifications(data.data.notifications || []);
      } else {
        toast.error(data.message || "Failed to load dashboard data");
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    }
  }, []);

  const handlePostQuestion = async () => {
    if (!postQuestionText.trim()) {
      toast.error("Please enter your question");
      return;
    }

    if (!postQuestionJurisdiction) {
      toast.error("Please select a jurisdiction");
      return;
    }

    try {
      const response = await ApiService.request({
        method: "POST",
        url: "addQuestion",
        data: {
          question: postQuestionText,
          jurisdiction_id: postQuestionJurisdiction,
        },
      });

      const data = response.data;
      if (data.status) {
        // Show success animation
        setShowSuccessAnimation(true);
        // Reset form
        setPostQuestionText("");
        setPostQuestionJurisdiction(null);
        // Close the offcanvas after a delay
        setTimeout(() => {
          setShowPostQuestion(false);
        }, 300);
        
        // Refresh dashboard data
        fetchDashboardData();
      } else {
        toast.error(data.message || "Failed to post question");
      }
    } catch (error) {
      console.error("Error posting question:", error);
      toast.error("Failed to post question. Please try again.");
    }
  };

  // Initial Data Fetch
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      await fetchDashboardData();
      
      // Fetch jurisdictions for Post Question dropdown
      try {
        const dropdownResponse = await ApiService.request({
          method: "GET",
          url: "getDropdownData",
        });
        const dropdownData = dropdownResponse.data;
        if (dropdownData.status && dropdownData.data && dropdownData.data.jurisdictions) {
          const options = dropdownData.data.jurisdictions.map(j => ({
            label: j.name,
            value: j.id
          }));
          setJurisdictionOptions(options);
        }
      } catch (error) {
        console.error("Error fetching jurisdictions:", error);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [fetchDashboardData]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (postQuestionJurisdictionRef.current && !postQuestionJurisdictionRef.current.contains(event.target)) {
        setShowPostQuestionJurisdictionDropdown(false);
      }
    };

    if (showPostQuestionJurisdictionDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPostQuestionJurisdictionDropdown]);

  if (loading) {
    return (
      <div className="d-flex flex-column flex-column-fluid header-main dashboard--inter-font">
        <div id="kt_app_content" className="app-content flex-column-fluid">
          <div
            id="kt_app_content_container"
            className="app-container container-fluid"
          >
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "50vh" }}>
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column flex-column-fluid dashboard--inter-font">
      <div id="kt_app_content" className="app-content flex-column-fluid">
        <div
          id="kt_app_content_container"
          className="app-container container-fluid"
        >
          {/* Animated Welcome Message */}
          {showWelcomeMessage && (
            <div className="welcome-message-container">
              <div className="welcome-message-box">
                <div className="welcome-message-icon">
                  <Lottie
                    animationData={profileIconAnimation}
                    loop={true}
                    autoplay={true}
                    style={{ width: "32px", height: "32px" }}
                  />
                </div>
                <span className="welcome-message-text">
                  {displayedText}
                </span>
              </div>
            </div>
          )}

          {/* Main Content Row */}
          <div className="row">
            {/* Left Column - Main Content */}
            <div className="col-md-8 pt-4 dashboard-main-content">
              {/* Welcome Header */}
              <div className="mb-6" data-aos="fade-up">
                <h1 className="text-black mb-2 dashboard-welcome-title">
                  Welcome Back! {userInfo.name || "User"}
                </h1>
                <p className="text-gray-600 mb-4 dashboard-welcome-subtitle">
                  {userInfo.location || "Location not available"}
                </p>
              </div>

              {/* Action Cards */}
              <div className="row mb-8">
                <div
                  className="col-lg-4 col-md-6 mb-4"
                  data-aos="fade-up"
                  data-aos-delay="100"
                >
                  <div
                    className="card h-100 dashboard-card-hover dashboard-action-card"
                    onClick={handleAddQuestionClick}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="card-body p-4 d-flex flex-column justify-content-between h-100">
                      <div>
                        <h5 className="text-black fw-bold mb-3">
                          Post Your Legal <br /> Issues
                        </h5>
                      </div>
                      <div className="d-flex justify-content-between align-items-center">
                        <button
                          className="btn btn-light rounded-circle d-flex justify-content-center align-items-center portal-button-hover dashboard-action-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddQuestionClick();
                          }}
                        >
                          <i className="bi bi-plus fs-1 text-dark pe-0"></i>
                        </button>
                        <img
                          src={postYourLegal}
                          alt="Post Your Legal"
                          className="w-100px h-100px postYourLegalImage"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className="col-lg-4 col-md-6 mb-4"
                  data-aos="fade-up"
                  data-aos-delay="200"
                >
                  <NavLink
                    to={"/lawyers"}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <div
                      className="card h-100 shadow dashboard-card-hover dashboard-action-card"
                      style={{ cursor: "pointer" }}
                    >
                      <div className="card-body p-4 d-flex flex-column justify-content-between h-100">
                        <div>
                          <h5 className="text-dark fw-bold mb-3">
                            Hire Lawyer
                          </h5>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <div className="dashboard-card-hover-icon">
                            <button
                              className="btn btn-light rounded-circle d-flex justify-content-center align-items-center portal-button-hover dashboard-action-button"
                              type="button"
                              onClick={(e) => e.preventDefault()}
                            >
                              <i className="bi bi-plus fs-1 text-dark pe-0"></i>
                            </button>
                          </div>
                          <img
                            src={hireLawyer}
                            alt="Hire Lawyer"
                            className="w-100px h-100px hireLawyerImage"
                          />
                        </div>
                      </div>
                    </div>
                  </NavLink>
                </div>

                <div
                  className="col-lg-4 col-md-6 mb-4"
                  data-aos="fade-up"
                  data-aos-delay="300"
                >
                  <div
                    className="card h-100 shadow dashboard-card-hover dashboard-action-card"
                    onClick={() => setShowCreateCase(true)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="card-body p-4 d-flex flex-column justify-content-between h-100">
                      <div>
                        <h5 className="text-dark fw-bold mb-3">
                          Create New Case
                        </h5>
                      </div>
                      <div className="d-flex justify-content-between align-items-center">
                        <button
                          className="btn rounded-circle d-flex justify-content-center align-items-center dashboard-action-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowCreateCase(true);
                          }}
                        >
                          <i className="bi bi-plus fs-1 text-black p-0"></i>
                        </button>
                        <img
                          src={createNewCase}
                          alt="Create New Case"
                          className="w-125px h-100px createNewCaseImage"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Posted Question and Lawyer Respond */}
              <div
                className="card mb-6 shadow recent-posted-question-card recent-question-card-hover dashboard-recent-question-card"
                data-aos="fade-up"
                data-aos-delay="500"
              >
                <div className="card-body p-4">
                  <div className="row">
                    {/* Recent Posted Question Section */}
                    <div className="col-lg-7 col-md-12 mb-4 mb-lg-0">
                      <h1 className="fw-bold text-dark mb-4">
                        Recent Posted Question
                      </h1>
                      {recentQuestion ? (
                        <>
                          <p className="text-gray-700 mb-4">
                            {recentQuestion.question}
                          </p>
                          <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
                            <div className="d-flex align-items-center">
                              <i className="bi bi-eye-fill text-black me-2"></i>
                              <span className="text-black">Views: {recentQuestion.views_count || 0}</span>
                            </div>
                            <div className="d-flex align-items-center">
                              <i className="bi bi-chat-dots-fill text-black me-2"></i>
                              <span className="text-black">Ans: {recentQuestion.answers_count || 0}</span>
                            </div>
                          </div>
                          {recentQuestion.created_at && (
                            <div
                              className="d-flex align-items-center justify-content-center bg-light rounded-pill py-2 px-3 dashboard-date-pill"
                              style={{ width: "40%" }}
                            >
                              <span className="text-black dashboard-date-text">
                                {recentQuestion.created_at}
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-gray-600">
                          <img src={noData} alt="No Data" className="w-150px mt-3" /> <br />
                          No questions posted yet</p>
                      )}
                    </div>

                    {/* Lawyer Respond Section */}
                    <div className="col-lg-5 col-md-12">
                      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4">
                        <h2 className="fw-bold mb-0 mb-md-0 dashboard-lawyer-respond-title">
                          Lawyer Respond
                        </h2>
                        <a
                          href="#"
                          className="text-muted fw-semibold text-decoration-none text-md-end"
                        >
                          See All
                        </a>
                      </div>

                      {lawyerResponses.length > 0 ? (
                        lawyerResponses.slice(0, 3).map((lawyer, index, array) => (
                          <div key={lawyer.id || index} className={`d-flex align-items-start ${index < array.length - 1 ? 'mb-4' : ''}`}>
                            <div className="symbol symbol-50px me-3 flex-shrink-0">
                              <img
                                src={lawyer.picture || notificationProfile}
                                alt={lawyer.name}
                                className="rounded-circle"
                                onError={(e) => {
                                  e.target.src = notificationProfile;
                                }}
                              />
                            </div>
                            <div className="flex-grow-1">
                              <h6 className="fw-bold text-dark mb-1">
                                {lawyer.name}
                              </h6>
                              <p className="text-gray-600 mb-0 small">
                                {lawyer.answer || "Answered your question"}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-600">
                          <img src={noData} alt="No Data" className="w-150px mt-3" /> <br />
                          No lawyer responses yet</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* My Lawyers */}
              <div
                className="card shadow-sm border-0 dashboard-my-lawyers-card"
                data-aos="fade-up"
                data-aos-delay="400"
              >
                <div className="card-body p-4">
                  {/* Header */}
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h4 className="fw-bold text-dark mb-0">My Lawyers</h4>
                    
                    <NavLink to={"/my-lawyers"}>
                      <a
                        href="#"
                        className="fw-semibold text-decoration-none text-muted"
                      >
                        See All
                      </a>
                    </NavLink>
                  </div>

                  {/* Tab Buttons */}
                  <div className="my-4 lawyers-tabs">
                      <button
                        className={`btn rounded-pill portal-tab-hover ${
                          activeTab === "active"
                            ? "bg-black text-white"
                            : "btn-light text-black"
                        }`}
                        onClick={() => setActiveTab("active")}
                      >
                        Active Lawyers
                      </button>
                      <button
                        className={`btn rounded-pill portal-tab-hover ${
                          activeTab === "inactive"
                            ? "bg-black text-white"
                            : "btn-light text-black"
                        }`}
                        onClick={() => setActiveTab("inactive")}
                      >
                        Inactive Lawyers
                      </button>
                    </div>

                  {/* Lawyers List */}
                  {(activeTab === "active" ? activeLawyers : inactiveLawyers).length > 0 ? (
                    (activeTab === "active" ? activeLawyers : inactiveLawyers).map((lawyer, index) => (
                    <div
                      key={lawyer.id || index}
                      className="card mb-3 border-0 shadow-sm lawyer-card-hover"
                      data-aos="fade-up"
                      data-aos-delay={`${500 + index * 100}`}
                    >
                      <div className="card-body p-3">
                        <div className="row align-items-center">
                          {/* Profile */}
                          <div className="col-md-4 col-sm-12 mb-2 mb-md-0">
                            <div className="d-flex align-items-center">
                              <img
                                src={lawyer.lawyer_picture || notificationProfile}
                                alt={lawyer.lawyer_name}
                                className="rounded-circle me-3"
                                width="48"
                                height="48"
                                onError={(e) => {
                                  e.target.src = notificationProfile;
                                }}
                              />
                              <div>
                                <h6 className="fw-bold text-dark mb-0">
                                  {lawyer.lawyer_name}
                                </h6>
                                <small className="text-muted">
                                  {lawyer.practice_areas || "Lawyer"}
                                </small>
                              </div>
                            </div>
                          </div>

                            {/* Practice Areas */}
                            <div className="col-md-3 col-sm-6 mb-2 mb-md-0">
                              <div className="text-muted small">
                                {lawyer.practice_areas || "N/A"}
                              </div>
                            </div>

                            {/* Renewal Date */}
                            <div className="col-md-3 col-sm-6 mb-2 mb-md-0">
                              <div className="text-muted small">
                                {lawyer.renewal_date ? `Renew ${lawyer.renewal_date}` : "N/A"}
                              </div>
                            </div>

                            {/* Price */}
                            <div className="col-md-2 col-sm-12 text-md-end">
                              <div className="fw-semibold text-dark">
                                {lawyer.price ? `${lawyer.price.toFixed(2)} ${lawyer.currency || 'USD'}` : "N/A"}
                              </div>
                            </div>
                        </div>
                      </div>
                    </div>
                    ))
                  ) : (
                    <p className="text-gray-600">
                          <img src={noData} alt="No Data" className="w-150px mt-3" /> <br />
                      No {activeTab === "active" ? "active" : "inactive"} lawyers found</p>
                  )}
                </div>
              </div>
            </div>

            <div className="col-md-4 mt-4">
              {/* My Cases */}
              <div
                className="card mb-6 shadow my-cases-card-hover"
                data-aos="fade-left"
                data-aos-delay="600"
              >
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="fw-bold text-dark mb-0">My Cases</h2>
                    <NavLink to={"/my-cases"} 
                        className="text-muted fw-semibold text-decoration-none">
                        See All
                    </NavLink>
                  </div>

                  {cases.length > 0 ? (
                    cases.slice(0, 3).map((caseItem, index) => (
                      <div
                        key={caseItem.id || index}
                        className="card mb-3 my-cases-row-hover"
                        data-aos="fade-up"
                        data-aos-delay={`${700 + index * 100}`}
                      >
                        <div className="card-body p-3">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <h6 className="fw-bold text-dark mb-0">
                              {caseItem.title}
                            </h6>
                            <span className="badge bg-black text-white dashboard-case-badge">
                              {caseItem.case_number}
                            </span>
                          </div>
                          <p className="text-gray-600 mb-0 small">
                            {caseItem.description || "No description available"}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-600">No cases found</p>
                  )}
                </div>
              </div>

              {/* Notifications */}
              <div
                className="card shadow notification-card-hover"
                data-aos="fade-left"
                data-aos-delay="1000"
              >
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h4 className="fw-bold text-black mb-0">Notifications</h4>
                    <NavLink to={"/notifications"}>
                      <a
                        href="#"
                        className="text-black fw-semibold text-decoration-none"
                      >
                        See All
                      </a>
                    </NavLink>
                  </div>

                  {notifications.length > 0 ? (
                    notifications.slice(0, 4).map((notification, index, array) => (
                      <div
                        key={notification.id || index}
                        className={`d-flex align-items-start ${index < array.length - 1 ? 'mb-4' : ''} notification-item-hover`}
                        data-aos="fade-up"
                        data-aos-delay={`${1100 + index * 100}`}
                      >
                        <div className="symbol symbol-40px me-3 flex-shrink-0">
                          <img
                            src={notification.picture || notificationProfile}
                            alt="Notification"
                            className="rounded-circle"
                            onError={(e) => {
                              e.target.src = notificationProfile;
                            }}
                          />
                        </div>
                        <div className="flex-grow-1">
                          <p className="text-gray-600 mb-2 small">
                            {notification.message || "No message"}
                          </p>
                          <span className="text-gray-500 small">{notification.time_ago || "Just now"}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-600">No notifications</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AskQuestionOffcanvas
        show={showPostQuestion}
        onClose={() => setShowPostQuestion(false)}
        jurisdictionOptions={jurisdictionOptions}
        onSuccess={fetchDashboardData}
      />

      {/* Create Case Modal */}
      <CreateCaseModal 
        show={showCreateCase} 
        onClose={() => setShowCreateCase(false)} 
        onSuccess={fetchDashboardData}
      />

      {/* Success Animation Modal */}
      {showSuccessAnimation && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            animation: "fadeIn 0.3s ease-out",
          }}
          onClick={() => {
            setShowSuccessAnimation(false);
            handleClosePostQuestion();
          }}
        >
          <div
            className="success-animation-modal"
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              padding: "3rem 2.5rem 2rem 2.5rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.15)",
              maxWidth: "450px",
              width: "90%",
              animation: "fadeIn 0.3s ease-out",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button - Top Right */}
            <button
              type="button"
              onClick={() => {
                setShowSuccessAnimation(false);
                handleClosePostQuestion();
              }}
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                background: "transparent",
                border: "none",
                fontSize: "24px",
                cursor: "pointer",
                color: "#000",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                transition: "all 0.2s ease",
                zIndex: 10,
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#f5f5f5";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "transparent";
              }}
            >
              <i className="bi bi-x-lg"></i>
            </button>

            {/* Animation */}
            <div style={{ marginBottom: "1.5rem" }}>
              <Lottie
                animationData={successAnimation}
                loop={false}
                autoplay={true}
                style={{ width: "200px", height: "200px" }}
              />
            </div>

            {/* Success Message */}
            <h4
              className="fw-bold success-animation-text mb-4"
              style={{
                color: "#212529",
                fontSize: "20px",
                textAlign: "center",
                lineHeight: "1.4",
              }}
            >
              Question Posted Successfully!
            </h4>

            {/* Action Button */}
            <button
              type="button"
              className="btn text-white w-100"
              onClick={() => {
                setShowSuccessAnimation(false);
                handleClosePostQuestion();
              }}
              style={{
                height: "50px",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: "600",
                backgroundColor: "#000",
                border: "none",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#333";
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#000";
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "none";
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
