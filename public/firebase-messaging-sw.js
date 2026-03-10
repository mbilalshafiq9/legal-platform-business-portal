/* Firebase Messaging service worker for user-portal (web) */

/* eslint-disable no-undef */

importScripts("https://www.gstatic.com/firebasejs/7.23.0/firebase-app.js");
importScripts("https://www.gstatic.com/firebasejs/7.23.0/firebase-messaging.js");

firebase.initializeApp({
  apiKey: "AIzaSyA3Gzei323NkC3SlIyOMtxttMbz9AgpH-0",
  authDomain: "legal-platform-6e119.firebaseapp.com",
  projectId: "legal-platform-6e119",
  storageBucket: "legal-platform-6e119.appspot.com",
  messagingSenderId: "1056379556496",
  appId: "1:1056379556496:web:4a4a221e24486c98357e15",
  measurementId: "G-231C8BQRL3",
});

self.addEventListener("push", (event) => {
  let data = {};
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.log("Push data is not JSON:", event.data.text());
      data = {
        notification: {
          title: "Legal Platform",
          body: event.data.text(),
        },
        data: {
          title: "Legal Platform",
          body: event.data.text(),
        }
      };
    }
  }
  
  console.log("Push event", data);

  // If the app is in background, setBackgroundMessageHandler will handle it.
  // However, we explicitly show notification here to ensure it appears in all cases.
  
  const notificationTitle = data.notification?.title || data.data?.title || "Legal Platform";
  const notificationOptions = {
    body: data.notification?.body || data.data?.body || "You have a new notification",
    icon: "/logo192.png",
    data: data.data || {},
    requireInteraction: true, // Keep notification visible until user interacts
    vibrate: [200, 100, 200] // Add vibration pattern
  };

  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
      .catch(err => console.error("Error showing notification:", err))
  );
});

const messaging = firebase.messaging();

messaging.setBackgroundMessageHandler(function (payload) {
  console.log("[firebase-messaging-sw.js] Received background message ", payload);

  const notificationTitle =
    (payload.notification && payload.notification.title) ||
    "Legal Platform";
  const notificationOptions = {
    body:
      (payload.notification && payload.notification.body) ||
      "You have a new notification",
    icon: "/logo192.png",
  };

  return self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});

