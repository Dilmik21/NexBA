import { useState, useEffect } from "react";

export default function ClientRecentActivity() {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/client/recent-activity");
        const result = await response.json();
        if (result.success) {
          setActivities(result.data);
        }
      } catch (error) {
        console.error("Failed to load recent activity:", error);
      }
    };
    fetchActivities();
  }, []);

  return (
    <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 mt-8 overflow-hidden">
      
      {/* Header */}
      <div className="px-8 py-6 border-b border-gray-50">
        <h2 className="text-lg font-bold text-navy">Recent Activity</h2>
      </div>

      {/* Activity List */}
      <div className="p-4">
        {activities.map((item, index) => (
          <div 
            key={index} 
            className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors mb-1"
          >
            {/* Left Side: Dot, ID, and Action */}
            <div className="flex items-center space-x-4">
              {/* Colored Dot */}
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm ${item.dotColor}`}></div>
              
              {/* Text */}
              <div className="flex items-baseline space-x-3">
                <span className="text-sm font-bold text-navy">{item.id}</span>
                <span className="text-sm text-gray-500">— {item.action}</span>
              </div>
            </div>

            {/* Right Side: Timestamp */}
            <span className="text-xs font-medium text-gray-400 flex-shrink-0 ml-4">
              {item.time}
            </span>
          </div>
        ))}
      </div>

    </div>
  );
}