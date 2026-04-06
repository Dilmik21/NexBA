import { useState, useEffect, useRef } from "react";
import ClientTopBar from "../../components/Client/ClientTopBar";
import ClientSidebar from "../../components/Client/ClientSidebar";
import { useAuth } from "../../contexts/AuthContext";
import { Loader2, CheckCircle2, AlertTriangle, FileText, Search, Link as LinkIcon, ExternalLink, ChevronDown, X, Bug, Maximize } from "lucide-react";

export default function ClientApprovals() {
  const { currentUser } = useAuth();
  
  const [approvals, setApprovals] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const [changeType, setChangeType] = useState("Scope Change");
  const [changeDescription, setChangeDescription] = useState("");
  const [isSubmittingChange, setIsSubmittingChange] = useState(false);

  const fetchApprovals = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/client/approvals?uid=${currentUser.uid}`);
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setApprovals(data.data);
        
        setSelectedItem(prevSelected => {
          if (!prevSelected && data.data.length > 0) return data.data[0];
          if (prevSelected) {
            const updated = data.data.find(r => r.reqId === prevSelected.reqId);
            return updated || null; 
          }
          return null;
        });
      }
    } catch (error) {
      console.error("Error fetching approvals:", error);
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.uid) {
      fetchApprovals(false); 
      
      const intervalId = setInterval(() => {
        fetchApprovals(true); 
      }, 5000);
      
      return () => clearInterval(intervalId); 
    }
  }, [currentUser]);

  const handleApprove = async () => {
    if (!selectedItem || isSubmittingApproval || !currentUser?.uid) return;
    setIsSubmittingApproval(true);

    try {
      const response = await fetch(`http://localhost:5000/api/client/approvals/${selectedItem.reqId}/approve?uid=${currentUser.uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      
      const data = await response.json();
      if (data.success) {
        const updatedList = approvals.filter(r => r.reqId !== selectedItem.reqId);
        setApprovals(updatedList);
        setSelectedItem(updatedList.length > 0 ? updatedList[0] : null);
      } else {
        alert("Failed to approve. " + data.message);
      }
    } catch (error) {
      console.error("Error submitting approval:", error);
      alert("Network Error: Could not reach the server.");
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const handleSubmitChangeRequest = async () => {
    if (!selectedItem || !currentUser?.uid || !changeDescription.trim()) return;
    setIsSubmittingChange(true);

    try {
      const response = await fetch(`http://localhost:5000/api/client/approvals/${selectedItem.reqId}/request-change?uid=${currentUser.uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          changeType: changeType,
          changeDescription: changeDescription
        })
      });
      
      const data = await response.json();
      if (data.success) {
        const updatedList = approvals.map(r => r.reqId === selectedItem.reqId ? { ...r, status: 'Change Requested' } : r);
        setApprovals(updatedList);
        setSelectedItem({ ...selectedItem, status: 'Change Requested' });
        
        setIsModalOpen(false);
        setChangeDescription("");
        setChangeType("Scope Change");
      } else {
        alert("Failed to request changes. " + data.message);
      }
    } catch (error) {
      console.error("Error submitting change request:", error);
      alert("Network Error: Could not reach the server.");
    } finally {
      setIsSubmittingChange(false);
    }
  };

  const filteredItems = approvals.filter(r => 
    (r.title || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
    (r.reqId || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>

      <div className="h-screen bg-[#F5F7FA] overflow-hidden flex flex-col">
        <ClientTopBar />

        <div className="flex max-w-[1600px] w-full mx-auto pt-6 px-4 md:px-6 gap-8 pb-6 flex-1 min-h-0">
          
          <div className="hidden lg:block flex-shrink-0 h-full">
            <ClientSidebar />
          </div>

          <div className="flex-1 flex flex-col min-w-0 h-full">
            
            <div className="mb-6 flex-shrink-0">
              <h1 className="text-[20px] md:text-[24px] font-bold text-navy">Approvals</h1>
              <p className="text-[13px] md:text-[15px] text-gray-500 mt-1">Review completed evidence and approve or request changes.</p>
            </div>

            <div className="flex flex-col lg:flex-row flex-1 min-h-0 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              
              {/* LEFT PANE */}
              <div className="w-full lg:w-[35%] flex flex-col bg-[#FAFAFA] border-r border-gray-100 h-full flex-shrink-0">
                <div className="p-5 border-b border-gray-100 bg-white flex-shrink-0">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-navy text-[15px]">Awaiting Review</h3>
                    <span className="bg-blue-50 text-[#007BFF] text-xs font-bold px-2 py-1 rounded-full">{approvals.length}</span>
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
                  {/* CHANGED: Show loader inside the list */}
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-[#007BFF] mb-3" />
                      <p className="text-sm text-gray-400 font-medium">Loading approvals...</p>
                    </div>
                  ) : filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <CheckCircle2 className="w-12 h-12 text-green-400 mb-3 opacity-50" />
                      <p className="font-bold text-gray-500">No approvals pending!</p>
                      <p className="text-xs text-gray-400 mt-1 max-w-[200px]">You have no requirements waiting for review.</p>
                    </div>
                  ) : (
                    filteredItems.map(req => (
                      <div 
                        key={req.reqId}
                        onClick={() => setSelectedItem(req)}
                        className={`p-4 rounded-2xl cursor-pointer transition-all border relative overflow-hidden ${
                          selectedItem?.reqId === req.reqId 
                            ? 'bg-blue-50/50 border-[#007BFF] ring-1 ring-[#007BFF]/30 shadow-sm' 
                            : 'bg-white border-transparent hover:border-gray-200 hover:shadow'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1.5">
                          <div className="flex items-center gap-2">
                              <div className={`w-2.5 h-2.5 rounded-full ${selectedItem?.reqId === req.reqId ? 'bg-[#007BFF]' : 'bg-gray-300'}`}></div>
                              <span className="text-[11px] font-bold text-[#007BFF]">{req.reqId}</span>
                          </div>
                          
                          {req.status === 'Change Requested' ? (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-orange-50 text-orange-600 flex items-center border border-orange-100">
                                <AlertTriangle className="w-3 h-3 mr-1" /> Change Requested
                              </span>
                          ) : req.rejectionReason ? (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-red-50 text-red-600 flex items-center border border-red-100">
                                <AlertTriangle className="w-3 h-3 mr-1" /> CR Declined
                              </span>
                          ) : (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-blue-50 text-[#007BFF] flex items-center">
                                Needs Review
                              </span>
                          )}
                        </div>
                        <h4 className="font-bold text-navy text-[14px] leading-tight line-clamp-2 mb-1">{req.title}</h4>
                        <p className="text-[11px] text-gray-500 font-medium">Completed: {req.submittedAt}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* RIGHT PANE */}
              <div className="w-full lg:w-[65%] flex flex-col h-full bg-white relative min-w-0">
                
                {!selectedItem ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-[#F8FAFC]">
                    <CheckCircle2 className="w-16 h-16 mb-4 opacity-30 text-[#007BFF]" />
                    <p className="font-medium text-navy text-lg">Requirement Review</p>
                    <p className="text-sm mt-1 max-w-sm text-center">Select a requirement from the list on the left to review its submitted evidence.</p>
                  </div>
                ) : (
                  <>
                    <div className="p-6 md:p-8 border-b border-gray-100 bg-white flex-shrink-0 z-10">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[12px] font-bold text-[#007BFF] bg-blue-50 px-2 py-1 rounded-md">{selectedItem.reqId}</span>
                        
                        {selectedItem.status === 'Change Requested' ? (
                          <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-orange-50 text-orange-600 flex items-center border border-orange-100">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Change Requested
                          </span>
                        ) : selectedItem.rejectionReason ? (
                          <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-red-50 text-red-600 flex items-center border border-red-100">
                            <AlertTriangle className="w-3 h-3 mr-1" /> CR Declined
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-green-50 text-green-600 flex items-center border border-green-100">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> BA Verified
                          </span>
                        )}
                      </div>
                      <h2 className="text-[20px] md:text-[24px] font-bold text-navy">{selectedItem.title}</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 bg-[#F8FAFC] space-y-8">

                      {/* REJECTION BANNER */}
                      {selectedItem.rejectionReason && selectedItem.status !== 'Change Requested' && (
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-6 shadow-sm flex items-start gap-4">
                           <div className="bg-red-100 p-2 rounded-full flex-shrink-0 mt-0.5">
                             <AlertTriangle className="w-4 h-4 text-red-600" />
                           </div>
                           <div>
                             <h4 className="font-bold text-red-800 text-[14px] mb-1.5">Change Request Declined</h4>
                             <p className="text-red-700 text-[13px] leading-relaxed mb-3">
                               {selectedItem.rejectionReason}
                             </p>
                             <p className="text-red-600 text-[12px] font-semibold flex items-center gap-1.5">
                               <CheckCircle2 className="w-3.5 h-3.5" /> 
                               You may now approve the originally submitted evidence below.
                             </p>
                           </div>
                        </div>
                      )}
                      
                      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                        <details className="group">
                          <summary className="flex justify-between items-center font-bold text-navy text-[13px] p-5 cursor-pointer list-none bg-gray-50/50 hover:bg-gray-100 transition-colors">
                            <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-[#007BFF]" /> View Original Specification</span>
                            <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" />
                          </summary>
                          <div className="p-6 text-gray-600 text-[14px] leading-relaxed whitespace-pre-wrap border-t border-gray-100 bg-white">
                            {selectedItem.description || "No description provided."}
                          </div>
                        </details>
                      </div>

                      <div>
                        <h4 className="text-[12px] font-bold text-[#007BFF] uppercase tracking-widest mb-3 flex items-center gap-2">
                           <CheckCircle2 className="w-4 h-4 text-[#007BFF]" /> Submitted Evidence
                        </h4>
                        
                        <div className="bg-white border border-blue-100 rounded-2xl p-6 shadow-sm">
                          
                          {selectedItem.evidence?.githubLink && (
                            <div className="mb-6">
                              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Project Link</label>
                              <a 
                                href={selectedItem.evidence.githubLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 hover:border-[#007BFF] transition-all group"
                              >
                                <LinkIcon className="w-5 h-5 text-[#007BFF] flex-shrink-0" />
                                <span className="text-[14px] font-semibold text-[#007BFF] truncate group-hover:underline">
                                  {selectedItem.evidence.githubLink}
                                </span>
                                <ExternalLink className="w-4 h-4 text-[#007BFF] ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                              </a>
                            </div>
                          )}

                          {selectedItem.evidence?.notes && (
                            <div className="mb-6">
                              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Team Notes</label>
                              <div className="p-5 bg-gray-50 rounded-xl border border-gray-200 text-[14px] text-navy whitespace-pre-wrap leading-relaxed shadow-inner">
                                {selectedItem.evidence.notes}
                              </div>
                            </div>
                          )}

                          {selectedItem.evidence?.files && selectedItem.evidence.files.length > 0 && (
                            <div>
                              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 block">Visual Proof</label>
                              
                              <div className="flex flex-col gap-6">
                                {selectedItem.evidence.files.map((file, idx) => {
                                  const isImage = file.base64?.startsWith('data:image') || file.type?.startsWith('image/');
                                  
                                  return (
                                    <div key={idx} className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white flex flex-col group">
                                      
                                      <div className="p-4 bg-white border-b border-gray-100 flex items-center gap-3 flex-shrink-0">
                                        <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                        <span className="text-[14px] font-semibold text-navy truncate block w-full">{file.name}</span>
                                      </div>

                                      {isImage ? (
                                        <div className="p-4 md:p-6 bg-gray-50 flex justify-center items-center">
                                          <a href={file.base64} target="_blank" rel="noreferrer" className="block relative w-full text-center">
                                            <img 
                                              src={file.base64} 
                                              alt={file.name} 
                                              className="max-w-full max-h-[450px] w-auto inline-block object-contain rounded-xl shadow-sm border border-gray-200" 
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center rounded-xl pointer-events-none">
                                              <ExternalLink className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                                            </div>
                                          </a>
                                        </div>
                                      ) : (
                                        <div className="w-full py-16 flex flex-col items-center justify-center bg-blue-50/50">
                                          <FileText className="w-12 h-12 text-[#007BFF] mb-3 opacity-70" />
                                          <span className="text-[12px] text-navy font-semibold px-4 text-center truncate max-w-sm">{file.name}</span>
                                          <a href={file.base64 || '#'} target="_blank" rel="noreferrer" className="mt-3 text-[#007BFF] text-[13px] font-bold hover:underline">Download File</a>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {(!selectedItem.evidence?.githubLink && !selectedItem.evidence?.notes && (!selectedItem.evidence?.files || selectedItem.evidence.files.length === 0)) && (
                             <div className="p-10 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                               <AlertTriangle className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                               <p className="text-[15px] font-bold text-gray-500">No Evidence Attached</p>
                               <p className="text-[13px] text-gray-400 mt-2 max-w-sm mx-auto">The development team submitted this requirement without visual proof.</p>
                             </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* DYNAMIC FOOTER */}
                    {selectedItem.status !== 'Change Requested' ? (
                      <div className="p-5 md:p-6 bg-white border-t border-gray-100 flex justify-end gap-3 flex-shrink-0 z-10 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.05)]">
                        
                        {!selectedItem.rejectionReason && (
                          <button 
                            onClick={() => setIsModalOpen(true)}
                            disabled={isSubmittingApproval || isSubmittingChange}
                            className="px-6 py-3.5 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 hover:border-orange-300 text-orange-600 flex items-center justify-center font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 gap-2 text-[14px]" 
                          >
                            <AlertTriangle className="w-4 h-4" /> Request Changes
                          </button>
                        )}
                        
                        <button 
                          onClick={handleApprove}
                          disabled={isSubmittingApproval || isSubmittingChange}
                          className="px-8 py-3.5 rounded-xl bg-[#10B981] hover:bg-[#059669] flex items-center justify-center text-white text-[15px] font-bold shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:opacity-50 gap-2" 
                        >
                          {isSubmittingApproval ? (
                             <><Loader2 className="w-5 h-5 animate-spin" /> Approving...</>
                          ) : (
                             <><CheckCircle2 className="w-5 h-5" /> {selectedItem.rejectionReason ? "Approve Original Evidence" : "Approve & Accept"}</>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="p-5 md:p-6 bg-orange-50/50 border-t border-gray-100 flex justify-center items-center flex-shrink-0 z-10">
                         <p className="text-[14px] font-bold text-orange-600 flex items-center gap-2">
                           <Loader2 className="w-4 h-4 animate-spin" />
                           Waiting for the team to process your requested changes...
                         </p>
                      </div>
                    )}
                  </>
                )}
              </div>

            </div>
          </div>
        </div>
        
        {/* EMBEDDED MODAL */}
        {isModalOpen && selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              
              <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
                <div>
                  <h2 className="text-xl font-bold text-navy">Request Changes</h2>
                  <p className="text-sm text-gray-500 mt-1 truncate max-w-[300px]">
                    {selectedItem.reqId}: {selectedItem.title}
                  </p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
                <div className="flex gap-3 p-4 bg-orange-50 border border-orange-200 rounded-2xl text-orange-700">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="text-[13px] leading-relaxed">
                    Changing this requirement may delay the timeline by <strong>2 days</strong>. Consider discussing with your BA first.
                  </p>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Selection Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setChangeType("Bug Report")} className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition-all ${changeType === "Bug Report" ? "border-[#007BFF] bg-blue-50/50 ring-1 ring-[#007BFF]/20" : "border-gray-200 hover:border-gray-300 bg-white"}`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${changeType === "Bug Report" ? "border-[#007BFF]" : "border-gray-300"}`}>
                          {changeType === "Bug Report" && <div className="w-2 h-2 bg-[#007BFF] rounded-full" />}
                        </div>
                        <Bug className={`w-4 h-4 ${changeType === "Bug Report" ? "text-[#007BFF]" : "text-gray-400"}`} />
                        <span className={`text-sm font-bold ${changeType === "Bug Report" ? "text-navy" : "text-gray-600"}`}>Bug Report</span>
                      </div>
                      <p className="text-[11px] text-gray-500 pl-6">Evidence doesn't match spec.</p>
                    </button>

                    <button onClick={() => setChangeType("Scope Change")} className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition-all ${changeType === "Scope Change" ? "border-orange-500 bg-orange-50/50 ring-1 ring-orange-500/20" : "border-gray-200 hover:border-gray-300 bg-white"}`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${changeType === "Scope Change" ? "border-orange-500" : "border-gray-300"}`}>
                          {changeType === "Scope Change" && <div className="w-2 h-2 bg-orange-500 rounded-full" />}
                        </div>
                        <Maximize className={`w-4 h-4 ${changeType === "Scope Change" ? "text-orange-500" : "text-gray-400"}`} />
                        <span className={`text-sm font-bold ${changeType === "Scope Change" ? "text-navy" : "text-gray-600"}`}>Scope Change</span>
                      </div>
                      <p className="text-[11px] text-gray-500 pl-6">I need a new feature added.</p>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Description of Change</label>
                  <textarea 
                    value={changeDescription}
                    onChange={(e) => setChangeDescription(e.target.value)}
                    placeholder="Please describe exactly what needs to be changed or fixed..."
                    className="w-full border border-gray-200 rounded-2xl p-4 text-[14px] text-navy outline-none focus:ring-2 focus:ring-[#007BFF]/20 focus:border-[#007BFF] bg-gray-50 hover:bg-gray-100 transition-colors h-32 resize-none"
                  />
                </div>
              </div>

              <div className="p-5 border-t border-gray-100 flex justify-end items-center gap-3 bg-gray-50/50">
                <button onClick={() => setIsModalOpen(false)} disabled={isSubmittingChange} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-navy hover:bg-gray-200 rounded-xl transition-colors">
                  Cancel
                </button>
                <button 
                  onClick={handleSubmitChangeRequest}
                  disabled={!changeDescription.trim() || isSubmittingChange}
                  className="px-6 py-2.5 bg-[#007BFF] hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-2 active:scale-95"
                >
                  {isSubmittingChange ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : "Submit Change Request"}
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </>
  );
}