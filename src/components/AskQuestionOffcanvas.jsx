import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import Lottie from "lottie-react";
import ApiService from "../services/ApiService";
import successAnimation from "../assets/images/Succes.json";
import { color } from "framer-motion";

const AskQuestionOffcanvas = ({ show, onClose, jurisdictionOptions = [], onSuccess }) => {
  const [isClosing, setIsClosing] = useState(false);
  const [postQuestionText, setPostQuestionText] = useState("");
  const [jurisdiction, setJurisdiction] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState("");
  const [attachment, setAttachment] = useState(null);
  const dropdownRef = useRef(null);
  const fileInputRef = useRef(null);
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
      setAttachment(null);
    }
  }, [show]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setShowDropdown(false);
      setSearch("");
      setAttachment(null);
      onClose && onClose();
    }, 300);
  };

  const handleAttachmentChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAttachment(file);
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
      let requestData;
      if (attachment) {
        requestData = new FormData();
        requestData.append("question", postQuestionText);
        requestData.append("jurisdiction_id", jurisdiction);
        requestData.append("attachment", attachment);
      } else {
        requestData = {
          question: postQuestionText,
          jurisdiction_id: jurisdiction,
        };
      }

      const response = await ApiService.request({
        method: "POST",
        url: "addQuestion",
        data: requestData,
      });
      const data = response.data;
      if (data.status) {
        setShowSuccessAnimation(true);
        setPostQuestionText("");
        setJurisdiction(null);
        setAttachment(null);
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

        <div className="offcanvas-body p-5 d-flex flex-column" style={{ borderBottomLeftRadius: "15px", borderBottomRightRadius: "15px", height: "calc(100% - 70px)" }}>
          <div className="flex-grow-1">
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
                  className="d-flex align-items-center justify-content-between"
                  onClick={() => {
                    setShowDropdown(!showDropdown);
                    setSearch("");
                  }}
                  style={{
                    width: "606px",
                    height: "70px",
                    border: "1px solid #C9C9C9",
                    borderRadius: "8px",
                    backgroundColor: "#fff",
                    cursor: "pointer",
                    textAlign: "left",
                    paddingLeft: "12px",
                    paddingRight: "12px",
                  }}
                >
                  <span style={{ color: jurisdiction ? "#000" : "#6c757d" }}>
                    {jurisdiction ? jurisdictionOptions.find(j => j.value === jurisdiction)?.label || "Jurisdiction" : "Jurisdiction"}
                  </span>
                  <i className={`bi bi-chevron-${showDropdown ? "up" : "down"} fs-5 text-dark`}></i>
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

            <div className="mb-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAttachmentChange}
                style={{ display: "none" }}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
              <div
                onClick={() => fileInputRef.current.click()}
                style={{
                  width: "606px",
                  height: "64px",
                  border: "1px dashed #C9C9C9",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                  padding: "0 16px",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    backgroundColor: "#F5F5F5",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px dashed #BEBEBE"
                  }}
                >
                  <i className="bi bi-paperclip fs-4 text-muted"></i>
                </div>
                <span style={{ color: attachment ? "#000" : "#6c757d", fontSize: "14px" }}>
                  {attachment ? attachment.name : "Attach Document"}
                </span>
                {attachment && (
                  <button
                    type="button"
                    className="btn-close ms-auto"
                    style={{ fontSize: "10px" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAttachment();
                    }}
                  ></button>
                )}
              </div>
            </div>

            <div className="mb-4">
              <h6 className="fw-bold mb-4" style={{ fontSize: "16px", marginTop: "2rem" }}>How it works</h6>
              <div className="d-flex flex-column gap-5">
                <div className="d-flex align-items-start gap-3">
                  <div 
                    className="mt-1"
                    style={{ 
                      width: "14px", 
                      height: "14px", 
                      borderRadius: "50%", 
                      border: "3.5px solid #000",
                      borderRightColor: "transparent",
                      transform: "rotate(45deg)",
                      flexShrink: 0
                    }} 
                  />
                  <span style={{ fontSize: "14px", color: "#374151", fontWeight: "500", lineHeight: "1.5" }}>
                    Ask your question and see the answer in <br /> Questions & Answers.
                  </span>
                </div>
                <div className="d-flex align-items-start gap-3">
                  <div 
                    className="mt-1"
                    style={{ 
                      width: "14px", 
                      height: "14px", 
                      borderRadius: "50%", 
                      border: "3.5px solid #000",
                      borderRightColor: "transparent",
                      transform: "rotate(45deg)",
                      flexShrink: 0,
                    }} 
                  />
                  <span style={{ fontSize: "14px", color: "#374151", fontWeight: "500", lineHeight: "1.5" }}>
                    You will be notified when a lawyer answers.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto pb-2">
            <div
              className="mb-3 rounded-4"
              style={{
                border: "1px solid #D3D3D3",
                width: "606px",
                height: "75px",
                borderRadius: "8px",
              }}
            >
              <div className="d-flex justify-content-between align-items-center h-100 rounded">
                <div className="p-3">
                  <h6 className="fw-bold mb-1">Post Question Fee</h6>
                  <small className="" style={{ color: "#474747" }}>1 Question post only</small>
                </div>
                <div
                  className="text-end px-5 h-100 d-flex flex-column justify-content-center"
                  style={{ borderLeft: "1px solid #D3D3D3", minWidth: "120px", alignItems: "center" }}
                >
                  <div className="fw-light fs-3">USD</div>
                  <div className="fw-bold fs-1">1.00</div>
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
                marginTop: "10px",
              }}
            >
              Post Your Legal Issues
            </button>
          </div>
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

