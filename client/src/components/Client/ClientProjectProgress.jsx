import { useState, useEffect } from "react";
import { Loader2, MessageSquare } from "lucide-react"; 
import { getAuth, onAuthStateChanged } from "firebase/auth"; 
import { useNavigate } from "react-router-dom";

export default function ClientProjectProgress() {
  const [progressData, setProgressData] = useState({
    requirements: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
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

  const formatUpdatedTime = (rawDate) => {
    if (!rawDate) return "Recently updated";
    try {
      let d = new Date();
      if (typeof rawDate === 'string' || typeof rawDate === 'number') {
        d = new Date(rawDate);
      } else if (rawDate._seconds) {
        d = new Date(rawDate._seconds * 1000); 
      } else if (rawDate.seconds) {
        d = new Date(rawDate.seconds * 1000); 
      }
      
      if (isNaN(d.getTime())) return "Recently updated"; 
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (err) {
      return "Recently updated";
    }
  };

  const getStageDetails = (stage) => {
    const s = stage?.toLowerCase() || "";
    

    if (s === "pending ba review") return { badgeBg: "bg-gray-100", badgeText: "text-gray-600", barColor: "bg-gray-400", progress: 10, displayStage: "Pending BA Review" };
    if (s.includes("analysis")) return { badgeBg: "bg-yellow-100", badgeText: "text-yellow-700", barColor: "bg-yellow-500", progress: 20, displayStage: "Analysis" };
    if (s.includes("clarification")) return { badgeBg: "bg-red-100", badgeText: "text-red-600", barColor: "bg-red-500", progress: 20, displayStage: "Paused: Client Input" };
    if (s.includes("sent to engineering")) return { badgeBg: "bg-blue-100", badgeText: "text-blue-600", barColor: "bg-blue-400", progress: 30, displayStage: "Queued for Dev" };
    if (s.includes("in progress")) return { badgeBg: "bg-blue-100", badgeText: "text-blue-800", barColor: "bg-blue-600", progress: 50, displayStage: "Development" };
    if (s.includes("ready for review")) return { badgeBg: "bg-teal-100", badgeText: "text-teal-700", barColor: "bg-teal-500", progress: 70, displayStage: "Dev Complete" };
    if (s.includes("pending verification") || s.includes("awaiting verification")) return { badgeBg: "bg-purple-100", badgeText: "text-purple-700", barColor: "bg-purple-500", progress: 80, displayStage: "Internal Review" };
    if (s.includes("change requested") || s.includes("modification requested")) return { badgeBg: "bg-orange-100", badgeText: "text-orange-700", barColor: "bg-orange-500", progress: 85, displayStage: "Revising Scope" };
    if (s.includes("uat") || s.includes("pending approval")) return { badgeBg: "bg-indigo-100", badgeText: "text-indigo-700", barColor: "bg-indigo-500", progress: 90, displayStage: "Ready for UAT" };
    if (s.includes("complete") || s.includes("done") || s.includes("approved") || s.includes("live")) return { badgeBg: "bg-green-100", badgeText: "text-green-700", barColor: "bg-green-500", progress: 100, displayStage: "Completed" };
      
    return { badgeBg: "bg-gray-100", badgeText: "text-gray-600", barColor: "bg-gray-400", progress: 0, displayStage: stage || "Unknown" };
  };

  return (
    <div className="bg-white rounded-3xl md:rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden mt-6 md:mt-8">
      
      {/* Header */}
      <div className="px-5 py-4 md:px-8 md:py-6 border-b border-gray-50 flex items-center">
        <h2 className="text-base md:text-lg font-bold text-navy">Project Progress</h2>
      </div>

      {/* Requirements List */}
      <div className="p-5 md:p-8 space-y-6">
        {isLoading ? (
          <div className="text-center py-6 text-gray-400 text-sm flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading progress...
          </div>
        ) : progressData.requirements?.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-[13px] md:text-sm">
            No active requirements to track right now.
          </div>
        ) : (
          progressData.requirements?.map((req, index) => {
            const { badgeBg, badgeText, barColor, progress: mappedProgress, displayStage } = getStageDetails(req.stage || req.status);
            const displayProgress = (typeof req.progress === 'number' && req.progress > 0) ? req.progress : mappedProgress;
            const displayDate = formatUpdatedTime(req.rawDate);
            
            return (
              <div key={index} className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 border-b border-gray-50 pb-5 md:border-0 md:pb-0 last:border-0 last:pb-0">
                
                {/* Left Side: ID, Title, and Timestamp */}
                <div className="w-full md:w-1/3 min-w-0 pr-2">
                  <p className="text-[10px] md:text-[11px] font-bold text-gray-400 uppercase tracking-wider">{req.id || req.reqId}</p>
                  <p className="text-[13px] md:text-sm font-semibold text-navy mt-0.5 truncate">{req.title}</p>
                  <p className="text-[10px] md:text-[11px] text-gray-400 font-medium mt-1">Updated: {displayDate}</p>
                </div>

                {/* Bottom/Right Group: Badge, Bar, Quick Update Button */}
                <div className="flex flex-col sm:flex-row sm:items-center w-full md:w-2/3 gap-3 md:gap-4">
                  
                  {/* Status Badge */}
                  <div className="flex-shrink-0 w-full sm:w-32 md:w-36">
                    <span className={`text-[10px] md:text-[11px] font-bold px-3 py-1.5 rounded-md block text-center whitespace-nowrap ${badgeBg} ${badgeText}`}>
                      {displayStage}
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
                    <span className="text-[11px] md:text-[13px] font-bold text-gray-600 ml-3 w-8 text-right flex-shrink-0">
                      {displayProgress}%
                    </span>
                  </div>

                  {/* Quick Update Button */}
                  <button 
                    onClick={() => navigate('/client/messages', { state: { selectedReqId: req.id || req.reqId } })}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-[#007BFF] bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-lg transition-all whitespace-nowrap flex-shrink-0"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Quick Update
                  </button>

                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}