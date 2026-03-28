import { useState, useEffect } from "react";
import BATopBar from "../../components/BA/BATopBar";
import BASidebar from "../../components/BA/BASidebar";
import { useAuth } from "../../contexts/AuthContext";
import { Check, X, Loader2, Image as ImageIcon, Video, ExternalLink } from "lucide-react";

export default function VerificationQueue() {
  const { currentUser } = useAuth();
  
  const [verifications, setVerifications] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Fetch data when component loads
  useEffect(() => {
    if (currentUser?.uid) {
      fetchVerifications();
    }
  }, [currentUser]);

  const fetchVerifications = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/ba/verification?uid=${currentUser.uid}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setVerifications(json.data);
        if (json.data.length > 0) {
          setSelectedTask(json.data[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch verification queue:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedTask || !currentUser?.uid) return;
    setIsProcessing(true);
    
    try {
      const res = await fetch(`http://localhost:5000/api/ba/verification/${selectedTask.taskId}/approve?uid=${currentUser.uid}`, {
        method: "POST"
      });
      const json = await res.json();
      
      if (json.success) {
        // Remove the approved task from the list
        const updatedList = verifications.filter(v => v.taskId !== selectedTask.taskId);
        setVerifications(updatedList);
        setSelectedTask(updatedList.length > 0 ? updatedList[0] : null);
        setIsRejecting(false);
      }
    } catch (error) {
      console.error("Approval failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!selectedTask || !currentUser?.uid || !rejectReason.trim()) return;
    setIsProcessing(true);
    
    try {
      const res = await fetch(`http://localhost:5000/api/ba/verification/${selectedTask.taskId}/reject?uid=${currentUser.uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason })
      });
      const json = await res.json();
      
      if (json.success) {
        // Remove the rejected task from the list (it goes back to developer)
        const updatedList = verifications.filter(v => v.taskId !== selectedTask.taskId);
        setVerifications(updatedList);
        setSelectedTask(updatedList.length > 0 ? updatedList[0] : null);
        setIsRejecting(false);
        setRejectReason("");
      }
    } catch (error) {
      console.error("Rejection failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <BATopBar />

      <div className="flex max-w-[1600px] mx-auto pt-6 px-4 md:px-6 gap-8">
        <div className="hidden lg:block flex-shrink-0">
          <BASidebar />
        </div>

        <div className="flex-1 pb-10 flex flex-col h-full lg:h-[calc(100vh-100px)]">
          
          {/* Header Section */}
          <div className="mb-6 flex-shrink-0">
            <h1 className="text-[22px] font-bold text-navy">Verification Queue</h1>
            <p className="text-sm text-gray-500 mt-1">Review developer evidence against requirement specifications.</p>
          </div>

          <div className="flex flex-col lg:flex-row flex-1 lg:min-h-0 gap-6">
            
            {/* LEFT LIST: Pending Verifications */}
            <div className="w-full lg:w-1/3 flex flex-col h-[400px] lg:h-full">
              <div className="bg-transparent mb-3 px-1">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                  Pending Review ({verifications.length})
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 pb-20">
                {isLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : verifications.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
                     <Check className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                     <p className="text-sm text-gray-400 font-medium">No tasks waiting for verification.</p>
                  </div>
                ) : (
                  verifications.map((v) => (
                    <div 
                      key={v.taskId} 
                      onClick={() => { setSelectedTask(v); setIsRejecting(false); setRejectReason(""); }}
                      className={`p-5 rounded-2xl cursor-pointer transition-all border shadow-sm ${
                        selectedTask?.taskId === v.taskId 
                          ? 'bg-purple-50/30 border-primary ring-1 ring-primary/50' 
                          : 'bg-white border-transparent hover:border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center">
                           <div className={`w-3 h-3 rounded-full mr-2 ${selectedTask?.taskId === v.taskId ? 'bg-purple-500' : 'bg-gray-300'}`}></div>
                           <span className="text-[11px] font-bold text-gray-400">{v.taskId}</span>
                        </div>
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-600">
                          Needs Review
                        </span>
                      </div>
                      <h4 className="font-bold text-navy text-[14px] leading-snug mb-3 truncate">{v.title}</h4>
                      <div className="flex items-center text-[11px] text-gray-400 font-medium">
                         <span className="truncate">{v.assigneeName}</span>
                         <span className="mx-2">•</span>
                         <span>{v.dateStr}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* RIGHT DETAILS: Task Review Panel */}
            <div className="w-full lg:w-2/3 bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col relative">
              {selectedTask ? (
                <div className="flex-1 overflow-y-auto p-8 lg:p-10 pb-32">
                  
                  {/* Task Header */}
                  <div className="mb-2">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{selectedTask.taskId}</span>
                  </div>
                  <h2 className="text-xl font-bold text-navy mb-2">{selectedTask.title}</h2>
                  <p className="text-[12px] text-gray-500 font-medium mb-10 pb-6 border-b border-gray-50">
                    Evidence from {selectedTask.assigneeName} <span className="mx-2">•</span> {selectedTask.dateStr}
                  </p>

                  <div className="flex flex-col md:flex-row gap-8">
                     
                     {/* Specification (Left Column) */}
                     <div className="flex-1">
                        <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Requirement Specification</h4>
                        <div className="bg-[#F8FAFC] border border-gray-100 rounded-2xl p-6">
                           <p className="text-[14px] text-gray-600 leading-[1.8] whitespace-pre-wrap">
                             {selectedTask.specification}
                           </p>
                        </div>
                     </div>

                     {/* Evidence (Right Column) */}
                     <div className="flex-1">
                        <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Developer Evidence</h4>
                        
                        {/* Media Box */}
                        <div className="bg-[#F8FAFC] border border-gray-100 rounded-2xl p-4 mb-5 min-h-[200px] flex flex-col items-center justify-center text-center">
                           {selectedTask.evidence?.images?.length > 0 ? (
                             <img 
                               src={selectedTask.evidence.images[0]} 
                               alt="Evidence" 
                               className="w-full rounded-lg object-contain max-h-[300px]" 
                             />
                           ) : selectedTask.evidence?.video ? (
                             <div className="text-gray-400 flex flex-col items-center">
                               <Video className="w-10 h-10 mb-2 opacity-50" />
                               <span className="text-xs font-bold">Video Evidence Attached</span>
                             </div>
                           ) : (
                             <div className="text-gray-300 flex flex-col items-center">
                               <ImageIcon className="w-12 h-12 mb-3 opacity-50" />
                               <span className="text-xs font-medium">No media uploaded</span>
                             </div>
                           )}
                           
                           {selectedTask.evidence?.images?.length > 0 && (
                             <p className="text-[10px] text-gray-400 mt-3">
                               {selectedTask.evidence.images.length > 1 ? `1 of ${selectedTask.evidence.images.length} images` : "evidence-final.png"}
                             </p>
                           )}
                        </div>

                        {/* GitHub Link */}
                        <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Commit Link</h4>
                        {selectedTask.evidence?.githubLink ? (
                           <a 
                             href={selectedTask.evidence.githubLink} 
                             target="_blank" 
                             rel="noopener noreferrer" 
                             className="flex items-center text-[13px] font-bold text-primary hover:underline truncate"
                           >
                             <ExternalLink className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                             <span className="truncate">{selectedTask.evidence.githubLink.replace('https://', '')}</span>
                           </a>
                        ) : (
                           <p className="text-[13px] text-gray-400 italic">No link provided</p>
                        )}
                     </div>

                  </div>

                  {/* Rejection Form (Reveals when Reject is clicked) */}
                  {isRejecting && (
                    <div className="mt-10 border-t border-gray-100 pt-8 animate-in fade-in slide-in-from-bottom-4">
                       <h5 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">Rejection Reason</h5>
                       <textarea 
                         className="w-full border border-red-200 rounded-2xl p-5 text-[14px] text-navy outline-none focus:ring-2 focus:ring-red-100 bg-red-50/30 mb-6 h-32 resize-none shadow-inner" 
                         placeholder="Explain why this evidence does not meet the specification..." 
                         value={rejectReason} 
                         onChange={e => setRejectReason(e.target.value)} 
                       />
                    </div>
                  )}

                  {/* BOTTOM ACTION BUTTONS */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-gray-50 flex justify-end gap-5 items-center">
                    
                    {isRejecting ? (
                       <>
                         <button 
                           className="px-6 py-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 text-[13px] font-bold transition-colors" 
                           onClick={() => { setIsRejecting(false); setRejectReason(""); }}
                           disabled={isProcessing}
                         >
                           Cancel
                         </button>
                         <button 
                           className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100" 
                           onClick={handleConfirmReject} 
                           disabled={isProcessing || !rejectReason.trim()}
                         >
                           {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <X size={26} strokeWidth={3} />}
                         </button>
                       </>
                    ) : (
                       <>
                         <button 
                           className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105 disabled:opacity-50" 
                           onClick={() => setIsRejecting(true)}
                           disabled={isProcessing}
                         >
                           <X size={26} strokeWidth={3} />
                         </button>
                         <button 
                           className="w-14 h-14 rounded-full bg-[#10B981] hover:bg-[#059669] flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105 disabled:opacity-50" 
                           onClick={handleApprove}
                           disabled={isProcessing}
                         >
                           {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Check size={26} strokeWidth={3} />}
                         </button>
                       </>
                    )}

                  </div>

                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                   <Check className="w-12 h-12 mb-4 opacity-30" />
                   <p className="font-medium">Select a task from the queue to verify</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}