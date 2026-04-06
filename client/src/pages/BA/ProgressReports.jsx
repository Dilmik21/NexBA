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
        setData(json.data);
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

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <BATopBar />

      <div className="flex max-w-[1600px] mx-auto pt-6 px-4 md:px-6 gap-8 pb-10">
        <div className="hidden lg:block flex-shrink-0">
          <BASidebar />
        </div>

        <div className="flex-1 flex flex-col h-full">
          
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-[22px] font-bold text-navy">Progress & Reports</h1>
              <p className="text-sm text-gray-500 mt-1">Manage client-visible progress and export reports.</p>
            </div>

            <button 
              onClick={handleExportPDF}
              disabled={isExporting || isLoading}
              className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-navy font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50 hover:border-gray-300"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Download className="w-4 h-4 text-primary" />} 
              {isExporting ? "Generating PDF..." : "Export PDF"}
            </button>
          </div>

          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
               <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
               <p className="font-bold text-navy">Compiling Report Data...</p>
            </div>
          ) : (
            <div id="report-content" className="space-y-6 bg-[#F5F7FA] p-2">
              
              {/* KPI CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-[11px] font-bold text-gray-400 mb-2 uppercase tracking-wider">Requirements Processed</h3>
                  <div className="text-3xl font-black text-navy">{data.stats.reqs}</div>
                  <div className="mt-2 flex items-center">
                     <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5"></span>
                     <span className="text-[11px] font-bold text-gray-400 uppercase">This Week</span>
                  </div>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-[11px] font-bold text-gray-400 mb-2 uppercase tracking-wider">Tasks Assigned</h3>
                  <div className="text-3xl font-black text-navy">{data.stats.tasks}</div>
                  <div className="mt-2 flex items-center">
                     <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-1.5"></span>
                     <span className="text-[11px] font-bold text-gray-400 uppercase">This Week</span>
                  </div>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-[11px] font-bold text-gray-400 mb-2 uppercase tracking-wider">Verifications Completed</h3>
                  <div className="text-3xl font-black text-navy">{data.stats.verifications}</div>
                  <div className="mt-2 flex items-center">
                     <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                     <span className="text-[11px] font-bold text-gray-400 uppercase">This Week</span>
                  </div>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-[11px] font-bold text-gray-400 mb-2 uppercase tracking-wider">Change Requests Reviewed</h3>
                  <div className="text-3xl font-black text-navy">{data.stats.changes}</div>
                  <div className="mt-2 flex items-center">
                     <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mr-1.5"></span>
                     <span className="text-[11px] font-bold text-gray-400 uppercase">This Week</span>
                  </div>
                </div>
              </div>

              {/* TIMELINE SECTION */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                  <h2 className="text-[16px] font-extrabold text-navy">Project Progress Timeline</h2>
                </div>
                
                <div className="px-6 py-2">
                  {data.timeline.length === 0 ? (
                     <div className="text-center py-10 text-sm text-gray-400 italic">No active projects found to report.</div>
                  ) : (
                    data.timeline.map((item, index) => (
                      
                      <div key={index} className="flex items-center justify-between py-5 border-b border-gray-100 last:border-0">
                        
                        <div className="w-[30%] pr-4 block">
                           <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1" style={{ display: 'block' }}>
                             {item.reqId}
                           </div>
                           <div className="text-[14px] font-bold text-navy leading-tight whitespace-normal break-words" style={{ display: 'block' }}>
                             {item.title}
                           </div>
                        </div>

                        <div className="w-[20%] flex justify-start pl-2">
                           <span className={`px-3 py-1.5 text-[11px] font-bold rounded-lg whitespace-nowrap ${item.badgeClass}`}>
                             {item.stage}
                           </span>
                        </div>

                        <div className="w-[50%] pl-6 pr-2">
                           <div className="h-5 w-full bg-gray-100 rounded-full relative overflow-hidden shadow-inner">
                              <div 
                                className={`h-full transition-all duration-1000 ease-out flex items-center justify-end pr-2.5 rounded-full ${item.colorClass}`}
                                style={{ width: `${item.progress}%` }}
                              >
                                 <span className="text-[10px] font-bold text-white drop-shadow-md tracking-wider">
                                   {item.progress}%
                                 </span>
                              </div>
                           </div>
                        </div>

                      </div>

                    ))
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