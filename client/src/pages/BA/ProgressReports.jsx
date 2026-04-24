import { useState, useEffect } from "react";
import BATopBar from "../../components/BA/BATopBar";
import BASidebar from "../../components/BA/BASidebar";
import { useAuth } from "../../contexts/AuthContext";
import { Download, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export default function ProgressReports() {
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [data, setData] = useState({
    stats: { reqs: 0, tasks: 0, verifications: 0, changes: 0 },
    timeline: []
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
          timeline: json.data.timeline || []
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

  // NEW: Exact logic from the Client side to color-code the stages!
  const getStageStyle = (stage) => {
    const s = stage?.toLowerCase() || "";
    if (s === "pending ba review") return "bg-gray-100 text-gray-600 border border-gray-200";
    if (s.includes("analysis")) return "bg-yellow-50 text-yellow-700 border border-yellow-200";
    if (s.includes("clarification")) return "bg-red-50 text-red-600 border border-red-200";
    if (s.includes("sent to engineering")) return "bg-blue-50 text-blue-500 border border-blue-200";
    if (s.includes("in progress")) return "bg-blue-100 text-blue-700 border border-blue-300";
    if (s.includes("ready for review")) return "bg-teal-50 text-teal-700 border border-teal-200";
    if (s.includes("pending verification") || s.includes("awaiting verification")) return "bg-purple-50 text-purple-700 border border-purple-200";
    if (s.includes("change requested") || s.includes("modification requested")) return "bg-orange-50 text-orange-600 border border-orange-200";
    if (s.includes("uat") || s.includes("pending approval")) return "bg-indigo-50 text-indigo-600 border border-indigo-200";
    if (s.includes("complete") || s.includes("done") || s.includes("approved") || s.includes("live")) return "bg-green-50 text-green-700 border border-green-200";
    return "bg-gray-50 text-gray-500 border border-gray-200";
  };

  return (
    /* THE FIX: Changed to min-h-screen to allow the entire window to scroll externally */
    <div className="min-h-screen bg-[#F5F7FA]">
      <BATopBar />

      <div className="flex max-w-[1600px] w-full mx-auto pt-6 px-4 md:px-6 gap-8 pb-10">
        
        <div className="hidden lg:block w-[260px] flex-shrink-0">
          {/* THE FIX: Added a sticky wrapper so the sidebar follows you down the page */}
          <div className="sticky top-24 h-[calc(100vh-120px)]">
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
            <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
               <Loader2 className="w-10 h-10 animate-spin text-[#007BFF] mb-4" />
               <p className="font-bold text-navy">Compiling Report Data...</p>
            </div>
          ) : (
            <div id="report-content" className="space-y-6 bg-[#F5F7FA] p-2">
              
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

              {/* NEW: Replaced the percentage bars with the clean Client-style Status Tracker Table! */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                  <h2 className="text-[16px] font-extrabold text-navy">Project Status Tracking</h2>
                </div>
                
                {data.timeline.length === 0 ? (
                    <div className="text-center py-10 text-sm text-gray-400 italic">No active projects found to report.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-white border-b border-gray-100">
                        <tr>
                          <th className="py-5 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest w-[15%]">Project ID</th>
                          <th className="py-5 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest w-[35%]">Title</th>
                          <th className="py-5 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest w-[25%]">Client Name</th>
                          <th className="py-5 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest w-[25%]">Current Stage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {data.timeline.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-5 px-6 text-xs font-bold text-[#007BFF] tracking-wider">{item.reqId}</td>
                            <td className="py-5 px-6 font-bold text-navy truncate max-w-xs">{item.title}</td>
                            <td className="py-5 px-6 text-sm text-gray-500">{item.clientName}</td>
                            <td className="py-5 px-6">
                              <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap shadow-sm ${getStageStyle(item.stage)}`}>
                                {item.stage}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}