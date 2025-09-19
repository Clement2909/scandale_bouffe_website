import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCXy9AGCm80EAb3zYOctB2MMuR6xoMM-d4",
  authDomain: "scandale.firebaseapp.com",
  projectId: "scandale",
  storageBucket: "scandale.firebasestorage.app",
  messagingSenderId: "413940361704",
  appId: "1:413940361704:web:472249dfa3a74ca9179c5d",
  measurementId: "G-NTZ1JD24XH"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export default app;