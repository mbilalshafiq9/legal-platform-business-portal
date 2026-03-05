import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import Lottie from "lottie-react";
import ApiService from "../services/ApiService";
import successAnimation from "../assets/images/Succes.json";

const AskQuestionOffcanvas = ({ show, onClose, jurisdictionOptions = [], onSuccess }) => {
  const [isClosing, setIsClosing] = useState(false);
  const [postQuestionText, setPostQuestionText] = useState("");
  const [jurisdiction, setJurisdiction] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  useEffect(() => {
    if (!show) {
      setIsClosing(false);
      setShowDropdown(false);
      setSearch("");
    }
  }, [show]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setShowDropdown(false);
      setSearch("");
      onClose && onClose();
    }, 300);
  };

  const handleSubmit = async () => {
    if (!postQuestionText.trim()) {
      toast.error("Please enter your question");
      return;
    }
    if (!jurisdiction) {
      toast.error("Please select a jurisdiction");
      return;
    }
    try {
      const response = await ApiService.request({
        method: "POST",
        url: "addQuestion",
        data: { question: postQuestionText, jurisdiction_id: jurisdiction },
      });
      const data = response.data;
      if (data.status) {
        setShowSuccessAnimation(true);
        setPostQuestionText("");
        setJurisdiction(null);
        setTimeout(() => {
          setShowSuccessAnimation(false);
          handleClose();
          onSuccess && onSuccess();
        }, 300);
      } else {
        toast.error(data.message || "Failed to post question");
      }
    } catch (e) {
      toast.error("Failed to post question. Please try again.");
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
          width: "633px",
          transition: "all 0.3s ease-out",
          borderRadius: "13px",
          margin: "20px",
          zIndex: 1045,
          transform: isClosing ? "translateX(100%)" : "translateX(0)",
          animation: isClosing ? "slideOutToRight 0.3s ease-in" : "slideInFromRight 0.3s ease-out",
          backgroundColor: "#fff",
        }}
      >
        <div className="offcanvas-header border-bottom" style={{ borderTopLeftRadius: "15px", borderTopRightRadius: "15px" }}>
          <div className="d-flex justify-content-between align-items-center w-100">
            <h5 className="mb-0 fw-bold">Post Question</h5>
            <button type="button" className="btn-close" onClick={handleClose}></button>
          </div>
        </div>

        <div className="offcanvas-body p-4" style={{ borderBottomLeftRadius: "15px", borderBottomRightRadius: "15px" }}>
          <div className="mb-3">
            <textarea
              className="form-control"
              placeholder="Explain Your Question"
              value={postQuestionText}
              onChange={(e) => setPostQuestionText(e.target.value)}
              style={{
                resize: "none",
                width: "606px",
                height: "217px",
                border: "1px solid #C9C9C9",
                borderRadius: "8px",
                position: "relative",
                zIndex: 1,
                backgroundColor: "#ffffff",
              }}
            ></textarea>
          </div>

          <div className="mb-3">
            <div className="position-relative" ref={dropdownRef}>
              <button
                type="button"
                className="form-select d-flex align-items-center justify-content-between"
                onClick={() => {
                  setShowDropdown(!showDropdown);
                  setSearch("");
                }}
                style={{
                  width: "606px",
                  height: "79px",
                  border: "1px solid #C9C9C9",
                  borderRadius: "8px",
                  backgroundColor: "#fff",
                  cursor: "pointer",
                  textAlign: "left",
                  paddingLeft: "12px",
                  paddingRight: "40px",
                }}
              >
                <span style={{ color: jurisdiction ? "#000" : "#6c757d" }}>
                  {jurisdiction ? jurisdictionOptions.find(j => j.value === jurisdiction)?.label || "Jurisdiction" : "Jurisdiction"}
                </span>
                {/* <i className={`bi bi-chevron-${showDropdown ? "up" : "down"} position-absolute end-0 translate-middle-y me-3 text-gray-600`} style={{ top: "50%" }}></i> */}
              </button>
              
              {showDropdown && (
                <div 
                  className="position-absolute bg-white border rounded shadow-lg"
                  style={{ 
                    zIndex: 1050, 
                    width: "606px", 
                    maxHeight: "400px",
                    overflowX: "hidden",
                    top: "100%",
                    marginTop: "8px",
                    bottom: "auto"
                  }}
                >
                  <div className="p-2 border-bottom bg-white" style={{ position: "sticky", top: 0 }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search jurisdiction..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div style={{ maxHeight: "340px", overflowY: "auto" }}>
                    {jurisdictionOptions
                      .filter(j => j.label.toLowerCase().includes(search.toLowerCase()))
                      .map((j) => (
                        <button
                          key={j.value}
                          type="button"
                          className="btn btn-light w-100 text-start px-3 py-2 border-0"
                          onClick={() => {
                            setJurisdiction(j.value);
                            setShowDropdown(false);
                            setSearch("");
                          }}
                          style={{ 
                            fontSize: "0.9rem",
                            backgroundColor: jurisdiction === j.value ? "#f0f0f0" : "#fff"
                          }}
                        >
                          {j.label}
                        </button>
                      ))}
                    {jurisdictionOptions.filter(j => j.label.toLowerCase().includes(search.toLowerCase())).length === 0 && (
                      <div className="p-3 text-center text-muted">No results</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div
            className="mb-3 rounded-4"
            style={{
              border: "1px solid #D3D3D3",
              width: "606px",
              height: "92px",
              borderRadius: "8px",
            }}
          >
            <div className="d-flex justify-content-between align-items-center h-100 rounded">
              <div className="p-3">
                <h6 className="fw-bold mb-1">Post Question Fee</h6>
                <small className="text-muted">1 Question post only</small>
              </div>
              <div
                className="text-end px-5 h-100 d-flex flex-column justify-content-center"
                style={{ borderLeft: "1px solid #D3D3D3" }}
              >
                <div className="fw-bold">USD</div>
                <div className="fw-bold fs-5">1.00</div>
              </div>
            </div>
          </div>

          <button
            className="btn text-white rounded-pill"
            onClick={handleSubmit}
            style={{
              height: "63px",
              fontSize: "20px",
              fontWeight: "500",
              backgroundColor: "#000",
              width: "606px",
              marginTop: "25px",
            }}
          >
            Post Your Legal Issues
          </button>
        </div>
      </div>

      {show && (
        <div
          className="offcanvas-backdrop fade show"
          onClick={handleClose}
        ></div>
      )}

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
            handleClose();
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
            <button
              type="button"
              onClick={() => {
                setShowSuccessAnimation(false);
                handleClose();
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
            >
              <i className="bi bi-x-lg"></i>
            </button>
            <div style={{ marginBottom: "1.5rem" }}>
              <Lottie
                animationData={successAnimation}
                loop={false}
                autoplay={true}
                style={{ width: "200px", height: "200px" }}
              />
            </div>
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
          </div>
        </div>
      )}
    </>
  );
};

export default AskQuestionOffcanvas;

