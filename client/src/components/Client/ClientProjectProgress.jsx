import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react"; 
import { getAuth, onAuthStateChanged } from "firebase/auth"; 

export default function ClientProjectProgress() {
  const [progressData, setProgressData] = useState({
    lastUpdated: "Loading...",
    requirements: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Fetch progress data exactly ONCE when the user logs in
        fetchProgress(user.uid, true); 
      } else {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchProgress = async (uid, showLoader = false) => {
    try {
      if (showLoader) setIsLoading(true);
      const response = await fetch(`http://localhost:5000/api/client/project-progress?uid=${uid}`);
      const result = await response.json();
      if (result.success) {
        setProgressData(result.data);
      }
    } catch (error) {
      console.error("Failed to load project progress:", error);
    } finally {
      if (showLoader) setIsLoading(false);
    }
  };

  const getStageDetails = (stage) => {
    const s = stage?.toLowerCase() || "";
    
    if (s.includes("pending") || s.includes("review")) 
      return { badgeBg: "bg-orange-100", badgeText: "text-orange-600", barColor: "bg-orange-500", progress: 0 };
    if (s.includes("analysis")) 
      return { badgeBg: "bg-yellow-100", badgeText: "text-yellow-700", barColor: "bg-yellow-500", progress: 15 };
    if (s.includes("clarification")) 
      return { badgeBg: "bg-red-100", badgeText: "text-red-600", barColor: "bg-red-500", progress: 15 };
    if (s.includes("ready")) 
      return { badgeBg: "bg-indigo-100", badgeText: "text-indigo-600", barColor: "bg-indigo-500", progress: 25 };
    if (s.includes("develop")) 
      return { badgeBg: "bg-blue-100", badgeText: "text-blue-600", barColor: "bg-blue-500", progress: 50 };
    if (s.includes("change") || s.includes("modification")) 
      return { badgeBg: "bg-amber-100", badgeText: "text-amber-600", barColor: "bg-amber-500", progress: 75 };
    if (s.includes("uat") || s.includes("verif")) 
      return { badgeBg: "bg-purple-100", badgeText: "text-purple-600", barColor: "bg-purple-500", progress: 90 };
    if (s.includes("complete") || s.includes("live") || s.includes("approved")) 
      return { badgeBg: "bg-green-100", badgeText: "text-green-600", barColor: "bg-green-500", progress: 100 };
      
    return { badgeBg: "bg-gray-100", badgeText: "text-gray-600", barColor: "bg-gray-400", progress: 0 };
  };

  return (
    <div className="bg-white rounded-3xl md:rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden mt-6 md:mt-8">
      
      {/* Header */}
      <div className="px-5 py-4 md:px-8 md:py-6 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-0">
        <h2 className="text-base md:text-lg font-bold text-navy">Project Progress</h2>
        <span className="text-[11px] md:text-xs text-gray-400 font-medium flex items-center">
          <span className="w-2 h-2 rounded-full bg-blue-400 mr-2"></span>
          Data synced: {progressData.lastUpdated}
        </span>
      </div>

      {/* Requirements List */}
      <div className="p-5 md:p-8 space-y-6">
        {isLoading ? (
          <div className="text-center py-6 text-gray-400 text-sm flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading progress...
          </div>
        ) : progressData.requirements.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-[13px] md:text-sm">
            No active requirements to track right now.
          </div>
        ) : (
          progressData.requirements.map((req, index) => {
            const { badgeBg, badgeText, barColor, progress: mappedProgress } = getStageDetails(req.stage);
            const displayProgress = (typeof req.progress === 'number' && req.progress > 0) ? req.progress : mappedProgress;
            
            return (
              <div key={index} className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 border-b border-gray-50 pb-5 md:border-0 md:pb-0 last:border-0 last:pb-0">
                
                {/* Left Side: ID and Title */}
                <div className="w-full md:w-1/3 min-w-0 pr-2">
                  <p className="text-[10px] md:text-[11px] font-bold text-gray-400 uppercase tracking-wider">{req.id}</p>
                  <p className="text-[13px] md:text-sm font-semibold text-navy mt-0.5 truncate">{req.title}</p>
                </div>

                {/* Bottom/Right Group: Badge & Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center w-full md:w-2/3 gap-3 md:gap-5">
                  
                  {/* Status Badge */}
                  <div className="flex-shrink-0 w-full sm:w-36 md:w-40">
                    <span className={`text-[10px] md:text-[11px] font-bold px-3 py-1.5 rounded-md block text-center whitespace-nowrap ${badgeBg} ${badgeText}`}>
                      {req.stage}
                    </span>
                  </div>

                  {/* Progress Bar & Percentage */}
                  <div className="flex-1 flex items-center min-w-0">
                    <div className="w-full bg-gray-100 rounded-full h-2.5 md:h-3 relative overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor}`} 
                        style={{ width: `${displayProgress}%` }}
                      >
                      </div>
                    </div>
                    {/* Percentage Text */}
                    <span className="text-[11px] md:text-[13px] font-bold text-gray-600 ml-3 md:ml-4 w-8 md:w-10 text-right flex-shrink-0">
                      {displayProgress}%
                    </span>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}