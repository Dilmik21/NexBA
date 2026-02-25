import { useAuth } from "../../contexts/AuthContext";

export default function DeveloperDashboard() {
  const { userData, logout } = useAuth();
  
  return (
    <div className="p-10 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-navy mb-4">Developer Hub</h1>
      <p>Welcome back, {userData?.fullName}!</p>
      <button onClick={logout} className="mt-6 bg-red-500 text-white px-4 py-2 rounded-lg">Log Out</button>
    </div>
  );
}