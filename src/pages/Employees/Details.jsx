import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import circle from "../../assets/images/yellow-circle.png";
import employeeDetail from "../../assets/images/employeeDetail.png";
import "./detail.css";

const EmployeeDetails = () => {
  const { id } = useParams();
  const [showEditProfile, setShowEditProfile] = useState(false);

  // Load data from localStorage
  const loadFromLocalStorage = (key, defaultValue) => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
    }
    return defaultValue;
  };

  // Load employee from employees list
  const loadEmployeeData = () => {
    const employees = loadFromLocalStorage("employees_list", []);
    const foundEmployee = employees.find((emp) => emp.id === parseInt(id));
    
    if (foundEmployee) {
      return foundEmployee;
    }
    
    // Load saved employee details if exists
    const savedDetails = loadFromLocalStorage(`employee_details_${id}`, null);
    if (savedDetails) {
      return savedDetails;
    }
    
    // Default employee data
    return {
      id: parseInt(id),
      name: "Noon",
      location: "Retail Riyadh, 5K–10K Employees",
      description:
        "Noon is a Saudi Arabian-headquartered, tech-driven e-commerce platform founded in 2016 by Mohamed Alabbar to cater to the Middle East's digital economy by offering a local alternative to international Read More...",
      bannerImage: employeeDetail,
      profileImage: circle,
      socialMedia: {
        facebook: "#",
        twitter: "#",
        instagram: "#",
        linkedin: "#",
      },
      additionalInfo: "",
    };
  };

  const [employee, setEmployee] = useState(loadEmployeeData());
  const [additionalInfo, setAdditionalInfo] = useState(
    loadFromLocalStorage(`employee_additionalInfo_${id}`, employee.additionalInfo || "")
  );
  
  // Edit form states
  const [editFormData, setEditFormData] = useState({
    name: employee.name,
    location: employee.location,
    description: employee.description,
    bannerImage: employee.bannerImage,
    profileImage: employee.profileImage,
    socialMedia: { ...employee.socialMedia },
  });

  // Save employee details to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`employee_details_${id}`, JSON.stringify(employee));
      localStorage.setItem(`employee_additionalInfo_${id}`, JSON.stringify(additionalInfo));
    } catch (error) {
      console.error("Error saving employee details to localStorage:", error);
    }
  }, [employee, additionalInfo, id]);

  // Update edit form when employee changes
  useEffect(() => {
    setEditFormData({
      name: employee.name,
      location: employee.location,
      description: employee.description,
      bannerImage: employee.bannerImage,
      profileImage: employee.profileImage,
      socialMedia: { ...employee.socialMedia },
    });
  }, [employee]);

  const handleEditInputChange = (field, value) => {
    if (field.startsWith("socialMedia.")) {
      const socialField = field.split(".")[1];
      setEditFormData((prev) => ({
        ...prev,
        socialMedia: {
          ...prev.socialMedia,
          [socialField]: value,
        },
      }));
    } else {
      setEditFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleSaveChanges = () => {
    // Update employee with edited data
    const updatedEmployee = {
      ...employee,
      ...editFormData,
    };
    
    setEmployee(updatedEmployee);
    
    // Also update in employees list
    const employees = loadFromLocalStorage("employees_list", []);
    const updatedEmployees = employees.map((emp) =>
      emp.id === parseInt(id) ? { ...emp, ...editFormData } : emp
    );
    localStorage.setItem("employees_list", JSON.stringify(updatedEmployees));
    
    toast.success("Profile updated successfully!");
    setShowEditProfile(false);
  };

  return (
    <div className="employee-container" style={{ marginTop: "31px" }}>
      {/* Banner Section */}
      <div className="banner-wrapper">
        <img src={employee.bannerImage} alt="Banner" className="banner-image" style={{ height: "259px" }} />
      </div>

      {/* Profile Card */}
      <div className="profile-card" style={{ width: "621px", height: "681px" }}>
        <div className="profile-header">
          <div className="profile-image-wrapper">
            <img
              src={employee.profileImage}
              alt="Profile"
              className="profile-image"
            />
          </div>
          <div className="profile-info">
            <h2 className="company-name">{employee.name}</h2>
            <p className="company-location">{employee.location}</p>
          </div>
          <div className="edit-button-wrapper">
            <button
              className="edit-btn"
              onClick={() => setShowEditProfile(true)}
            >
              <i className="bi bi-pencil text-white"></i> Edit Profile
            </button>
          </div>
        </div>

        <p className="company-description">{employee.description}</p>
        
        {/* Textarea in empty space */}
        <div className="company-textarea-section">
          <textarea
            className="company-textarea"
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            placeholder="Add additional information about the employee..."
            style={{ height: "246px" }}
          ></textarea>
        </div>
        {/* Social Media Links */}
      <div className="social-section" style={{ marginTop: "50px", width: "37%" }}>
        <h6 className="text-center">CONNECT WITH US</h6>
        <div className="social-icons">
          <a href={employee.socialMedia.facebook}>
            <i className="bi bi-facebook text-black"></i>
          </a>
          <a href={employee.socialMedia.twitter}>
            <i className="bi bi-twitter-x text-black"></i>
          </a>
          <a href={employee.socialMedia.instagram}>
            <i className="bi bi-instagram text-black"></i>
          </a>
          <a href={employee.socialMedia.linkedin}>
            <i className="bi bi-linkedin text-black"></i>
          </a>
        </div>
      </div>
      </div>

      {/* Edit Profile Offcanvas */}
      {showEditProfile && (
        <>
          <div
            className="offcanvas-backdrop"
            onClick={() => setShowEditProfile(false)}
          ></div>
          <div className="edit-panel">
            <div className="edit-header">
              <h5>Edit Profile</h5>
              <button onClick={() => setShowEditProfile(false)}>×</button>
            </div>
            <div className="edit-body">
              <form>
                <label>Employee Name</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => handleEditInputChange("name", e.target.value)}
                />
                <label>Location & Size</label>
                <input
                  type="text"
                  value={editFormData.location}
                  onChange={(e) => handleEditInputChange("location", e.target.value)}
                />
                <label>Description</label>
                <textarea
                  rows="4"
                  value={editFormData.description}
                  onChange={(e) => handleEditInputChange("description", e.target.value)}
                ></textarea>
                <label>Facebook URL</label>
                <input
                  type="text"
                  value={editFormData.socialMedia.facebook}
                  onChange={(e) => handleEditInputChange("socialMedia.facebook", e.target.value)}
                  placeholder="Enter Facebook URL"
                />
                <label>Twitter URL</label>
                <input
                  type="text"
                  value={editFormData.socialMedia.twitter}
                  onChange={(e) => handleEditInputChange("socialMedia.twitter", e.target.value)}
                  placeholder="Enter Twitter URL"
                />
                <label>Instagram URL</label>
                <input
                  type="text"
                  value={editFormData.socialMedia.instagram}
                  onChange={(e) => handleEditInputChange("socialMedia.instagram", e.target.value)}
                  placeholder="Enter Instagram URL"
                />
                <label>LinkedIn URL</label>
                <input
                  type="text"
                  value={editFormData.socialMedia.linkedin}
                  onChange={(e) => handleEditInputChange("socialMedia.linkedin", e.target.value)}
                  placeholder="Enter LinkedIn URL"
                />
                <label>Banner Image</label>
                <input type="file" accept="image/*" />
                <label>Profile Image</label>
                <input type="file" accept="image/*" />
              </form>
            </div>
            <div className="edit-footer">
              <button className="save-btn" onClick={handleSaveChanges}>
                Save Changes
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EmployeeDetails;
