import React, { useState, useEffect, useRef, useCallback } from "react";
import { NavLink } from "react-router-dom";
import { toast } from "react-toastify";
import ApiService from "../../services/ApiService";
import notificationProfile from "../../assets/images/notification-profile.png";
import NoQuestion from "../../assets/images/NoQuestion.png";
import PaymentModal from "../../components/PaymentModal";
import AskQuestionOffcanvas from "../../components/AskQuestionOffcanvas";
import "../../assets/css/siri-border-animation.css";

const List = () => {
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


  // No default questions - only show API data

  // Load popup states from localStorage
  const savedSelectedQuestion = loadFromLocalStorage("postQuestions_selectedQuestion", null);
  const savedShowDetail = loadFromLocalStorage("postQuestions_showDetail", false);
  const savedShowPostQuestion = loadFromLocalStorage("postQuestions_showPostQuestion", false);
  const savedQuestionText = loadFromLocalStorage("postQuestions_questionText", "");
  const savedQuestionJurisdiction = loadFromLocalStorage("postQuestions_questionJurisdiction", "");

  const [selectedQuestion, setSelectedQuestion] = useState(savedSelectedQuestion);
  const [showDetail, setShowDetail] = useState(savedShowDetail);
  const [showPostQuestion, setShowPostQuestion] = useState(savedShowPostQuestion);
  const [isClosing, setIsClosing] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  // Form states
  const [questionText, setQuestionText] = useState(savedQuestionText);
  const [questionJurisdiction, setQuestionJurisdiction] = useState(savedQuestionJurisdiction);
  const [attachments, setAttachments] = useState([]);
  const [postingQuestion, setPostingQuestion] = useState(false);
  const [closingQuestion, setClosingQuestion] = useState(false);
  const [showJurisdictionDropdown, setShowJurisdictionDropdown] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [questionPaymentAmount, setQuestionPaymentAmount] = useState(0);
  const [loadingPaymentAmount, setLoadingPaymentAmount] = useState(true);

  // Initialize with empty array - only API data will be shown
  const [questions, setQuestions] = useState([]);

  // Load lawyer responses from localStorage
  const getLawyerResponsesForQuestion = (questionId) => {
    const allResponses = loadFromLocalStorage("postQuestions_lawyerResponses", {});
    return allResponses[questionId] || [];
  };

  const [lawyerResponses, setLawyerResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [pagination, setPagination] = useState(null);
  const [questionDetails, setQuestionDetails] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [jurisdictions, setJurisdictions] = useState([]);
  const [loadingJurisdictions, setLoadingJurisdictions] = useState(false);
  const fetchedQuestionIds = useRef(new Set());
  const fetchingRef = useRef(false);
  const searchTimeoutRef = useRef(null);
  const jurisdictionDropdownRef = useRef(null);

  // Close jurisdiction dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (jurisdictionDropdownRef.current && !jurisdictionDropdownRef.current.contains(event.target)) {
        setShowJurisdictionDropdown(false);
      }
    };

    if (showJurisdictionDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showJurisdictionDropdown]);

  // Fetch jurisdictions from API
  useEffect(() => {
    const fetchJurisdictions = async () => {
      try {
        setLoadingJurisdictions(true);
        const response = await ApiService.request({
          method: "GET",
          url: "getDropdownData",
        });
        const data = response.data;
        if (data.status && data.data && data.data.jurisdictions) {
          setJurisdictions(data.data.jurisdictions);
        } else {
          setJurisdictions([]);
        }
      } catch (error) {
        console.error("Error fetching jurisdictions:", error);
        setJurisdictions([]);
      } finally {
        setLoadingJurisdictions(false);
      }
    };

    fetchJurisdictions();
  }, []);

  // Fetch questions from API
  useEffect(() => {
    const fetchQuestions = async (search = "") => {
      try {
        setLoading(true);
        const response = await ApiService.request({
          method: "GET",
          url: "getMyQuestions",
          data: search ? { search } : {},
        });
        const data = response.data;
        if (data.status && data.data.questions) {
          // Transform API data to match component format
          const apiQuestions = data.data.questions.map((q, index) => {
            const createdDate = q.created_at ? new Date(q.created_at) : new Date();
            const formattedDate = createdDate.toLocaleDateString("en-US", {
              month: "short",
              day: "2-digit",
              year: "numeric",
            });
            const formattedTime = createdDate.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            });

            return {
              id: q.id,
              title: q.question || "",
              date: `${formattedDate} - ${formattedTime}`,
              views: 0, // Will be updated when question details are fetched
              answers: q.answers_count || 0,
              isHighlighted: index === 0,
              jurisdiction: q.jurisdiction ? {
                id: q.jurisdiction.id,
                name: q.jurisdiction.name || ""
              } : null,
              timestamp: q.created_at,
              rawData: q, // Keep raw data for detail view
            };
          });

          // Use API questions only
          setQuestions(apiQuestions);
          
          setPagination(data.data.pagination);
        } else {
          // If API fails, show empty
          setQuestions([]);
        }
      } catch (error) {
        console.error("Error fetching questions:", error);
        // On error, show empty
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount - searchQuery handled in separate useEffect

  // Handle search with debouncing
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      const fetchQuestions = async (search = "") => {
        try {
          setLoading(true);
          // Clear fetched IDs when searching
          fetchedQuestionIds.current.clear();
          
          const response = await ApiService.request({
            method: "GET",
            url: "getMyQuestions",
            data: search ? { search } : {},
          });
          const data = response.data;
          if (data.status && data.data.questions) {
            // Transform API data to match component format
            const apiQuestions = data.data.questions.map((q, index) => {
              const createdDate = q.created_at ? new Date(q.created_at) : new Date();
              const formattedDate = createdDate.toLocaleDateString("en-US", {
                month: "short",
                day: "2-digit",
                year: "numeric",
              });
              const formattedTime = createdDate.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              });

              return {
                id: q.id,
                title: q.question || "",
                date: `${formattedDate} - ${formattedTime}`,
                views: 0,
                answers: q.answers_count || 0,
                isHighlighted: index === 0,
                jurisdiction: q.jurisdiction ? {
                  id: q.jurisdiction.id,
                  name: q.jurisdiction.name || ""
                } : null,
                timestamp: q.created_at,
                rawData: {
                  ...q,
                  status: q.status || null,
                },
              };
            });
            setQuestions(apiQuestions);
            setPagination(data.data.pagination);
          } else {
            setQuestions([]);
          }
        } catch (error) {
          console.error("Error fetching questions:", error);
          setQuestions([]);
        } finally {
          setLoading(false);
        }
      };

      fetchQuestions(searchQuery);
    }, 500); // 500ms debounce delay

    // Cleanup timeout on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Save questions to localStorage whenever they change
  useEffect(() => {
    try {
      if (questions.length > 0) {
        localStorage.setItem("postQuestions_questions", JSON.stringify(questions));
      }
    } catch (error) {
      console.error("Error saving questions to localStorage:", error);
    }
  }, [questions]);

  // Save popup states and form data to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("postQuestions_showPostQuestion", JSON.stringify(showPostQuestion));
      localStorage.setItem("postQuestions_showDetail", JSON.stringify(showDetail));
      localStorage.setItem("postQuestions_selectedQuestion", JSON.stringify(selectedQuestion));
      localStorage.setItem("postQuestions_questionText", JSON.stringify(questionText));
      localStorage.setItem("postQuestions_questionJurisdiction", JSON.stringify(questionJurisdiction));
    } catch (error) {
      console.error("Error saving postQuestions popup states to localStorage:", error);
    }
  }, [showPostQuestion, showDetail, selectedQuestion, questionText, questionJurisdiction]);

  // Fetch question details function
  const fetchQuestionDetails = useCallback(async (questionId) => {
    // Prevent multiple simultaneous calls
    if (fetchingRef.current) {
      return;
    }
    
    try {
      fetchingRef.current = true;
      setLoadingDetails(true);
      
      const response = await ApiService.request({
        method: "GET",
        url: "myQuestionDetails",
        data: { question_id: questionId }
      });
      const data = response.data;
      if (data.status && data.data) {
        const questionData = data.data;
        
        // Mark this question as fetched
        fetchedQuestionIds.current.add(questionId);
        
        // Store full question details
        setQuestionDetails(questionData);
        
        // Transform lawyer answers to match component format
        const responses = (questionData.answers || []).map((answer) => ({
          id: answer.id,
          name: answer.lawyer?.name || "Lawyer",
          title: answer.lawyer?.categories?.[0]?.name || answer.lawyer?.subCategories?.[0]?.name || "Legal Expert",
          response: answer.answer || "",
          time: answer.created_at ? new Date(answer.created_at).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }) : "Just now",
          avatar: answer.lawyer?.picture || notificationProfile,
          lawyerId: answer.lawyer?.id,
        }));
        setLawyerResponses(responses);
        
        // Update selected question with latest data (without triggering useEffect)
        const createdDate = questionData.created_at ? new Date(questionData.created_at) : new Date();
        const formattedDate = createdDate.toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
        });
        const formattedTime = createdDate.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
        
        // Update selected question state without causing re-render loop
        setSelectedQuestion(prev => ({
          ...prev,
          title: questionData.question || prev?.title,
          date: `${formattedDate} - ${formattedTime}`,
          views: questionData.views_count || prev?.views || 0,
          answers: questionData.answers_count || prev?.answers || 0,
          jurisdiction: questionData.jurisdiction ? {
            id: questionData.jurisdiction.id,
            name: questionData.jurisdiction.name || ""
          } : prev?.jurisdiction,
          rawData: {
            ...prev?.rawData,
            status: questionData.status || prev?.rawData?.status,
          },
        }));
        
        // Update in questions list
        setQuestions(prevQuestions => 
          prevQuestions.map((q) =>
            q.id === questionId ? { ...q, answers: questionData.answers_count || q.answers || 0 } : q
          )
        );
      } else {
        toast.error(data.message || "Failed to load question details");
      }
    } catch (error) {
      console.error("Error fetching question details:", error);
      if (error.response?.status !== 429) { // Don't show error for rate limiting
        toast.error("Failed to load question details");
      }
      // Use existing lawyer responses from localStorage if API fails
      const responses = getLawyerResponsesForQuestion(questionId);
      setLawyerResponses(responses);
    } finally {
      setLoadingDetails(false);
      fetchingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // getLawyerResponsesForQuestion is stable, no need to include

  // Fetch question details when selectedQuestion changes
  useEffect(() => {
    if (selectedQuestion && selectedQuestion.id && showDetail) {
      const questionId = selectedQuestion.id;
      // Only fetch if we haven't fetched this question yet and not currently fetching
      if (!fetchedQuestionIds.current.has(questionId) && !fetchingRef.current) {
        fetchQuestionDetails(questionId);
      }
    } else {
      setLawyerResponses([]);
      setQuestionDetails(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedQuestion?.id, showDetail, fetchQuestionDetails]); // selectedQuestion object changes but we only care about ID

  const handleCardClick = (question) => {
    // Reset fetched question IDs when clicking a new question
    if (selectedQuestion?.id !== question.id) {
      fetchedQuestionIds.current.clear();
    }
    setSelectedQuestion(question);
    setShowDetail(true);
  };

  const handleAddQuestionClick = () => {
    setShowPostQuestion(true);
  };

  const handleClosePostQuestion = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowPostQuestion(false);
      setIsClosing(false);
      // Reset form
      setQuestionText("");
      setQuestionJurisdiction("");
      setAttachments([]);
      // Clear form data from localStorage when closing
      try {
        localStorage.setItem("postQuestions_questionText", JSON.stringify(""));
        localStorage.setItem("postQuestions_questionJurisdiction", JSON.stringify(""));
      } catch (error) {
        console.error("Error clearing form data from localStorage:", error);
      }
    }, 300); // Match animation duration
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(files);
  };

  // Fetch question payment amount from getProfile API
  useEffect(() => {
    const fetchQuestionPaymentAmount = async () => {
      try {
        setLoadingPaymentAmount(true);
        const response = await ApiService.request({
          method: "GET",
          url: "getProfile",
        });
        
        const data = response.data;
        console.log("Profile response:", data); // Debug log
        
        if (data.status && data.data) {
          // Get the question payment amount from profile
          const paymentAmount = data.data.question_payment;
          
          if (paymentAmount !== null && paymentAmount !== undefined && paymentAmount !== '') {
            // Handle both string and number types
            const amount = typeof paymentAmount === 'string' 
              ? parseFloat(paymentAmount.replace(/[^0-9.]/g, '')) 
              : parseFloat(paymentAmount);
            
            if (!isNaN(amount) && amount > 0) {
              setQuestionPaymentAmount(amount);
            } else {
              console.warn("Invalid amount:", amount, "using default 1.00");
              setQuestionPaymentAmount(1.00);
            }
          } else {
            console.warn("question_payment not found in response, using default 1.00");
            setQuestionPaymentAmount(1.00);
          }
        } else {
          console.warn("Profile API response invalid, using default 1.00");
          setQuestionPaymentAmount(1.00);
        }
      } catch (error) {
        console.error("Error fetching question payment amount:", error);
        // Default fallback on error
        setQuestionPaymentAmount(1.00);
      } finally {
        setLoadingPaymentAmount(false);
      }
    };
    
    fetchQuestionPaymentAmount();
  }, []);

  const handlePostQuestion = () => {
    if (!questionText.trim()) {
      toast.error("Please enter your question");
      return;
    }

    if (!questionJurisdiction) {
      toast.error("Please select a jurisdiction");
      return;
    }

    // Show payment modal first
    setShowPaymentModal(true);
  };

  const submitQuestionAfterPayment = async (paymentResult) => {
    try {
      setPostingQuestion(true);
      
      // Create FormData for file uploads
      const formData = new FormData();
      formData.append('question', questionText.trim());
      formData.append('jurisdiction_id', questionJurisdiction);
      
      // Add attachments if any
      if (attachments && attachments.length > 0) {
        attachments.forEach((file) => {
          formData.append('attachments[]', file);
        });
      }

      const response = await ApiService.request({
        method: "POST",
        url: "addQuestion",
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = response.data;
      if (data.status) {
        toast.success(data.message || "Question posted successfully!");
        
        // Reset form
        setQuestionText("");
        setQuestionJurisdiction("");
        setAttachments([]);
        
        // Refresh questions list
        const refreshResponse = await ApiService.request({
          method: "GET",
          url: "getMyQuestions",
          data: searchQuery ? { search: searchQuery } : {},
        });
        const refreshData = refreshResponse.data;
        if (refreshData.status && refreshData.data.questions) {
          const apiQuestions = refreshData.data.questions.map((q, index) => {
            const createdDate = q.created_at ? new Date(q.created_at) : new Date();
            const formattedDate = createdDate.toLocaleDateString("en-US", {
              month: "short",
              day: "2-digit",
              year: "numeric",
            });
            const formattedTime = createdDate.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            });

            return {
              id: q.id,
              title: q.question || "",
              date: `${formattedDate} - ${formattedTime}`,
              views: 0,
              answers: q.answers_count || 0,
              isHighlighted: index === 0,
              jurisdiction: q.jurisdiction ? {
                id: q.jurisdiction.id,
                name: q.jurisdiction.name || ""
              } : null,
              timestamp: q.created_at,
              rawData: {
                ...q,
                status: q.status || null,
              },
            };
          });
          setQuestions(apiQuestions);
          setPagination(refreshData.data.pagination);
        }
        
        handleClosePostQuestion();
      } else {
        toast.error(data.message || "Failed to post question");
      }
    } catch (error) {
      console.error("Error posting question:", error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to post question. Please try again.");
      }
    } finally {
      setPostingQuestion(false);
    }
  };

  const refreshQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await ApiService.request({
        method: "GET",
        url: "getMyQuestions",
        data: searchQuery ? { search: searchQuery } : {},
      });
      const data = response.data;
      if (data.status && data.data.questions) {
        const apiQuestions = data.data.questions.map((q, index) => {
          const createdDate = q.created_at ? new Date(q.created_at) : new Date();
          const formattedDate = createdDate.toLocaleDateString("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric",
          });
          const formattedTime = createdDate.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });
          return {
            id: q.id,
            title: q.question || "",
            date: `${formattedDate} - ${formattedTime}`,
            views: 0,
            answers: q.answers_count || 0,
            isHighlighted: index === 0,
            jurisdiction: q.jurisdiction ? {
              id: q.jurisdiction.id,
              name: q.jurisdiction.name || ""
            } : null,
            timestamp: q.created_at,
            rawData: {
              ...q,
              status: q.status || null,
            },
          };
        });
        setQuestions(apiQuestions);
        setPagination(data.data.pagination);
      } else {
        setQuestions([]);
      }
    } catch (e) {
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  return (
    <div
      className="d-flex flex-column flex-column-fluid ask-question--mukta-font"
      style={{ marginTop: "20px" }}
    >
      <div className="app-content flex-column-fluid">
        {/* Search and Filter Bar */}
        <div
          className="d-flex gap-3 mb-6 bg-white p-4 border-top border-bottom post-question-list-header"
          style={{ marginTop: "-20px" }}
          data-aos="fade-up"
        >
          <div className="flex-fill" style={{ maxWidth: "40%" }}>
            <div className="position-relative">
              <input
                type="text"
                className="form-control form-control-lg rounded-pill portal-form-hover"
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ borderRadius: "12px", paddingLeft: "45px" }}
              />
              <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-gray-600"></i>
              {searchQuery && (
                <button
                  type="button"
                  className="btn btn-link position-absolute top-50 end-0 translate-middle-y me-2 p-0"
                  onClick={() => setSearchQuery("")}
                  style={{ border: "none", background: "none" }}
                >
                  <i className="bi bi-x-circle text-gray-600"></i>
                </button>
              )}
            </div>
          </div>

          <div className="d-flex gap-3 flex-wrap flex-md-nowrap">
            {/* <button
              className="btn btn-transparent border rounded-pill d-flex align-items-center gap-2 portal-button-hover"
              style={{ borderRadius: "12px", minWidth: "120px" }}
            >
              <i className="bi bi-funnel text-black"></i>
              Filter
            </button> */}

            <button
              className="btn border rounded-pill d-flex align-items-center gap-2 bg-black text-white post-question-action-btn"
              style={{ borderRadius: "12px", border: "none" }}
              onClick={handleAddQuestionClick}
            >
              <i className="bi bi-plus rounded-pill w-20px h-20px bg-white text-black d-flex justify-content-center align-items-center pe-0"></i>
              Post New Question
            </button>
          </div>
        </div>

        {/* Questions Grid */}
        <div className="container-fluid px-3 px-md-4">
          {loading ? (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <div className="row g-3 g-md-4">
              {questions.length === 0 ? (
              <div className="col-12 d-flex align-items-center justify-content-center" style={{ minHeight: "400px" }}>
                <div className="text-center p-5">
                  <div className="mb-4">
                    <img src={NoQuestion} alt="No Question" style={{ maxWidth: "200px", height: "auto" }} />
                  </div>
                  <h4 className="text-muted mb-2 fw-bold">No Questions</h4>
                  <p className="text-muted mb-0">
                    You don't have any questions yet.
                  </p>
                </div>
              </div>
            ) : (
              questions.map((question, index) => (
              <div
                key={question.id}
                className="col-lg-3 col-md-6 mb-4"
                data-aos="fade-up"
                data-aos-delay={`${100 + index * 100}`}
              >
                <div
                  className={`card portal-card-hover h-100 post-question-card ${
                    question.isHighlighted ? "text-black" : "bg-white"
                  }`}
                  style={{
                    borderRadius: "12px",
                    height: "300px",
                    cursor: "pointer",
                  }}
                  onClick={() => handleCardClick(question)}
                >
                  <div className="card-body p-3 p-md-4 d-flex flex-column">
                    {/* Date */}
                    <div className="mb-2 mb-md-3">
                      <small className="text-muted">{question.date}</small>
                    </div>

                    {/* Question Content */}
                    <div className="flex-fill mb-3 mb-md-4">
                      <p
                        className={`${
                          question.isHighlighted ? "text-black" : "text-dark"
                        } mb-0`}
                        style={{ 
                          fontSize: "clamp(14px, 4vw, 20px)", 
                          fontWeight: "500",
                          lineHeight: "1.4",
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical"
                        }}
                      >
                        {question.title}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="d-flex align-items-center justify-content-between stats-bottom-content">
                      <div className="d-flex align-items-center gap-1 gap-md-2">
                        <i className="bi bi-eye-fill text-muted"></i>
                        <span className="text-muted">Views: {question.views}</span>
                      </div>

                      <div className="d-flex align-items-center gap-1 gap-md-2">
                        <i className="bi bi-chat-dots-fill text-muted"></i>
                        <span className="text-muted">
                          Ans: {question.answers}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              ))
            )}
            </div>
          )}
        </div>
      </div>

      {/* Question Detail Offcanvas */}
      {selectedQuestion && (
        <div
          className={`offcanvas offcanvas-end ${showDetail ? "show" : ""}`}
          tabIndex="-1"
          style={{
            visibility: showDetail ? "visible" : "hidden",
            width: "400px",
            right: showDetail ? "0" : "-400px",
            transition: "all 0.3s ease",
            borderRadius: "30px",
            margin: "20px",
          }}
        >
          <div className="offcanvas-header border-bottom" style={{ borderTopLeftRadius: "15px", borderTopRightRadius: "15px" }}>
            <div className="d-flex justify-content-between align-items-center w-100">
              <div>
                <small className="text-black">
                  {questionDetails?.created_at 
                    ? (() => {
                        const date = new Date(questionDetails.created_at);
                        return date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "2-digit",
                          year: "numeric",
                        }) + " - " + date.toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        });
                      })()
                    : selectedQuestion?.date || ""
                  }
                </small>
              </div>
              <div className="d-flex gap-2">
                {questionDetails?.status === "Closed" || selectedQuestion?.rawData?.status === "Closed" ? (
                  <span className="badge bg-secondary text-dark btn-sm d-flex align-items-center" style={{ height: "31px" }}>
                    Closed
                  </span>
                ) : (
                  <button 
                    className="btn bg-black text-white btn-sm"
                    disabled={closingQuestion}
                    onClick={async () => {
                    if (selectedQuestion && selectedQuestion.id) {
                      try {
                        setClosingQuestion(true);
                        const response = await ApiService.request({
                          method: "POST",
                          url: "closeQuestion",
                          data: { question_id: selectedQuestion.id }
                        });
                        const data = response.data;
                        if (data.status) {
                          toast.success(data.message || "Question closed successfully");
                          // Update questionDetails status to Closed
                          setQuestionDetails(prev => prev ? { ...prev, status: "Closed" } : null);
                          // Refresh questions list
                          const refreshResponse = await ApiService.request({
                            method: "GET",
                            url: "getMyQuestions",
                            data: searchQuery ? { search: searchQuery } : {},
                          });
                          const refreshData = refreshResponse.data;
                          if (refreshData.status && refreshData.data.questions) {
                            const apiQuestions = refreshData.data.questions.map((q, index) => {
                              const createdDate = q.created_at ? new Date(q.created_at) : new Date();
                              const formattedDate = createdDate.toLocaleDateString("en-US", {
                                month: "short",
                                day: "2-digit",
                                year: "numeric",
                              });
                              const formattedTime = createdDate.toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              });

                              return {
                                id: q.id,
                                title: q.question || "",
                                date: `${formattedDate} - ${formattedTime}`,
                                views: 0,
                                answers: q.answers_count || 0,
                                isHighlighted: index === 0,
                                jurisdiction: q.jurisdiction ? {
                                  id: q.jurisdiction.id,
                                  name: q.jurisdiction.name || ""
                                } : null,
                                timestamp: q.created_at,
                                rawData: {
                                  ...q,
                                  status: q.status || null,
                                },
                              };
                            });
                            setQuestions(apiQuestions);
                            setShowDetail(false);
                            setSelectedQuestion(null);
                          }
                        } else {
                          toast.error(data.message || "Failed to close question");
                        }
                      } catch (error) {
                        console.error("Error closing question:", error);
                        if (error.response?.data?.message) {
                          toast.error(error.response.data.message);
                        } else {
                          toast.error("Failed to close question");
                        }
                      } finally {
                        setClosingQuestion(false);
                      }
                    }
                  }}
                >
                  {closingQuestion ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                      Closing...
                    </>
                  ) : (
                      "Mark Closed"
                    )}
                  </button>
                )}
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDetail(false)}
                ></button>
              </div>
            </div>
          </div>

          <div className="offcanvas-body p-0" style={{ borderBottomLeftRadius: "15px", borderBottomRightRadius: "15px" }}>
            {loadingDetails ? (
              <div className="d-flex justify-content-center align-items-center p-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : (
              <>
                {/* Question Details */}
                <div className="p-4">
                  <h5 className="mb-3">{selectedQuestion?.title || questionDetails?.question || ""}</h5>

                  {/* Show jurisdiction if available */}
                  {questionDetails?.jurisdiction && (
                    <div className="mb-3">
                      <span className="badge bg-light text-dark">
                        <i className="bi bi-geo-alt me-1"></i>
                        {questionDetails.jurisdiction.name}
                      </span>
                    </div>
                  )}

                  {/* Show attachments if available */}
                  {questionDetails?.attachments && questionDetails.attachments.length > 0 && (
                    <div className="mb-3">
                      <small className="text-muted d-block mb-2">Attachments:</small>
                      <div className="d-flex flex-wrap gap-2">
                        {questionDetails.attachments.map((attachment, index) => (
                          <a
                            key={index}
                            href={attachment}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline-secondary"
                          >
                            <i className="bi bi-paperclip me-1"></i>
                            Attachment {index + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="d-flex align-items-center gap-4 mb-4">
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-eye-fill text-gray-600"></i>
                      <span className="text-black">
                        Views: {selectedQuestion?.views || questionDetails?.views_count || 0}
                      </span>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-chat-dots-fill text-gray-600"></i>
                      <span className="text-black">
                        Ans: {selectedQuestion?.answers || questionDetails?.answers_count || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Lawyers Respond Section */}
            {!loadingDetails && (
              <div className="border-top">
                <div className="p-4">
                  <h6 className="mb-4">Lawyers Respond</h6>

                  {lawyerResponses.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-muted">No lawyer responses yet</p>
                    </div>
                  ) : (
                    <div
                      className="d-flex flex-column gap-3"
                      style={{ maxHeight: "400px", overflowY: "auto" }}
                    >
                      {lawyerResponses.map((lawyer) => (
                    <div
                      key={lawyer.id}
                      className="d-flex align-items-start justify-content-between border-bottom pb-3"
                    >
                      {/* Left Side: Profile + Message */}
                      <div className="d-flex align-items-start gap-3">
                        {/* Profile Picture */}
                        <img
                          src={lawyer.avatar}
                          alt={lawyer.name}
                          className="rounded-circle"
                          style={{
                            width: "40px",
                            height: "40px",
                            objectFit: "cover",
                            flexShrink: 0,
                          }}
                        />

                        {/* Text Content */}
                        <div>
                          <div className="d-flex flex-column">
                            <strong
                              className="text-dark"
                              style={{ fontSize: "14px" }}
                            >
                              {lawyer.name}
                            </strong>
                            <small className="text-black">{lawyer.title}</small>
                          </div>

                          <p
                            className="text-black mb-1 mt-2"
                            style={{ fontSize: "14px" }}
                          >
                            {lawyer.response}
                          </p>
                        </div>
                      </div>

                      {/* Right Side*/}
                      <div className="text-end ms-3">
                        <small className="text-muted d-block mb-2">
                          {lawyer.time}
                        </small>
                        <NavLink to="/chat">
                          <button
                            className="btn btn-outline-dark bg-dark p-5 rounded-pill text-white btn-sm rounded-circle d-flex justify-content-center align-items-center"
                            style={{
                              width: "32px",
                              height: "32px",
                              padding: 0,
                              borderWidth: "1px",
                            }}
                          >
                            <i
                              className="bi bi-chat-dots-fill p-0 text-white"
                              style={{ fontSize: "14px" }}
                            ></i>
                          </button>
                        </NavLink>
                      </div>
                    </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <AskQuestionOffcanvas
        show={showPostQuestion}
        onClose={handleClosePostQuestion}
        jurisdictionOptions={jurisdictions.map(j => ({ label: j.name, value: j.id }))}
        onSuccess={refreshQuestions}
      />

      {/* Backdrop */}
      {showDetail && (
        <div
          className="offcanvas-backdrop fade show"
          onClick={() => setShowDetail(false)}
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

      {/* Payment Modal */}
      <PaymentModal
        show={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        amount={questionPaymentAmount}
        onSuccess={async (paymentResult) => {
          // After payment success, submit the question
          await submitQuestionAfterPayment(paymentResult);
          setShowPaymentModal(false);
        }}
        title="Pay to Post Question"
        saveCard={true}
        paymentType="question"
        paymentData={{}}
      />
    </div>
  );
};

export default List;
