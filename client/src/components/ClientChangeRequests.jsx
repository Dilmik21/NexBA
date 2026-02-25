import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function ClientChangeRequests() {
  const [requests, setRequests] = useState([]);

  // Fetch the warning data from your Node.js backend
  useEffect(() => {
    const fetchChangeRequests = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/client/change-requests");
        const result = await response.json();
        if (result.success) {
          setRequests(result.data);
        }
      } catch (error) {
        console.error("Failed to load change requests:", error);
      }
    };
    fetchChangeRequests();
  }, []);

  return (
    <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-2 border-orange-200 overflow-hidden mt-8">
      
      {/* Header Area with Orange Warning Icon */}
      <div className="px-8 py-5 border-b border-orange-100 flex items-center space-x-3 bg-orange-50/50">
        <AlertTriangle className="w-6 h-6 text-orange-500" />
        <h2 className="text-lg font-bold text-navy">Change Request Status</h2>
      </div>

      {/* List of Change Requests */}
      <div className="p-4 space-y-4">
        {requests.map((req, index) => (
          <div 
            key={index} 
            className="flex flex-col md:flex-row md:items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors"
          >
            {/* Left Side: Details */}
            <div>
              <p className="text-sm font-bold text-navy">
                {req.id}: {req.title}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {req.type} • {req.date}
              </p>
            </div>

            {/* Right Side: Dynamic Colored Warning Badge */}
            <div className="mt-3 md:mt-0">
              <span className={`text-xs font-bold px-4 py-2 rounded-lg ${
                req.statusColor === 'red' 
                  ? 'bg-red-50 text-red-600' 
                  : 'bg-yellow-50 text-yellow-600'
              }`}>
                {req.status}
              </span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}