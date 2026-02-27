import { getMessaging, getToken } from "firebase/messaging";
import { app } from "./firebase";

let messagingInstance = null;

export const initFirebaseMessaging = async () => {
  // if (!process.env.REACT_APP_FIREBASE_API_KEY) {
  //   return null;
  // }
  if (!("serviceWorker" in navigator) || !("Notification" in window)) {
    return null;
  }

  if (!messagingInstance) {
    messagingInstance = getMessaging(app);
  }

  try {
    const swUrl = `${process.env.PUBLIC_URL || ""}/firebase-messaging-sw.js`;
    const registration = await navigator.serviceWorker.register(swUrl);
    const currentToken = await getToken(messagingInstance, {
      serviceWorkerRegistration: registration,
    });
    if (currentToken) {
      localStorage.setItem("fcmToken", currentToken);
      return currentToken;
    }
  } catch (error) {
    console.error("Error retrieving FCM token", error);
  }

  return null;
};

export const getStoredFcmToken = () => {
  return localStorage.getItem("fcmToken");
};
