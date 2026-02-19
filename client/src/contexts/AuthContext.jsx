import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null); // Stores Name, Role, etc.
  const [loading, setLoading] = useState(true);

  // 1. Sign Up (Creates Auth User + Saves extra data to Firestore)
  async function signup(email, password, additionalData) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Save the extra fields (Name, Role, Org) to the database
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      ...additionalData,
      createdAt: new Date()
    });
    
    return userCredential;
  }

  // 2. Login
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // 3. Logout
  function logout() {
    return signOut(auth);
  }

  // 4. Password Reset
  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  // 5. Watcher: Checks who is logged in and fetches their extra data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = { currentUser, userData, signup, login, logout, resetPassword };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}