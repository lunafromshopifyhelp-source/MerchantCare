
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD13R28VXQsuByA0bt-1n8mIxIZPPAY9vU",
  authDomain: "merchantcare-portal.firebaseapp.com",
  projectId: "merchantcare-portal",
  storageBucket: "merchantcare-portal.firebasestorage.app",
  messagingSenderId: "1064433315528",
  appId: "1:1064433315528:web:d0d0777ef4a7f8f55c7ffd"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
