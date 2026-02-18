// client/src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyA1u9HtNkxP2HVJDpzE3SfgFFpC2RgSfEs",
  authDomain: "nexba-app.firebaseapp.com",
  projectId: "nexba-app",
  storageBucket: "nexba-app.firebasestorage.app",
  messagingSenderId: "181158715500",
  appId: "1:181158715500:web:af9636553cb7c997ecb849"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the services so we can use them in other files
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);