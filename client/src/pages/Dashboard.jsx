import { useAuth } from "../contexts/AuthContext";
import ClientDashboard from "./dashboards/ClientDashboard";
import BADashboard from "./dashboards/BADashboard";
import DeveloperDashboard from "./dashboards/DeveloperDashboard";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const { userData } = useAuth();

  // Sometimes Firebase takes a half-second to fetch the role from the database.
  // We show a loading spinner while we wait, so it doesn't crash.
  if (!userData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-gray-500 font-medium">Loading your workspace...</p>
      </div>
    );
  }

  // Look at the role saved in Firestore and load the correct UI
  switch (userData.role) {
    case 'Client':
      return <ClientDashboard />;
    case 'BA':
      return <BADashboard />;
    case 'Developer':
      return <DeveloperDashboard />;
    default:
      return (
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-red-500 font-bold">Error: No valid role assigned to this account.</p>
        </div>
      );
  }
}