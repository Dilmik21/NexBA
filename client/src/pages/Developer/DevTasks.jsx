import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DevTopBar from "../../components/Developer/DevTopBar";
import DevSidebar from "../../components/Developer/DevSidebar";
import { useAuth } from "../../contexts/AuthContext";
import { Loader2, Calendar, User, AlertCircle, Clock, FileText, CheckCircle2, Circle, ClipboardList, Activity, Building2, Paperclip, ChevronDown, Check, Info } from "lucide-react";

export default function DevTasks() {
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate(); 
  
  const [requirements, setRequirements] = useState([]);
  const [selectedReq, setSelectedReq] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingTask, setUpdatingTask] = useState(null); 
  const [updatingReq, setUpdatingReq] = useState(false);

  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const statusDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
        setIsStatusOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchTasksData = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    
    try {
      const res = await fetch(`http://localhost:5000/api/dev/tasks?uid=${currentUser.uid}`);
      const json = await res.json();
      
      if (json.success) {
        let activeReqs = json.data;

        activeReqs.sort((a, b) => {
            const aDone = ['Completed', 'Done', 'Approved & Live', 'Closed'].includes(a.status);
            const bDone = ['Completed', 'Done', 'Approved & Live', 'Closed'].includes(b.status);
            if (aDone && !bDone) return 1;
            if (!aDone && bDone) return -1;
            return 0;
        });

        setRequirements(activeReqs);

        setSelectedReq(prev => {
          if (prev) {
            const updated = activeReqs.find(r => r.reqId === prev.reqId);
            return updated || prev;
          }
          const reqIdFromState = location.state?.selectedReqId;
          if (reqIdFromState && !isBackground) {
            const target = activeReqs.find(r => r.reqId === reqIdFromState);
            if (target) return target;
          } 
          if (activeReqs.length > 0 && !isBackground) {
            return activeReqs[0];
          }
          return null;
        });
      }
    } catch (error) {
      console.error("Failed to fetch dev tasks:", error);
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.uid) {
      fetchTasksData(false); 
      
      const intervalId = setInterval(() => {
        fetchTasksData(true);
      }, 5000);
      
      return () => clearInterval(intervalId); 
    }
  }, [currentUser]);

  const handleTaskToggle = async (task) => {
    if (['Completed', 'Done', 'Pending Verification', 'Client UAT'].includes(selectedReq.status)) {
        return;
    }
    if (updatingTask === task.taskId) return;
    
    const isDone = ['Completed', 'Done', 'Client UAT', 'Pending Verification'].includes(task.status);
    const newStatus = isDone ? "To Do" : "Completed"; 

    setUpdatingTask(task.taskId);
    try {
      const res = await fetch(`http://localhost:5000/api/dev/tasks/status?uid=${currentUser.uid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.taskId, status: newStatus })
      });
      const json = await res.json();
      
      if (json.success) {
        const updatedReqs = requirements.map(req => {
          if (req.reqId === selectedReq.reqId) {
            const updatedTasks = req.tasks.map(t => t.taskId === task.taskId ? { ...t, status: newStatus } : t);
            return { ...req, tasks: updatedTasks };
          }
          return req;
        });
        setRequirements(updatedReqs);
        setSelectedReq(updatedReqs.find(r => r.reqId === selectedReq.reqId));
      }
    } catch (error) {
      alert("Failed to update task status");
    } finally {
      setUpdatingTask(null);
    }
  };

  const handleReqStatusChange = async (newStatus) => {
    if (!selectedReq?.dbId) return;
    setUpdatingReq(true);
    setIsStatusOpen(false); 
    
    try {
      const res = await fetch(`http://localhost:5000/api/dev/requirements/status?uid=${currentUser.uid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dbId: selectedReq.dbId, status: newStatus })
      });
      
      const json = await res.json();
      
      if (json.success) {
        const updatedReqs = requirements.map(req => 
          req.dbId === selectedReq.dbId ? { ...req, status: newStatus } : req
        );
        setRequirements(updatedReqs);
        setSelectedReq({ ...selectedReq, status: newStatus });
      } else {
        throw new Error(json.message || "Failed to update on server");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to update project status.");
    } finally {
      setUpdatingReq(false);
    }
  };

  const handleMarkReadyForReview = async (dbId) => {
    try {
      setIsLoading(true);
      await fetch(`http://localhost:5000/api/dev/requirements/status?uid=${currentUser.uid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dbId: dbId, status: "Ready for Review" })
      });
      
      navigate('/dev/evidence');
    } catch (error) {
      console.error(error);
      alert("Failed to update requirement status.");
      setIsLoading(false);
    }
  };

  const reqStatusConfig = {
    "Sent to Engineering": { label: "Pending Start", color: "bg-gray-100 text-gray-700 hover:bg-gray-200" },
    "In Progress": { label: "In Progress (Working)", color: "bg-blue-100 text-[#007BFF] hover:bg-blue-200" },
    "Ready for Review": { label: "Ready for Review", color: "bg-purple-100 text-purple-700 hover:bg-purple-200" },
    "Modification Requested": { label: "Change Requested", color: "bg-orange-100 text-orange-700 hover:bg-orange-200" },
    "Pending Verification": { label: "Under BA Review", color: "bg-yellow-100 text-yellow-700 cursor-not-allowed" },
    "Client UAT": { label: "Client Testing", color: "bg-indigo-100 text-indigo-700 cursor-not-allowed" },
    "Completed": { label: "Completed", color: "bg-green-100 text-green-700 cursor-not-allowed" },
    "Done": { label: "Completed", color: "bg-green-100 text-green-700 cursor-not-allowed" }
  };

  const dropdownOptions = ["Sent to Engineering", "In Progress", "Ready for Review"];

  const renderBAAnalysis = (analysisData) => {
    if (!analysisData) return null;

    if (typeof analysisData === 'string') {
      return <div className="bg-white p-5 rounded-2xl text-[14px] text-gray-600 whitespace-pre-wrap border border-blue-100 shadow-sm">{analysisData}</div>;
    }

    return (
      <div className="space-y-4">
        {Object.entries(analysisData).map(([key, value]) => {
          const lowerKey = key.toLowerCase();
          if (!value || 
              lowerKey === 'status' || 
              lowerKey === 'timestamp' || 
              lowerKey.includes('question') ||
              lowerKey.includes('processed text') ||
              lowerKey.includes('processedtext') ||
              lowerKey.includes('detailed requirement')) return null; 
          
          let displayValue = value;
          
          if (Array.isArray(value)) {
            displayValue = (
              <ul className="list-disc pl-5 space-y-1">
                {value.map((item, idx) => (
                  <li key={idx}>{typeof item === 'object' ? JSON.stringify(item) : item}</li>
                ))}
              </ul>
            );
          } else if (typeof value === 'object') {
            displayValue = JSON.stringify(value, null, 2);
          }

          let formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, str => str.toUpperCase()).trim();

          return (
            <div key={key} className="bg-white border border-blue-100 rounded-xl p-5 shadow-sm">
              <h4 className="text-[#007BFF] font-bold text-[13px] uppercase tracking-widest mb-3 border-b border-blue-50 pb-2">
                {formattedKey}
              </h4>
              <div className="text-[14px] text-gray-700 leading-relaxed whitespace-pre-wrap">
                {displayValue}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // --- THE FIX: KEEP SIDEBAR VISIBLE DURING INITIAL LOAD ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] overflow-x-hidden flex flex-col">
        <DevTopBar />
        <div className="flex max-w-[1600px] w-full mx-auto pt-6 px-4 md:px-6 gap-8 pb-10 h-[calc(100vh-80px)]">
          <div className="hidden lg:block flex-shrink-0 h-full">
            <DevSidebar />
          </div>
          <div className="flex-1 flex flex-col min-w-0 h-full items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#007BFF]" />
          </div>
        </div>
      </div>
    );
  }

  const getPriorityColor = (p) => {
    if (p === 'High') return 'bg-red-50 text-red-600';
    if (p === 'Medium') return 'bg-orange-50 text-orange-600';
    return 'bg-green-50 text-green-600';
  };

  let isAllTasksDone = false;
  if (selectedReq && selectedReq.tasks) {
     const activeTotal = selectedReq.tasks.length;
     const activeCompleted = selectedReq.tasks.filter(t => ['Completed', 'Done', 'Pending Verification', 'Client UAT'].includes(t.status)).length;
     isAllTasksDone = activeTotal > 0 && activeCompleted === activeTotal;
  }

  const isRequirementLocked = ['Completed', 'Done', 'Pending Verification', 'Client UAT'].includes(selectedReq?.status);
  const isSelectedBaReject = selectedReq?.rejectionReason && !selectedReq.rejectionReason.startsWith('Client Feedback:');
  const isSelectedChangeReq = (selectedReq?.isChangeRequest || selectedReq?.rejectionReason?.startsWith('Client Feedback:')) && !isSelectedBaReject;

  return (
    <div className="min-h-screen bg-[#F5F7FA] overflow-x-hidden">
      <DevTopBar />

      <div className="flex max-w-[1600px] mx-auto pt-6 px-4 md:px-6 gap-8 pb-10 h-[calc(100vh-80px)]">
        <div className="hidden lg:block flex-shrink-0 h-full">
          <DevSidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0 h-full">
          
          <div className="mb-6 flex-shrink-0">
            <h1 className="text-[20px] md:text-[24px] font-bold text-navy">My Tasks & Requirements</h1>
            <p className="text-[13px] md:text-[15px] text-gray-500 mt-1">Manage your to-do lists grouped by assigned requirements.</p>
          </div>

          <div className="flex flex-col lg:flex-row flex-1 min-h-0 gap-6 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            
            <div className="w-full lg:w-1/3 lg:border-r border-gray-100 flex flex-col bg-[#FAFAFA] h-[300px] lg:h-full flex-shrink-0 lg:flex-shrink">
              <div className="p-5 md:p-6 border-b border-gray-100 bg-white flex justify-between items-center">
                <h3 className="font-bold text-navy text-[15px]">Assigned Projects</h3>
                <span className="bg-blue-50 text-[#007BFF] text-xs font-bold px-2 py-1 rounded-full">{requirements.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {requirements.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">No requirements assigned to you.</p>
                ) : (
                  requirements.map(req => {
                    const completed = req.tasks.filter(t => ['Completed', 'Done', 'Client UAT', 'Pending Verification'].includes(t.status)).length;
                    const total = req.tasks.length;
                    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
                    const isReqDone = ['Completed', 'Done', 'Approved & Live'].includes(req.status);
                    
                    const isBaReject = req.rejectionReason && !req.rejectionReason.startsWith('Client Feedback:');
                    const isChangeReq = (req.isChangeRequest || req.rejectionReason?.startsWith('Client Feedback:')) && !isBaReject;

                    return (
                      <div 
                        key={req.reqId}
                        onClick={() => setSelectedReq(req)}
                        className={`p-4 rounded-2xl cursor-pointer transition-all border relative overflow-hidden ${
                          selectedReq?.reqId === req.reqId 
                            ? 'bg-blue-50/50 border-[#007BFF] ring-1 ring-[#007BFF]/20 shadow-sm' 
                            : 'bg-white border-gray-100 hover:border-gray-200 shadow-sm hover:shadow'
                        } ${isReqDone ? 'opacity-70' : ''}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-[#007BFF]">{req.reqId}</span>
                            
                            {isReqDone ? (
                               <span className="bg-green-50 text-green-600 text-[9px] font-bold px-1.5 py-0.5 rounded border border-green-100 flex items-center">
                                 <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Completed
                               </span>
                            ) : req.status === 'Pending Verification' ? (
                               <span className="bg-yellow-50 text-yellow-600 text-[9px] font-bold px-1.5 py-0.5 rounded border border-yellow-100 flex items-center">
                                 <Clock className="w-2.5 h-2.5 mr-0.5" /> Under Review
                               </span>
                            ) : isBaReject ? (
                              <span className="bg-red-50 text-red-600 text-[9px] font-bold px-1.5 py-0.5 rounded border border-red-100 flex items-center">
                                <AlertCircle className="w-2.5 h-2.5 mr-0.5" /> Rejected
                              </span>
                            ) : isChangeReq && (
                              <span className="bg-orange-50 text-orange-600 text-[9px] font-bold px-1.5 py-0.5 rounded border border-orange-100 flex items-center">
                                <Info className="w-2.5 h-2.5 mr-0.5" /> Changed
                              </span>
                            )}
                          </div>
                          {req.isOverdue && !isReqDone && <AlertCircle className="w-4 h-4 text-red-500" />}
                        </div>
                        <h4 className={`font-bold text-[14px] leading-tight mb-3 line-clamp-2 ${isReqDone ? 'text-gray-500 line-through' : 'text-navy'}`}>{req.title}</h4>
                        
                        <div className="flex justify-between text-[11px] font-bold text-gray-400 mb-1.5">
                          <span>Progress</span>
                          <span>{completed}/{total} Tasks</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full transition-all ${isReqDone ? 'bg-green-500' : 'bg-[#007BFF]'}`} style={{ width: `${progress}%` }}></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="w-full lg:w-2/3 flex flex-col h-full bg-white relative">
              {!selectedReq ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                  <FileText className="w-16 h-16 mb-4 opacity-50 text-gray-300" />
                  <p className="font-medium text-navy text-lg">Select a requirement</p>
                  <p className="text-sm mt-1">Choose a project from the left to see details and tasks.</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  
                  <div className="p-6 md:p-8 border-b border-gray-50 flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${getPriorityColor(selectedReq.priority)}`}>
                            {selectedReq.priority} Priority
                          </span>
                        </div>
                        <h2 className="text-xl md:text-2xl font-bold text-navy mb-2">{selectedReq.title}</h2>
                      </div>
                      
                      <div className="flex-shrink-0 relative" ref={statusDropdownRef}>
                        {updatingReq ? (
                           <div className="px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-xs font-bold text-gray-500 flex items-center shadow-sm">
                             <Loader2 className="w-4 h-4 animate-spin mr-2" /> Updating...
                           </div>
                        ) : isRequirementLocked ? (
                           <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border border-transparent shadow-sm ${reqStatusConfig[selectedReq.status]?.color || 'bg-gray-100 text-gray-500'}`}>
                             <CheckCircle2 className="w-4 h-4 opacity-70" />
                             <span className="text-[13px] font-bold">
                               {reqStatusConfig[selectedReq.status]?.label || selectedReq.status}
                             </span>
                           </div>
                        ) : (
                          <button 
                            onClick={() => setIsStatusOpen(!isStatusOpen)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border border-transparent shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#007BFF]/30 active:scale-95 ${
                              reqStatusConfig[selectedReq.status]?.color || reqStatusConfig["Sent to Engineering"].color
                            }`}
                          >
                            <Activity className="w-4 h-4 opacity-70" />
                            <span className="text-[13px] font-bold">
                              {reqStatusConfig[selectedReq.status]?.label || "Pending Start"}
                            </span>
                            <ChevronDown className={`w-4 h-4 opacity-70 ml-1 transition-transform duration-200 ${isStatusOpen ? "rotate-180" : ""}`} />
                          </button>
                        )}

                        {isStatusOpen && !updatingReq && !isRequirementLocked && (
                          <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden z-20 py-1 animate-in fade-in slide-in-from-top-2">
                            {dropdownOptions.map((statusKey) => (
                              <button
                                key={statusKey}
                                onClick={() => handleReqStatusChange(statusKey)}
                                className={`w-full text-left px-4 py-3 text-[13px] font-semibold transition-colors flex items-center justify-between ${
                                  selectedReq.status === statusKey ? "bg-blue-50 text-[#007BFF]" : "text-gray-600 hover:bg-gray-50 hover:text-navy"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${
                                    statusKey === 'Ready for Review' ? 'bg-green-500' : 
                                    statusKey === 'In Progress' ? 'bg-[#007BFF]' : 'bg-gray-400'
                                  }`}></div>
                                  {reqStatusConfig[statusKey]?.label || statusKey}
                                </div>
                                {selectedReq.status === statusKey && <Check className="w-4 h-4 text-[#007BFF]" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#F7F9FC] p-4 rounded-2xl border border-gray-100 mt-2">
                      <div>
                        <p className="text-[11px] text-gray-400 font-bold uppercase mb-1">Requested By</p>
                        <div className="flex flex-col">
                          <div className="flex items-center text-sm font-semibold text-navy">
                            <Building2 className="w-4 h-4 mr-1.5 text-gray-400 flex-shrink-0" /> 
                            <span className="truncate" title={selectedReq.clientName}>{selectedReq.clientName}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-400 font-bold uppercase mb-1">Assigned By (BA)</p>
                        <div className="flex items-center text-sm font-semibold text-navy">
                          <User className="w-4 h-4 mr-1.5 text-gray-400 flex-shrink-0" /> 
                          <span className="truncate" title={selectedReq.baName}>{selectedReq.baName}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-400 font-bold uppercase mb-1">Received On</p>
                        <div className="flex items-center text-sm font-semibold text-navy">
                          <Calendar className="w-4 h-4 mr-1.5 text-gray-400" /> {selectedReq.submittedAt}
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-400 font-bold uppercase mb-1">Project Deadline</p>
                        <div className={`flex items-center text-sm font-semibold ${selectedReq.isOverdue && !isRequirementLocked ? 'text-red-600' : 'text-navy'}`}>
                          <Clock className="w-4 h-4 mr-1.5" /> {selectedReq.deadline}
                        </div>
                      </div>
                    </div>
                  </div>

                  {isSelectedBaReject && !isRequirementLocked && (
                    <div className="mx-6 md:mx-8 mt-6 bg-red-50 border border-red-200 rounded-2xl p-5 flex gap-4 items-start shadow-sm animate-in fade-in slide-in-from-top-4">
                      <div className="bg-red-100 p-2 rounded-full flex-shrink-0">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-red-800 text-[14px] mb-1">BA Rejected Previous Submission</h4>
                        <p className="text-red-600 text-[13px] leading-relaxed">
                          {selectedReq.rejectionReason}
                        </p>
                      </div>
                    </div>
                  )}

                  {isSelectedChangeReq && !isRequirementLocked && (
                    <div className="mx-6 md:mx-8 mt-6 bg-orange-50 border border-orange-200 rounded-2xl p-5 flex gap-4 items-start shadow-sm animate-in fade-in slide-in-from-top-4">
                      <div className="bg-orange-100 p-2 rounded-full flex-shrink-0">
                        <Info className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-orange-800 text-[14px] mb-1">Client Change Request Active</h4>
                        <p className="text-orange-600 text-[13px] leading-relaxed">
                          The client has requested modifications to this requirement. Please review the updated specifications in the Communication Hub before submitting your work.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="p-6 md:p-8 border-b border-gray-50">
                    <h3 className="font-bold text-navy text-[15px] mb-4 flex items-center">
                      <User className="w-4 h-4 mr-2 text-[#007BFF]" /> Original Client Request
                    </h3>
                    <div className="bg-gray-50 p-5 rounded-2xl text-[13px] text-gray-600 leading-relaxed whitespace-pre-wrap border border-gray-100">
                      {selectedReq.description}
                    </div>

                    {selectedReq.attachments && selectedReq.attachments.length > 0 && (
                      <div className="mt-5">
                        <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Attached Documents</h4>
                        <div className="flex flex-wrap gap-3">
                          {selectedReq.attachments.map((file, idx) => (
                            <a 
                              key={idx} 
                              href={file.url || '#'} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="flex items-center px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:border-[#007BFF] hover:shadow-sm transition-all group max-w-sm"
                            >
                              <Paperclip className="w-4 h-4 text-gray-400 mr-3 flex-shrink-0 group-hover:text-[#007BFF]" />
                              <span className="text-[13px] font-semibold text-navy group-hover:text-[#007BFF] truncate">
                                {file.name || 'Client_Document_Attachment'}
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedReq.baAnalysis && (
                    <div className="p-6 md:p-8 border-b border-gray-50 bg-[#F4F9FF]">
                      <h3 className="font-bold text-navy text-[15px] mb-4 flex items-center">
                        <ClipboardList className="w-4 h-4 mr-2 text-[#007BFF]" /> Business Analyst Specifications
                      </h3>
                      {renderBAAnalysis(selectedReq.baAnalysis)}
                    </div>
                  )}

                  <div className="p-6 md:p-8">
                    <h3 className="font-bold text-navy text-[15px] mb-4 flex items-center">
                      <CheckCircle2 className="w-4 h-4 mr-2 text-[#007BFF]" /> Developer Task Checklist
                    </h3>
                    
                    {selectedReq.tasks.length === 0 ? (
                      <p className="text-sm text-gray-500 p-4 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">No specific tasks have been generated for this requirement yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedReq.tasks.map(task => {
                          const isDone = ['Completed', 'Done', 'Client UAT', 'Pending Verification'].includes(task.status);
                          const isUpdating = updatingTask === task.taskId;
                          
                          return (
                            <div 
                              key={task.taskId} 
                              onClick={() => handleTaskToggle(task)}
                              className={`p-4 rounded-xl border transition-all flex items-center gap-4 ${isRequirementLocked ? 'cursor-not-allowed opacity-80' : 'cursor-pointer group'} ${
                                isDone ? 'bg-gray-50/50 border-gray-200' : 'bg-white border-gray-200 shadow-sm hover:border-[#007BFF]/50 hover:shadow-md'
                              }`}
                            >
                              
                              <div className="flex-shrink-0">
                                {isUpdating ? (
                                  <Loader2 className="w-6 h-6 text-[#007BFF] animate-spin" />
                                ) : isDone ? (
                                  <div className={`w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-sm transition-transform ${isRequirementLocked ? '' : 'group-hover:scale-105'}`}>
                                    <CheckCircle2 className="w-4 h-4 text-white" />
                                  </div>
                                ) : (
                                  <div className="w-6 h-6 rounded-full border-2 border-gray-300 group-hover:border-[#007BFF] transition-all flex items-center justify-center">
                                    <Circle className="w-3 h-3 text-transparent group-hover:text-blue-100 fill-current" />
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-[10px] font-bold text-gray-400">{task.displayId || task.taskId}</span>
                                  {task.requiredRole && <span className="text-[9px] font-bold bg-blue-50 text-[#007BFF] px-2 py-0.5 rounded">{task.requiredRole}</span>}
                                </div>
                                <h4 className={`text-[14px] font-semibold leading-snug transition-all ${isDone ? 'text-gray-400 line-through' : `text-navy ${isRequirementLocked ? '' : 'group-hover:text-[#007BFF]'}`}`}>
                                  {task.title}
                                </h4>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {isAllTasksDone && selectedReq.status !== 'Ready for Review' && !isRequirementLocked && (
                      <div className="mt-8 p-6 bg-blue-50 border border-blue-100 rounded-2xl flex flex-col items-center justify-center text-center animate-in fade-in">
                        <div className="w-12 h-12 bg-[#007BFF] rounded-full flex items-center justify-center mb-3 shadow-md">
                          <CheckCircle2 className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-navy mb-1">All Tasks Completed!</h3>
                        <p className="text-sm text-gray-500 mb-5 max-w-md">You have finished all tasks for this requirement. Mark it as ready for review to submit your final evidence to the BA.</p>
                        
                        <button 
                          onClick={() => handleMarkReadyForReview(selectedReq.dbId)}
                          className="bg-[#007BFF] hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                        >
                          <Check className="w-5 h-5" /> Mark as Ready for Review
                        </button>
                      </div>
                    )}

                  </div>

                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}