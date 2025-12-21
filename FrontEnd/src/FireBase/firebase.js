import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";  

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCajQnaMC-pGUAFZyQek3fhuK7_2ylKMIg",
  authDomain: "auth-4f25b.firebaseapp.com",
  projectId: "auth-4f25b",
  storageBucket: "auth-4f25b.firebasestorage.app",
  messagingSenderId: "250443264445",
  appId: "1:250443264445:web:8a7eeeae2415ca2f7722d4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);   

export { app, auth, db };       
