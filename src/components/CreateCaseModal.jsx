import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import ApiService from "../services/ApiService";

const CreateCaseModal = ({ show, onClose, onSuccess }) => {
  const [isClosing, setIsClosing] = useState(false);
  
  // Dropdown data states
  const [jurisdictions, setJurisdictions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [arbitrators, setArbitrators] = useState([]); // This maps to "Type of legal consultant"
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  const [lawyerCount, setLawyerCount] = useState(null);
  const [checkingLawyers, setCheckingLawyers] = useState(false);

  const initialFormState = {
    jurisdiction: "",
    consultantType: "",
    category: "",
    subCategory: "",
    description: "",
    attachments: [],
    acceptTerms: false
  };

  const [formData, setFormData] = useState(initialFormState);

  // Check for lawyers when dependencies change
  useEffect(() => {
    const checkLawyerAvailability = async () => {
      // Only check if we have enough info to filter lawyers
      if (!formData.category) {
        setLawyerCount(null);
        return;
      }

      try {
        setCheckingLawyers(true);
        // Prepare payload for search
        const payload = {
          categories: JSON.stringify([parseInt(formData.category)]),
          // Optional filters that refine the search if selected
          ...(formData.subCategory && { sub_categories: JSON.stringify([parseInt(formData.subCategory)]) }),
          ...(formData.jurisdiction && { jurisdictions: JSON.stringify([parseInt(formData.jurisdiction)]) }),
          ...(formData.consultantType && { type_legal_consultant: formData.consultantType })
        };

        const response = await ApiService.request({
          method: "GET",
          url: "lawyers", // Using the lawyers search endpoint
          data: payload
        });

        const data = response.data;
        if (data.status && data.data) {
          // Use total count from pagination if available, otherwise use list length
          const count = data.data.pagination?.total ?? (data.data.lawyers?.length || 0);
          setLawyerCount(count);
        } else {
          setLawyerCount(0);
        }
      } catch (error) {
        console.error("Error checking lawyer availability:", error);
        // Don't block user on error, just hide the count
        setLawyerCount(null); 
      } finally {
        setCheckingLawyers(false);
      }
    };

    // Debounce the check to avoid too many requests
    const timeoutId = setTimeout(() => {
      checkLawyerAvailability();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.category, formData.subCategory, formData.jurisdiction, formData.consultantType]);

  // Fetch dropdown data on mount
  useEffect(() => {
    if (show) {
      const fetchDropdownData = async () => {
        try {
          setLoadingDropdowns(true);
          
          // Fetch dropdown data (jurisdictions and arbitrators)
          const dropdownResponse = await ApiService.request({
            method: "GET",
            url: "getDropdownData",
          });
          const dropdownData = dropdownResponse.data;
          if (dropdownData.status && dropdownData.data) {
            if (dropdownData.data.jurisdictions) {
              setJurisdictions(dropdownData.data.jurisdictions);
            }
            if (dropdownData.data.arbitrators) {
              setArbitrators(dropdownData.data.arbitrators);
            }
          }
          
          // Fetch categories
          const categoriesResponse = await ApiService.request({
            method: "GET",
            url: "getCategories",
          });
          const categoriesData = categoriesResponse.data;
          if (categoriesData.status && categoriesData.data) {
            setCategories(categoriesData.data);
          }
        } catch (error) {
          console.error("Error fetching dropdown data:", error);
          toast.error("Failed to load form data");
        } finally {
          setLoadingDropdowns(false);
        }
      };

      fetchDropdownData();
    }
  }, [show]);

  // Fetch subcategories when category is selected
  useEffect(() => {
    const fetchSubCategories = async () => {
      if (!formData.category) {
        setSubCategories([]);
        setFormData(prev => ({ ...prev, subCategory: "" }));
        return;
      }

      try {
        const response = await ApiService.request({
          method: "GET",
          url: "getSubCategories",
          data: { categories: JSON.stringify([formData.category]) }
        });
        const data = response.data;
        if (data.status && data.data) {
          setSubCategories(data.data);
        } else {
          setSubCategories([]);
        }
      } catch (error) {
        console.error("Error fetching subcategories:", error);
        setSubCategories([]);
      }
    };

    fetchSubCategories();
  }, [formData.category]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 4) {
      toast.error("You can upload maximum 4 files only");
      return;
    }
    setFormData(prev => ({ ...prev, attachments: files }));
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
      setFormData(initialFormState); // Reset form on close
    }, 300);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.jurisdiction) {
      toast.error("Please select jurisdiction");
      return;
    }
    if (!formData.consultantType) {
      toast.error("Please select type of legal consultant");
      return;
    }
    if (!formData.category) {
      toast.error("Please select category");
      return;
    }
    if (!formData.subCategory) {
      toast.error("Please select sub category");
      return;
    }
    if (!formData.description.trim()) {
      toast.error("Please describe your case");
      return;
    }
    if (!formData.acceptTerms) {
      toast.error("Please accept the Privacy policy & Terms & conditions");
      return;
    }

    try {
      // Create FormData for case creation
      const submitData = new FormData();
      submitData.append('description', formData.description.trim());
      submitData.append('jurisdictions', JSON.stringify([parseInt(formData.jurisdiction)]));
      submitData.append('type_legal_consultant', formData.consultantType);
      submitData.append('categories', JSON.stringify([parseInt(formData.category)]));
      submitData.append('sub_categories', JSON.stringify([parseInt(formData.subCategory)]));
      
      // Required by backend but hidden in UI
      submitData.append('consultation_type', JSON.stringify([]));
      
      // Add attachments if any
      if (formData.attachments && formData.attachments.length > 0) {
        formData.attachments.forEach((file) => {
          submitData.append('attachments[]', file);
        });
      }

      const response = await ApiService.request({
        method: "POST",
        url: "createCase",
        data: submitData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = response.data;
      if (data.status) {
        toast.success(data.message || "Case created successfully!");
        handleClose();
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast.error(data.message || "Failed to create case");
      }
    } catch (error) {
      console.error("Error creating case:", error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        const firstError = Object.values(errors)[0];
        toast.error(Array.isArray(firstError) ? firstError[0] : firstError);
      } else {
        toast.error("Failed to create case. Please try again.");
      }
    }
  };

  if (!show && !isClosing) return null;

  return (
    <>
      <div
        className="modal fade show"
        style={{
          display: "block",
          backgroundColor: "rgba(0,0,0,0.5)",
          opacity: isClosing ? 0 : 1,
          transition: "opacity 0.3s ease-in-out"
        }}
        tabIndex="-1"
        onClick={handleClose}
      >
        <div 
          className="modal-dialog modal-dialog-centered modal-lg" 
          style={{ maxWidth: "800px" }}
          onClick={e => e.stopPropagation()}
        >
          <div className="modal-content" style={{ borderRadius: "20px", border: "none", padding: "20px" }}>
            <div className="modal-header border-0 pb-0">
              <h5 className="modal-title fw-bold fs-4">Create a Case</h5>
              <button
                type="button"
                className="btn-close"
                onClick={handleClose}
                aria-label="Close"
              ></button>
            </div>
            
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                {/* Row 1: Jurisdiction & Consultant Type */}
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <div className="position-relative">
                      <select
                        className="form-select form-select-lg"
                        value={formData.jurisdiction}
                        onChange={(e) => handleChange("jurisdiction", e.target.value)}
                        disabled={loadingDropdowns}
                        style={{
                          height: "60px",
                          borderRadius: "12px",
                          border: "1px solid #E0E0E0",
                          fontSize: "16px",
                          color: formData.jurisdiction ? "#000" : "#6c757d"
                        }}
                      >
                        <option value="" className="text-muted">Select Jurisdiction</option>
                        {jurisdictions.map((jurisdiction) => (
                          <option key={jurisdiction.id} value={jurisdiction.id} style={{color: "#000"}}>
                            {jurisdiction.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="position-relative">
                      <select
                        className="form-select form-select-lg"
                        value={formData.consultantType}
                        onChange={(e) => handleChange("consultantType", e.target.value)}
                        disabled={loadingDropdowns}
                        style={{
                          height: "60px",
                          borderRadius: "12px",
                          border: "1px solid #E0E0E0",
                          fontSize: "16px",
                          color: formData.consultantType ? "#000" : "#6c757d"
                        }}
                      >
                        <option value="">Type of legal consultant</option>
                        {arbitrators.map((arbitrator) => (
                          <option key={arbitrator.id} value={arbitrator.name} style={{color: "#000"}}>
                            {arbitrator.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Row 2: Category & Sub Category */}
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <div className="position-relative">
                      <select
                        className="form-select form-select-lg"
                        value={formData.category}
                        onChange={(e) => handleChange("category", e.target.value)}
                        disabled={loadingDropdowns}
                        style={{
                          height: "60px",
                          borderRadius: "12px",
                          border: "1px solid #E0E0E0",
                          fontSize: "16px",
                          color: formData.category ? "#000" : "#6c757d"
                        }}
                      >
                        <option value="">Select Category</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id} style={{color: "#000"}}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="position-relative">
                      <select
                        className="form-select form-select-lg"
                        value={formData.subCategory}
                        onChange={(e) => handleChange("subCategory", e.target.value)}
                        disabled={!formData.category || loadingDropdowns}
                        style={{
                          height: "60px",
                          borderRadius: "12px",
                          border: "1px solid #E0E0E0",
                          fontSize: "16px",
                          color: formData.subCategory ? "#000" : "#6c757d"
                        }}
                      >
                        <option value="">Select Sub Categories</option>
                        {subCategories.map((subCategory) => (
                          <option key={subCategory.id} value={subCategory.id} style={{color: "#000"}}>
                            {subCategory.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="mb-3">
                  <textarea
                    className="form-control"
                    placeholder="Explain Your Case"
                    value={formData.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    style={{
                      height: "200px",
                      borderRadius: "12px",
                      border: "1px solid #E0E0E0",
                      padding: "15px",
                      resize: "none"
                    }}
                  ></textarea>
                </div>

                {/* File Attachment */}
                <div className="mb-4">
                  <div 
                    className="d-flex align-items-center px-3 py-3"
                    style={{
                      border: "1px dashed #E0E0E0",
                      borderRadius: "12px",
                      position: "relative"
                    }}
                  >
                    <input
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                      onChange={handleFileChange}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        opacity: 0,
                        cursor: "pointer"
                      }}
                    />
                    <div className="d-flex align-items-center">
                      <div 
                        className="d-flex align-items-center justify-content-center me-3"
                        style={{
                          width: "40px",
                          height: "40px",
                          backgroundColor: "#f8f9fa",
                          borderRadius: "8px"
                        }}
                      >
                        <i className="bi bi-paperclip fs-5 text-dark"></i>
                      </div>
                      <div>
                        <span className="text-dark fw-medium">Attach Document</span>
                        {formData.attachments.length > 0 && (
                          <div className="text-muted small mt-1">
                            {formData.attachments.length} file(s) selected
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Terms */}
                <div className="mb-4">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="acceptTerms"
                      checked={formData.acceptTerms}
                      onChange={(e) => handleChange("acceptTerms", e.target.checked)}
                      style={{ cursor: "pointer" }}
                    />
                    <label className="form-check-label text-muted small ms-2" htmlFor="acceptTerms" style={{ cursor: "pointer" }}>
                      Accept all Privacy policy & Terms & conditions
                    </label>
                  </div>
                </div>
                
                {/* Lawyer Availability Warning/Info */}
                {lawyerCount !== null && (
                  <div 
                    className={`alert d-flex align-items-center justify-content-center py-3 mb-0`}
                    style={{ 
                      borderRadius: "50px",
                      backgroundColor: lawyerCount > 0 ? "#198754" : "#212529", // Explicit green or dark
                      color: "#fff"
                    }}
                  >
                    <i className={`bi ${lawyerCount > 0 ? 'bi-check-circle-fill' : 'bi-info-circle-fill'} me-2 ${lawyerCount > 0 ? 'text-white' : 'text-warning'}`}></i>
                    <span>
                      {lawyerCount > 0 
                        ? `${lawyerCount} Lawyer${lawyerCount > 1 ? 's' : ''} available in this category`
                        : "No Lawyer Available in this Category"
                      }
                    </span>
                  </div>
                )}

                {/* Submit Button (Hidden trigger for form submission) */}
                <button type="submit" className="d-none"></button>
              </form>
            </div>

            <div className="modal-footer border-0 pt-0 justify-content-center pb-4">
              <button
                type="button"
                className={`btn w-100 py-3 rounded-pill fw-bold fs-5 ${lawyerCount === 0 ? 'btn-secondary' : 'btn-dark'}`}
                onClick={handleSubmit}
                disabled={loadingDropdowns || checkingLawyers || lawyerCount === 0}
              >
                {checkingLawyers ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Checking availability...
                  </>
                ) : lawyerCount === 0 ? (
                  "No Lawyer Available"
                ) : (
                  "Submit"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreateCaseModal;
