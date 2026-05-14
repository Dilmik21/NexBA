import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children, allowedRole }) {
  // Pulling both currentUser (for auth) and userData (for the role)
  const { currentUser, userData } = useAuth();

  // 1. If there is no logged-in user, bounce them back to the login page
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // 2. If this page requires a specific role, and the user's role doesn't match:
  if (allowedRole && userData && userData.role !== allowedRole) {
    // Bounce them to their own correct dashboard based on their actual role
    if (userData.role === "Developer") return <Navigate to="/dev/dashboard" replace />;
    if (userData.role === "BA") return <Navigate to="/ba/dashboard" replace />;
    if (userData.role === "Client") return <Navigate to="/client/overview" replace />;
    
    // Fallback if role is somehow missing
    return <Navigate to="/login" replace />;
  }

  // 3. If they are logged in AND have the right role, let them see the page
  return children;
}