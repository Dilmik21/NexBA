import { useState, useEffect } from "react";
import BATopBar from "../../components/BA/BATopBar";
import BASidebar from "../../components/BA/BASidebar";
import { useAuth } from "../../contexts/AuthContext";
import { Loader2, Search, CheckCircle2, XCircle, Link as LinkIcon, FileText, AlertTriangle, Clock, ArrowLeft, Download } from "lucide-react";

export default function VerificationQueue() {
  const { currentUser } = useAuth();
  
  const [verifications, setVerifications] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // --- REAL-TIME SILENT POLLING ---
  const fetchVerifications = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/ba/verification?uid=${currentUser.uid}`);
      const json = await res.json();
      
      if (json.success && Array.isArray(json.data)) {
        setVerifications(json.data);
        
        // Safely update selected item without disrupting the BA
        setSelectedItem(prev => {
          if (prev) {
            const updated = json.data.find(v => v.id === prev.id);
            return updated || null; // If it was approved/rejected by another BA, hide it
          }
          if (json.data.length > 0 && !isBackground && window.innerWidth >= 1024) {
            return json.data[0];
          }
          return null;
        });
      }
    } catch (error) {
      console.error("Failed to fetch verification queue:", error);
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.uid) {
      fetchVerifications(false); // First load
      
      // Silent refresh every 5 seconds
      const intervalId = setInterval(() => {
        fetchVerifications(true);
      }, 5000);
      
      return () => clearInterval(intervalId); // Cleanup
    }
  }, [currentUser]);

  const handleApprove = async () => {
    if (!selectedItem) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`http://localhost:5000/api/ba/verification/${selectedItem.reqId}/approve?uid=${currentUser.uid}`, {
        method: 'PUT'
      });
      const json = await res.json();
      
      if (json.success) {
        alert("Evidence Approved! Project moved to Client UAT.");
        const newList = verifications.filter(v => v.id !== selectedItem.id);
        setVerifications(newList);
        setSelectedItem(newList.length > 0 ? newList[0] : null);
        setShowRejectInput(false);
        setRejectReason("");
      } else {
        alert("Failed to approve: " + json.message);
      }
    } catch (error) {
      console.error(error);
      alert("Network Error: Could not reach server.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedItem || !rejectReason.trim()) {
      alert("Please provide a reason for rejection so the developer knows what to fix.");
      return;
    }
    
    setIsProcessing(true);
    try {
      const res = await fetch(`http://localhost:5000/api/ba/verification/${selectedItem.reqId}/reject?uid=${currentUser.uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason })
      });
      const json = await res.json();
      
      if (json.success) {
        alert("Evidence Rejected. Developer has been notified.");
        const newList = verifications.filter(v => v.id !== selectedItem.id);
        setVerifications(newList);
        setSelectedItem(newList.length > 0 ? newList[0] : null);
        setShowRejectInput(false);
        setRejectReason("");
      } else {
        alert("Failed to reject: " + json.message);
      }
    } catch (error) {
      console.error(error);
      alert("Network Error: Could not reach server.");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredItems = verifications.filter(v => 
    (v.title || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
    (v.reqId || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#007BFF]" />
      </div>
    );
  }

  return (
    <>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>

      <div className="h-screen bg-[#F5F7FA] overflow-hidden flex flex-col">
        <BATopBar />

        <div className="flex max-w-[1600px] w-full mx-auto pt-6 px-4 md:px-6 gap-8 pb-6 flex-1 min-h-0">
          
          <div className="hidden lg:block flex-shrink-0 h-full">
            <BASidebar />
          </div>

          <div className="flex-1 flex flex-col min-w-0 h-full">
            
            <div className="mb-6 flex-shrink-0">
              <h1 className="text-[20px] md:text-[24px] font-bold text-navy">Verification Queue</h1>
              <p className="text-[13px] md:text-[15px] text-gray-500 mt-1">Review evidence submitted by developers before sending to the client for UAT.</p>
            </div>

            <div className="flex flex-col lg:flex-row flex-1 min-h-0 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              
              {/* LEFT PANE */}
              <div className={`w-full lg:w-[35%] flex-col bg-[#FAFAFA] border-r border-gray-100 h-full flex-shrink-0 ${selectedItem ? 'hidden lg:flex' : 'flex'}`}>
                <div className="p-5 border-b border-gray-100 bg-white flex-shrink-0">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-navy text-[15px]">Pending Verifications</h3>
                    <span className="bg-yellow-50 text-yellow-600 text-xs font-bold px-2 py-1 rounded-full">{verifications.length}</span>
                  </div>
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search ID or Title..." 
                      className="w-full bg-gray-50 border border-gray-200 text-sm rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-[#007BFF] focus:ring-1 focus:ring-[#007BFF]/20 transition-all"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 bg-[#FAFAFA]">
                  {filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <CheckCircle2 className="w-12 h-12 text-green-400 mb-3 opacity-50" />
                      <p className="font-bold text-gray-500">Queue is Empty</p>
                      <p className="text-xs text-gray-400 mt-1 max-w-[200px]">No developers have submitted evidence for review yet.</p>
                    </div>
                  ) : (
                    filteredItems.map(item => (
                      <div 
                        key={item.id}
                        onClick={() => {
                          setSelectedItem(item);
                          setShowRejectInput(false);
                          setRejectReason("");
                        }}
                        className={`p-4 rounded-2xl cursor-pointer transition-all border relative overflow-hidden ${
                          selectedItem?.id === item.id 
                            ? 'bg-yellow-50/50 border-yellow-400 ring-1 ring-yellow-400/30 shadow-md' 
                            : 'bg-white border-transparent hover:border-gray-200 hover:shadow'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[11px] font-bold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded">{item.reqId}</span>
                          <span className="text-[10px] font-bold text-gray-400 flex items-center"><Clock className="w-3 h-3 mr-1"/> {item.dateStr || "Recently"}</span>
                        </div>
                        <h4 className="font-bold text-navy text-[14px] leading-tight line-clamp-2 mb-2">{item.title}</h4>
                        <p className="text-[11px] font-medium text-gray-500 truncate">Dev: {item.assigneeName}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* RIGHT PANE */}
              <div className={`w-full lg:w-[65%] flex-col h-full bg-white relative min-w-0 ${!selectedItem ? 'hidden lg:flex' : 'flex'}`}>
                
                {!selectedItem ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-[#F8FAFC]">
                    <FileText className="w-16 h-16 mb-4 opacity-30 text-[#007BFF]" />
                    <p className="font-medium text-navy text-lg">Review Developer Submissions</p>
                    <p className="text-sm mt-1 max-w-sm text-center">Select an item from the queue to review evidence, screenshots, and links.</p>
                  </div>
                ) : (
                  <>
                    <div className="p-6 md:p-8 border-b border-gray-100 bg-white flex-shrink-0 z-10">
                      <div className="flex items-center gap-2 mb-3">
                        <button className="lg:hidden p-1.5 mr-1 -ml-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors" onClick={() => setSelectedItem(null)}>
                           <ArrowLeft className="w-5 h-5" />
                        </button>
                        <span className="text-[12px] font-bold text-[#007BFF] bg-blue-50 border border-blue-100 px-2 py-1 rounded-md">{selectedItem.reqId}</span>
                        <span className="text-[11px] font-bold text-gray-500 ml-auto flex items-center bg-gray-50 px-2 py-1 rounded border border-gray-200">
                          <Clock className="w-3.5 h-3.5 mr-1.5"/> Submitted {selectedItem.dateStr}
                        </span>
                      </div>
                      <h2 className="text-[20px] md:text-[24px] font-bold text-navy mb-1">{selectedItem.title}</h2>
                      <p className="text-[13px] text-gray-500 font-medium">Assigned Developer: <strong className="text-navy">{selectedItem.assigneeName}</strong></p>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 bg-[#F8FAFC] space-y-8">
                      
                      {/* SUBMITTED EVIDENCE SECTION */}
                      <div>
                        <h4 className="text-[12px] font-bold text-[#007BFF] uppercase tracking-widest mb-3 flex items-center gap-2">
                           <CheckCircle2 className="w-4 h-4 text-[#007BFF]" /> Developer's Evidence
                        </h4>
                        
                        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
                           
                           {/* Links */}
                           {selectedItem.evidence?.githubLink ? (
                             <div>
                               <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Project / Repository Link</p>
                               <a href={selectedItem.evidence.githubLink} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3.5 bg-blue-50 border border-blue-100 rounded-xl group hover:bg-blue-100 transition-colors">
                                 <div className="flex items-center gap-3 overflow-hidden">
                                   <LinkIcon className="w-4 h-4 text-[#007BFF] flex-shrink-0" />
                                   <span className="text-[14px] font-semibold text-[#007BFF] truncate group-hover:underline">{selectedItem.evidence.githubLink}</span>
                                 </div>
                               </a>
                             </div>
                           ) : (
                             <div>
                               <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Project Link</p>
                               <p className="text-[13px] text-gray-500 italic bg-gray-50 p-3 rounded-xl border border-dashed border-gray-200">No link provided by developer.</p>
                             </div>
                           )}

                           {/* Notes */}
                           <div>
                             <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Developer Notes</p>
                             <div className="bg-[#FAFAFA] p-4 rounded-xl border border-gray-100 text-[13px] text-navy leading-relaxed whitespace-pre-wrap">
                               {selectedItem.evidence?.notes || <span className="italic text-gray-400">No additional notes provided.</span>}
                             </div>
                           </div>

                           {/* Uploaded Files / Visual Proof */}
                           <div>
                             <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Visual Proof / Attachments</p>
                             {selectedItem.evidence?.files && selectedItem.evidence.files.length > 0 ? (
                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                 {selectedItem.evidence.files.map((file, idx) => (
                                   <a key={idx} href={file.base64 || file.url || '#'} download={file.name} target="_blank" rel="noreferrer" className="flex items-center p-3 bg-white border border-gray-200 rounded-xl hover:border-[#007BFF] transition-colors group shadow-sm">
                                     <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mr-3 flex-shrink-0">
                                       <FileText className="w-5 h-5 text-[#007BFF]" />
                                     </div>
                                     <div className="flex-1 min-w-0 pr-2">
                                       <p className="text-[13px] font-semibold text-navy truncate group-hover:text-[#007BFF]">{file.name}</p>
                                       <p className="text-[10px] text-gray-400 uppercase">{file.type?.split('/')[1] || 'FILE'}</p>
                                     </div>
                                     <Download className="w-4 h-4 text-gray-300 group-hover:text-[#007BFF] flex-shrink-0" />
                                   </a>
                                 ))}
                               </div>
                             ) : (
                               <p className="text-[13px] text-gray-500 italic bg-gray-50 p-3 rounded-xl border border-dashed border-gray-200">No visual proof or files were attached.</p>
                             )}
                           </div>
                        </div>
                      </div>

                      {/* ORIGINAL SPECIFICATION REFERENCE */}
                      <div>
                        <h4 className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                           <FileText className="w-4 h-4 text-gray-400" /> Original Requirement Context
                        </h4>
                        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                           <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-wrap">
                             {selectedItem.specification || "No context found."}
                           </p>
                        </div>
                      </div>

                    </div>

                    {/* ACTION FOOTER */}
                    <div className="p-5 md:p-6 bg-white border-t border-gray-100 flex flex-col gap-3 flex-shrink-0 z-10 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.05)]">
                      
                      {showRejectInput && (
                        <div className="mb-2 animate-in slide-in-from-bottom-2">
                          <label className="text-[12px] font-bold text-red-600 block mb-2">Reason for Rejection *</label>
                          <textarea 
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Explain exactly what the developer needs to fix or add..." 
                            className="w-full p-4 bg-red-50 border border-red-200 rounded-xl text-[14px] text-red-900 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all h-24 resize-none placeholder-red-300"
                            autoFocus
                          />
                        </div>
                      )}

                      <div className="flex justify-end gap-3 w-full">
                        {!showRejectInput ? (
                          <button 
                            type="button"
                            onClick={() => setShowRejectInput(true)}
                            disabled={isProcessing}
                            className="px-6 py-3.5 rounded-xl border border-red-200 text-red-600 text-[14px] font-bold bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50 flex items-center gap-2 mr-auto" 
                          >
                            <XCircle className="w-4 h-4" /> Reject Evidence
                          </button>
                        ) : (
                          <div className="flex w-full justify-between items-center gap-2">
                            <button 
                              type="button"
                              onClick={() => { setShowRejectInput(false); setRejectReason(""); }}
                              className="px-5 py-3 rounded-xl text-gray-500 font-bold hover:bg-gray-100 text-[13px] transition-colors"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={handleReject}
                              disabled={isProcessing || !rejectReason.trim()}
                              className="px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[14px] font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2" 
                            >
                              {isProcessing ? <><Loader2 className="w-4 h-4 animate-spin" /> Rejecting...</> : 'Confirm Rejection'}
                            </button>
                          </div>
                        )}

                        {!showRejectInput && (
                          <button 
                            onClick={handleApprove}
                            disabled={isProcessing}
                            className="px-8 py-3.5 rounded-xl bg-[#10B981] hover:bg-[#059669] flex items-center justify-center text-white text-[14px] font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50 gap-2" 
                          >
                            {isProcessing ? <><Loader2 className="w-4 h-4 animate-spin" /> Approving...</> : <><CheckCircle2 className="w-5 h-5" /> Approve & Move to UAT</>}
                          </button>
                        )}
                      </div>
                    </div>

                  </>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}