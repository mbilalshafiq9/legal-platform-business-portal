import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: (process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyA3Gzei323NkC3SlIyOMtxttMbz9AgpH-0").trim(),
  authDomain: (process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "legal-platform-6e119.firebaseapp.com").trim(),
  projectId: (process.env.REACT_APP_FIREBASE_PROJECT_ID || "legal-platform-6e119").trim(),
  storageBucket: (process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "legal-platform-6e119.appspot.com").trim(),
  messagingSenderId: (process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "1056379556496").trim(),
  appId: (process.env.REACT_APP_FIREBASE_APP_ID || "1:1056379556496:web:4a4a221e24486c98357e15").trim(),
  measurementId: (process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-231C8BQRL3").trim(),
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, googleProvider };
