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
    badge: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA5NiA5NiI+PHRleHQgeD0iNDgiIHk9Ijc0IiBmb250LWZhbWlseT0iSW1wYWN0LEFyaWFsIE5hcnJvdyxzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iOTAwIiBmb250LXNpemU9IjcyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSI+RFM8L3RleHQ+PC9zdmc+',
    tag: 'darkset-rest',
    renotify: true,
    vibrate: [400, 100, 400, 100, 600],
    requireInteraction: false,
    data: { url: './' }
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});
