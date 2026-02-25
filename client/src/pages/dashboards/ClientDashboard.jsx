import { useState } from "react"; // <-- Import useState
import ClientTopBar from "../../components/ClientTopBar";
import ClientSidebar from "../../components/ClientSidebar";
import ClientOverviewCards from "../../components/ClientOverviewCards";
import ClientProjectProgress from "../../components/ClientProjectProgress";
import ClientChangeRequests from "../../components/ClientChangeRequests";
import ClientActionItems from "../../components/ClientActionItems";
import ClientRecentActivity from "../../components/ClientRecentActivity";
import NewProjectModal from "../../components/NewProjectModal"; // <-- 1. Import the Modal
import { useAuth } from "../../contexts/AuthContext";
import { Plus } from "lucide-react";

export default function ClientDashboard() {
  const { userData } = useAuth(); 
  
  // 2. Add state to control the modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getFirstName = (fullName) => {
    if (!fullName) return "Client";
    return fullName.split(" ")[0];
  };

  const getTimeBasedGreeting = () => {
    const currentHour = new Date().getHours();
    if (currentHour < 12) return "Good morning";
    if (currentHour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      
      {/* 3. Drop the Modal Component here */}
      <NewProjectModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />

      <ClientTopBar />

      <div className="flex max-w-[1600px] mx-auto pt-6 px-6 gap-8">
        
        <div className="hidden lg:block w-64 flex-shrink-0">
          <ClientSidebar />
        </div>

        <div className="flex-1 pb-10">
          
          <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-navy">Overview</h1>
              <p className="text-gray-500 mt-1 text-sm">
                {getTimeBasedGreeting()}, {getFirstName(userData?.fullName)}. Here's your project summary.
              </p>
            </div>
            
            {/* 4. Connect the button to open the modal! */}
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-primary hover:bg-blue-600 text-white px-6 py-2.5 rounded-full font-semibold flex items-center transition-colors shadow-sm flex-shrink-0"
            >
              <Plus className="w-5 h-5 mr-2" strokeWidth={3} />
              New Project
            </button>
          </div>
          
          <ClientOverviewCards />
          <ClientProjectProgress />
          <ClientChangeRequests />
          <ClientActionItems />
          <ClientRecentActivity />

        </div>
      </div>
    </div>
  );
}