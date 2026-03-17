import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import ApiService from "../services/ApiService";
import Loader from "../components/Loader"; 
import circle from "../assets/images/yellow-circle.png";
import licenseImg from "../assets/images/lisence-img.png";
import "./Employees/detail.css";

const Account = () => {
  const user = (() => {
    try {
      const userStr = localStorage.getItem('loggedUser');
      if (userStr && userStr !== 'undefined' && userStr.startsWith('{')) {
        return JSON.parse(userStr);
      }
    } catch (e) {
      console.error("Error parsing admin in Account", e);
    }
    return null;
  })();

  // Load data from localStorage
  const loadFromLocalStorage = (key, defaultValue) => {
    try {
      const saved = localStorage.getItem(key);
      if (saved && saved !== 'undefined') {
        if (saved.startsWith('{') || saved.startsWith('[') || saved.startsWith('"')) {
          return JSON.parse(saved);
        }
        return saved;
      }
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
    }
    return defaultValue;
  };

  const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });

  const [tab, setTab] = useState(loadFromLocalStorage("account_tab", "profile"));
  const [name, setName] = useState(loadFromLocalStorage("account_name", user?.name || ""));
  const [pictureFile, setPictureFile] = useState(null);
  const [picturePreview, setPicturePreview] = useState(user?.picture || "");
  const [email, setEmail] = useState(loadFromLocalStorage("account_email", user?.email || ""));
  const [otp, setOtp] = useState(loadFromLocalStorage("account_emailOtp", ""));
  const [oldPassword, setOldPassword] = useState(loadFromLocalStorage("account_oldPassword", ""));
  const [newPassword, setNewPassword] = useState(loadFromLocalStorage("account_newPassword", ""));
  const [confirmPassword, setConfirmPassword] = useState(loadFromLocalStorage("account_confirmPassword", ""));
  const [tradeLicenseFile, setTradeLicenseFile] = useState(null);
  const [is2FAEnabled, setIs2FAEnabled] = useState(user?.is_2fa_enabled === 1 || user?.is_2fa_enabled === true);
  const [isLoader, setIsLoader] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    website: user?.business_info?.website || "",
  });
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const fileInputRef = useRef(null);

  // Keep form fields in sync if logged user changes elsewhere
  useEffect(() => {
    try {
      const userStr = localStorage.getItem('loggedUser');
      if (userStr && userStr !== 'undefined' && userStr.startsWith('{')) {
        const parsed = JSON.parse(userStr);
        setName((prev) => prev || parsed?.name || "");
        setEmail((prev) => prev || parsed?.email || "");
        setPicturePreview((prev) => prev || parsed?.picture || "");
        setIs2FAEnabled(parsed?.is_2fa_enabled === 1 || parsed?.is_2fa_enabled === true);
      }
    } catch {}
  }, []);

  // Save account data to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("account_tab", JSON.stringify(tab));
      localStorage.setItem("account_name", JSON.stringify(name));
      localStorage.setItem("account_email", JSON.stringify(email));
      localStorage.setItem("account_emailOtp", JSON.stringify(otp));
      localStorage.setItem("account_oldPassword", JSON.stringify(oldPassword));
      localStorage.setItem("account_newPassword", JSON.stringify(newPassword));
      localStorage.setItem("account_confirmPassword", JSON.stringify(confirmPassword));
    } catch (error) {
      console.error("Error saving account data to localStorage:", error);
    }
  }, [tab, name, email, otp, oldPassword, newPassword, confirmPassword]);


const handleSubmit = async (e) => {
    e.preventDefault();

    setIsLoader(true);
    try {
        const formData = {
          "old_password": oldPassword,
          "new_password": newPassword,
          "confirm_password": confirmPassword,
        };
        const response = await ApiService.request({
          method: "POST",
          url: "updateAccount",
          data: formData
        });
        const data = response.data;
        if (data.status) {
          toast.success(data.message);
          setOldPassword('');
          setNewPassword('');
          setConfirmPassword('');
          try {
            localStorage.setItem("account_oldPassword", JSON.stringify(""));
            localStorage.setItem("account_newPassword", JSON.stringify(""));
            localStorage.setItem("account_confirmPassword", JSON.stringify(""));
          } catch (error) {
            console.error("Error clearing password fields from localStorage:", error);
          }
        } else {
          toast.error(data.message);
        }
        setIsLoader(false);
    } catch (error) {
        console.log(error);

        setIsLoader(false);
    }
   
};

const handleProfileUpdate = async () => {
  if (profileData.email !== user?.email && !isEmailVerified) {
    toast.error("Please verify your new email first");
    return;
  }
  try {
    const fd = new FormData();
    fd.append("name", profileData.name || user?.name);
    fd.append("email", profileData.email || user?.email);
    fd.append("phone", profileData.phone || user?.phone);
    fd.append("website", profileData.website || user?.website);

    if (pictureFile) {
      fd.append("picture", pictureFile);
    }
    if (tradeLicenseFile) {
      fd.append("trade_license", tradeLicenseFile);
    }
    const response = await ApiService.request({
      method: "POST",
      url: "update-profile",
      data: fd,
      headers: { "Content-Type": "multipart/form-data" }
    });
    const data = response.data;
    if (data.status) {
      let tradeLicenseData = user?.business_info?.trade_license;
      if (tradeLicenseFile) {
        tradeLicenseData = await toBase64(tradeLicenseFile);
      }

      const updated = { 
        ...(user || {}), 
        name: profileData.name || user?.name,
        email: profileData.email || user?.email,
        phone: profileData.phone || user?.phone,
        website: profileData.website || user?.website,
        picture: picturePreview,
        business_info: {
          ...(user?.business_info || {}),
          trade_license: tradeLicenseData
        }
      };
      localStorage.setItem('loggedUser', JSON.stringify(updated));
      setPicturePreview(updated.picture || "");
      setIsEmailVerified(false);
      setIsOtpSent(false);
      setOtp("");
      toast.success(data.message || "Profile updated");
    } else {
      toast.error(data.message || "Failed to update profile");
    }
  } catch (e) {
    toast.error("Failed to update profile");
  }
};

const handleSendEmailOtp = async (targetEmail) => {
  if (!targetEmail) {
    toast.error("Please enter email");
    return;
  }
  try {
    const response = await ApiService.request({
      method: "POST",
      url: "resendOTP",
      data: { email: targetEmail, update_profile: true, userId: user?.id }
    });
    const data = response.data;
    if (data.status) {
      toast.success("OTP sent to email");
      setIsOtpSent(true);
    } else {
      toast.error(data.message || "Failed to send OTP");
    }
  } catch (e) {
    toast.error("Failed to send OTP");
  }
};

const handleVerifyAndUpdateEmail = async (targetEmail) => {
  if (!targetEmail || !otp) {
    toast.error("Enter email and OTP");
    return;
  }
  try {
    const verify = await ApiService.request({
      method: "POST",
      url: "verifyOTP",
      data: { email: email, otp: otp, update_profile: true }
    });
    const v = verify.data;
    if (!v.status) {
      toast.error(v.message || "Invalid OTP");
      return;
    }
    setIsEmailVerified(true);
    toast.success("Email verified successfully");
  } catch (e) {
    toast.error("Failed to verify OTP");
  }
};

const handle2FAToggle = async () => {
  const newValue = !is2FAEnabled;
  try {
    const fd = new FormData();
    fd.append("is_2fa_enabled", newValue ? 1 : 0);
    const response = await ApiService.request({
      method: "POST",
      url: "update-profile",
      data: fd,
      headers: { "Content-Type": "multipart/form-data" }
    });
    const data = response.data;
    if (data.status) {
      setIs2FAEnabled(newValue);
      const updated = { ...(user || {}), is_2fa_enabled: newValue ? 1 : 0 };
      localStorage.setItem('loggedUser', JSON.stringify(updated));
      toast.success(newValue ? "2FA Enabled" : "2FA Disabled");
    } else {
      toast.error(data.message || "Failed to update 2FA settings");
    }
  } catch (e) {
    toast.error("Failed to update 2FA settings");
  }
};

  return (
    <div className="d-flex flex-column flex-column-fluid mt-15 mx-5">
        <div id="kt_app_toolbar" className="app-toolbar py-3 py-lg-6">
            <div id="kt_app_toolbar_container" className="app-container container-fluid d-flex flex-stack">
                <div className="page-title d-flex flex-column justify-content-center flex-wrap me-3">
                    <h1 className="page-heading d-flex text-dark fw-bold fs-3 flex-column justify-content-center my-0">
                        Account
                    </h1>
                    <ul className="breadcrumb breadcrumb-separatorless fw-semibold fs-7 my-0 pt-1">
                        <li className="breadcrumb-item text-muted">
                            <a href="/TimeLogger/admin/" className="text-muted text-hover-primary">Home</a>
                        </li>
                        <li className="breadcrumb-item">
                            <span className="bullet bg-gray-400 w-5px h-2px"></span>
                        </li>
                        <li className="breadcrumb-item text-muted">Account</li>
                    </ul>
                </div>
                <div className="d-flex align-items-center gap-2 gap-lg-3"></div>
            </div>
        </div>

        <div id="kt_app_content" className="app-content flex-column-fluid">
            <div id="kt_app_content_container" className="app-container container-fluid">
                <div className="card">
                    <nav>
                        <div className="nav nav-tabs" id="nav-tab" role="tablist">
                        <button
                            className={`nav-link fs-lg-5 ${tab === "profile" ? "active" : ""}`}
                            onClick={() => setTab("profile")}
                            type="button"
                        >
                            <i className="bi bi-person"></i> Profile
                        </button>
                        <button
                            className={`nav-link fs-lg-5 ${tab === "password" ? "active" : ""}`}
                            onClick={() => setTab("password")}
                            id="nav-contact-tab"
                            type="button"
                        >
                            <i className="bi bi-key"></i> Change Password
                        </button>
                        <button
                            className={`nav-link fs-lg-5 ${tab === "security" ? "active" : ""}`}
                            onClick={() => setTab("security")}
                            type="button"
                        >
                            <i className="bi bi-shield-check"></i> Security
                        </button>
                        </div>
                    </nav>
                    <div className="card-body pt-0">
                        <div className="mb-8 text-center"></div>
                        <div className="row g-9 mb-8">
                        <div className="col-md-12">
                            <div className="tab-content mt-5" id="nav-tabContent">
                            {tab === "profile" && (
                              <div className="tab-pane fade show active">
                                {/* <div className="row">
                                  <div className="col-md-12">
                                    <label className="required fs-6 fw-semibold mb-2">Name</label>
                                    <input
                                      type="text"
                                      className="form-control form-control-solid"
                                      placeholder="Enter Name"
                                      value={name}
                                      onChange={(e) => setName(e.target.value)}
                                    />
                                  </div>
                                </div> */}

                                {/* Account Details Card */}
                                <div 
                                  className="profile-card dashboard-card-hover mt-10" 
                                  style={{ width: "621px", margin: "40px 0" }}
                                  data-aos="fade-up"
                                  data-aos-duration="1000"
                                >
                                  <div className="profile-header">
                                    <div 
                                      className="profile-image-wrapper"
                                      onClick={() => fileInputRef.current?.click()}
                                      title="Click to update profile picture"
                                    >
                                      <img
                                        src={picturePreview || user?.picture || circle}
                                        alt="Profile"
                                        className={`profile-image ${!(picturePreview || user?.picture) ? 'noon-logo' : 'user-photo'}`}
                                      />
                                      <div className="edit-image-icon">
                                        <i className="bi bi-camera-fill fs-2"></i>
                                      </div>
                                    </div>
                                    <input
                                      type="file"
                                      ref={fileInputRef}
                                      style={{ display: 'none' }}
                                      accept="image/*"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          setPictureFile(file);
                                          const reader = new FileReader();
                                          reader.onload = () => setPicturePreview(reader.result);
                                          reader.readAsDataURL(file);
                                        }
                                      }}
                                    />
                                    <div className="profile-info">
                                      {isEditMode ? (
                                        <input
                                          type="text"
                                          className="form-control form-control-solid mb-2"
                                          value={profileData.name || user?.name || ''}
                                          onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                                        />
                                      ) : (
                                        <h2 className="company-name">{user?.name || "Noon"}</h2>
                                      )}
                                    </div>
                                    <div className="edit-button-wrapper">
                                      <button
                                        className="edit-btn"
                                        onClick={() => {
                                          if (isEditMode) {
                                            handleProfileUpdate();
                                          }
                                          setIsEditMode(!isEditMode);
                                        }}
                                      >
                                        {isEditMode ? (
                                          <><i className="bi bi-check-lg text-white"></i> Save</>
                                        ) : (
                                          <><i className="bi bi-pencil text-white"></i> Edit Profile</>
                                        )}
                                      </button>
                                    </div>
                                  </div>

                                  <div className="contact-info-grid mt-4">
                                    <div className="contact-info-item">
                                      <h6 className="contact-label">Email</h6>
                                      {isEditMode ? (
                                        <>
                                          <div className="d-flex gap-2">
                                            <input
                                              type="email"
                                              className="form-control form-control-solid"
                                              value={profileData.email || ""}
                                              onChange={(e) => {
                                                setProfileData({ ...profileData, email: e.target.value });
                                                setIsEmailVerified(false);
                                                setIsOtpSent(false);
                                              }}
                                            />
                                            {profileData.email !== user?.email && !isEmailVerified && (
                                              <button
                                                type="button"
                                                className="btn rounded-pill fw-bold otp-btn"
                                                onClick={() => handleSendEmailOtp(profileData.email)}
                                              >
                                                Send OTP
                                              </button>
                                            )}
                                          </div>
                                          {isOtpSent && !isEmailVerified && (
                                            <div className="mt-2 d-flex gap-2">
                                              <input
                                                type="text"
                                                className="form-control form-control-solid"
                                                placeholder="Enter OTP"
                                                value={otp}
                                                onChange={(e) => setOtp(e.target.value)}
                                              />
                                              <button
                                                type="button"
                                                className="btn rounded-pill fw-bold otp-btn"
                                                onClick={() => handleVerifyAndUpdateEmail(profileData.email)}
                                              >
                                                Verify
                                              </button>
                                            </div>
                                          )}
                                          {isEmailVerified && (
                                            <div className="text-success mt-1 fs-7">
                                              <i className="bi bi-check-circle-fill me-1"></i> Email Verified
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        <p className="contact-value">{user?.email || "noon@shopping.com"}</p>
                                      )}
                                    </div>
                                    <div className="contact-info-item">
                                      <h6 className="contact-label">Phone</h6>
                                      {isEditMode ? (
                                        <input
                                          type="text"
                                          className="form-control form-control-solid"
                                          value={profileData.phone || user?.phone || ''}
                                          onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                                        />
                                      ) : (
                                        <div className="d-flex align-items-center gap-2">
                                          <img src="https://flagcdn.com/w20/ae.png" alt="UAE Flag" width="20" height="15" />
                                          <p className="contact-value mb-0">{user?.phone || "+971 24 836 9057"}</p>
                                        </div>
                                      )}
                                    </div>
                                    <div className="contact-info-item">
                                      <h6 className="contact-label">Website</h6>
                                      {isEditMode ? (
                                        <input
                                          type="text"
                                          className="form-control form-control-solid"
                                          value={profileData.website || user?.website || ''}
                                          onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
                                        />
                                      ) : (
                                        <p className="contact-value">{user?.website || "noon.com"}</p>
                                      )}
                                    </div>
                                    <div className="contact-info-item">
                                      <h6 className="contact-label">Company Trade License</h6>
                                      {isEditMode ? (
                                        <input
                                          type="file"
                                          className="form-control form-control-solid"
                                          onChange={(e) => setTradeLicenseFile(e.target.files?.[0])}
                                        />
                                      ) : (
                                        <div className="license-image-container">
                                          <img src={user?.business_info?.trade_license || licenseImg} alt="Trade License" className="license-image" />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                    <button
                                      className="btn rounded-pill fw-bold mt-5"
                                      style={{ backgroundColor: "#000", color: "#fff", border: "none" }}
                                      onClick={handleProfileUpdate}
                                    >
                                  Update Profile
                                    </button>
                              </div>
                            )}
                            {tab === "password" && (
                                <div className="tab-pane fade show active">
                                <form className="form" onSubmit={handleSubmit}>
                                    <div className="row">
                                    <div className="col-md-12">
                                    <div className="row">
                                    <div className="col-md-12">
                                        <label className="required fs-6 fw-semibold mb-2">
                                        Current Password
                                        </label>
                                        <input
                                        type="password"
                                        required
                                        className="form-control form-control-solid"
                                        placeholder="Enter Your Old Password"
                                        value={oldPassword}
                                        onChange={(e) => setOldPassword(e.target.value)}
                                        />
                                        <br />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="required fs-6 fw-semibold mb-2">
                                        New Password
                                        </label>
                                        <input
                                        type="password"
                                        required
                                        className="form-control form-control-solid"
                                        placeholder="Enter New Password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="required fs-6 fw-semibold mb-2">
                                        Confirm Password
                                        </label>
                                        <input
                                        type="password"
                                        required
                                        className="form-control form-control-solid"
                                        placeholder="Enter Confirm Password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        />
                                    </div>
                                    </div>
                                    </div>
                                    </div>
                                    <button
                                    type="submit"
                                    className="btn rounded-pill fw-bold my-5"
                                    style={{ backgroundColor: "#000", color: "#fff", border: "none" }}
                                    disabled={isLoader}
                                    >
                                    <span className="indicator-label">
                                        {!isLoader ? "Update Password" : <Loader size="20" text="Updating" />}
                                    </span>
                                    </button>
                                </form>
                                </div>
                            )}
                            {tab === "security" && (
                              <div className="tab-pane fade show active">
                                <div className="row">
                                  <div className="col-md-12">
                                    <div className="d-flex align-items-center justify-content-between p-5 border rounded">
                                      <div>
                                        <h5 className="fw-bold mb-1">Two-Factor Authentication (2FA)</h5>
                                        <p className="text-muted mb-0">Secure your account with 2FA.</p>
                                      </div>
                                      <div className="form-check form-switch form-check-custom form-check-solid">
                                        <input
                                          className="form-check-input h-30px w-50px"
                                          type="checkbox"
                                          checked={is2FAEnabled}
                                          onChange={handle2FAToggle}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            </div>
                        </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Account;
