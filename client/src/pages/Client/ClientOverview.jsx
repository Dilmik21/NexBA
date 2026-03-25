import { useState } from "react"; 
import ClientTopBar from "../../components/Client/ClientTopBar";
import ClientSidebar from "../../components/Client/ClientSidebar";
import ClientOverviewCards from "../../components/Client/ClientOverviewCards";
import ClientProjectProgress from "../../components/Client/ClientProjectProgress";
import ClientChangeRequests from "../../components/Client/ClientChangeRequests";
import ClientActionItems from "../../components/Client/ClientActionItems";
import ClientRecentActivity from "../../components/Client/ClientRecentActivity";
import NewProjectModal from "../../components/Client/NewProjectModal"; 
import { useAuth } from "../../contexts/AuthContext";
import { Plus } from "lucide-react";

export default function ClientDashboard() {
  const { userData } = useAuth(); 
  
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
      
      <NewProjectModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />

      <ClientTopBar />

      {/* Adjusted padding for mobile screens */}
      <div className="flex max-w-[1600px] mx-auto pt-6 px-4 md:px-6 gap-8">
        
        <div className="hidden lg:block w-64 flex-shrink-0">
          <ClientSidebar />
        </div>

        <div className="flex-1 pb-10">
          
          <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-[22px] md:text-2xl font-bold text-navy">Overview</h1>
              <p className="text-gray-500 mt-1 text-[13px] md:text-sm">
                {getTimeBasedGreeting()}, {getFirstName(userData?.fullName)}. Here's your project summary.
              </p>
            </div>
            
            {/* Button stretches to full width on mobile for easy thumb tapping */}
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto justify-center bg-primary hover:bg-blue-600 text-white px-6 py-3 sm:py-2.5 rounded-xl sm:rounded-full font-bold flex items-center transition-colors shadow-sm flex-shrink-0 text-sm"
            >
              <Plus className="w-5 h-5 mr-2" strokeWidth={3} />
              New Project
            </button>
          </div>
          
          {/* Note: Ensure the individual components below also use standard Tailwind responsive classes (like grid-cols-1 md:grid-cols-2) in their own files! */}
          <div className="space-y-6 md:space-y-8">
            <ClientOverviewCards />
            <ClientProjectProgress />
            <ClientChangeRequests />
            <ClientActionItems />
            <ClientRecentActivity />
          </div>

        </div>
      </div>
    </div>
  );
}