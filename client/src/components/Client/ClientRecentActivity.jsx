import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { Loader2, Activity } from "lucide-react";

export default function ClientRecentActivity() {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Fetch activity data exactly ONCE when the user logs in
        fetchActivity(user.uid, true);
      } else {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchActivity = async (uid, showLoader = false) => {
    try {
      if (showLoader) setIsLoading(true);
      const response = await fetch(`http://localhost:5000/api/client/recent-activity?uid=${uid}`);
      const data = await response.json();
      
      if (data.success) {
        setActivities(data.data);
      }
    } catch (error) {
      console.error("Error fetching recent activity:", error);
    } finally {
      if (showLoader) setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl md:rounded-[2rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full flex flex-col">
      
      <div className="flex items-center space-x-3 mb-8 flex-shrink-0">
        <div className="bg-blue-50 p-2.5 rounded-xl text-primary">
          <Activity className="w-5 h-5" strokeWidth={2.5} />
        </div>
        <h2 className="text-lg font-bold text-navy">Recent Activity</h2>
      </div>

      <div className="flex-1 overflow-y-auto pr-2">
        {isLoading ? (
          <div className="text-center py-8 text-gray-400 text-sm flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm bg-gray-50 rounded-xl border border-gray-100 font-medium">
            No recent activity found.
          </div>
        ) : (
          <div className="relative border-l-2 border-gray-100 ml-3 space-y-6 pb-2">
            {activities.map((activity, index) => (
              <div key={index} className="relative pl-6 group">
                <div 
                  className={`absolute w-3.5 h-3.5 rounded-full -left-[9px] top-1.5 ring-4 ring-white shadow-sm transition-transform group-hover:scale-125 ${
                    activity.dotColor || 'bg-blue-500'
                  }`}
                ></div>
                
                <div className="bg-white border border-gray-100 p-4 md:p-5 rounded-2xl shadow-sm group-hover:border-blue-100 group-hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <span className="font-bold text-navy text-sm break-words">{activity.id}</span>
                    <time className="text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap bg-gray-50 px-2 py-1 rounded-md">
                      {activity.time}
                    </time>
                  </div>
                  <p className="text-[13px] text-gray-600 leading-relaxed font-medium">{activity.action}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}