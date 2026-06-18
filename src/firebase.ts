import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyA6cPwacs8p0sZXDWZO4KFz4YX_wEQ1vDE",
  authDomain: "bardrop-ace33.firebaseapp.com",
  projectId: "bardrop-ace33",
  storageBucket: "bardrop-ace33.firebasestorage.app",
  messagingSenderId: "769195258053",
  appId: "1:769195258053:web:75ccb8104479b5da3900ac",
  measurementId: "G-74998NY1J7",
};

const app = initializeApp(firebaseConfig);
export const analytics =
  typeof window !== "undefined" ? getAnalytics(app) : null;

export const auth = getAuth(app);

// Use standard Firestore instance
export const db = getFirestore(app);
