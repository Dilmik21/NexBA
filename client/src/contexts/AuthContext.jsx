import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification 
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, onSnapshot } from "firebase/firestore";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Kept for backward compatibility, but onSnapshot handles real-time updates now
  const refreshUserData = async () => {
    if (currentUser) {
      try {
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
      } catch (error) {
        console.error("Error refreshing global user data:", error);
      }
    }
  };

  // 1. Sign Up
  async function signup(email, password, additionalData) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      ...additionalData,
      isOnline: true,
      createdAt: new Date()
    });

    await sendEmailVerification(user);
    return userCredential;
  }

  // 2. Login
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // 3. Logout
  async function logout() {
    if (currentUser) {
      try {
        const userRef = doc(db, "users", currentUser.uid);
        await updateDoc(userRef, { isOnline: false });
      } catch (error) {
        console.error("Failed to set user offline on logout:", error);
      }
    }
    return signOut(auth);
  }

  // 4. Password Reset (Added perfectly!)
  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  // 5. Watcher: Checks who is logged in and manages real-time updates
  useEffect(() => {
    let handleTabClose = null;
    let unsubscribeUserDoc = null; 

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      
      if (user) {
        const docRef = doc(db, "users", user.uid);
        
        // --- REAL-TIME PROFILE LISTENER ---
        unsubscribeUserDoc = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          }
          setLoading(false); 
        }, (error) => {
          console.error("Real-time profile sync error:", error);
          setLoading(false);
        });

        // Set user online when they load the app
        updateDoc(docRef, { isOnline: true }).catch(err => console.error(err));

        // Set up the tab close listener to turn offline when browser tab closes
        if (handleTabClose) window.removeEventListener('beforeunload', handleTabClose);
        
        handleTabClose = () => {
          updateDoc(docRef, { isOnline: false }).catch(err => console.error(err));
        };
        window.addEventListener('beforeunload', handleTabClose);

      } else {
        // Clean up when user logs out
        setUserData(null);
        setLoading(false);
        
        if (unsubscribeUserDoc) {
          unsubscribeUserDoc();
          unsubscribeUserDoc = null;
        }
        
        if (handleTabClose) {
          window.removeEventListener('beforeunload', handleTabClose);
          handleTabClose = null;
        }
      }
    });

    // Final cleanup when component unmounts
    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
      if (handleTabClose) window.removeEventListener('beforeunload', handleTabClose);
    };
  }, []);

  const value = { 
    currentUser, 
    userData, 
    refreshUserData, 
    signup, 
    login, 
    logout, 
    resetPassword // Fully exposed and ready to use in Login.jsx!
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}