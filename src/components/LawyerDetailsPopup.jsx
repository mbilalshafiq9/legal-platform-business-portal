import React, { useState, useEffect } from "react";
import visaCard from "../assets/images/visa-card.png";
import masterCard from "../assets/images/master-card.png";
import applePay from "../assets/images/apple-white.png";

const LawyerDetailsPopup = ({
  show,
  onClose,
  lawyerDetails,
  onShare,
  onPurchaseService,
  myService,
  pricingOptions,
  selectedPricingOption,
  setSelectedPricingOption,
  setCurrentSlideIndex,
  currentSlideIndex,
  handleCancelService,
  cancellingService,
  loadingLawyerDetails,
  nextSlide,
  prevSlide,
  goToSlide,
  notificationProfile,
}) => {
  const [showAllJurisdictions, setShowAllJurisdictions] = useState(false);
  const [showAllExpertise, setShowAllExpertise] = useState(false);
  const [showPricingOptions, setShowPricingOptions] = useState(false);

  useEffect(() => {
    if (show) {
      setShowAllJurisdictions(false);
      setShowAllExpertise(false);
      setShowPricingOptions(false);
      setCurrentSlideIndex(0);
    }
  }, [show, setCurrentSlideIndex]);

  if (!show || !lawyerDetails) return null;

  const timeAgo = (input) => {
    if (!input) return "Recently";
    const date = new Date(input);
    const now = new Date();
    const diffSeconds = Math.floor((now - date) / 1000);
    if (!isFinite(diffSeconds) || diffSeconds < 0) return "Recently";
    if (diffSeconds < 60) return "Just now";
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `${diffMonths} month${diffMonths !== 1 ? "s" : ""} ago`;
    const diffYears = Math.floor(diffMonths / 12);
    return `${diffYears} year${diffYears !== 1 ? "s" : ""} ago`;
  };
  const totalReviews = lawyerDetails?.reviews?.length || 0;
  const getStarCount = (star) =>
    lawyerDetails?.reviews?.filter((review) => review.stars === star).length || 0;

  return (
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
          className="btn btn-dark opacity-50 rounded-circle shadow-sm d-flex align-items-center justify-content-center lawyer-detail-close-btn"
          style={{ width: "30px", height: "33px" }}
          onClick={onClose}
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
          className="btn btn-dark opacity-50 rounded-circle shadow-sm d-flex align-items-center justify-content-center lawyer-detail-share-btn"
          style={{ width: "30px", height: "33px" }}
          onClick={onShare}
          aria-label="Share lawyer profile"
        >
          <i className="bi bi-upload fs-5 pe-0"></i>
        </button>
      </div>

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
              <div
                className="position-relative w-100 h-100"
                style={{ 
                  overflow: "hidden",
                  borderTopRightRadius: "15px",
                  borderTopLeftRadius: "15px",
                  backgroundColor: "#f8f9fa"
                }}
              >
                {(() => {
                  const lawyerImages = lawyerDetails?.images || [];
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
                  } else if (lawyerDetails?.picture) {
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
                  } else {
                    return (
                      <div className="w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: "#f8f9fa" }}>
                        <i className="bi bi-image fs-1 text-muted"></i>
                      </div>
                    );
                  }
                })()}

                {(() => {
                  const lawyerImages = lawyerDetails?.images || [];
                  const imagesToShow = lawyerImages.length > 0 ? lawyerImages : 
                                      (lawyerDetails?.picture ? [lawyerDetails.picture] : []);
                  
                  return imagesToShow.length > 1 ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-dark rounded-circle position-absolute top-50 start-0 translate-middle-y ms-3 shadow-sm"
                        style={{
                          width: "20px",
                          height: "33px",
                          zIndex: 10,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: "rgba(0, 0, 0, 0.5)",
                        }}
                        onClick={prevSlide}
                        aria-label="Previous image"
                      >
                        <i className="bi bi-chevron-left pe-1" style={{ fontSize: "1rem" }}></i>
                      </button>
                      <button
                        type="button"
                        className="btn btn-dark rounded-circle position-absolute top-50 end-0 translate-middle-y me-3 shadow-sm"
                        style={{
                          width: "20px",
                          height: "33px",
                          zIndex: 10,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: "rgba(0, 0, 0, 0.5)",
                        }}
                        onClick={nextSlide}
                        aria-label="Next image"
                      >
                        <i className="bi bi-chevron-right pe-0" style={{ fontSize: "1rem" }}></i>
                      </button>
                    </>
                  ) : null;
                })()}

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

            {lawyerDetails?.city && (
              <div className="mb-2 px-3">
                <small className="text-muted fs-5">
                  {lawyerDetails.city} {lawyerDetails.country}
                </small>
              </div>
            )}

            <div className="d-flex justify-content-between align-items-center mb-3 px-3 lawyer-card-title">
              <div className="">
                 <h1 className="fw-bold text-dark mb-0">
                  {lawyerDetails?.name || lawyerDetails?.firm_name || ""}
                </h1>
              <div className="d-flex gap-3">
                {lawyerDetails?.categories?.[0]?.name  && (
                  <span className="text-muted me-2">
                    {lawyerDetails.categories?.[0]?.name+ ' +'+lawyerDetails.categories.length}
                  </span>
                )}
                {lawyerDetails?.rating && (
                  <div className="d-flex align-items-center">
                    <span className="fw-bold fs-6">{lawyerDetails.rating}</span>
                    <i className="bi bi-star-fill text-dark ms-1 fs-6"></i>
                  </div>
                )}
                </div>
              </div>
            </div>

            {(lawyerDetails?.about || lawyerDetails?.description) && (
              <p className="text-muted mb-4 px-3" style={{ lineHeight: "1.6" }}>
                {lawyerDetails.about || lawyerDetails.description}
              </p>
            )}

            {lawyerDetails?.jurisdictions && lawyerDetails.jurisdictions.length > 0 && (
              <div className="px-3 mb-3">
                <h6 className="fw-bold text-dark mb-2">Jurisdictions</h6>
                <div className="text-muted">
                  {(showAllJurisdictions 
                    ? lawyerDetails.jurisdictions 
                    : lawyerDetails.jurisdictions.slice(0, 5)
                  ).map(j => j.name).join(", ")}
                  {lawyerDetails.jurisdictions.length > 5 && (
                    <span 
                      className="text-primary ms-2 fw-bold" 
                      onClick={() => setShowAllJurisdictions(!showAllJurisdictions)}
                      style={{ cursor: "pointer" }}
                    >
                      {showAllJurisdictions ? "See Less" : "See More"}
                    </span>
                  )}
                </div>
              </div>
            )}

            {(lawyerDetails?.categories || lawyerDetails?.sub_categories) && (
              <div className="px-3 mb-3">
                <h6 className="fw-bold text-dark mb-2">Expertise</h6>
                <div className="text-muted">
                  {(() => {
                    const allExpertise = [
                      ...(lawyerDetails.categories || []),
                      ...(lawyerDetails.sub_categories || [])
                    ];
                    const displayExpertise = showAllExpertise 
                      ? allExpertise 
                      : allExpertise.slice(0, 5);
                    
                    return (
                      <>
                        {displayExpertise.map(e => e.name).join(", ")}
                        {allExpertise.length > 5 && (
                          <span 
                            className="text-primary ms-2 fw-bold" 
                            onClick={() => setShowAllExpertise(!showAllExpertise)}
                            style={{ cursor: "pointer" }}
                          >
                            {showAllExpertise ? "See Less" : "See More"}
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            <div className="mb-4 px-3">
              <h6 className="fw-bold text-dark mb-3">Services</h6>
              <div className="d-flex flex-column gap-2">
                {lawyerDetails?.services.map((service, index) => (
                  <div key={index} className="d-flex align-items-center">
                    <i className="bi bi-check-circle-fill text-black me-2"></i>
                    <span className="text-muted">{service}</span>
                  </div>
                ))}
              </div>
            </div>

            {lawyerDetails?.reviews && lawyerDetails.reviews.length > 0 && (
              <div className="mb-4 px-3">
                <h6 className="fw-bold text-dark mb-3">Reviews</h6>
                {lawyerDetails.rating && (
                  <>
                    <div className="d-flex align-items-center mb-2">
                      <div className="d-flex me-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <i
                            key={star}
                            className={`bi bi-star${star <= Math.round(lawyerDetails.rating) ? "-fill" : ""} text-dark`}
                          ></i>
                        ))}
                      </div>
                      <span className="fw-bold me-2">{lawyerDetails.rating} out of 5</span>
                    </div>
                    <p className="text-muted">{lawyerDetails.reviews.length} total review{lawyerDetails.reviews.length !== 1 ? "s" : ""}</p>
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = getStarCount(star);
                      const pct = totalReviews ? (count / totalReviews) * 100 : 0;
                      return (
                        <div className="row align-items-center mb-2" key={star}>
                          <span className="col-2">{star} star</span>
                          <div className="col-10">
                            <div
                              className="progress rounded"
                              role="progressbar"
                              aria-valuenow={pct}
                              aria-valuemin="0"
                              aria-valuemax="100"
                              style={{ height: "8px" }}
                            >
                              <div
                                className="progress-bar bg-dark rounded"
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}

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
                            {review.created_at ? timeAgo(review.created_at) : "Recently"}
                          </small>
                        </div>
                        <div className="d-flex mb-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <i 
                              key={star} 
                              className={`bi bi-star${star <= review.stars ? '-fill' : ''}`}
                              style={{ fontSize: "0.9rem", color: star <= review.stars ? "#000" : "#ccc" }}
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
          </div>
        )}

        {myService ? (
          <div className="p-4" style={{ backgroundColor: "#000", borderBottomRightRadius: "15px", borderBottomLeftRadius: "15px" }}>
            {myService.period === 'weekly' ? (
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
          <div className={`p-4 ${showPricingOptions ? "bg-white shadow border border-top" : "bg-black"}`} style={{  borderBottomRightRadius: "15px", borderBottomLeftRadius: "15px" }}>
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
                      backgroundColor: selectedPricingOption === option.value ? "#000000" : "#ffffff",
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

            <div className="d-flex gap-3 justify-content-center">
              {/* <button
                className="btn d-flex align-items-center justify-content-center rounded-pill"
                style={{ 
                  height: "50px", 
                  width: "180px", 
                  backgroundColor: "#474747",
                  border: "none",
                  color: "#ffffff"
                }}
                onClick={onPurchaseService}
              >
                <i className="bi bi-apple me-2 text-white" style={{ fontSize: "1.2rem" }}></i>
                <span>Apple</span>
              </button> */}
              <button
                className="btn rounded-pill fw-bold w-100"
                style={{ 
                  height: "50px", 
                  backgroundColor: showPricingOptions ? "#000000" : "#9e9e9eff", 
                  color: "#ffffff",
                  border: "none",
                  fontSize: "1rem"
                }}
                onClick={onPurchaseService}
                disabled={!lawyerDetails || pricingOptions.length === 0}
              >
                <img src={visaCard} alt="visa" className="w-30px me-2" />
                <img src={masterCard} alt="master" className="w-25px me-2" />
                <img src={applePay} alt="apple" className="w-20px me-2" />
                Get Service
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default LawyerDetailsPopup;
