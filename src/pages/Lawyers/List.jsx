import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import notificationProfile from "../../assets/images/lawyerImg.png";
import lawyersImg from "../../assets/images/Lawyers.png";
import NoLawyer from "../../assets/images/NoLawyer.png";
import ApiService from "../../services/ApiService";
import { toast } from "react-toastify";
import PaymentModal from "../../components/PaymentModal";

const List = () => {
  const location = useLocation();
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

  const [selectedFilter, setSelectedFilter] = useState(
    loadFromLocalStorage("lawyers_selectedFilter", "")
  );
  const [typeFilter, setTypeFilter] = useState(
    loadFromLocalStorage("lawyers_typeFilter", "")
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(
    loadFromLocalStorage("lawyers_selectedCategory", "")
  );
  const [selectedJurisdiction, setSelectedJurisdiction] = useState(
    loadFromLocalStorage("lawyers_selectedJurisdiction", "")
  );
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showJurisdictionDropdown, setShowJurisdictionDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [activeDropdownType, setActiveDropdownType] = useState(null); // 'category' or 'jurisdiction'
  const [lawyers, setLawyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [jurisdictions, setJurisdictions] = useState([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);
  const searchTimeoutRef = useRef(null);
  const categoryButtonRef = useRef(null);
  const jurisdictionButtonRef = useRef(null);
  const [showLawyerDetail, setShowLawyerDetail] = useState(
    loadFromLocalStorage("lawyers_showLawyerDetail", false)
  );
  const [selectedLawyer, setSelectedLawyer] = useState(
    loadFromLocalStorage("lawyers_selectedLawyer", null)
  );
  const [lawyerDetails, setLawyerDetails] = useState(null);
  const [myService, setMyService] = useState(null);
  const [loadingLawyerDetails, setLoadingLawyerDetails] = useState(false);
  const [cancellingService, setCancellingService] = useState(false);
  const [imageLoadingStates, setImageLoadingStates] = useState({});
  const [currentSlideIndex, setCurrentSlideIndex] = useState(
    loadFromLocalStorage("lawyers_currentSlideIndex", 0)
  );
  
  const [pricingOptions, setPricingOptions] = useState([]);
  const [selectedPricingOption, setSelectedPricingOption] = useState(null);
  const [showPricingOptions, setShowPricingOptions] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("");
    setSelectedJurisdiction("");
    setTypeFilter("");
    setSelectedFilter("");
  };

  const handleLawyerClick = async (lawyer) => {
    setSelectedLawyer(lawyer);
    setShowLawyerDetail(true);
    setCurrentSlideIndex(0); // Reset slider to first image when opening
    setLawyerDetails(null); // Clear previous details
    setMyService(null); // Clear previous service
    // Fetch detailed lawyer information
    const lawyerId = lawyer.id || lawyer.rawData?.id;
    if (lawyerId) {
      await fetchLawyerDetails(lawyerId);
    }
  };

  const fetchLawyerDetails = async (lawyerId) => {
    if (!lawyerId) return;
    
    try {
      setLoadingLawyerDetails(true);
      const response = await ApiService.request({
        method: "GET",
        url: "getLawyerDetails",
        data: { lawyer_id: lawyerId }
      });
      
      const data = response.data;
      if (data.status && data.data) {
        setLawyerDetails(data.data);
        setMyService(data.my_service || null);
        
        // Update pricing options based on API data
        const lawyer = data.data;
        const options = [];
        
        // Add weekly pricing as "One Time Service" if available
        if (lawyer.weekly_price) {
          options.push({
            label: `$${lawyer.weekly_price} / One Time Service`,
            value: "one-time"
          });
        }
        
        // Add monthly pricing if available
        if (lawyer.monthly_price) {
          options.push({
            label: `$${lawyer.monthly_price} / Monthly`,
            value: "monthly"
          });
        }
        
        // Add consult_fee as one-time service if weekly_price not available
        if (!lawyer.weekly_price && lawyer.consult_fee) {
          options.push({
            label: `$${lawyer.consult_fee} / One Time Service`,
            value: "one-time"
          });
        }
        
        setPricingOptions(options);
        
        // Set default to monthly if available, otherwise first option
        const defaultOption = options.find(opt => opt.value === "monthly") || options[0];
        if (defaultOption) {
          setSelectedPricingOption(defaultOption.value);
        } else {
          setSelectedPricingOption(null);
        }
        
        // Reset slide index when new lawyer details are loaded
        setCurrentSlideIndex(0);
        return data.data;
      } else {
        console.error("Failed to fetch lawyer details:", data.message);
        toast.error(data.message || "Failed to load lawyer details");
      }
    } catch (error) {
      console.error("Error fetching lawyer details:", error);
      toast.error("Failed to load lawyer details");
    } finally {
      setLoadingLawyerDetails(false);
    }
    return null;
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const id = searchParams.get("id");
    if (id) {
      const loadDetails = async () => {
        const details = await fetchLawyerDetails(id);
        if (details) {
          // Construct a minimal selectedLawyer object to satisfy rendering conditions
          const lawyer = {
            id: details.id,
            type: details.company_id ? "Company" : "Individual",
            name: details.name || "",
            firmName: details.company_name || details.name || "",
            title: details.title || "Legal Expert",
            rating: parseFloat(details.rating) || 0,
            location: `${details.city || ""}${details.city && details.country ? ", " : ""}${details.country || ""}`.trim() || "Location not available",
            image: details.picture || lawyersImg,
            specialization: "", 
            rawData: details
          };
          setSelectedLawyer(lawyer);
          setShowLawyerDetail(true);
        }
      };
      loadDetails();
    }
  }, [location.search]);

  const handleCancelService = async () => {
    if (!myService || !myService.id) {
      toast.error("Service information not available");
      return;
    }

    if (!window.confirm("Are you sure you want to cancel this subscription?")) {
      return;
    }

    try {
      setCancellingService(true);
      const response = await ApiService.request({
        method: "POST",
        url: "cancelService",
        data: { user_service_id: myService.id }
      });

      const data = response.data;
      if (data.status && data.data) {
        // Update myService with cancelled status
        setMyService(prev => ({
          ...prev,
          status: 'Cancelled',
          cancel_renewal: 1
        }));
        toast.success(data.message || "Service cancelled successfully");
      } else {
        toast.error(data.message || "Failed to cancel service");
      }
    } catch (error) {
      console.error("Error cancelling service:", error);
      toast.error("Failed to cancel service. Please try again.");
    } finally {
      setCancellingService(false);
    }
  };

  const nextSlide = () => {
    const lawyerImages = lawyerDetails?.images || [];
    const imagesToShow = lawyerImages.length > 0 ? lawyerImages : 
                        (lawyerDetails?.picture ? [lawyerDetails.picture] : []);
    if (imagesToShow.length > 1) {
      setCurrentSlideIndex((prev) => (prev + 1) % imagesToShow.length);
    }
  };

  const prevSlide = () => {
    const lawyerImages = lawyerDetails?.images || [];
    const imagesToShow = lawyerImages.length > 0 ? lawyerImages : 
                        (lawyerDetails?.picture ? [lawyerDetails.picture] : []);
    if (imagesToShow.length > 1) {
      setCurrentSlideIndex((prev) => (prev - 1 + imagesToShow.length) % imagesToShow.length);
    }
  };

  const goToSlide = (index) => {
    setCurrentSlideIndex(index);
  };

  const handleImageLoad = (imageId) => {
    setImageLoadingStates(prev => ({
      ...prev,
      [imageId]: 'loaded'
    }));
  };

  const handleImageError = (imageId) => {
    setImageLoadingStates(prev => ({
      ...prev,
      [imageId]: 'error'
    }));
  };


  const filters = ["Company", "Individual", "Categories", "Jurisdiction"];

  // Fetch dropdown data (categories and jurisdictions)
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        setLoadingDropdowns(true);
        
        // Fetch jurisdictions from getDropdownData
        const dropdownResponse = await ApiService.request({
          method: "GET",
          url: "getDropdownData",
        });
        const dropdownData = dropdownResponse.data;
        console.log("Dropdown Data Response:", dropdownData); // Debug log
        
        if (dropdownData.status && dropdownData.data) {
          if (dropdownData.data.jurisdictions) {
            setJurisdictions(dropdownData.data.jurisdictions);
            console.log("Jurisdictions loaded:", dropdownData.data.jurisdictions.length); // Debug log
          }
        }
        
        // Fetch categories separately
        const categoriesResponse = await ApiService.request({
          method: "GET",
          url: "getCategories",
        });
        const categoriesData = categoriesResponse.data;
        console.log("Categories Response:", categoriesData); // Debug log
        
        if (categoriesData.status && categoriesData.data) {
          setCategories(categoriesData.data);
          console.log("Categories loaded:", categoriesData.data.length); // Debug log
        }
      } catch (error) {
        console.error("Error fetching dropdown data:", error);
      } finally {
        setLoadingDropdowns(false);
      }
    };

    fetchDropdownData();
  }, []);

  // Fetch lawyers from API
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      const fetchLawyers = async () => {
        try {
          setLoading(true);
          
          const requestData = {};

          // Only add search if there's a search term
          // API returns empty results if search is empty string
          if (searchTerm && searchTerm.trim()) {
            requestData.search = searchTerm.trim();
          }

          // Add category filter (independent of selectedFilter)
          if (selectedCategory) {
            const categoryObj = categories.find(cat => cat.name === selectedCategory || cat.id === selectedCategory);
            if (categoryObj) {
              requestData.categories = JSON.stringify([categoryObj.id]);
            }
          }

          // Add jurisdiction filter (independent of selectedFilter)
          if (selectedJurisdiction) {
            const jurisdictionObj = jurisdictions.find(j => j.name === selectedJurisdiction || j.id === selectedJurisdiction);
            if (jurisdictionObj) {
              requestData.jurisdictions = JSON.stringify([jurisdictionObj.id]);
            }
          }

          // Set add=1 to get all lawyers (not filtered by jurisdiction requirement)
          requestData.add = 1;
          
          console.log("Filter Lawyers Request:", requestData); // Debug log

          const response = await ApiService.request({
            method: "POST",
            url: "filterLawyers",
            data: requestData,
          });

          const data = response.data;
          console.log("Filter Lawyers API Response:", data); // Debug log
          
          if (data.status && data.data && data.data.lawyers) {
            // Transform API data to match component format
            let transformedLawyers = data.data.lawyers.map((lawyer) => {
              const lawyerCategories = lawyer.categories || [];
              const lawyerJurisdictions = lawyer.jurisdictions || [];
              const primaryCategory = lawyerCategories[0];
              const primaryJurisdiction = lawyerJurisdictions[0];

              return {
                id: lawyer.id,
                type: lawyer.company_id ? "Company" : "Individual",
                name: lawyer.name || "",
                firmName: lawyer.company_name || lawyer.name || "",
                title: lawyer.title || "Legal Expert",
                rating: parseFloat(lawyer.rating) || 0,
                location: `${lawyer.city || ""}${lawyer.city && lawyer.country ? ", " : ""}${lawyer.country || ""}`.trim() || "Location not available",
                specialization: `${primaryCategory?.name || ""}${primaryCategory && primaryJurisdiction ? " + Jurisdiction: " : primaryJurisdiction ? "Jurisdiction: " : ""}${primaryJurisdiction?.name || ""}${primaryJurisdiction ? "+" : ""}`,
                image: lawyer.picture || lawyersImg,
                category: primaryCategory?.name || "",
                jurisdiction: primaryJurisdiction?.name || "",
                description: lawyer.about || "",
                categories: lawyerCategories,
                jurisdictions: lawyerJurisdictions,
                rawData: lawyer,
                weekly_price: lawyer.weekly_price || 0,
                monthly_price: lawyer.monthly_price || 0,
              };
            });

            console.log("Transformed Lawyers:", transformedLawyers); // Debug log

            // Apply Company/Individual filter client-side
            if (typeFilter === "Company") {
              transformedLawyers = transformedLawyers.filter(lawyer => lawyer.type === "Company");
            } else if (typeFilter === "Individual") {
              transformedLawyers = transformedLawyers.filter(lawyer => lawyer.type === "Individual");
            }

            setLawyers(transformedLawyers);
          } else {
            console.log("No lawyers data in response:", data); // Debug log
            setLawyers([]);
          }
        } catch (error) {
          console.error("Error fetching lawyers:", error);
          setLawyers([]);
        } finally {
          setLoading(false);
        }
      };

      fetchLawyers();
    }, 500); // 500ms debounce delay

    // Cleanup timeout on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, selectedCategory, selectedJurisdiction, categories, jurisdictions, typeFilter]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("lawyers_selectedFilter", JSON.stringify(selectedFilter));
      localStorage.setItem("lawyers_typeFilter", JSON.stringify(typeFilter));
      localStorage.setItem("lawyers_selectedCategory", JSON.stringify(selectedCategory));
      localStorage.setItem("lawyers_selectedJurisdiction", JSON.stringify(selectedJurisdiction));
      localStorage.setItem("lawyers_showLawyerDetail", JSON.stringify(showLawyerDetail));
      localStorage.setItem("lawyers_selectedLawyer", JSON.stringify(selectedLawyer));
      localStorage.setItem("lawyers_currentSlideIndex", JSON.stringify(currentSlideIndex));
      localStorage.setItem("lawyers_selectedPricingOption", JSON.stringify(selectedPricingOption));
      localStorage.setItem("lawyers_showPricingOptions", JSON.stringify(showPricingOptions));
    } catch (error) {
      console.error("Error saving lawyers data to localStorage:", error);
    }
  }, [selectedFilter, typeFilter, selectedCategory, selectedJurisdiction, showLawyerDetail, selectedLawyer, currentSlideIndex, selectedPricingOption, showPricingOptions]);

  const handleFilterClick = (filter) => {
    if (filter === "Company" || filter === "Individual") {
      setTypeFilter(filter);
      setSelectedFilter(filter);
    } else {
      setSelectedFilter(filter);
    }
  };

  const calculateDropdownPosition = (buttonRef) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom ,
      left: rect.left + window.scrollX,
      width: rect.width
    });
  };

  const handleCategoryDropdownToggle = () => {
    if (!showCategoryDropdown) {
      calculateDropdownPosition(categoryButtonRef);
      setActiveDropdownType('category');
    }
    setShowCategoryDropdown(!showCategoryDropdown);
    setShowJurisdictionDropdown(false);
  };

  const handleJurisdictionDropdownToggle = () => {
    if (!showJurisdictionDropdown) {
      calculateDropdownPosition(jurisdictionButtonRef);
      setActiveDropdownType('jurisdiction');
    }
    setShowJurisdictionDropdown(!showJurisdictionDropdown);
    setShowCategoryDropdown(false);
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setShowCategoryDropdown(false);
    setActiveDropdownType(null);
  };

  const handleJurisdictionSelect = (jurisdiction) => {
    setSelectedJurisdiction(jurisdiction);
    setShowJurisdictionDropdown(false);
    setActiveDropdownType(null);
  };

  // Preload images for better performance
  useEffect(() => {
    const preloadImages = () => {
      const imagesToPreload = [lawyersImg, notificationProfile];
      imagesToPreload.forEach(src => {
        const img = new Image();
        img.src = src;
      });
    };
    
    preloadImages();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const isClickOnButton = categoryButtonRef.current?.contains(event.target) || 
                              jurisdictionButtonRef.current?.contains(event.target);
      const isClickOnDropdown = event.target.closest('.lawyers-filter-dropdown-portal');
      
      if (!isClickOnButton && !isClickOnDropdown) {
        setShowCategoryDropdown(false);
        setShowJurisdictionDropdown(false);
        setActiveDropdownType(null);
      }
    };

    // Update dropdown position on scroll/resize
    const updatePosition = () => {
      if (showCategoryDropdown && categoryButtonRef.current) {
        calculateDropdownPosition(categoryButtonRef);
      }
      if (showJurisdictionDropdown && jurisdictionButtonRef.current) {
        calculateDropdownPosition(jurisdictionButtonRef);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [showCategoryDropdown, showJurisdictionDropdown]);

  return (
    <div className="container-fluid">
      {/* Search and Filter Section */}
      <div className="row mb-4" data-aos="fade-up">
        <div className="col-12 px-0">
          {/* Search Bar + Clear Filters */}
          <div
            className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 bg-white lawyers-list-header-bar"
            style={{
              borderBottom: "0.1px solid #e6e6e6",
              borderTop: "0.1px solid #e6e6e6",
              marginTop: "28px",
              paddingInline: "16px",
            }}
          >
            <div
              className="position-relative my-4 my-md-5 flex-grow-1"
              style={{ width: "100%", maxWidth: "1096px" }}
            >
              <input
                type="text"
                className="form-control form-control-lg portal-form-hover"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  paddingLeft: "50px",
                  paddingRight: "20px",
                  height: "50px",
                  border: "1px solid #e9ecef",
                  backgroundColor: "#ffffff",
                  borderRadius: "25px",
                  fontSize: "1rem",
                  boxShadow: "none",
                }}
              />
              <i
                className="bi bi-search position-absolute top-50 translate-middle-y text-muted fs-5"
                style={{ left: "20px" }}
              ></i>
            </div>
            {(searchTerm ||
              selectedCategory ||
              selectedJurisdiction ||
              typeFilter !== "Company") && (
              <button
                type="button"
                className="btn btn-outline-secondary ms-md-3 mb-4 mb-md-0"
                onClick={clearFilters}
                style={{ borderRadius: "25px", height: "40px", whiteSpace: "nowrap" }}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
         {/* Filter Buttons */}
         <div className="d-flex justify-content-start gap-3 flex-wrap lawyers-filter-tabs" style={{ position: "relative", zIndex: 100 }}>
           {filters.map((filter) => (
             <div key={filter} className="position-relative" style={{ zIndex: 100 }}>
               {filter === "Categories" ? (
                 <div className="position-relative">
                   <button
                     ref={categoryButtonRef}
                     className={`btn px-4 py-2 portal-button-hover ${
                       selectedFilter === filter || selectedCategory
                         ? "bg-black text-white"
                         : "bg-white text-black"
                     }`}
                     onClick={() => {
                       handleFilterClick(filter);
                       handleCategoryDropdownToggle();
                     }}
                     style={{
                       fontSize: "0.9rem",
                       fontWeight: "500",
                       borderRadius: "25px",
                       border: selectedFilter === filter ? "none" : "1px solid #e9ecef",
                       minWidth: "120px",
                       height: "40px",
                       display: "flex",
                       alignItems: "center",
                       justifyContent: "center",
                       gap: "8px",
                     }}
                   >
                     {selectedCategory || filter}
                     <i className="bi bi-chevron-down" style={{ fontSize: "0.8rem" }}></i>
                   </button>
                 </div>
               ) : filter === "Jurisdiction" ? (
                 <div className="position-relative">
                   <button
                     ref={jurisdictionButtonRef}
                     className={`btn px-4 py-2 portal-button-hover ${
                       selectedFilter === filter || selectedJurisdiction
                         ? "bg-black text-white"
                         : "bg-white text-black"
                     }`}
                     onClick={() => {
                       handleFilterClick(filter);
                       handleJurisdictionDropdownToggle();
                     }}
                     style={{
                       fontSize: "0.9rem",
                       fontWeight: "500",
                       borderRadius: "25px",
                       border: selectedFilter === filter ? "none" : "1px solid #e9ecef",
                       minWidth: "120px",
                       height: "40px",
                       display: "flex",
                       alignItems: "center",
                       justifyContent: "center",
                       gap: "8px",
                     }}
                   >
                     {selectedJurisdiction || filter}
                     <i className="bi bi-chevron-down" style={{ fontSize: "0.8rem" }}></i>
                   </button>
                 </div>
               ) : (
                 <button
                   className={`btn px-4 py-2 ${
                     typeFilter === filter
                       ? "bg-black text-white"
                       : "bg-white text-black"
                   }`}
                   onClick={() => handleFilterClick(filter)}
                   style={{
                     fontSize: "0.9rem",
                     fontWeight: "500",
                     borderRadius: "25px",
                     border: typeFilter === filter ? "none" : "1px solid #e9ecef",
                     minWidth: "120px",
                     height: "40px",
                     display: "flex",
                     alignItems: "center",
                     justifyContent: "center",
                     gap: "8px",
                   }}
                 >
                   {filter}
                 </button>
               )}
             </div>
           ))}
         </div>
      </div>

      {/* Lawyers Grid */}
      <div className="row">
        {loading ? (
          <div className="col-12 d-flex align-items-center justify-content-center" style={{ minHeight: "400px" }}>
            <div className="text-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          </div>
        ) : lawyers.length === 0 ? (
          <div className="col-12 d-flex align-items-center justify-content-center" style={{ minHeight: "400px" }}>
            <div className="text-center p-5">
              <div className="mb-4">
                <img src={NoLawyer} alt="No Lawyer" style={{ maxWidth: "200px", height: "auto" }} />
              </div>
              <h4 className="text-muted mb-2 fw-bold">No Lawyers Found</h4>
              <p className="text-muted mb-0">
                {searchTerm || selectedCategory || selectedJurisdiction 
                  ? "Try adjusting your search or filters." 
                  : "No lawyers available at the moment."}
              </p>
            </div>
          </div>
        ) : (
          lawyers.map((lawyer, index) => (
          <div key={lawyer.id} className="col-lg-4 col-md-6 mb-4" data-aos="fade-up" data-aos-delay={`${100 + index * 100}`}
              style= {{zIndex:1}}>
            <div
              className="card h-100 shadow-sm portal-card-hover"
              style={{
                borderRadius: "15px",
                border: "none",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                cursor: "pointer"
              }}
              onClick={() => handleLawyerClick(lawyer)}
            >
              <div
                className="card-img-top position-relative"
                style={{
                  borderTopRightRadius: "15px",
                  borderTopLeftRadius: "15px",
                  overflow: "hidden"
                }}
              >
                <img
                  src={lawyer.image}
                  className="card-img-top"
                  alt={lawyer.type === "Individual" ? lawyer.name : lawyer.firmName}
                  loading="lazy"
                  decoding="async"
                  onLoad={() => handleImageLoad(`lawyer-${lawyer.id}`)}
                  onError={() => handleImageError(`lawyer-${lawyer.id}`)}
                  style={{
                    height: "320px",
                    objectFit: "cover",
                    objectPosition: "center",
                    width: "100%",
                    borderTopRightRadius: "15px",
                    borderTopLeftRadius: "15px",
                    backgroundColor: "#f8f9fa"
                  }}
                />
              </div>
              <div className="card-body p-4">
                {lawyer.type === "Individual" ? (
                  <>
                    <h5 className="card-title fw-bold text-dark mb-2" style={{ fontSize: "1.1rem", lineHeight: "1.3" }}>
                      {lawyer.name}
                    </h5>
                    <div className="d-flex align-items-center justify-content-start mb-3">
                      <div className="d-flex align-items-center me-5">
                        <i className="bi bi-star-fill text-dark me-1" style={{ fontSize: "0.9rem" }}></i>
                        <span className="fw-bold text-dark lawyers-rating-hover" style={{ fontSize: "0.9rem" }}>
                          {lawyer.rating}
                        </span>
                      </div>
                      <div className="d-flex align-items-center">
                        <i className="bi bi-geo-alt-fill text-muted me-1" style={{ fontSize: "0.8rem" }}></i>
                        <span className="text-muted" style={{ fontSize: "1rem" }}>{lawyer.location}</span>
                      </div>
                    </div>
                    <p className="text-muted mb-3" style={{ fontSize: "0.9rem", fontWeight: "500" }}>{lawyer.categories[0]?.name} +{lawyer.categories.length}</p>
                    <p className="text-muted mb-3" style={{ fontSize: "0.9rem", lineHeight: "1.4" }}>Jurisdiction: {lawyer.categories[0]?.name} +{lawyer.categories.length}</p>
                    <div className="">
                      <p className="text-dark mb-0 float-start fw-semibold" style={{ fontSize: "1rem", lineHeight: "1.4" }}>$ {lawyer.weekly_price} / On Time Service </p>
                      <p className="text-dark mb-0 float-end fw-semibold" style={{ fontSize: "1rem", lineHeight: "1.4" }}>$ {lawyer.monthly_price} / Monthly </p>
                    </div>
                  </>
                ) : (
                  <>
                    <h5 className="card-title fw-bold text-dark mb-2" style={{ fontSize: "1.6rem", lineHeight: "1.3" }}>
                      {lawyer.firmName}
                    </h5>
                    <div className="d-flex align-items-center justify-content-start mb-3">
                      <div className="d-flex align-items-center me-5">
                        <i className="bi bi-star-fill text-dark me-1" style={{ fontSize: "0.9rem" }}></i>
                        <span className="fw-bold text-dark lawyers-rating-hover" style={{ fontSize: "0.9rem" }}>
                          {lawyer.rating}
                        </span>
                      </div>
                      <div className="d-flex align-items-center">
                        <i className="bi bi-geo-alt-fill text-muted me-1" style={{ fontSize: "0.8rem" }}></i>
                        <span className="text-muted" style={{ fontSize: "0.85rem" }}>{lawyer.location}</span>
                      </div>
                    </div>
                    <p className="text-muted mb-0" style={{ fontSize: "0.8rem", lineHeight: "1.4" }}>{lawyer.specialization}</p>
                  </>
                )}
              </div>
            </div>
          </div>
          ))
        )}
      </div>

      {/* Lawyer Detail Offcanvas */}
      {showLawyerDetail && selectedLawyer && (
        <div
          className="offcanvas offcanvas-end show"
          tabIndex="-1"
          style={{ position: "fixed" }}
        >
          <div
            className="position-absolute top-0 start-0 m-3"
            style={{ zIndex: 1100 }}
          >
            <button
              type="button"
              className="btn btn-light rounded-circle shadow-sm d-flex align-items-center justify-content-center lawyer-detail-close-btn"
              style={{ width: "30px", height: "33px" }}
              onClick={() => {
                setShowLawyerDetail(false);
                setLawyerDetails(null);
                setMyService(null);
                setCurrentSlideIndex(0);
              }}
              aria-label="Close lawyer details"
            >
              <i className="bi bi-x-lg fs-5 pe-0"></i>
            </button>
          </div>
          <div
            className="position-absolute top-0 end-0 m-3"
            style={{ zIndex: 1100 }}
          >
            <button
              type="button"
              className="btn btn-light rounded-circle shadow-sm d-flex align-items-center justify-content-center lawyer-detail-close-btn"
              style={{ width: "30px", height: "33px" }}
              onClick={() => {
                setShowLawyerDetail(false);
                setLawyerDetails(null);
                setMyService(null);
                setCurrentSlideIndex(0);
              }}
              aria-label="Close lawyer details"
            >
              <i className="bi bi-upload fs-5 pe-0"></i>
            </button>
          </div>
          {/* <div className="offcanvas-header p-3 p-md-4">
            <div className="d-flex justify-content-between align-items-center w-100">
              <h5 className="mb-0 fw-bold fs-5 fs-md-4">Lawyer Detail</h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => {
                setShowLawyerDetail(false);
                setMyService(null);
              }}
              ></button>
            </div>
          </div> */}

          <div className="offcanvas-body p-0 d-flex flex-column" style={{ height: "100%" }}>
            {loadingLawyerDetails ? (
              <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : (
            <div className="p-0 flex-grow-1" style={{ overflowY: "auto" }}>
              {/* Image Slider */}
              <div className="mb-4 position-relative" style={{ height: "390px" }}>
                {/* Slider Container */}
                <div
                  className="position-relative w-100 h-100"
                  style={{ 
                    overflow: "hidden",
                    borderTopRightRadius: "15px",
                    borderTopLeftRadius: "15px",
                    backgroundColor: "#f8f9fa"
                  }}
                >
                  {/* Images - Use lawyer images array or picture from API */}
                  {(() => {
                    // Get images array from API
                    const lawyerImages = lawyerDetails?.images || [];
                    // If we have multiple images, use them
                    if (lawyerImages.length > 0) {
                      return lawyerImages.map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`${lawyerDetails?.name || lawyerDetails?.firm_name || 'Lawyer'} - Image ${index + 1}`}
                          className="w-100 h-100"
                          loading="lazy"
                          decoding="async"
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            objectPosition: "center top",
                            opacity: index === currentSlideIndex ? 1 : 0,
                            transition: "opacity 0.5s ease-in-out",
                            borderTopRightRadius: "15px",
                            borderTopLeftRadius: "15px",
                          }}
                          onError={(e) => {
                            e.target.src = lawyerDetails?.picture || notificationProfile;
                          }}
                        />
                      ));
                    }
                    // If single picture, use it
                    else if (lawyerDetails?.picture) {
                      return (
                        <img
                          src={lawyerDetails.picture}
                          alt={lawyerDetails.name || lawyerDetails.firm_name || "Lawyer"}
                          className="w-100 h-100"
                          loading="lazy"
                          decoding="async"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            objectPosition: "center top",
                            borderTopRightRadius: "15px",
                            borderTopLeftRadius: "15px",
                          }}
                          onError={(e) => {
                            e.target.src = notificationProfile;
                          }}
                        />
                      );
                    }
                    // No images available - show placeholder
                    else {
                      return (
                        <div className="w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: "#f8f9fa" }}>
                          <i className="bi bi-image fs-1 text-muted"></i>
                        </div>
                      );
                    }
                  })()}

                  {/* Navigation Arrows - Show only if multiple images */}
                  {(() => {
                    const lawyerImages = lawyerDetails?.images || [];
                    const imagesToShow = lawyerImages.length > 0 ? lawyerImages : 
                                        (lawyerDetails?.picture ? [lawyerDetails.picture] : []);
                    
                    return imagesToShow.length > 1 ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-light rounded-circle position-absolute top-50 start-0 translate-middle-y ms-3 shadow-sm"
                          style={{
                            width: "20px",
                            height: "33px",
                            zIndex: 10,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "rgba(255, 255, 255, 0.9)",
                          }}
                          onClick={prevSlide}
                          aria-label="Previous image"
                        >
                          <i className="bi bi-chevron-left pe-1" style={{ fontSize: "1rem" }}></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-light rounded-circle position-absolute top-50 end-0 translate-middle-y me-3 shadow-sm"
                          style={{
                            width: "20px",
                            height: "33px",
                            zIndex: 10,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "rgba(255, 255, 255, 0.9)",
                          }}
                          onClick={nextSlide}
                          aria-label="Next image"
                        >
                          <i className="bi bi-chevron-right pe-0" style={{ fontSize: "1rem" }}></i>
                        </button>
                      </>
                    ) : null;
                  })()}

                  {/* Dots Indicator - Show only if multiple images */}
                  {(() => {
                    const lawyerImages = lawyerDetails?.images || [];
                    const imagesToShow = lawyerImages.length > 0 ? lawyerImages : 
                                        (lawyerDetails?.picture ? [lawyerDetails.picture] : []);
                    
                    return imagesToShow.length > 1 ? (
                      <div
                        className="position-absolute bottom-0 start-50 translate-middle-x mb-3"
                        style={{ zIndex: 10 }}
                      >
                        <div className="d-flex gap-2">
                          {imagesToShow.map((_, index) => (
                            <button
                              key={index}
                              type="button"
                              className="btn p-0 border-0"
                              onClick={() => goToSlide(index)}
                              style={{
                                width: index === currentSlideIndex ? "24px" : "8px",
                                height: "8px",
                                borderRadius: "4px",
                                backgroundColor: index === currentSlideIndex ? "#ffffff" : "rgba(255, 255, 255, 0.5)",
                                transition: "all 0.3s ease",
                                cursor: "pointer",
                              }}
                              aria-label={`Go to slide ${index + 1}`}
                            />
                          ))}
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>

              {/* Thumbnail Images */}
              {/* <div className="d-flex gap-2 mb-4">
                {[1, 2, 3, 4].map((index) => (
                  <div
                    key={index}
                    className="rounded"
                    style={{
                      width: "60px",
                      height: "60px",
                      backgroundColor: "#f8f9fa",
                      border: "1px solid #e9ecef"
                    }}
                  >
                    <img 
                      src={notificationProfile} 
                      className="w-100 h-100" 
                      alt="Lawyer profile thumbnail"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                ))}
              </div> */}

              {/* Location */}
              {lawyerDetails?.location && (
                <div className="mb-2 px-3">
                  <small className="text-muted fs-3">
                    {lawyerDetails.location}
                  </small>
                </div>
              )}

              {/* Name and Rating */}
              <div className="d-flex justify-content-between align-items-center mb-3 px-3 lawyer-card-title">
                <h1 className="fw-bold text-dark mb-0">
                  {lawyerDetails?.name || lawyerDetails?.firm_name || ""}
                </h1>
                <div className="d-flex align-items-center">
                  {(lawyerDetails?.categories?.[0]?.name || lawyerDetails?.sub_categories?.[0]?.name) && (
                    <span className="text-muted me-2">
                      {lawyerDetails.categories?.[0]?.name || lawyerDetails.sub_categories?.[0]?.name}
                    </span>
                  )}
                  {lawyerDetails?.rating && (
                    <div className="d-flex align-items-center">
                      <i className="bi bi-star-fill text-dark me-1"></i>
                      <span className="fw-bold">{lawyerDetails.rating}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {(lawyerDetails?.about || lawyerDetails?.description) && (
                <p className="text-muted mb-4 px-3" style={{ lineHeight: "1.6" }}>
                  {lawyerDetails.about || lawyerDetails.description}
                </p>
              )}

              {/* Jurisdictions */}
              {lawyerDetails?.jurisdictions && lawyerDetails.jurisdictions.length > 0 && (
                <div className="px-3 mb-3">
                  <h6 className="fw-bold text-dark mb-2">Jurisdictions</h6>
                  <div className="d-flex flex-wrap gap-2">
                    {lawyerDetails.jurisdictions.map((jurisdiction, index) => (
                      <span key={jurisdiction.id || index} className="badge bg-light text-dark">
                        {jurisdiction.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Categories/Expertise */}
              {(lawyerDetails?.categories || lawyerDetails?.sub_categories) && (
                <div className="px-3 mb-3">
                  <h6 className="fw-bold text-dark mb-2">Expertise</h6>
                  <div className="d-flex flex-wrap gap-2">
                    {lawyerDetails.categories?.map((category, index) => (
                      <span key={category.id || index} className="badge bg-light text-dark">
                        {category.name}
                      </span>
                    ))}
                    {lawyerDetails.sub_categories?.map((subCategory, index) => (
                      <span key={subCategory.id || index} className="badge bg-light text-dark">
                        {subCategory.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Services */}
              <div className="mb-4 px-3">
                <h6 className="fw-bold text-dark mb-3">Services</h6>
                <div className="d-flex flex-column gap-2">
                  {[
                    "Legal consultation and advice",
                    "Document preparation and review",
                    "Court representation",
                    "Contract negotiation"
                  ].map((service, index) => (
                    <div key={index} className="d-flex align-items-center">
                      <i className="bi bi-check-circle-fill text-black me-2"></i>
                      <span className="text-muted">{service}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reviews */}
              {lawyerDetails?.reviews && lawyerDetails.reviews.length > 0 && (
                <div className="mb-4 px-3">
                  <h6 className="fw-bold text-dark mb-3">Reviews</h6>
                  
                  {/* Overall Rating */}
                  {lawyerDetails.rating && (
                    <div className="d-flex align-items-center mb-3">
                      <div className="d-flex me-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <i 
                            key={star} 
                            className={`bi bi-star${star <= Math.round(lawyerDetails.rating) ? '-fill' : ''} text-dark`}
                          ></i>
                        ))}
                      </div>
                      <span className="fw-bold me-2">{lawyerDetails.rating} out of 5</span>
                      <span className="text-muted">{lawyerDetails.reviews.length} total review{lawyerDetails.reviews.length !== 1 ? 's' : ''}</span>
                    </div>
                  )}

                  {/* Individual Reviews */}
                  <div className="d-flex flex-column gap-3">
                    {lawyerDetails.reviews.slice(0, 5).map((review, index) => (
                      <div key={review.id || index} className="d-flex align-items-start">
                        <img
                          src={review.user?.picture || notificationProfile}
                          alt={review.user?.name || "Reviewer"}
                          className="rounded-circle me-3"
                          loading="lazy"
                          decoding="async"
                          style={{ width: "40px", height: "40px", objectFit: "cover" }}
                          onError={(e) => {
                            e.target.src = notificationProfile;
                          }}
                        />
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center justify-content-between mb-1">
                            <span className="fw-bold">{review.user?.name || "Anonymous"}</span>
                            <small className="text-muted">
                              {review.created_at ? new Date(review.created_at).toLocaleDateString() : "Recently"}
                            </small>
                          </div>
                          <div className="d-flex mb-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <i 
                                key={star} 
                                className={`bi bi-star${star <= review.rating ? '-fill' : ''}`}
                                style={{ fontSize: "0.9rem", color: star <= review.rating ? "#000" : "#ccc" }}
                              ></i>
                            ))}
                          </div>
                          {review.comment && (
                            <p className="text-muted mb-0" style={{ fontSize: "0.9rem" }}>
                              {review.comment}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Company Lawyers (if company) */}
              {lawyerDetails?.is_company === 1 && lawyerDetails?.lawyers && lawyerDetails.lawyers.length > 0 && (
                <div className="mb-4 px-3">
                  <h6 className="fw-bold text-dark mb-3">Company Lawyers</h6>
                  <div className="d-flex flex-column gap-2">
                    {lawyerDetails.lawyers.map((lawyer, index) => (
                      <div key={lawyer.id || index} className="d-flex align-items-center p-2 border rounded">
                        <img
                          src={lawyer.picture || notificationProfile}
                          alt={lawyer.name}
                          className="rounded-circle me-3"
                          style={{ width: "50px", height: "50px", objectFit: "cover" }}
                          onError={(e) => {
                            e.target.src = notificationProfile;
                          }}
                        />
                        <div className="flex-grow-1">
                          <h6 className="mb-0 fw-bold">{lawyer.name}</h6>
                          <small className="text-muted">
                            {lawyer.categories?.[0]?.name || lawyer.sub_categories?.[0]?.name || "Lawyer"}
                          </small>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Response Time */}
              {/* {lawyerDetails?.response_time && (
                <div className="mb-4 px-3">
                  <h6 className="fw-bold text-dark mb-2">Response Time</h6>
                  <p className="text-muted mb-0">{lawyerDetails.response_time}</p>
                </div>
              )} */}

              {/* Consultation Count */}
              {/* {lawyerDetails?.consult_count !== undefined && (
                <div className="mb-4 px-3">
                  <h6 className="fw-bold text-dark mb-2">Consultations Completed</h6>
                  <p className="text-muted mb-0">{lawyerDetails.consult_count}</p>
                </div>
              )} */}
            </div>
            )}
            {/* Pricing and Action Section - Fixed at bottom */}
            {myService ? (
              // Show My Service Information
              <div className="p-4" style={{ backgroundColor: "#000", borderBottomRightRadius: "15px", borderBottomLeftRadius: "15px" }}>
                {myService.period === 'weekly' ? (
                  // Weekly (One Time Service)
                  <div>
                    <div className="d-flex align-items-center justify-content-between">
                        <p className="text-white fw-bold mb-1" style={{ fontSize: "1.5rem" }}>
                          One Time Service
                        </p>
                        <span className="text-white fw-bold fs-2">
                              ${myService.pay_amount || 0} USD
                          </span>
                    </div>
                      <div className="my-3">
                          <span className="badge bg-white text-black px-3 py-2 rounded-pill fs-6">
                            {myService.status || 'Active'}
                          </span>
                      </div>
                    
                  </div>
                ) : myService.period === 'monthly' ? (
                  // Monthly Subscription
                  <div>
                    <div className="mb-3">
                      <div className="d-flex align-items-center justify-content-between gap-3">
                        <p className="text-white fw-bold mb-1" style={{ fontSize: "1.5rem" }}>
                          {myService.expiry_date 
                            ? `Expires on ${new Date(myService.expiry_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long' })}`
                            : 'Monthly Service'}
                        </p>
                        <span className="text-white fw-bold fs-2">
                            ${myService.pay_amount || 0} USD
                        </span>
                      </div>

                        <div className="d-flex align-items-center justify-content-between gap-3 mt-2">
                          <span className="badge bg-white text-black px-3 py-2 rounded-pill fs-6">
                            {myService.cancel_renewal === 1 ? "Cancelled" :myService.status || 'Active'}
                          </span>
                          {myService.cancel_renewal === 0 &&
                            <button
                              className="btn rounded-pill fw-bold"
                              style={{ 
                                backgroundColor: "#dc3545", 
                                color: "#ffffff",
                                border: "none",
                                fontSize: "1rem"
                              }}
                              onClick={handleCancelService}
                              disabled={cancellingService || myService.status === 'Cancelled'}
                            >
                              {cancellingService ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                  Cancelling...
                                </>
                              ) : (
                                'Cancel'
                              )}
                            </button>
                          }
                        </div>

                    </div>
                  </div>
                ) : null}
              </div>
            ) : pricingOptions.length > 0 ? (
              // Show Pricing Options if no service
              <div className="p-4" style={{ backgroundColor: "#000", borderBottomRightRadius: "15px", borderBottomLeftRadius: "15px" }}>
                {/* Pricing and Dropdown in Same Row */}
                <div className="d-flex align-items-center justify-content-between mb-4 p-3 rounded" style={{ backgroundColor: "#000" }}>
                  <p className="text-white fw-bold mb-0" style={{ fontSize: "1.5rem" }}>
                    {pricingOptions.find((option) => option.value === selectedPricingOption)?.label || pricingOptions[0]?.label || ""}
                  </p>
                  {pricingOptions.length > 1 && (
                  <button
                    onClick={() => setShowPricingOptions(!showPricingOptions)}
                    className="btn d-flex align-items-center gap-2 text-white"
                    style={{
                      backgroundColor: "#000",
                      border: "1px solid #333",
                      borderRadius: "8px",
                      padding: "8px 16px"
                    }}
                  >
                    <span>{pricingOptions.length} option{pricingOptions.length !== 1 ? 's' : ''}</span>
                    <i className={`bi bi-chevron-${showPricingOptions ? 'up' : 'down'}`}></i>
                  </button>
                  )}
                </div>

                {/* Expanded Pricing Options */}
                {showPricingOptions && pricingOptions.length > 1 && (
                  <div className="mb-4" style={{ transition: "all 0.3s ease" }}>
                    {pricingOptions.map((option, index) => (
                      <div
                        key={option.value}
                        onClick={() => {
                          setSelectedPricingOption(option.value);
                          setShowPricingOptions(false);
                        }}
                        className="d-flex align-items-center p-3 mb-2 rounded"
                      style={{
                          backgroundColor: selectedPricingOption === option.value ? "#007bff" : "#ffffff",
                          border: selectedPricingOption === option.value ? "none" : "1px solid #e0e0e0",
                          cursor: "pointer",
                          transition: "all 0.2s ease"
                        }}
                      >
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center me-3"
                          style={{
                            width: "24px",
                            height: "24px",
                            backgroundColor: selectedPricingOption === option.value ? "#ffffff" : "transparent",
                            border: selectedPricingOption === option.value ? "none" : "2px solid #ccc"
                          }}
                        >
                          {selectedPricingOption === option.value && (
                            <i className="bi bi-check" style={{ fontSize: "14px", fontWeight: "bold", color: "#007bff" }}></i>
                          )}
                        </div>
                        <span
                          style={{
                            color: selectedPricingOption === option.value ? "#ffffff" : "#000000",
                            fontWeight: selectedPricingOption === option.value ? "500" : "400"
                          }}
                        >
                          {option.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="d-flex gap-3 justify-content-center">
                  <button
                    className="btn d-flex align-items-center justify-content-center rounded-pill"
                    style={{ 
                      height: "50px", 
                      width: "180px", 
                      backgroundColor: "#474747",
                      border: "none",
                      color: "#ffffff"
                    }}
                    onClick={() => {
                      if (!lawyerDetails) return;
                      const selectedOption = pricingOptions.find(opt => opt.value === selectedPricingOption);
                      if (!selectedOption) {
                        toast.error("Please select a pricing option");
                        return;
                      }
                      setShowPaymentModal(true);
                    }}
                  >
                    <i className="bi bi-apple me-2 text-white" style={{ fontSize: "1.2rem" }}></i>
                    <span>Apple</span>
                  </button>
                  <button
                    className="btn rounded-pill fw-bold"
                    style={{ 
                      height: "50px", 
                      width: "190px",
                      backgroundColor: "#808080", 
                      color: "#ffffff",
                      border: "none",
                      fontSize: "1rem"
                    }}
                    onClick={() => {
                      if (!lawyerDetails) return;
                      const selectedOption = pricingOptions.find(opt => opt.value === selectedPricingOption);
                      if (!selectedOption) {
                        toast.error("Please select a pricing option");
                        return;
                      }
                      setShowPaymentModal(true);
                    }}
                    disabled={!lawyerDetails || pricingOptions.length === 0}
                  >
                    Get Service
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Backdrop for Lawyer Detail */}
      {showLawyerDetail && (
        <div
          className="offcanvas-backdrop fade show"
          onClick={() => setShowLawyerDetail(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            zIndex: 1040,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,1)",
          }}
        ></div>
      )}

      {/* Portal Dropdown for Categories and Jurisdictions */}
      {(showCategoryDropdown || showJurisdictionDropdown) && createPortal(
        <div
          className="lawyers-filter-dropdown-portal bg-white border rounded shadow-lg"
          style={{
            position: "fixed",
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${Math.max(dropdownPosition.width, 200)}px`,
            maxHeight: "400px",
            overflowY: "auto",
            overflowX: "hidden",
            zIndex: 9999,
            borderRadius: "8px",
            padding: "4px 0",
          }}
        >
          {loadingDropdowns ? (
            <div className="p-3 text-center">
              <div className="spinner-border spinner-border-sm text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : activeDropdownType === 'category' && categories.length > 0 ? (
            categories.map((category) => (
              <button
                key={category.id}
                className="btn btn-light w-100 text-start px-3 py-2 border-0 lawyers-filter-dropdown-item"
                onClick={() => handleCategorySelect(category.name)}
                style={{ fontSize: "0.9rem" }}
              >
                {category.name}
              </button>
            ))
          ) : activeDropdownType === 'jurisdiction' && jurisdictions.length > 0 ? (
            jurisdictions.map((jurisdiction) => (
              <button
                key={jurisdiction.id}
                className="btn btn-light w-100 text-start px-3 py-2 border-0 lawyers-filter-dropdown-item"
                onClick={() => handleJurisdictionSelect(jurisdiction.name)}
                style={{ fontSize: "0.9rem" }}
              >
                {jurisdiction.name}
              </button>
            ))
          ) : (
            <div className="p-3 text-center text-muted">
              <small>
                {activeDropdownType === 'category' ? 'No categories available' : 'No jurisdictions available'}
              </small>
            </div>
          )}
        </div>,
        document.body
      )}

      {/* Payment Modal */}
      <PaymentModal
        show={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        amount={(() => {
          if (!lawyerDetails) return 0;
          const selectedOption = pricingOptions.find(opt => opt.value === selectedPricingOption);
          if (!selectedOption) return 0;
          
          if (selectedPricingOption === "monthly") {
            return parseFloat(lawyerDetails.monthly_price || 0);
          } else if (selectedPricingOption === "one-time") {
            return parseFloat(lawyerDetails.weekly_price || lawyerDetails.consult_fee || 0);
          }
          return 0;
        })()}
        onSuccess={async (paymentResult) => {
          try {
            setProcessingPayment(true);
            
            // Determine period based on selected option
            const period = selectedPricingOption === "monthly" ? "monthly" : "weekly";
            
            // Call buyService API
            const response = await ApiService.request({
              method: "POST",
              url: "buyService",
              data: {
                lawyer_id: lawyerDetails.id || lawyerDetails.lawyer_id,
                period: period,
                transaction_id: paymentResult.paymentIntentId,
              }
            });

            const data = response.data;
            if (data.status) {
              toast.success(data.message || "Service purchased successfully!");
              setShowPaymentModal(false);
              setShowLawyerDetail(false);
              setMyService(null);
              
              // Refresh lawyer details or navigate
              // You might want to refresh the lawyers list or navigate to chat
              if (data.data && data.data.chat) {
                // Optionally navigate to chat
                // navigate(`/chat`);
              }
            } else {
              toast.error(data.message || "Failed to purchase service");
            }
          } catch (error) {
            console.error("Error purchasing service:", error);
            toast.error("Failed to purchase service. Please try again.");
          } finally {
            setProcessingPayment(false);
          }
        }}
        title="Purchase Service"
        saveCard={true}
        paymentType="service"
        paymentData={{
          lawyer_id: lawyerDetails?.id || lawyerDetails?.lawyer_id,
          period: selectedPricingOption === "monthly" ? "monthly" : "weekly",
        }}
      />
    </div>
  );
};

export default List;
