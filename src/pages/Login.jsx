import React, { useState, useEffect } from "react";
import AuthService from "../services/AuthService";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Loader from "../components/Loader";
import { setPermissions, clearPermissions } from "../stores/permissionsSlice";
import logoImg from "../assets/images/login-img.png";
import logoImg2 from "../assets/images/logoImg2.png";
import logo from "../assets/images/logo.png";
import G from "../assets/images/G.png";
import notificationProfile from "../assets/images/notification-profile.png";
// import loginBgVideo from "../assets/login-bg-video.mp4"; // Moved to public folder
import "../assets/css/dark-mode.css";
import "./Login.css";
import { initFirebaseMessaging, getStoredFcmToken } from "../services/firebaseMessaging";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../services/firebase";

const Login = () => {
  // Load saved credentials from localStorage
  const loadSavedCredentials = () => {
    try {
      const saved = localStorage.getItem("loggedUser");
      if (saved) {
        const credentials = JSON.parse(saved);
        return credentials;
      }
    } catch (error) {
      console.error("Error loading saved credentials:", error);
    }
    return null;
  };

  const savedCredentials = loadSavedCredentials();
  
  const [email, setEmail] = useState(savedCredentials?.email || "");
  const [otp, setOtp] = useState("");
  const [isLoader, setIsLoader] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(
    localStorage.getItem("darkMode") === "true" || false
  );
  const [deviceToken, setDeviceToken] = useState();
  const navigate = useNavigate();



  useEffect(() => {
    // Check if user is already authenticated
    const isAuthenticated = AuthService.getCurrentUser();
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [navigate]);

  // Apply dark mode on component mount and when it changes
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, [isDarkMode]);

  // Sync dark mode with localStorage changes from other pages
  useEffect(() => {
    const handleStorageChange = () => {
      const darkModeValue = localStorage.getItem("darkMode") === "true";
      setIsDarkMode(darkModeValue);
    };

    // Listen for storage changes
    window.addEventListener("storage", handleStorageChange);
    
    // Also check periodically for changes (in case of same-tab updates)
    const interval = setInterval(() => {
      const darkModeValue = localStorage.getItem("darkMode") === "true";
      if (darkModeValue !== isDarkMode) {
        setIsDarkMode(darkModeValue);
      }
    }, 100);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [isDarkMode]);

  useEffect(() => {
    // const existing = getStoredFcmToken();
    // if (existing) {
    //     console.log("Existing FCM TOKEN:", existing);
    //   setDeviceToken(existing);
    //   return;
    // }
    initFirebaseMessaging().then((token) => {
      if (token) {
        console.log("NEW FCM TOKEN:", token);
        setDeviceToken(token);
      }
    });
  }, []);



  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Validate email is provided
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    // If OTP input is shown, verify OTP
    if (showOtpInput) {
      if (!otp.trim()) {
        toast.error("Please enter the OTP code");
        return;
      }

      setIsLoader(true);
      try {
        const response = await AuthService.verifyOTP(
          email,
          otp,
          deviceToken 
        );
        
        if (response.status && response.data) {
          // Save login credentials to localStorage
          var loggedUser = response.data.user;

          loggedUser.auth_token = response.data.auth_token;
          loggedUser.lastLogin = new Date().toISOString();

          localStorage.setItem("loggedUser", JSON.stringify(loggedUser));

          toast.success("Login successful!");
          navigate("/dashboard");
        } else {
          toast.error(response.message || "Invalid OTP. Please try again.");
        }
      } catch (error) {
        console.error("OTP verification failed:", error);
        const errorMessage = error.response?.data?.message || "OTP verification failed. Please try again.";
        toast.error(errorMessage);
      } finally {
        setIsLoader(false);
      }
      return;
    }

    // Step 1: Send OTP to email
    setIsLoader(true);
    try {
      const language = localStorage.getItem("admin_lang") || "en";
      const is_company = 1;
      const response = await AuthService.userLogin(
        email,
        language,
        deviceToken,
        is_company,
      );
      
      if (response.status) {
        toast.success(response.message || "OTP sent to your email. Please check your inbox.");
        setShowOtpInput(true);
      } else {
        toast.error(response.message || "Failed to send OTP. Please try again.");
      }
    } catch (error) {
      console.error("Login failed:", error);
      const errorMessage = error.response?.data?.message || "Login failed. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsLoader(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!agreeToTerms) {
      toast.error("Please agree to the Terms and Conditions first.");
      return;
    }

    try {
      setIsLoader(true);
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Send user details to backend
      const response = await AuthService.googleLogin(
        user.displayName,
        user.email,
        user.uid,
        deviceToken 
      );
      
      if (response.status) {
        toast.success(response.message || "Google Login successful!");
        navigate("/dashboard");
      } else {
        toast.error(response.message || "Google Login failed.");
      }
    } catch (error) {
      console.error("Google Login Error:", error);
      toast.error(error.message || "Google Login failed. Please try again.");
    } finally {
      setIsLoader(false);
    }
  };

  return (
    <div className="login-container">
      {/* Left Panel - Video Background Section */}
      <div className="left-panel" data-aos="fade-right" data-aos-delay="100">
        {/* Video Container */}
        <div className="slider-container" style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
          {/* Video Background */}
          <video
            className="login-video-bg"
            autoPlay
            muted
            loop
            playsInline
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center center",
              display: "block",
              position: "absolute",
              top: 0,
              left: 0,
              maxWidth: "none",
              maxHeight: "none",
              transform: "none",
              zIndex: 1
            }}
          >
            <source src={`${process.env.PUBLIC_URL}/login-bg-video.mp4`} type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          {/* Gradient Overlay */}
          <div 
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: "linear-gradient(135deg, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.4) 50%, rgba(0, 0, 0, 0.3) 100%)",
              zIndex: 2
            }}
          />

          {/* Content Overlay */}
          <div className="left-panel-content" data-aos="fade-up" data-aos-delay="300" style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "40px", zIndex: 3 }}>
            <h1 className="left-panel-title text-white text-center">
              Professional Legal Services
            </h1>
            <p className="left-panel-description text-white text-center">
              Get expert legal advice from qualified attorneys. Our platform connects you with experienced lawyers for all your business and personal legal needs.
            </p>
          </div>
        </div>

        {/* Pagination Dots - COMMENTED OUT FOR VIDEO BACKGROUND */}
        {/* <div className="pagination-dots">
          {sliderData.map((_, index) => (
            <div
              key={index}
              className={`pagination-dot ${
                index === currentSlide ? "active" : "inactive"
              }`}
              onClick={() => handleDotClick(index)}
            />
          ))}
        </div> */}
      </div>

      {/* Right Panel - Login Form Section */}
      <div className="right-panel" data-aos="fade-left" data-aos-delay="200">
        {/* Logo */}
        <div style={{ marginBottom: "60px" }} data-aos="fade-up" data-aos-delay="300">
          <img alt="Legal Platform Logo" src={logo} className="login-logo" />
        </div>

        {/* Login Form */}
        <div data-aos="fade-up" data-aos-delay="400">
          <h2 className="login-title">Login</h2>

          <form onSubmit={handleLogin} className="login-form">
            {/* Email Field */}
            <div className="form-group" data-aos="fade-up" data-aos-delay="500">
              <label className="form-label" style={{ fontSize: "18px" }}>Email</label>
              <input
                type="email"
                required
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input rounded-pill login-page-inp"
                placeholder="noon@company.com"
                style={{ fontSize: "18px", width: "398px", height: "67px", paddingLeft: "30px", paddingRight: "30px" }}
              />
            </div>

            {/* Password Field - Hidden when OTP input is shown */}
            {/* {!showOtpInput && (
              <div className="form-group" data-aos="fade-up" data-aos-delay="600">
                <label className="form-label" style={{ fontSize: "18px" }}>Password</label>
                <div className="password-container">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input rounded-pill login-page-inp"
                    placeholder="Password (Optional)"
                    autoComplete="off"
                    style={{ width: "398px", height: "67px", fontSize: "18px", paddingLeft: "30px", paddingRight: "30px" }}
                  />
                </div>
              </div>
            )} */}

            {/* OTP Field - Shown after email is submitted */}
            {showOtpInput && (
              <div className="form-group" data-aos="fade-up" data-aos-delay="600">
                <label className="form-label" style={{ fontSize: "18px" }}>Enter OTP</label>
                <div className="password-container">
                  <input
                    type="text"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="form-input rounded-pill login-page-inp"
                    placeholder="Enter 4-digit OTP"
                    autoComplete="off"
                    maxLength={4}
                    style={{ width: "398px", height: "67px", fontSize: "18px", paddingLeft: "30px", paddingRight: "30px", textAlign: "center", letterSpacing: "8px" }}
                  />
                </div>
                <div style={{ marginTop: "10px", fontSize: "14px", color: "#666" }}>
                  <button
                    type="button"
                    onClick={async () => {
                      setIsLoader(true);
                      try {
                        const language = localStorage.getItem('admin_lang') || 'en';
                        const response = await AuthService.userLogin(email, language);
                        if (response.status) {
                          toast.success(response.message || "OTP resent to your email.");
                        }
                      } catch (error) {
                        toast.error("Failed to resend OTP. Please try again.");
                      } finally {
                        setIsLoader(false);
                      }
                    }}
                    style={{ background: "none", border: "none", color: "#007bff", textDecoration: "underline", cursor: "pointer" }}
                  >
                    Resend OTP
                  </button>
                </div>
              </div>
            )}

            {/* Terms and Conditions Checkbox */}
            <div className="form-group" data-aos="fade-up" data-aos-delay="650">
              <div className="d-flex align-items-start" style={{ width: "398px" }}>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="agreeToTerms"
                    checked={agreeToTerms}
                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                    style={{ 
                      width: "18px", 
                      height: "18px", 
                      marginTop: "2px",
                      accentColor: "#000"
                    }}
                  />
                  <label className="form-check-label text-muted" htmlFor="agreeToTerms" style={{ fontSize: "14px", lineHeight: "1.4", marginLeft: "8px" }}>
                    I agree to all the{" "}
                    <a href="#" className="text-dark fw-semibold" style={{ textDecoration: "underline" }}>
                      Terms and Conditions
                    </a>
                  </label>
                </div>
              </div>
            </div>

            {/* Login Button */}
            <button type="submit" disabled={isLoader || !agreeToTerms} className="login-button rounded-pill d-flex align-items-center justify-content-center position-relative" style={{ width: "398px", height: "67px", fontSize: "18px", opacity: agreeToTerms ? 1 : 0.6 }} data-aos="fade-up" data-aos-delay="700">
              {isLoader ? (
                <Loader size="20" text={showOtpInput ? "Verifying" : "Sending"} color="white" />
              ) : (
                <>
                  <span className="login-text">{showOtpInput ? "Verify OTP" : "Login"}</span>
                  <span className="login-button-arrow rounded-pill bg-white d-flex justify-content-center align-items-center position-absolute" style={{ width: "29px", height: "29px", right: "15px" }}> 
                    <i className="bi bi-arrow-right text-black fs-6"></i> 
                  </span>
                </>
              )}
            </button>

            {/* Back to Email Button - Shown when OTP input is visible */}
            {showOtpInput && (
              <button
                type="button"
                onClick={() => {
                  setShowOtpInput(false);
                  setOtp("");
                }}
                className="btn btn-link"
                style={{ width: "398px", marginTop: "10px", color: "#666", textDecoration: "none" }}
              >
                ← Back to Email
              </button>
            )}

            {/* Google Login Button */}
            {/* <button 
              type="button" 
              className="google-button rounded-pill login-btn-google" 
              onClick={handleGoogleLogin}
              style={{ width: "398px", height: "67px", fontSize: "18px", opacity: agreeToTerms ? 1 : 0.6 }} 
              data-aos="fade-up" 
              data-aos-delay="800"
            >
              <span className="google-icon">
                <img src={G} alt="" className="w-35px h-35px" />
              </span>
              Continue With Google
            </button> */}
          </form>
        </div>

        {/* Copyright */}
        <div className="copyright" data-aos="fade-up" data-aos-delay="900">
          © 2025 Legal Platform. All rights Reserved.
        </div>
      </div>
    </div>
  );
};

export default Login;
