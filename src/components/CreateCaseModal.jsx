import React, { useState, useEffect, useRef } from "react";
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
  const [showJurisdictionDropdown, setShowJurisdictionDropdown] = useState(false);
  const [jurisdictionSearch, setJurisdictionSearch] = useState("");
  const jurisdictionRef = useRef(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const categoryRef = useRef(null);
  const [showSubCategoryDropdown, setShowSubCategoryDropdown] = useState(false);
  const [subCategorySearch, setSubCategorySearch] = useState("");
  const subCategoryRef = useRef(null);

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (jurisdictionRef.current && !jurisdictionRef.current.contains(event.target)) {
        setShowJurisdictionDropdown(false);
      }
      if (categoryRef.current && !categoryRef.current.contains(event.target)) {
        setShowCategoryDropdown(false);
      }
      if (subCategoryRef.current && !subCategoryRef.current.contains(event.target)) {
        setShowSubCategoryDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
        className="offcanvas offcanvas-end show"
        tabIndex="-1"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          visibility: "visible",
          width: "650px",
          height: "80%",
          transition: "all 0.3s ease-out",
          borderRadius: "13px",
          margin: "auto 20px",
          zIndex: 1045,
          transform: isClosing ? "translateX(100%)" : "translateX(0)",
          animation: isClosing ? "slideOutToRight 0.3s ease-in" : "slideInFromRight 0.3s ease-out",
          backgroundColor: "#fff",
        }}
      >
        <div className="offcanvas-header border-bottom" style={{ borderTopLeftRadius: "15px", borderTopRightRadius: "15px" }}>
          <div className="d-flex justify-content-between align-items-center w-100">
            <h5 className="mb-0 fw-bold fs-4" style={{ color: "#2B2B2B" }}>Create a Case</h5>
            <button type="button" className="btn-close" onClick={handleClose}></button>
          </div>
        </div>
        
        <div className="offcanvas-body p-4 d-flex flex-column" style={{ borderBottomLeftRadius: "15px", borderBottomRightRadius: "15px", height: "calc(100% - 70px)" }}>
              <div className="flex-grow-1" style={{ overflowY: "auto" }}>
              <form onSubmit={handleSubmit}>
                {/* Row 1: Jurisdiction & Consultant Type */}
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <div className="position-relative" ref={jurisdictionRef}>
                      <button
                        type="button"
                        className="form-select form-select-lg d-flex align-items-center justify-content-between"
                        onClick={() => {
                          if (!loadingDropdowns) {
                            setShowJurisdictionDropdown(!showJurisdictionDropdown);
                            setJurisdictionSearch("");
                          }
                        }}
                        disabled={loadingDropdowns}
                        style={{
                          height: "70px",
                          borderRadius: "12px",
                          border: "1px solid #E0E0E0",
                          fontSize: "16px",
                          color: formData.jurisdiction ? "#000" : "#6c757d",
                          textAlign: "left",
                          paddingLeft: "12px",
                          paddingRight: "40px",
                          width: "100%"
                        }}
                      >
                        <span>
                          {formData.jurisdiction
                            ? jurisdictions.find(j => j.id === parseInt(formData.jurisdiction))?.name || "Select Jurisdiction"
                            : "Select Jurisdiction"}
                        </span>
                        {/* <i className={`bi bi-chevron-${showJurisdictionDropdown ? "up" : "down"} position-absolute end-0 translate-middle-y me-3 text-gray-600`} style={{ top: "50%" }}></i> */}
                      </button>
                      {showJurisdictionDropdown && (
                        <div 
                          className="position-absolute bg-white border rounded shadow-lg"
                          style={{ 
                            zIndex: 1050, 
                            width: "100%", 
                            maxHeight: "300px", 
                            top: "100%",
                            marginTop: "8px"
                          }}
                        >
                          <div className="p-2 border-bottom bg-white" style={{ position: "sticky", top: 0 }}>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Search jurisdiction..."
                              value={jurisdictionSearch}
                              onChange={(e) => setJurisdictionSearch(e.target.value)}
                            />
                          </div>
                          <div style={{ maxHeight: "240px", overflowY: "auto" }}>
                            {jurisdictions
                              .filter(j => j.name.toLowerCase().includes(jurisdictionSearch.toLowerCase()))
                              .map((jurisdiction) => (
                                <button
                                  key={jurisdiction.id}
                                  type="button"
                                  className="btn btn-light w-100 text-start px-3 py-2 border-0"
                                  onClick={() => {
                                    handleChange("jurisdiction", jurisdiction.id.toString());
                                    setShowJurisdictionDropdown(false);
                                    setJurisdictionSearch("");
                                  }}
                                  style={{ 
                                    fontSize: "0.95rem",
                                    backgroundColor: formData.jurisdiction === String(jurisdiction.id) ? "#f0f0f0" : "#fff"
                                  }}
                                >
                                  {jurisdiction.name}
                                </button>
                              ))}
                            {jurisdictions.filter(j => j.name.toLowerCase().includes(jurisdictionSearch.toLowerCase())).length === 0 && (
                              <div className="p-3 text-center text-muted">No results</div>
                            )}
                          </div>
                        </div>
                      )}
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
                    <div className="position-relative" ref={categoryRef}>
                      <button
                        type="button"
                        className="form-select form-select-lg d-flex align-items-center justify-content-between"
                        onClick={() => {
                          if (!loadingDropdowns) {
                            setShowCategoryDropdown(!showCategoryDropdown);
                            setCategorySearch("");
                          }
                        }}
                        disabled={loadingDropdowns}
                        style={{
                          height: "60px",
                          borderRadius: "12px",
                          border: "1px solid #E0E0E0",
                          fontSize: "16px",
                          color: formData.category ? "#000" : "#6c757d",
                          textAlign: "left",
                          paddingLeft: "12px",
                          paddingRight: "40px",
                          width: "100%"
                        }}
                      >
                        <span>
                          {formData.category
                            ? categories.find(c => c.id === parseInt(formData.category))?.name || "Select Category"
                            : "Select Category"}
                        </span>
                        {/* <i className={`bi bi-chevron-${showCategoryDropdown ? "up" : "down"} position-absolute end-0 translate-middle-y me-3 text-gray-600`} style={{ top: "50%" }}></i> */}
                      </button>
                      {showCategoryDropdown && (
                        <div 
                          className="position-absolute bg-white border rounded shadow-lg"
                          style={{ 
                            zIndex: 1050, 
                            width: "100%", 
                            maxHeight: "300px", 
                            top: "100%",
                            marginTop: "8px"
                          }}
                        >
                          <div className="p-2 border-bottom bg-white" style={{ position: "sticky", top: 0 }}>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Search category..."
                              value={categorySearch}
                              onChange={(e) => setCategorySearch(e.target.value)}
                            />
                          </div>
                          <div style={{ maxHeight: "240px", overflowY: "auto" }}>
                            {categories
                              .filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase()))
                              .map((category) => (
                                <button
                                  key={category.id}
                                  type="button"
                                  className="btn btn-light w-100 text-start px-3 py-2 border-0"
                                  onClick={() => {
                                    handleChange("category", category.id.toString());
                                    setShowCategoryDropdown(false);
                                    setCategorySearch("");
                                  }}
                                  style={{ 
                                    fontSize: "0.95rem",
                                    backgroundColor: formData.category === String(category.id) ? "#f0f0f0" : "#fff"
                                  }}
                                >
                                  {category.name}
                                </button>
                              ))}
                            {categories.filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase())).length === 0 && (
                              <div className="p-3 text-center text-muted">No results</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="position-relative" ref={subCategoryRef}>
                      <button
                        type="button"
                        className="form-select form-select-lg d-flex align-items-center justify-content-between"
                        onClick={() => {
                          if (!loadingDropdowns && formData.category) {
                            setShowSubCategoryDropdown(!showSubCategoryDropdown);
                            setSubCategorySearch("");
                          }
                        }}
                        disabled={!formData.category || loadingDropdowns}
                        style={{
                          height: "60px",
                          borderRadius: "12px",
                          border: "1px solid #E0E0E0",
                          fontSize: "16px",
                          color: formData.subCategory ? "#000" : "#6c757d",
                          textAlign: "left",
                          paddingLeft: "12px",
                          paddingRight: "40px",
                          width: "100%"
                        }}
                      >
                        <span>
                          {formData.subCategory
                            ? subCategories.find(s => s.id === parseInt(formData.subCategory))?.name || "Select Sub Categories"
                            : "Select Sub Categories"}
                        </span>
                        {/* <i className={`bi bi-chevron-${showSubCategoryDropdown ? "up" : "down"} position-absolute end-0 translate-middle-y me-3 text-gray-600`} style={{ top: "50%" }}></i> */}
                      </button>
                      {showSubCategoryDropdown && (
                        <div 
                          className="position-absolute bg-white border rounded shadow-lg"
                          style={{ 
                            zIndex: 1050, 
                            width: "100%", 
                            maxHeight: "300px", 
                            top: "100%",
                            marginTop: "8px"
                          }}
                        >
                          <div className="p-2 border-bottom bg-white" style={{ position: "sticky", top: 0 }}>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Search sub category..."
                              value={subCategorySearch}
                              onChange={(e) => setSubCategorySearch(e.target.value)}
                            />
                          </div>
                          <div style={{ maxHeight: "240px", overflowY: "auto" }}>
                            {subCategories
                              .filter(s => s.name.toLowerCase().includes(subCategorySearch.toLowerCase()))
                              .map((subCategory) => (
                                <button
                                  key={subCategory.id}
                                  type="button"
                                  className="btn btn-light w-100 text-start px-3 py-2 border-0"
                                  onClick={() => {
                                    handleChange("subCategory", subCategory.id.toString());
                                    setShowSubCategoryDropdown(false);
                                    setSubCategorySearch("");
                                  }}
                                  style={{ 
                                    fontSize: "0.95rem",
                                    backgroundColor: formData.subCategory === String(subCategory.id) ? "#f0f0f0" : "#fff"
                                  }}
                                >
                                  {subCategory.name}
                                </button>
                              ))}
                            {subCategories.filter(s => s.name.toLowerCase().includes(subCategorySearch.toLowerCase())).length === 0 && (
                              <div className="p-3 text-center text-muted">No results</div>
                            )}
                          </div>
                        </div>
                      )}
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
                          borderRadius: "8px",
                          border: "1px dashed #bebebe"
                        }}
                      >
                        <i className="bi bi-paperclip fs-5 text-dark"></i>
                      </div>
                      <div>
                        <span className="fw-medium" style={{ color: "#525252" }}>Attach Document</span>
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
                      style={{ cursor: "pointer", border: "1px solid black" }}
                    />
                    <label className="form-check-label small ms-2" htmlFor="acceptTerms" style={{ cursor: "pointer", color: "#767676" }}>
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
            
            <div className="mt-auto pt-3">
              <button
                type="button"
                className={`btn w-100 py-3 rounded-pill text-white fw-bold fs-5 ${lawyerCount === 0 ? 'text-white' : 'bg-black'}`}
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
      
      <div
        className="offcanvas-backdrop fade show"
        onClick={handleClose}
      ></div>
    </>
  );
};

export default CreateCaseModal;
