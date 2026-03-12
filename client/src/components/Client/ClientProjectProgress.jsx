import { useState, useEffect } from "react";

export default function ClientProjectProgress() {
  const [progressData, setProgressData] = useState({
    lastUpdated: "Loading...",
    requirements: []
  });

  // Fetch the data from your Node.js backend
  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/client/project-progress");
        const result = await response.json();
        if (result.success) {
          setProgressData(result.data);
        }
      } catch (error) {
        console.error("Failed to load project progress:", error);
      }
    };
    fetchProgress();
  }, []);

  // Helper function to match the exact colors from your UI design
  const getStageStyles = (stage) => {
    switch (stage) {
      case "Development":
        return { badgeBg: "bg-blue-100", badgeText: "text-blue-600", barColor: "bg-blue-600" };
      case "UAT":
        return { badgeBg: "bg-purple-100", badgeText: "text-purple-600", barColor: "bg-green-600" };
      
      // REVERTED: Now the standard is 'Pending BA Review'. Keeping old ones as fallbacks.
      case "Pending BA Review":
      case "Analysis":
      case "In Analysis":
        return { badgeBg: "bg-orange-100", badgeText: "text-orange-600", barColor: "bg-orange-400" };
      
      default:
        return { badgeBg: "bg-gray-100", badgeText: "text-gray-600", barColor: "bg-gray-500" };
    }
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden mt-8">
      
      {/* Header */}
      <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center">
        <h2 className="text-lg font-bold text-navy">Project Progress</h2>
        <span className="text-xs text-gray-400 font-medium">Last updated by BA: {progressData.lastUpdated}</span>
      </div>

      {/* Requirements List */}
      <div className="p-8 space-y-6">
        {progressData.requirements.map((req, index) => {
          const styles = getStageStyles(req.stage);
          
          return (
            <div key={index} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              {/* Left Side: ID and Title */}
              <div className="w-full md:w-1/3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{req.id}</p>
                <p className="text-sm font-semibold text-navy mt-0.5 truncate">{req.title}</p>
              </div>

              {/* Middle: Stage Badge */}
              <div className="w-28 flex-shrink-0">
                <span className={`text-[10px] font-bold px-3 py-1 rounded w-full block text-center ${styles.badgeBg} ${styles.badgeText}`}>
                  {/* REVERTED: Force the UI to always display "Pending BA Review" for old test data */}
                  {req.stage === "Analysis" || req.stage === "In Analysis" ? "Pending BA Review" : req.stage}
                </span>
              </div>

              {/* Right Side: Progress Bar */}
              <div className="w-full md:w-1/2 flex items-center">
                <div className="w-full bg-gray-100 rounded-full h-3 relative overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${styles.barColor}`} 
                    style={{ width: `${req.progress}%` }}
                  ></div>
                </div>
                {/* Percentage Text */}
                <span className="text-xs font-bold text-gray-500 ml-4 w-10 text-right">
                  {req.progress} %
                </span>
              </div>

            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="px-8 py-4 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          Progress is updated by your Business Analyst. Contact them for real-time status.
        </p>
      </div>

    </div>
  );
}