import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function ClientChangeRequests() {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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
      } finally {
        setIsLoading(false);
      }
    };
    fetchChangeRequests();
  }, []);

  return (
    <div className="bg-white rounded-3xl md:rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-2 border-orange-200 overflow-hidden mt-6 md:mt-8">
      
      {/* Header Area with Orange Warning Icon */}
      <div className="px-5 py-4 md:px-8 md:py-5 border-b border-orange-100 flex items-center space-x-2 md:space-x-3 bg-orange-50/50">
        <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-orange-500 flex-shrink-0" />
        <h2 className="text-base md:text-lg font-bold text-navy truncate">Change Request Status</h2>
      </div>

      {/* List of Change Requests */}
      <div className="p-3 md:p-4 space-y-2 md:space-y-4">
        {isLoading ? (
          <div className="text-center py-6 text-gray-400 text-sm">Loading change requests...</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-[13px] md:text-sm">No active change requests pending.</div>
        ) : (
          requests.map((req, index) => (
            <div 
              key={index} 
              className="flex flex-col md:flex-row md:items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors gap-3 md:gap-0 border border-transparent hover:border-gray-100"
            >
              {/* Left Side: Details */}
              <div className="min-w-0 pr-0 md:pr-4">
                <p className="text-[13px] md:text-sm font-bold text-navy truncate">
                  {req.id}: {req.title}
                </p>
                <p className="text-[11px] md:text-xs text-gray-500 mt-1 truncate">
                  {req.type} • {req.date}
                </p>
              </div>

              {/* Right Side: Dynamic Colored Warning Badge */}
              <div className="flex-shrink-0 self-start md:self-auto">
                <span className={`text-[10px] md:text-xs font-bold px-3 py-1.5 md:px-4 md:py-2 rounded-lg inline-block w-max ${
                  req.statusColor === 'red' 
                    ? 'bg-red-50 text-red-600' 
                    : 'bg-yellow-50 text-yellow-600'
                }`}>
                  {req.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}