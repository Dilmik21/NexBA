import { useState, useEffect } from "react";
import BATopBar from "../../components/BA/BATopBar";
import BASidebar from "../../components/BA/BASidebar";
import { useAuth } from "../../contexts/AuthContext";
import { Download, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export default function ProgressReports() {
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const navigate = useNavigate();
  
  const [data, setData] = useState({
    stats: { reqs: 0, tasks: 0, verifications: 0, changes: 0 },
    clientTimeline: [] // THE FIX: Uses the unfiltered array!
  });

  useEffect(() => {
    if (currentUser?.uid) fetchProgressData();
  }, [currentUser]);

  const fetchProgressData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/ba/progress?uid=${currentUser.uid}`);
      const json = await res.json();
      
      if (json.success) {
        setData({
          stats: json.data.stats || { reqs: 0, tasks: 0, verifications: 0, changes: 0 },
          clientTimeline: json.data.clientTimeline || []
        });
      }
    } catch (error) {
      console.error("Failed to fetch progress data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const element = document.getElementById("report-content");
      if (!element) return;

      window.scrollTo(0, 0);
      await new Promise((resolve) => setTimeout(resolve, 500));

      const canvas = await html2canvas(element, { 
        scale: 3, 
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: 1200, 
        logging: false
      });
      
      const imgData = canvas.toDataURL("image/jpeg", 1.0); 
      const pdf = new jsPDF("p", "mm", "a4");
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const margin = 10;
      const printWidth = pdfWidth - (margin * 2);
      const printHeight = (canvas.height * printWidth) / canvas.width;

      pdf.addImage(imgData, "JPEG", margin, margin, printWidth, printHeight);
      pdf.save(`NexBA_Progress_Report_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (error) {
      console.error("Failed to export PDF:", error);
    } finally {
      setIsExporting(false);
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
    
    if (s === "pending ba review") return { badgeBg: "bg-gray-100", badgeText: "text-gray-600", barColor: "bg-gray-400", fallbackProgress: 10, displayStage: "Pending BA Review" };
    if (s.includes("analysis")) return { badgeBg: "bg-yellow-100", badgeText: "text-yellow-700", barColor: "bg-yellow-500", fallbackProgress: 20, displayStage: "Analysis" };
    if (s.includes("clarification")) return { badgeBg: "bg-red-100", badgeText: "text-red-600", barColor: "bg-red-500", fallbackProgress: 20, displayStage: "Paused: Client Input" };
    if (s.includes("sent to engineering")) return { badgeBg: "bg-blue-100", badgeText: "text-blue-600", barColor: "bg-blue-400", fallbackProgress: 30, displayStage: "Queued for Dev" };
    if (s.includes("in progress")) return { badgeBg: "bg-blue-100", badgeText: "text-blue-800", barColor: "bg-blue-600", fallbackProgress: 50, displayStage: "Development" };
    if (s.includes("ready for review")) return { badgeBg: "bg-teal-100", badgeText: "text-teal-700", barColor: "bg-teal-500", fallbackProgress: 70, displayStage: "Dev Complete" };
    if (s.includes("pending verification") || s.includes("awaiting verification")) return { badgeBg: "bg-purple-100", badgeText: "text-purple-700", barColor: "bg-purple-500", fallbackProgress: 80, displayStage: "Internal Review" };
    if (s.includes("change requested") || s.includes("modification requested")) return { badgeBg: "bg-orange-100", badgeText: "text-orange-700", barColor: "bg-orange-500", fallbackProgress: 85, displayStage: "Revising Scope" };
    if (s.includes("uat") || s.includes("pending approval")) return { badgeBg: "bg-indigo-100", badgeText: "text-indigo-700", barColor: "bg-indigo-500", fallbackProgress: 90, displayStage: "Ready for UAT" };
    if (s.includes("complete") || s.includes("done") || s.includes("approved") || s.includes("live")) return { badgeBg: "bg-green-100", badgeText: "text-green-700", barColor: "bg-green-500", fallbackProgress: 100, displayStage: "Completed" };
      
    return { badgeBg: "bg-gray-100", badgeText: "text-gray-600", barColor: "bg-gray-400", fallbackProgress: 0, displayStage: stage || "Unknown" };
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <BATopBar />

      <div className="flex max-w-[1600px] w-full mx-auto pt-6 px-4 md:px-6 gap-8 pb-10">
        
        <div className="hidden lg:block w-[260px] flex-shrink-0">
          <div className="sticky top-6">
             <BASidebar />
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 flex-shrink-0 mt-2">
            <div>
              <h1 className="text-[20px] md:text-[24px] font-bold text-navy">Progress & Reports</h1>
              <p className="text-[13px] md:text-[15px] text-gray-500 mt-1">Manage client-visible progress and export reports.</p>
            </div>

            <button 
              onClick={handleExportPDF}
              disabled={isExporting || isLoading}
              className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-navy font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50 hover:border-gray-300"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin text-[#007BFF]" /> : <Download className="w-4 h-4 text-[#007BFF]" />} 
              {isExporting ? "Generating PDF..." : "Export PDF"}
            </button>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
               <Loader2 className="w-10 h-10 animate-spin text-[#007BFF] mb-4" />
               <p className="font-bold text-navy">Compiling Report Data...</p>
            </div>
          ) : (
            <div id="report-content" className="space-y-6">
              
              {/* KPI CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-[11px] font-bold text-gray-400 mb-2 uppercase tracking-wider">Requirements Processed</h3>
                  <div className="text-3xl font-black text-navy">{data.stats?.reqs || 0}</div>
                  <div className="mt-2 flex items-center">
                     <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5"></span>
                     <span className="text-[11px] font-bold text-gray-400 uppercase">This Week</span>
                  </div>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-[11px] font-bold text-gray-400 mb-2 uppercase tracking-wider">Tasks Assigned</h3>
                  <div className="text-3xl font-black text-navy">{data.stats?.tasks || 0}</div>
                  <div className="mt-2 flex items-center">
                     <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-1.5"></span>
                     <span className="text-[11px] font-bold text-gray-400 uppercase">This Week</span>
                  </div>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-[11px] font-bold text-gray-400 mb-2 uppercase tracking-wider">Verifications Pending</h3>
                  <div className="text-3xl font-black text-navy">{data.stats?.verifications || 0}</div>
                  <div className="mt-2 flex items-center">
                     <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                     <span className="text-[11px] font-bold text-gray-400 uppercase">Current</span>
                  </div>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-[11px] font-bold text-gray-400 mb-2 uppercase tracking-wider">Change Requests</h3>
                  <div className="text-3xl font-black text-navy">{data.stats?.changes || 0}</div>
                  <div className="mt-2 flex items-center">
                     <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mr-1.5"></span>
                     <span className="text-[11px] font-bold text-gray-400 uppercase">Pending Review</span>
                  </div>
                </div>
              </div>

              {/* CLIENT-STYLE PROGRESS BARS SECTION */}
              <div className="bg-white rounded-3xl md:rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden mt-6 md:mt-8">
                
                <div className="px-5 py-4 md:px-8 md:py-6 border-b border-gray-50 flex items-center">
                  <h2 className="text-base md:text-lg font-bold text-navy">Project Progress Timeline</h2>
                </div>
                
                <div className="p-5 md:p-8 space-y-6">
                  {data.clientTimeline.length === 0 ? (
                      <div className="text-center py-6 text-gray-400 text-[13px] md:text-sm">No active projects found to report.</div>
                  ) : (
                    data.clientTimeline.map((req, index) => {
                      const { badgeBg, badgeText, barColor, fallbackProgress, displayStage } = getStageDetails(req.clientStage);
                      const displayProgress = fallbackProgress; 
                      const displayDate = formatUpdatedTime(req.rawDate);
                      
                      return (
                        <div key={index} className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 border-b border-gray-50 pb-6 md:border-0 md:pb-0 last:border-0 last:pb-0">
                          
                          <div className="w-full md:w-1/3 min-w-0 pr-2">
                            <p className="text-[10px] md:text-[11px] font-bold text-gray-400 uppercase tracking-wider">{req.reqId}</p>
                            <p className="text-[13px] md:text-sm font-semibold text-navy mt-0.5 truncate">{req.title}</p>
                            <p className="text-[10px] md:text-[11px] text-gray-400 font-medium mt-1">Client: {req.clientName} • Updated: {displayDate}</p>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center w-full md:w-2/3 gap-3 md:gap-4">
                            
                            <div className="flex-shrink-0 w-full sm:w-32 md:w-36">
                              <span className={`text-[10px] md:text-[11px] font-bold px-3 py-1.5 rounded-md block text-center whitespace-nowrap shadow-sm ${badgeBg} ${badgeText}`}>
                                {displayStage}
                              </span>
                            </div>

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

                            

                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}