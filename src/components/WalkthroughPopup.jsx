import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import ApiService from '../services/ApiService';

const WalkthroughPopup = () => {
  const [show, setShow] = useState(false);
  const [slides, setSlides] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const hasSeen = localStorage.getItem('has_seen_walkthrough_business');
    if (!hasSeen) {
      fetchWalkthrough();
    }
  }, []);

  const fetchWalkthrough = async () => {
    try {
      const response = await ApiService.request({
        method: 'GET',
        url: 'getWalkthrough?user_type=business',
      });

      if (response.data && response.data.data && response.data.data.length > 0) {
        setSlides(response.data.data);
        setShow(true);
      }
    } catch (error) {
      console.error('Error fetching walkthrough:', error);
    }
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    setShow(false);
    localStorage.setItem('has_seen_walkthrough_business', 'true');
  };

  if (!show || slides.length === 0) return null;

  const slide = slides[currentSlide];

  return (
    <Modal show={show} onHide={handleClose} centered size="xl" contentClassName="border-0 rounded-4 overflow-hidden">
      <Modal.Body className="p-0">
        <div className="d-flex flex-column flex-lg-row" style={{ minHeight: '500px' }}>
          {/* Left Content */}
          <div className="col-lg-5 p-5 d-flex flex-column justify-content-center bg-light">
             {/* Progress Indicators */}
            <div className="d-flex mb-5 gap-2 px-2">
                {slides.map((_, idx) => (
                    <div 
                        key={idx} 
                        className={`flex-grow-1 rounded-pill transition-all`}
                        style={{ 
                            height: '4px', 
                            backgroundColor: idx === currentSlide ? '#000' : '#d1d1d1ff',
                            transition: 'background-color 0.3s ease'
                        }}
                    ></div>
                ))}
            </div>

            <div className="px-2 my-4">
                <h2 className="fw-bold my-3" style={{ fontSize: '2rem' }}>{slide.heading}</h2>
                <p className="text-muted fs-5" style={{ lineHeight: '1.6' }}>{slide.description}</p>
            </div>
            
            <div className="mt-auto px-2">
                <Button 
                    variant="dark" 
                    className="w-100 rounded-pill py-3 fw-bold fs-5"
                    onClick={handleNext}
                    style={{ backgroundColor: '#000', border: 'none' }}
                >
                    {currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
                </Button>
            </div>
          </div>

          {/* Right Image */}
          <div className="col-lg-7 bg-white position-relative p-0 overflow-hidden">
             {/* Background overlay or color if needed */}
             <img className="w-100 h-100 p-3" alt="img" src={slide.image}
                style={{
                    objectFit: 'contain',
                    minHeight: '80vh'
                }}
              />
             
             {/* Close button on image side (optional) */}
             <button 
                className="btn btn-icon position-absolute top-0 end-0 m-3 text-white bg-dark bg-opacity-25 rounded-circle"
                onClick={handleClose}
                style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
             >
                <i className="bi bi-x-lg"></i>
             </button>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default WalkthroughPopup;