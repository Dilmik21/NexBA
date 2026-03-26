import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 
import BATopBar from "../../components/BA/BATopBar";
import BASidebar from "../../components/BA/BASidebar";
import { useAuth } from "../../contexts/AuthContext";
import { AlertTriangle, Check, X, MessageSquare, Loader2 } from "lucide-react";

export default function ChangeManagement() {
  const { currentUser } = useAuth();
  const navigate = useNavigate(); 
  
  const [changeRequests, setChangeRequests] = useState([]);
  const [selectedCR, setSelectedCR] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (currentUser?.uid) {
      fetchChangeRequests();
    }
  }, [currentUser]);

  const fetchChangeRequests = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/ba/changes?uid=${currentUser.uid}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setChangeRequests(json.data);
        if (json.data.length > 0) {
          setSelectedCR(json.data[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch changes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (status) => {
    if (!selectedCR || !currentUser?.uid) return;
    setIsUpdating(true);
    
    try {
      const res = await fetch(`http://localhost:5000/api/ba/changes/${selectedCR.id}/status?uid=${currentUser.uid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const json = await res.json();
      
      if (json.success) {
        const updatedList = changeRequests.map(cr => cr.id === selectedCR.id ? { ...cr, status } : cr);
        setChangeRequests(updatedList);
        setSelectedCR({ ...selectedCR, status });
        
        if (status === 'Approved') {
           alert("Change Approved! The Development Team has been notified.");
        } else if (status === 'Rejected') {
           alert("Change Rejected! The Client has been notified.");
        }
      }
    } catch (error) {
      console.error("Status update failed:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getTagColor = (type) => {
    if (type && type.includes("Bug")) return "bg-red-100 text-red-600";
    return "bg-yellow-100 text-yellow-700";
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <BATopBar />

      <div className="flex max-w-[1600px] mx-auto pt-6 px-4 md:px-6 gap-8">
        <div className="hidden lg:block flex-shrink-0">
          <BASidebar />
        </div>

        <div className="flex-1 pb-10 flex flex-col h-full lg:h-[calc(100vh-100px)]">
          <div className="mb-6 flex-shrink-0">
            <h1 className="text-[22px] font-bold text-navy">Change Management</h1>
            <p className="text-sm text-gray-500 mt-1">Review client change requests and assess AI-powered risk analysis.</p>
          </div>

          <div className="flex flex-col lg:flex-row flex-1 lg:min-h-0 gap-6">
            
            {/* LEFT LIST */}
            <div className="w-full lg:w-1/3 flex flex-col h-[400px] lg:h-full">
              <div className="bg-white rounded-t-2xl border-t border-l border-r border-gray-100 p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                  Change Requests ({changeRequests.filter(cr => cr.status === 'Pending').length})
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto bg-[#F8FAFC] border border-gray-100 rounded-b-2xl shadow-sm space-y-3 p-4">
                {isLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : changeRequests.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-10">No active change requests found.</p>
                ) : (
                  changeRequests.map((cr) => (
                    <div 
                      key={cr.id} 
                      onClick={() => setSelectedCR(cr)}
                      className={`p-4 rounded-xl cursor-pointer transition-all border ${
                        selectedCR?.id === cr.id ? 'bg-white border-primary ring-1 ring-primary shadow-sm' : 'bg-white border-transparent hover:border-gray-200 shadow-sm'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold text-gray-400">{cr.reqId || "REQ-XXX"}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getTagColor(cr.type)}`}>
                          {cr.type || "Update"}
                        </span>
                      </div>
                      <h4 className="font-bold text-navy text-[13px] leading-snug mb-3 truncate">{cr.title || "Untitled Change"}</h4>
                      <div className="flex justify-between items-center">
                         <span className="text-[11px] text-gray-500">{cr.clientName || "Client"}</span>
                         {cr.status === 'Pending' ? (
                           <span className="text-[11px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded">{cr.aiImpact?.riskScore || 0}% Risk</span>
                         ) : (
                           <span className="text-[11px] font-bold text-green-500 bg-green-50 px-2 py-1 rounded">{cr.status}</span>
                         )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* RIGHT DETAILS */}
            <div className="w-full lg:w-2/3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              {selectedCR ? (
                <>
                  <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[11px] font-bold text-gray-400">{selectedCR.crId || "CR-NEW"}</span>
                      <span className="text-gray-300">•</span>
                      <span className="text-[11px] font-bold text-gray-400">{selectedCR.reqId || "REQ-XXX"}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ml-2 ${getTagColor(selectedCR.type)}`}>
                        {selectedCR.type || "Update"}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-navy mb-2">{selectedCR.title || "Untitled Change Request"}</h2>
                    <p className="text-[12px] text-gray-500 font-medium mb-8">
                      From {selectedCR.clientName || "Unknown Client"} <span className="mx-2">•</span> {selectedCR.dateStr || "Recent"}
                    </p>

                    {/* Client Desc */}
                    <div className="mb-8">
                      <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Client's Description</h4>
                      <p className="text-[14px] text-navy leading-relaxed">{selectedCR.clientDescription || "No description provided."}</p>
                    </div>

                    {/* Comparison */}
                    <div className="mb-8">
                      <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Requirement Comparison</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="bg-red-50/50 border border-red-100 rounded-xl p-5">
                            <h5 className="text-[10px] font-bold text-red-500 uppercase mb-2">Original</h5>
                            <p className="text-[13px] text-gray-600 leading-relaxed">{selectedCR.originalText || "No original text available."}</p>
                         </div>
                         <div className="bg-green-50/50 border border-green-100 rounded-xl p-5">
                            <h5 className="text-[10px] font-bold text-green-600 uppercase mb-2">Proposed</h5>
                            <p className="text-[13px] text-navy leading-relaxed font-medium">{selectedCR.proposedText || "No proposed text available."}</p>
                         </div>
                      </div>
                    </div>

                    {/* AI Impact */}
                    {selectedCR.aiImpact && (
                      <div className="bg-[#F8FAFC] border border-gray-200 rounded-xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                        <div className="flex items-center gap-2 mb-4">
                           <AlertTriangle className="w-5 h-5 text-orange-500" />
                           <h4 className="text-[13px] font-bold text-navy">AI Impact Assessment</h4>
                        </div>
                        
                        <div className="flex justify-between items-end mb-2">
                           <span className="text-[11px] font-bold text-red-500">{selectedCR.aiImpact.riskLevel || "Unknown Risk"}</span>
                           <span className="text-[13px] font-bold text-navy">{selectedCR.aiImpact.riskScore || 0} %</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
                           <div className="bg-red-500 h-2.5 rounded-full" style={{ width: `${selectedCR.aiImpact.riskScore || 0}%` }}></div>
                        </div>

                        <p className="text-[13px] text-gray-600 leading-relaxed mb-6 bg-white p-4 rounded-lg border border-gray-100">
                          {selectedCR.aiImpact.analysisText || "No analysis provided."}
                        </p>

                        {selectedCR.aiImpact.conflicts?.length > 0 && (
                          <div>
                             <h5 className="text-[11px] font-bold text-gray-500 mb-3">Potential Conflicts</h5>
                             <ul className="space-y-2">
                               {selectedCR.aiImpact.conflicts.map((conflict, i) => (
                                 <li key={i} className="flex items-start text-[12px] text-navy">
                                   <AlertTriangle className="w-3.5 h-3.5 text-red-400 mr-2 mt-0.5 flex-shrink-0" /> 
                                   <span><strong>{conflict.taskId}:</strong> {conflict.title} <span className="text-gray-400 ml-1">({conflict.status})</span></span>
                                 </li>
                               ))}
                             </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  {selectedCR.status === 'Pending' ? (
                    <div className="p-6 border-t border-gray-100 bg-white flex justify-end gap-4 flex-shrink-0">
                      
                      <button 
                        onClick={() => navigate('/ba/communication')}
                        disabled={isUpdating}
                        className="flex items-center justify-center px-6 py-3 rounded-xl border border-gray-200 text-gray-600 text-[13px] font-bold hover:bg-gray-50 transition-colors mr-auto"
                      >
                        <MessageSquare className="w-4 h-4 mr-2" /> Discuss with Client
                      </button>

                      <button 
                        onClick={() => handleUpdateStatus('Rejected')}
                        disabled={isUpdating}
                        className="flex items-center justify-center px-8 py-3 rounded-xl border border-red-200 text-red-600 text-[13px] font-bold hover:bg-red-50 transition-colors"
                      >
                        <X className="w-4 h-4 mr-2" /> Reject
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus('Approved')}
                        disabled={isUpdating}
                        className="flex items-center justify-center px-8 py-3 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-[13px] font-bold transition-colors shadow-sm"
                      >
                        {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />} Approve Change
                      </button>
                    </div>
                  ) : (
                    <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-center flex-shrink-0">
                       <span className="text-[13px] font-bold text-gray-500">This change request has been {selectedCR.status.toLowerCase()}.</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400">Select a change request to view details</div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}