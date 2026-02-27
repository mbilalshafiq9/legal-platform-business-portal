import React, { useState, useEffect, useRef } from 'react';
import socketService from '../services/SocketService';
import audioFile from '../assets/new-order.mp3';
import orderImg from '../assets/images/new-order.jpg'; 
import {  useNavigate} from 'react-router-dom';

const SocketIOPopup = () => {
  const [showPopup, setShowPopup] = useState(false);
  const [orderHeading, setOrderHeading] = useState('');
  const [orderText, setOrderText] = useState('');
  const [order, setOrder] = useState([]);
  const audioRef = useRef(null);
  const branch = JSON.parse(localStorage.getItem('branch'));

  const navigate = useNavigate();
  
  useEffect(() => {
    initializeAudio();
    
    // Subscribe using the service method which handles connection safely
    const unsubscribe = socketService.subscribe('newOrder', (data) => {
      setOrder(data);
      setOrderHeading(`New Order #${data.order_code}`);
      setOrderText(`Order #${data.order_code} on Branch ${data?.branch?.name}`);
      setShowPopup(true);
      playSound();
    });

    // Cleanup function
    return () => {
      unsubscribe();
    };
  }, []);

  const initializeAudio = () => {
    audioRef.current = new Audio(audioFile);
  };

  const playSound = () => {
    if (audioRef.current) {
      audioRef.current.play();
    }
  };

  const closePopup = () => {
    navigate('/orders/'+order._id);
    setShowPopup(false);
  };

  return (
    <>
      {showPopup && (
        <div>
          <div className="backdrop"></div>
          <div 
            className="modal fade show" 
            id="exampleModalLive" 
            tabIndex="-1" 
            aria-labelledby="exampleModalLiveLabel" 
            aria-modal="true" 
            role="dialog" 
            style={{ display: 'block' }}
          >
            <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '90%', width: '400px' }}>
              <div className="modal-content">
                <div className="modal-body">
                  <div className="p-3 p-md-5 text-center">
                    <img 
                      src={orderImg} 
                      alt="new_order" 
                      width="150"
                      className="mb-3"
                    />
                    <h4 className="fs-5 fs-md-4 mb-3">{orderHeading}</h4>
                    <p className="fs-6 mb-4">{orderText}</p>
                    <div className="text-center">
                      <button 
                        type="button" 
                        className="btn btn-secondary py-2 py-md-1 px-4" 
                        data-bs-dismiss="modal" 
                        onClick={closePopup}
                      >
                        Okay!
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SocketIOPopup;