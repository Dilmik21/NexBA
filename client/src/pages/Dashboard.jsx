import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const { userData } = useAuth();
  const navigate = useNavigate();

  // The "Traffic Cop" logic: Watch for userData to load, then redirect them
  useEffect(() => {
    if (userData) {
      if (userData.role === 'Client') {
        navigate("/client/overview", { replace: true });
      } 
      else if (userData.role === 'BA' || userData.role === 'Business Analyst') {
        navigate("/ba/dashboard", { replace: true });
      } 
      else if (userData.role === 'Developer') {
        // Sends them to the new Dev portal!
        navigate("/dev/dashboard", { replace: true });
      }
    }
  }, [userData, navigate]);

  // While we wait for Firebase to tell us their role, show a smooth loading screen
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F7FA]">
      <Loader2 className="w-10 h-10 animate-spin text-[#007BFF] mb-4" />
      <p className="text-gray-500 font-medium animate-pulse">Loading your workspace...</p>
    </div>
  );
}