import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import notificationProfile from "../../assets/images/notification-profile.png";
import { toast } from "react-toastify";
import ApiService from "../../services/ApiService";
import CreateCaseModal from "../../components/CreateCaseModal";
import "./MyCasesList.css";

const List = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateCase, setShowCreateCase] = useState(false);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const navigate = useNavigate();
  const searchTimeoutRef = useRef(null);
  
  // Function to fetch cases
  const fetchCases = useCallback(async (search = searchTerm) => {
    try {
      setLoading(true);
      const response = await ApiService.request({
        method: "GET",
        url: "myCases",
        data: search ? { search } : {},
      });
      const data = response.data;
      if (data.status && data.data && data.data.cases) {
        // Transform API data to match component format
        const transformedCases = data.data.cases.map((caseItem) => {
          // Get first category name
          const categoryName = caseItem.categories?.[0]?.name || caseItem.sub_categories?.[0]?.name || "Case";
          // Get jurisdiction names
          const jurisdictionNames = caseItem.jurisdictions?.map(j => j.name).join(", ") || "";
          
          return {
            id: caseItem.id,
            caseType: categoryName,
            caseId: `Case# ${caseItem.id}`,
            description: caseItem.description || "",
            jurisdiction: jurisdictionNames || "N/A",
            caseBudget: caseItem.case_budget ? `$${caseItem.case_budget}` : "$0",
            respond: caseItem.interests_count || caseItem.interests?.length || 0,
            rawData: caseItem, // Keep raw data for details view
          };
        });
        setCases(transformedCases);
        setPagination(data.data.pagination);
      } else {
        setCases([]);
      }
    } catch (error) {
      console.error("Error fetching cases:", error);
      // toast.error("Failed to load cases"); // Optional: don't show toast on initial load error if prefer silent fail
      setCases([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  // Initial fetch
  useEffect(() => {
    fetchCases();
  }, []);

  // Handle search with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      fetchCases(searchTerm);
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, fetchCases]);

  return (
    <div className="container-fluid case-details--mukta-font">
      {/* Search and Filter Section */}
      <div className="row mb-4 bg-white px-4 py-5" style={{
              borderBottom: "1px solid #e6e6e6",
              borderTop: "1px solid #e6e6e6",
              marginTop: "30px",
            }} data-aos="fade-up">
        <div className="col-12 px-0">
          <div className="d-lg-flex gap-3 align-items-center my-cases-header-container">
            {/* Search Bar */}
            <div className="position-relative flex-grow-1 my-cases-search-container" style={{ maxWidth: "400px" }}>
              <input
                type="text"
                className="form-control form-control-lg rounded-pill portal-form-hover"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  paddingLeft: "45px",
                  // width: "483px",
                  height: "45px",
                  border: "1px solid #e9ecef",
                  backgroundColor: "#fff",
                }}
              />
              <i className="bi bi-search position-absolute top-50 translate-middle-y text-black fs-3 ms-4"></i>
            </div>

            {/* Add New Case Button */}
            <button
              className="btn btn-outline-dark rounded-pill px-4 py-2 d-flex justify-content-center align-items-center gap-2 portal-button-hover my-cases-add-button"
              style={{
                fontWeight: "500",
                marginLeft: "80px",
                border: "none",
              }}
              type="button"
              onClick={() => setShowCreateCase(true)}
            >
              <div
                className="rounded-circle d-flex align-items-center justify-content-center my-cases-plus-icon-container"
                style={{
                  backgroundColor: "#f8f9fa",
                }}
              >
                <i className="bi bi-plus text-black bg-white rounded-pill pe-0"></i>
              </div>
              Add New Case
            </button>
          </div>
        </div>
      </div>

      {/* Cases Grid */}
      <div className="row" style={{ marginLeft: "30px", marginRight: "30px" }}>
        {loading ? (
          <div className="col-12 d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : cases.length === 0 ? (
          <div className="col-12 d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
            <div className="text-center">
              <h4 className="text-muted mb-2">No Cases Found</h4>
              <p className="text-muted">You don't have any cases yet.</p>
            </div>
          </div>
        ) : (
        cases.map((caseItem, index) => (
          <div key={caseItem.id} className="col-lg-3 col-md-6 mb-4" data-aos="fade-up" data-aos-delay={`${100 + index * 100}`}>
            <div 
              className="card h-100 shadow-sm portal-card-hover" 
              style={{ 
                cursor: "pointer",
                height: "300px"
              }}
              onClick={() => navigate(`/my-cases/${caseItem.id}`)}
            >
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <h5 className="card-title mb-0 my-cases-card-title" style={{ fontSize: "16px", color: "#474747", fontWeight: "500" }}>
                    {caseItem.caseType}
                  </h5>
                  <span
                    className="badge bg-black text-white px-3 py-2 rounded-pill my-cases-card-badge"
                    style={{ fontSize: "12px", fontWeight: "500" }}
                  >
                    {caseItem.caseId}
                  </span>
                </div>
                
                <p className="mb-4 my-cases-card-description" style={{ fontSize: "14px", color: "#474747" }}>
                  {caseItem.description}
                </p>

                <div className="row text-center my-cases-card-details">
                  <div className="col-4">
                    <div className="d-flex flex-column">
                      <small className="mb-1 my-cases-card-label" style={{ fontSize: "14px", color: "#989898", fontWeight: "400" }}>Jurisdiction</small>
                      <span className="my-cases-card-value" style={{ color: "#474747", fontSize: "16px", fontWeight: "500" }}>{caseItem.jurisdiction}</span>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="d-flex flex-column">
                      <small className="mb-1 my-cases-card-label" style={{ fontSize: "14px", color: "#989898", fontWeight: "400" }}>Case Budget</small>
                      <span className="my-cases-card-value" style={{ color: "#474747", fontSize: "16px", fontWeight: "500" }}>{caseItem.caseBudget}</span>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="d-flex flex-column">
                      <small className="mb-1 my-cases-card-label" style={{ fontSize: "14px", color: "#989898", fontWeight: "400" }}>Respond</small>
                      <span className="my-cases-card-value" style={{ color: "#474747", fontSize: "16px", fontWeight: "500" }}>{caseItem.respond}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))
        )}
      </div>

      {/* Create Case Modal */}
      <CreateCaseModal 
        show={showCreateCase} 
        onClose={() => setShowCreateCase(false)} 
        onSuccess={() => fetchCases(searchTerm)}
      />
    </div>
  );
};

export default List;
