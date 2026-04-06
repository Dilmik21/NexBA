import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 
import BATopBar from "../../components/BA/BATopBar";
import BASidebar from "../../components/BA/BASidebar";
import { useAuth } from "../../contexts/AuthContext";
import { AlertTriangle, Check, X, MessageSquare, Loader2, Search, CheckCircle2, Bug, Maximize, FileText, CalendarClock, ArrowLeft } from "lucide-react";

export default function ChangeManagement() {
  const { currentUser } = useAuth();
  const navigate = useNavigate(); 
  
  const [changeRequests, setChangeRequests] = useState([]);
  const [selectedCR, setSelectedCR] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(null); 
  const [searchQuery, setSearchQuery] = useState("");

  const fetchChangeRequests = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/ba/changes?uid=${currentUser.uid}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setChangeRequests(json.data);
        
        setSelectedCR(prev => {
            if (prev) {
                const updated = json.data.find(c => c.crId === prev.crId);
                return updated || prev;
            }
            if (json.data.length > 0 && window.innerWidth >= 1024) return json.data[0];
            return null;
        });
      }
    } catch (error) {
      console.error("Failed to fetch changes:", error);
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.uid) {
      fetchChangeRequests(false); 
      
      const intervalId = setInterval(() => {
        fetchChangeRequests(true);
      }, 5000);
      
      return () => clearInterval(intervalId);
    }
  }, [currentUser]);

  const handleUpdateStatus = async (status) => {
    if (!selectedCR || !currentUser?.uid) return;
    setUpdatingStatus(status);
    
    try {
      const res = await fetch(`http://localhost:5000/api/ba/changes/${selectedCR.id}/status?uid=${currentUser.uid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const json = await res.json();
      
      if (json.success) {
        const resultingStatus = status === 'Approved' ? 'In Development' : 'Rejected by BA';
        
        const updatedList = changeRequests.map(cr => cr.id === selectedCR.id ? { ...cr, status: resultingStatus } : cr);
        setChangeRequests(updatedList);
        setSelectedCR({ ...selectedCR, status: resultingStatus });
        
        if (status === 'Approved') {
           alert("Change Approved! The Development Team has been notified.");
        } else if (status === 'Rejected') {
           alert("Change Rejected! The Client has been notified.");
        }
      }
    } catch (error) {
      console.error("Status update failed:", error);
      alert("Network Error: Could not reach the server.");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getTagColor = (type) => {
    if (type && type.includes("Bug")) return "bg-red-100 text-red-600 border-red-200";
    return "bg-orange-100 text-orange-600 border-orange-200";
  };

  const filteredItems = changeRequests.filter(cr => 
    (cr.title || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
    (cr.reqId || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (cr.crId || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTimelineRiskText = (score) => {
    if (!score) return "Low risk. Can likely be accommodated within the current sprint without delay.";
    if (score > 60) return "High probability of delaying the project by 3 to 5 days. Significant scope overlap detected.";
    if (score > 30) return "Moderate probability of delaying the project by 1 to 2 days. Minor adjustments needed.";
    return "Low risk. Can likely be accommodated within the current sprint without delay.";
  };

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
              <h1 className="text-[20px] md:text-[24px] font-bold text-navy flex items-center gap-2">
                 Change Management
              </h1>
              <p className="text-[13px] md:text-[15px] text-gray-500 mt-1">Review client change requests and assess timeline impact.</p>
            </div>

            <div className="flex flex-col lg:flex-row flex-1 min-h-0 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              
              <div className={`w-full lg:w-[35%] flex-col bg-[#FAFAFA] border-r border-gray-100 h-full flex-shrink-0 ${selectedCR ? 'hidden lg:flex' : 'flex'}`}>
                <div className="p-5 border-b border-gray-100 bg-white flex-shrink-0">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-navy text-[15px]">Active Requests</h3>
                    <span className="bg-orange-50 text-orange-600 text-xs font-bold px-2 py-1 rounded-full">{changeRequests.length}</span>
                  </div>
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search CR ID or Title..." 
                      className="w-full bg-gray-50 border border-gray-200 text-sm rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-[#007BFF] focus:ring-1 focus:ring-[#007BFF]/20 transition-all"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 bg-[#FAFAFA]">
                  {/* CHANGED: Loader is now inside the list */}
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-[#007BFF] mb-3" />
                      <p className="text-sm text-gray-400 font-medium">Loading change requests...</p>
                    </div>
                  ) : filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <CheckCircle2 className="w-12 h-12 text-green-400 mb-3 opacity-50" />
                      <p className="font-bold text-gray-500">No Active Changes</p>
                      <p className="text-xs text-gray-400 mt-1 max-w-[200px]">The client hasn't requested any modifications.</p>
                    </div>
                  ) : (
                    filteredItems.map(cr => (
                      <div 
                        key={cr.crId}
                        onClick={() => setSelectedCR(cr)}
                        className={`p-4 rounded-2xl cursor-pointer transition-all border relative overflow-hidden ${
                          selectedCR?.crId === cr.crId 
                            ? 'bg-white border-orange-300 ring-1 ring-orange-300/30 shadow-md' 
                            : 'bg-white border-transparent hover:border-gray-200 hover:shadow'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                             <div className={`w-2.5 h-2.5 rounded-full ${selectedCR?.crId === cr.crId ? 'bg-orange-500' : 'bg-gray-300'}`}></div>
                             <span className="text-[11px] font-bold text-orange-600">{cr.crId}</span>
                          </div>
                          <span className="text-[10px] font-bold text-gray-400">{cr.reqId}</span>
                        </div>
                        <h4 className="font-bold text-navy text-[14px] leading-tight line-clamp-2 mb-3">{cr.title}</h4>
                        <div className="flex items-center justify-between text-[11px] font-medium text-gray-500">
                          <span className={`flex items-center gap-1 border px-2 py-0.5 rounded ${getTagColor(cr.type)}`}>
                             {cr.type === "Bug Report" ? <Bug className="w-3 h-3"/> : <Maximize className="w-3 h-3"/>}
                             {cr.type}
                          </span>
                          
                          {cr.status === 'In Development' ? (
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">In Development</span>
                          ) : cr.status === 'Pending Verification' ? (
                            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">Evidence Submitted</span>
                          ) : cr.status === 'Rejected by BA' ? (
                            <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100">Rejected</span>
                          ) : (
                            <span>{cr.date}</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className={`w-full lg:w-[65%] flex-col h-full bg-white relative min-w-0 ${!selectedCR ? 'hidden lg:flex' : 'flex'}`}>
                
                {!selectedCR ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-[#F8FAFC]">
                    <AlertTriangle className="w-16 h-16 mb-4 opacity-30 text-orange-500" />
                    <p className="font-medium text-navy text-lg">Change Request Details</p>
                    <p className="text-sm mt-1 max-w-sm text-center">Select a change request from the left to review the client's feedback and assess impact.</p>
                  </div>
                ) : (
                  <>
                    <div className="p-6 md:p-8 border-b border-gray-100 bg-white flex-shrink-0 z-10">
                      <div className="flex items-center gap-2 mb-2">
                        <button className="lg:hidden p-1.5 mr-1 -ml-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors" onClick={() => setSelectedCR(null)}>
                           <ArrowLeft className="w-5 h-5" />
                        </button>

                        <span className="text-[12px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md">{selectedCR.crId}</span>
                        <span className="text-[11px] font-bold text-gray-500 bg-gray-50 border border-gray-200 px-2 py-1 rounded-md">Parent: {selectedCR.reqId}</span>
                        
                        {selectedCR.status === 'In Development' && (
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-1 rounded-md ml-auto">In Development</span>
                        )}
                        {selectedCR.status === 'Pending Verification' && (
                          <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-100 px-2 py-1 rounded-md ml-auto">Evidence Submitted</span>
                        )}
                        {selectedCR.status === 'Rejected by BA' && (
                          <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-1 rounded-md ml-auto">Rejected</span>
                        )}
                      </div>
                      <h2 className="text-[20px] md:text-[24px] font-bold text-navy mb-3">{selectedCR.title}</h2>
                      
                      <div className="flex items-center gap-4 text-[12px] font-medium">
                        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${
                          selectedCR.type === 'Bug Report' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                        }`}>
                          {selectedCR.type === "Bug Report" ? <Bug className="w-3.5 h-3.5"/> : <Maximize className="w-3.5 h-3.5"/>}
                          {selectedCR.type}
                        </span>
                        <span className="text-gray-500">Requested by: <strong className="text-navy">{selectedCR.clientName || "Client User"}</strong></span>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 bg-[#F8FAFC] space-y-8">
                      
                      <div>
                        <h4 className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                           <FileText className="w-4 h-4 text-gray-400" /> Client's Change Description
                        </h4>
                        <div className="bg-white border border-orange-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
                           <div className="absolute top-0 left-0 w-1 h-full bg-orange-400"></div>
                           <p className="text-[14px] text-gray-700 leading-relaxed whitespace-pre-wrap">
                             {selectedCR.description || selectedCR.clientDescription || "No description provided."}
                           </p>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-[12px] font-bold text-[#007BFF] uppercase tracking-widest mb-3 flex items-center gap-2">
                           <CalendarClock className="w-4 h-4 text-[#007BFF]" /> Timeline Risk Analysis
                        </h4>
                        <div className="bg-white border border-blue-100 rounded-2xl p-6 shadow-sm relative overflow-hidden">
                           <div className={`absolute top-0 left-0 w-1 h-full ${
                             selectedCR.aiImpact?.riskScore > 60 ? 'bg-red-500' : selectedCR.aiImpact?.riskScore > 30 ? 'bg-yellow-500' : 'bg-green-500'
                           }`}></div>
                           
                           <div className="flex justify-between items-end mb-2">
                              <span className="text-[12px] font-bold text-navy uppercase tracking-wide">
                                {selectedCR.aiImpact?.riskLevel || "Low Risk"}
                              </span>
                              <span className="text-[14px] font-bold text-navy">
                                {selectedCR.aiImpact?.riskScore || 15}% Impact
                              </span>
                           </div>
                           
                           <div className="w-full bg-gray-100 rounded-full h-2.5 mb-6 overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-500 ${
                                selectedCR.aiImpact?.riskScore > 60 ? 'bg-red-500' : selectedCR.aiImpact?.riskScore > 30 ? 'bg-yellow-500' : 'bg-green-500'
                              }`} style={{ width: `${selectedCR.aiImpact?.riskScore || 15}%` }}></div>
                           </div>

                           <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                             <p className="text-[13px] text-navy font-bold mb-1">Estimated Timeline Impact:</p>
                             <p className="text-[13px] text-gray-600 leading-relaxed">
                               {getTimelineRiskText(selectedCR.aiImpact?.riskScore)}
                             </p>
                           </div>

                           {selectedCR.aiImpact?.conflicts?.length > 0 && (
                             <div className="mt-5">
                                <h5 className="text-[11px] font-bold text-gray-500 mb-3">Linked Tasks Affected:</h5>
                                <ul className="space-y-2">
                                  {selectedCR.aiImpact.conflicts.map((conflict, i) => (
                                    <li key={i} className="flex items-start text-[12px] text-navy bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                      <AlertTriangle className="w-3.5 h-3.5 text-orange-400 mr-2 flex-shrink-0" /> 
                                      <span><strong>{conflict.taskId}:</strong> {conflict.title} <span className="text-gray-400 ml-1">({conflict.status})</span></span>
                                    </li>
                                  ))}
                                </ul>
                             </div>
                           )}
                        </div>
                      </div>

                    </div>

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
                        {selectedCR.status === 'Pending' ? (
                          <>
                            <button 
                              onClick={() => navigate('/ba/communication', { state: { activeReqId: selectedCR.reqId } })}
                              disabled={updatingStatus !== null}
                              className="flex items-center justify-center px-6 py-3.5 rounded-xl border border-gray-200 text-gray-600 text-[13px] font-bold hover:bg-gray-50 transition-colors mr-auto"
                            >
                              <MessageSquare className="w-4 h-4 mr-2" /> Discuss with Client
                            </button>

                            <button 
                              onClick={() => handleUpdateStatus('Rejected')}
                              disabled={updatingStatus !== null}
                              className="flex items-center justify-center px-6 py-3.5 rounded-xl border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 text-[13px] font-bold transition-colors active:scale-95 disabled:opacity-50"
                            >
                              {updatingStatus === 'Rejected' ? <><Loader2 className="w-4 h-4 animate-spin mr-2"/> Rejecting...</> : <><X className="w-4 h-4 mr-2" /> Reject Change</>}
                            </button>
                            
                            <button 
                              onClick={() => handleUpdateStatus('Approved')}
                              disabled={updatingStatus !== null}
                              className="flex items-center justify-center px-8 py-3.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-[14px] font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50 gap-2" 
                            >
                              {updatingStatus === 'Approved' ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Approving...</> : <><Check className="w-5 h-5" /> Approve Change Request</>}
                            </button>
                          </>
                        ) : selectedCR.status === 'In Development' ? (
                          <div className="w-full flex justify-center items-center py-2">
                             <p className="text-[14px] font-bold text-blue-600 flex items-center gap-2 bg-blue-50 px-6 py-3 rounded-xl border border-blue-100 w-full justify-center">
                               <Loader2 className="w-4 h-4 animate-spin" />
                               Waiting for developers to submit new evidence...
                             </p>
                          </div>
                        ) : selectedCR.status === 'Pending Verification' ? (
                           <div className="w-full flex justify-between items-center py-2 bg-green-50 px-6 rounded-xl border border-green-100">
                             <p className="text-[14px] font-bold text-green-700 flex items-center gap-2">
                               <CheckCircle2 className="w-5 h-5" />
                               Developer has submitted new evidence!
                             </p>
                             <button 
                               onClick={() => navigate('/ba/verification')}
                               className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-[13px] font-bold rounded-xl shadow-sm transition-all active:scale-95"
                             >
                               Go to Verification Queue
                             </button>
                           </div>
                        ) : selectedCR.status === 'Rejected by BA' ? (
                          <div className="w-full flex justify-center items-center py-2">
                             <p className="text-[14px] font-bold text-red-600 flex items-center gap-2 bg-red-50 px-6 py-3 rounded-xl border border-red-100 w-full justify-center">
                               <AlertTriangle className="w-4 h-4" />
                               Rejected. Waiting for the client to review your decision.
                             </p>
                          </div>
                        ) : null}
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