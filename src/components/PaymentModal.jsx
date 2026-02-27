import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  PaymentRequestButtonElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import ApiService from "../services/ApiService";
import { toast } from "react-toastify";

// Initialize Stripe (will be set when modal opens)
let stripePromise = null;

const PaymentForm = ({
  amount,
  onSuccess,
  onCancel,
  saveCard = false,
  savedCards = [],
  onCardSaved,
  paymentIntentClientSecret,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [saveCardForFuture, setSaveCardForFuture] = useState(saveCard);
  const [cardError, setCardError] = useState(null);
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [canMakePayment, setCanMakePayment] = useState(null); // null = checking, true = yes, false = no

  useEffect(() => {
    if (stripe && amount) {
      const pr = stripe.paymentRequest({
        country: 'US',
        currency: 'usd',
        total: {
          label: 'Total Payment',
          amount: Math.round(amount * 100),
        },
        requestPayerName: true,
        requestPayerEmail: true,
      });

      // Check the availability of the Payment Request API.
      pr.canMakePayment().then((result) => {
        console.log("canMakePayment result:", result);
        setCanMakePayment(!!result);
        if (result) {
          setPaymentRequest(pr);
        }
      });

      pr.on('paymentmethod', async (ev) => {
        setProcessing(true);
        setCardError(null);

        // Confirm the PaymentIntent without handling shipping
        const {error: confirmError, paymentIntent} = await stripe.confirmCardPayment(
          paymentIntentClientSecret,
          {payment_method: ev.paymentMethod.id},
          {handleActions: false}
        );

        if (confirmError) {
          // Report to the browser that the payment failed, prompting it to
          // re-show the payment interface, or show an error message and close
          // the payment interface.
          ev.complete('fail');
          setCardError(confirmError.message);
          setProcessing(false);
        } else {
          // Report to the browser that the confirmation was successful, prompting
          // it to close the browser payment method collection interface.
          ev.complete('success');
          
          // Check if we require further actions (like 3DS)
          if (paymentIntent.status === "requires_action") {
            // Let Stripe.js handle the rest of the payment flow.
            const {error, paymentIntent: confirmedIntent} = await stripe.confirmCardPayment(paymentIntentClientSecret);
            if (error) {
              setCardError(error.message);
              setProcessing(false);
            } else {
               handleSuccess(confirmedIntent, ev.paymentMethod.id);
            }
          } else {
             handleSuccess(paymentIntent, ev.paymentMethod.id);
          }
        }
      });
    }
  }, [stripe, amount, paymentIntentClientSecret]);

  const handleSuccess = async (paymentIntent, paymentMethodId) => {
    if (paymentIntent.status === "succeeded") {
        // Save card logic if needed (Apple Pay cards might not be saveable the same way or user might not want to)
        // For now, we only save explicitly entered cards via CardElement if checked.
        
        onSuccess({
          paymentIntentId: paymentIntent.id,
          paymentMethodId: paymentMethodId,
        });
      } else {
        setCardError("Payment failed. Please try again.");
        setProcessing(false);
      }
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements || !paymentIntentClientSecret) {
      return;
    }

    setProcessing(true);
    setCardError(null);

    try {
      let paymentMethodId = null;

      // If using saved card
      if (selectedCard) {
        paymentMethodId = selectedCard.id;
      } else {
        // Create new payment method
        const cardElement = elements.getElement(CardElement);
        const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
          type: "card",
          card: cardElement,
        });

        if (pmError) {
          setCardError(pmError.message);
          setProcessing(false);
          return;
        }

        paymentMethodId = paymentMethod.id;

        // Save card if requested
        if (saveCardForFuture) {
          try {
             // Call backend to attach payment method to customer
             await ApiService.request({
              method: "POST",
              url: "saveCard",
              data: {
                payment_method_id: paymentMethodId,
              },
            });
            
            // Refresh saved cards
            if (onCardSaved) {
              setTimeout(() => {
                onCardSaved();
              }, 1000);
            }
          } catch (saveError) {
            console.error("Error saving card:", saveError);
            // Continue with payment even if saving fails
          }
        }
      }

      // Confirm payment with payment intent client secret
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        paymentIntentClientSecret,
        {
          payment_method: paymentMethodId,
        }
      );

      if (confirmError) {
        setCardError(confirmError.message);
        setProcessing(false);
        return;
      }

      if (paymentIntent.status === "succeeded") {
        onSuccess({
          paymentIntentId: paymentIntent.id,
          paymentMethodId: paymentMethodId,
        });
      } else {
        setCardError("Payment failed. Please try again.");
        setProcessing(false);
      }
    } catch (error) {
      console.error("Payment error:", error);
      setCardError(error.message || "An error occurred during payment");
      setProcessing(false);
    }
  };

  const cardElementOptions = {
    hidePostalCode: true,
    style: {
      base: {
        fontSize: "16px",
        color: "#424770",
        "::placeholder": {
          color: "#aab7c4",
        },
      },
      invalid: {
        color: "#9e2146",
      },
    },
  };

  return (
    <div className="payment-container">
      {/* Apple Pay / Google Pay Button */}
      {paymentRequest && (
        <div className="mb-4">
          <div className="p-3">
            <PaymentRequestButtonElement options={{paymentRequest}} />
          </div>
          <div className="d-flex align-items-center my-3">
            <div className="flex-grow-1 border-bottom"></div>
            <span className="mx-3 text-muted fw-bold">OR</span>
            <div className="flex-grow-1 border-bottom"></div>
          </div>
        </div>
      )}

      {/* Credit Card Form */}
      <form onSubmit={handleSubmit} className="payment-form">
        {/* Saved Cards */}
        {savedCards.length > 0 && (
            <div className="mb-4">
              <label className="form-label fw-bold">Select Saved Card</label>
              <div className="saved-cards-list">
                {savedCards.map((card) => (
                  <div
                    key={card.id}
                    className={`saved-card-item p-3 mb-2 rounded border ${
                      selectedCard?.id === card.id ? "border-primary bg-light" : "border-secondary"
                    }`}
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedCard(card)}
                  >
                    <div className="d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center">
                        <div
                          className="me-3"
                          style={{
                            width: "40px",
                            height: "30px",
                            backgroundColor: "#f0f0f0",
                            borderRadius: "4px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <i className="bi bi-credit-card"></i>
                        </div>
                        <div>
                          <div className="fw-bold">
                            {card.brand?.toUpperCase() || "CARD"} •••• {card.last4}
                          </div>
                          <small className="text-muted">
                            Expires {card.exp_month}/{card.exp_year}
                          </small>
                        </div>
                      </div>
                      {selectedCard?.id === card.id && (
                        <i className="bi bi-check-circle-fill text-primary"></i>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-center mb-3">
                <button
                  type="button"
                  className="btn btn-link text-decoration-none"
                  onClick={() => setSelectedCard(null)}
                >
                  Use New Card
                </button>
              </div>
            </div>
          )}

          {/* New Card Form */}
          {!selectedCard && (
            <div className="mb-4">
              <label className="form-label fw-bold">Card Details</label>
              <div className="p-3 border rounded">
                <CardElement options={cardElementOptions} />
              </div>
              {cardError && (
                <div className="text-danger mt-2 small">{cardError}</div>
              )}
            </div>
          )}

          {/* Save Card Checkbox */}
          {!selectedCard && (
            <div className="mb-4">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="saveCard"
                  checked={saveCardForFuture}
                  onChange={(e) => setSaveCardForFuture(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="saveCard">
                  Save this card for future payments
                </label>
              </div>
            </div>
          )}

          {/* Amount Display */}
          <div className="mb-4 p-3 bg-light rounded">
            <div className="d-flex justify-content-between align-items-center">
              <span className="fw-bold">Total Amount:</span>
              <span className="fw-bold fs-5">${amount.toFixed(2)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-secondary flex-fill"
              onClick={onCancel}
              disabled={processing}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-fill"
              disabled={processing || !stripe}
            >
              {processing ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Processing...
                </>
              ) : (
                `Pay $${amount.toFixed(2)}`
              )}
            </button>
          </div>
        </form>
    </div>
  );
};

const PaymentModal = ({
  show,
  onClose,
  amount,
  onSuccess,
  title = "Complete Payment",
  saveCard = false,
  paymentType = "service", // "service" or "question"
  paymentData = {}, // Additional data for payment (lawyer_id, period, etc.)
}) => {
  const [stripeKey, setStripeKey] = useState(null);
  const [paymentIntent, setPaymentIntent] = useState(null);
  const [savedCards, setSavedCards] = useState([]);
  const [initializing, setInitializing] = useState(false);

  // Initialize payment when modal opens
  useEffect(() => {
    if (show && amount > 0) {
      initializePayment();
      fetchSavedCards();
    } else {
      setPaymentIntent(null);
      setStripeKey(null);
      setSavedCards([]);
    }
  }, [show, amount]);

  const initializePayment = async () => {
    try {
      setInitializing(true);
      
      // Call appropriate payment initialization API
      let response;
      if (paymentType === "question") {
        response = await ApiService.request({
          method: "POST",
          url: "paymentForQuestion",
          data: { amount },
        });
      } else if (paymentType === "invoice") {
        response = await ApiService.request({
          method: "POST",
          url: "paymentForInvoice",
          data: { amount },
        });
      } else {
        response = await ApiService.request({
          method: "POST",
          url: "processPayment",
          data: { amount },
        });
      }

      const data = response.data;
      if (data.status && data.data) {
        setPaymentIntent(data.data.paymentIntent);
        setStripeKey(data.data.publishableKey);
        
        // Initialize Stripe
        if (data.data.publishableKey) {
          stripePromise = loadStripe(data.data.publishableKey);
        }
      } else {
        toast.error(data.message || "Failed to initialize payment");
        onClose();
      }
    } catch (error) {
      console.error("Error initializing payment:", error);
      toast.error("Failed to initialize payment. Please try again.");
      onClose();
    } finally {
      setInitializing(false);
    }
  };

  const fetchSavedCards = async () => {
    try {
      const response = await ApiService.request({
        method: "GET",
        url: "getSavedCards",
      });

      const data = response.data;
      if (data.status && data.data && data.data.cards) {
        setSavedCards(data.data.cards);
      }
    } catch (error) {
      console.error("Error fetching saved cards:", error);
    }
  };

  const handlePaymentSuccess = async (paymentResult) => {
    // Payment confirmation is already handled in PaymentForm
    // Just call success callback with payment result and payment data
      onSuccess({
        ...paymentResult,
        ...paymentData,
      });
      
      onClose();
  };

  if (!show) return null;

  return (
    <div
      className="modal fade show"
      style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}
      tabIndex="-1"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              disabled={initializing}
            ></button>
          </div>
          <div className="modal-body">
            {initializing ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Initializing payment...</span>
                </div>
                <p className="mt-3 text-muted">Preparing payment...</p>
              </div>
            ) : stripeKey && paymentIntent && stripePromise ? (
              <Elements stripe={stripePromise} options={{ clientSecret: paymentIntent }}>
                <PaymentForm
                  amount={amount}
                  onSuccess={handlePaymentSuccess}
                  onCancel={onClose}
                  saveCard={saveCard}
                  savedCards={savedCards}
                  onCardSaved={fetchSavedCards}
                  paymentIntentClientSecret={paymentIntent}
                />
              </Elements>
            ) : (
              <div className="text-center py-4">
                <p className="text-danger">Failed to initialize payment. Please try again.</p>
                <button className="btn btn-primary" onClick={initializePayment}>
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
