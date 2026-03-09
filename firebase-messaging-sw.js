// Firebase Messaging Service Worker — DarkSet
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyB3bu3XercwmnlV0jdaldoXvd5gnHfj0GU",
  authDomain: "darkset-538d1.firebaseapp.com",
  projectId: "darkset-538d1",
  storageBucket: "darkset-538d1.firebasestorage.app",
  messagingSenderId: "354165019689",
  appId: "1:354165019689:web:dc458f0a61e26e6289f838"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  const notificationTitle = payload.notification?.title || '⏱ Descanso finalizado!';
  const notificationOptions = {
    body: payload.notification?.body || 'Hora da próxima série! 💪',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    tag: 'darkset-rest',
    renotify: true,
    vibrate: [400, 100, 400, 100, 600],
    requireInteraction: false,
    data: { url: './' }
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});
