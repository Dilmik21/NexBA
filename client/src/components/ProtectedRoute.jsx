import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();

  // If there is no logged-in user, bounce them back to the login page
  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  // If they are logged in, let them see the page
  return children;
}