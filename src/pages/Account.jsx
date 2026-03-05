import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import ApiService from "../services/ApiService";
import Loader from "../components/Loader"; 

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

  const [tab, setTab] = useState(loadFromLocalStorage("account_tab", "profile"));
  const [name, setName] = useState(loadFromLocalStorage("account_name", user?.name || ""));
  const [pictureFile, setPictureFile] = useState(null);
  const [picturePreview, setPicturePreview] = useState(user?.picture || "");
  const [email, setEmail] = useState(loadFromLocalStorage("account_email", user?.email || ""));
  const [newEmail, setNewEmail] = useState(loadFromLocalStorage("account_newEmail", ""));
  const [otp, setOtp] = useState(loadFromLocalStorage("account_emailOtp", ""));
  const [oldPassword, setOldPassword] = useState(loadFromLocalStorage("account_oldPassword", ""));
  const [newPassword, setNewPassword] = useState(loadFromLocalStorage("account_newPassword", ""));
  const [confirmPassword, setConfirmPassword] = useState(loadFromLocalStorage("account_confirmPassword", ""));
  const [is2FAEnabled, setIs2FAEnabled] = useState(user?.is_2fa_enabled === 1 || user?.is_2fa_enabled === true);
  const [isLoader, setIsLoader] = useState(false);

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
      localStorage.setItem("account_newEmail", JSON.stringify(newEmail));
      localStorage.setItem("account_emailOtp", JSON.stringify(otp));
      localStorage.setItem("account_oldPassword", JSON.stringify(oldPassword));
      localStorage.setItem("account_newPassword", JSON.stringify(newPassword));
      localStorage.setItem("account_confirmPassword", JSON.stringify(confirmPassword));
    } catch (error) {
      console.error("Error saving account data to localStorage:", error);
    }
  }, [tab, name, email, newEmail, otp, oldPassword, newPassword, confirmPassword]);


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
  try {
    const fd = new FormData();
    fd.append("name", name);
    if (pictureFile) {
      fd.append("picture", pictureFile);
    }
    const response = await ApiService.request({
      method: "POST",
      url: "update-profile",
      data: fd,
      headers: { "Content-Type": "multipart/form-data" }
    });
    const data = response.data;
    if (data.status) {
      const updated = { ...(user || {}), name, picture: data.data?.picture || picturePreview };
      localStorage.setItem('loggedUser', JSON.stringify(updated));
      setPicturePreview(updated.picture || "");
      toast.success(data.message || "Profile updated");
    } else {
      toast.error(data.message || "Failed to update profile");
    }
  } catch (e) {
    toast.error("Failed to update profile");
  }
};

const handleSendEmailOtp = async () => {
  if (!newEmail) {
    toast.error("Please enter new email");
    return;
  }
  try {
    const response = await ApiService.request({
      method: "POST",
      url: "resendOTP",
      data: { email: newEmail, update_profile: true, userId: user?.id }
    });
    const data = response.data;
    if (data.status) {
      toast.success("OTP sent to new email");
    } else {
      toast.error(data.message || "Failed to send OTP");
    }
  } catch (e) {
    toast.error("Failed to send OTP");
  }
};

const handleVerifyAndUpdateEmail = async () => {
  if (!newEmail || !otp) {
    toast.error("Enter new email and OTP");
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
    const update = await ApiService.request({
      method: "POST",
      url: "update-profile",
      data: { email: newEmail }
    });
    const u = update.data;
    if (u.status) {
      const updated = { ...(user || {}), email: newEmail };
      localStorage.setItem('loggedUser', JSON.stringify(updated));
      setEmail(newEmail);
      setNewEmail("");
      setOtp("");
      toast.success(u.message || "Email updated");
    } else {
      toast.error(u.message || "Failed to update email");
    }
  } catch (e) {
    toast.error("Failed to verify OTP or update email");
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
                            className={`nav-link fs-lg-5 ${tab === "email" ? "active" : ""}`}
                            onClick={() => setTab("email")}
                            id="nav-profile-tab"
                            type="button"
                        >
                            <i className="bi bi-envelope"></i> Change Email
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
                                <div className="row">
                                  <div className="col-md-8">
                                    <label className="required fs-6 fw-semibold mb-2">Name</label>
                                    <input
                                      type="text"
                                      className="form-control form-control-solid"
                                      placeholder="Enter Name"
                                      value={name}
                                      onChange={(e) => setName(e.target.value)}
                                    />
                                  </div>
                                  <div className="col-md-4">
                                    <label className="fs-6 fw-semibold mb-2">Picture</label>
                                    <div className="d-flex align-items-center gap-3">
                                      <div className="symbol symbol-60px">
                                        <img
                                          src={picturePreview || user?.picture || ""}
                                          alt="Profile"
                                          onError={(e)=>{ e.target.src=''; }}
                                          className="rounded"
                                        />
                                      </div>
                                      <div>
                                        <input
                                          type="file"
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
                                      </div>
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
                            {tab === "email" && (
                                <div className="tab-pane fade show active">
                                <div className="form">
                                  <div className="mb-4">
                                    <label className="fs-6 fw-semibold mb-2">Current Email</label>
                                    <input
                                      type="email"
                                      value={email}
                                      className="form-control form-control-solid"
                                      disabled
                                    />
                                  </div>
                                  <div className="mb-4">
                                    <label className="required fs-6 fw-semibold mb-2">New Email</label>
                                    <div className="d-flex gap-2">
                                      <input
                                        type="email"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        className="form-control form-control-solid"
                                        placeholder="Enter New Email"
                                      />
                                      <button
                                        type="button"
                                        className="btn rounded-pill fw-bold"
                                        style={{ backgroundColor: "#000", color: "#fff", border: "none" }}
                                        onClick={handleSendEmailOtp}
                                      >
                                        Send OTP
                                      </button>
                                    </div>
                                  </div>
                                  <div className="mb-4">
                                    <label className="required fs-6 fw-semibold mb-2">OTP</label>
                                    <input
                                      type="text"
                                      value={otp}
                                      onChange={(e) => setOtp(e.target.value)}
                                      className="form-control form-control-solid"
                                      placeholder="Enter OTP"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    className="btn rounded-pill fw-bold"
                                    style={{ backgroundColor: "#000", color: "#fff", border: "none" }}
                                    onClick={handleVerifyAndUpdateEmail}
                                  >
                                    Verify & Update Email
                                  </button>
                                </div>
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
