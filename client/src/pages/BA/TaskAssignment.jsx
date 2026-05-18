import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BATopBar from "../../components/BA/BATopBar";
import BASidebar from "../../components/BA/BASidebar";
import { useAuth } from "../../contexts/AuthContext";
import { Sparkles, ChevronDown, CheckCircle2, Users, Loader2, FileText, Send, Plus, Lock, Trash2, AlertCircle, ShieldCheck } from "lucide-react";

export default function TaskAssignment() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [requirements, setRequirements] = useState([]);
  const [selectedReq, setSelectedReq] = useState(null);
  
  const [leaders, setLeaders] = useState([]);
  const [selectedLeader, setSelectedLeader] = useState(null);
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  
  const [viewMode, setViewMode] = useState('empty');
  
  const [generatedTasks, setGeneratedTasks] = useState([]);
  const [isFetchingTasks, setIsFetchingTasks] = useState(false);
  const [isForwarding, setIsForwarding] = useState(false);
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);
  
  const [manualForm, setManualForm] = useState({ title: '', priority: 'Medium', requiredRole: 'Full-stack Developer' });

  const finishedStatuses = ['Complete', 'Completed', 'Approved & Live', 'Live', 'Closed', 'Done'];

  useEffect(() => {
    if (currentUser?.uid) {
      fetchInitialData();
    }
  }, [currentUser]);

  const fetchInitialData = async () => {
    if (!currentUser?.uid) return;
    try {
      const reqsRes = await fetch(`http://localhost:5000/api/ba/tasks/ready-requirements?uid=${currentUser.uid}`);
      const reqsJson = await reqsRes.json();
      if (reqsJson.success) {
        setRequirements(reqsJson.data);

        if (selectedReq) {
          const updatedReq = reqsJson.data.find(r => r.id === selectedReq.id);
          if (updatedReq) {
            setSelectedReq(updatedReq);
          }
        }
      }
      fetchLeaders();
    } catch (error) { console.error("Error fetching data:", error); }
  };

  const fetchLeaders = async () => {
    if (!currentUser?.uid) return;
    try {
      const res = await fetch(`http://localhost:5000/api/ba/tasks/developers?uid=${currentUser.uid}`);
      const json = await res.json();
      if (json.success) setLeaders(json.data);
    } catch (error) { console.error("Error fetching leaders:", error); }
  };

  const fetchTasksForRequirement = async (reqId) => {
    setIsFetchingTasks(true);
    try {
      const targetReq = requirements.find(r => r.id === reqId);
      const tasksToSet = targetReq?.tasks || [];
      setGeneratedTasks(tasksToSet);
      return tasksToSet;
    } catch (error) {
      console.error("Error fetching specific tasks:", error);
      return [];
    } finally {
      setIsFetchingTasks(false);
    }
  };

  const handleSelectRequirement = async (req) => {
    setSelectedReq(req);
    setIsDropdownOpen(false);
    setSelectedLeader(null);

    const assignedStatuses = ['Sent to Engineering', 'In Progress', 'Pending Verification', 'Modification Requested', 'Client UAT', 'Completed', 'Done'];
    const isAlreadyAssigned = assignedStatuses.includes(req.status);

    const fetchedTasks = await fetchTasksForRequirement(req.id);

    if (fetchedTasks.length > 0 || isAlreadyAssigned) {
      setViewMode('ai');
    } else {
      setViewMode('empty');
    }
  };

  const handleAIBreakdown = async () => {
    if (!selectedReq || !currentUser?.uid) return;
    setViewMode('loading');
    try {
      const response = await fetch(`http://localhost:5000/api/ba/tasks/generate/${selectedReq.id}?uid=${currentUser.uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiProcessedData: selectedReq.aiProcessedData, uid: currentUser.uid })
      });
      const json = await response.json();
      
      if (json.success) {
        setGeneratedTasks(json.data); 
        const updatedReqs = requirements.map(r => r.id === selectedReq.id ? { ...r, tasks: json.data, projectType: json.projectType } : r);
        setRequirements(updatedReqs);
        setSelectedReq(updatedReqs.find(r => r.id === selectedReq.id));
        setViewMode('ai');
      }
    } catch (error) {
      console.error("Generation failed:", error);
      setViewMode('empty');
    }
  };

  const handleAddManualTask = async () => {
    if (!manualForm.title.trim() || !currentUser?.uid) return;
    
    setIsSavingManual(true);
    const cleanTask = {
      title: manualForm.title,
      priority: manualForm.priority,
      requiredRole: manualForm.requiredRole
    };

    try {
      await fetch(`http://localhost:5000/api/ba/tasks/assign?uid=${currentUser.uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reqId: selectedReq.id, task: cleanTask, uid: currentUser.uid })
      });

      setManualForm({ title: '', priority: 'Medium', requiredRole: 'Full-stack Developer' });
      await fetchInitialData();
      if (selectedReq) await fetchTasksForRequirement(selectedReq.id);
      setViewMode('ai'); 
    } catch (error) { console.error("Assignment failed:", error); } 
    finally { setIsSavingManual(false); }
  };

  const handleDeleteTask = async (taskId) => {
    if (!taskId || !currentUser?.uid) return;
    
    setIsDeleting(taskId);
    try {
      const res = await fetch(`http://localhost:5000/api/ba/tasks/${taskId}?uid=${currentUser.uid}`, {
        method: "DELETE"
      });
      const json = await res.json();
      
      if (json.success) {
        setGeneratedTasks(json.data);
        setRequirements(prev => prev.map(r => r.id === selectedReq.id ? { ...r, tasks: json.data } : r));
      }
    } catch (error) {
      console.error("Deletion failed:", error);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleForwardToEngineering = async () => {
    if (!selectedReq || !selectedLeader || !currentUser?.uid) return;

    setIsForwarding(true);
    try {
      await fetch(`http://localhost:5000/api/ba/tasks/forward?uid=${currentUser.uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          reqId: selectedReq.id, 
          leaderId: selectedLeader.id,
          leaderName: selectedLeader.fullName,
          uid: currentUser.uid 
        })
      });

      await fetchInitialData();
      setSelectedLeader(null);
    } catch (error) { console.error("Forwarding failed:", error); } 
    finally { setIsForwarding(false); }
  };

  const getPriorityColor = (p) => {
    if (p === 'High') return 'bg-red-100 text-red-500';
    if (p === 'Medium') return 'bg-orange-100 text-orange-500';
    return 'bg-green-100 text-green-600';
  };

  const roleOptions = [
    'Front-end Developer', 
    'Back-end Developer', 
    'Full-stack Developer', 
    'Mobile App Developer', 
    'Game Developer', 
    'DevOps Engineer', 
    'Database Developer', 
    'AI/ML Developer'
  ];

  const reqNum = selectedReq ? (selectedReq?.id?.includes('-') ? selectedReq.id.split('-')[1] : selectedReq.id) : 'XXX';
  const usedSuffixes = new Set();
  generatedTasks.forEach(t => {
    if (t.taskId) {
      const suffix = parseInt(t.taskId.split('-').pop(), 10);
      if (!isNaN(suffix)) usedSuffixes.add(suffix);
    }
  });
  let nextAvailable = 1;
  while (usedSuffixes.has(nextAvailable)) {
    nextAvailable++;
  }
  const manualPreviewId = `TASK-${reqNum}-${nextAvailable}`;
  
  const assignedStatuses = ['Sent to Engineering', 'In Progress', 'Pending Verification', 'Modification Requested', 'Client UAT', 'Completed', 'Done'];
  const isAssigned = selectedReq ? assignedStatuses.includes(selectedReq.status) : false;
  const pendingTaskCount = generatedTasks.filter(t => t.status === 'Unassigned').length;

  const sortedRequirements = [...requirements].sort((a, b) => {
    const aFinished = finishedStatuses.includes(a.status);
    const bFinished = finishedStatuses.includes(b.status);
    if (aFinished && !bFinished) return 1;
    if (!aFinished && bFinished) return -1;
    return a.id.localeCompare(b.id);
  });

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <BATopBar />

      <div className="flex max-w-[1600px] mx-auto pt-6 px-4 md:px-6 gap-8">
        <div className="hidden lg:block flex-shrink-0">
          <BASidebar />
        </div>

        <div className="flex-1 pb-10 flex flex-col h-full lg:h-[calc(100vh-100px)]">
          
          <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center mb-6 flex-shrink-0 gap-4 md:gap-0">
            <div>
              <h1 className="text-[22px] font-bold text-navy">Task Assignment</h1>
              <p className="text-sm text-gray-500 mt-1">Generate technical tasks and forward the backlog to an Engineering Team.</p>
            </div>
            
            <div className="relative w-full md:w-auto">
              <div 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="bg-white px-5 py-2.5 rounded-xl md:rounded-full border border-gray-200 shadow-sm flex items-center justify-between font-semibold text-navy text-sm cursor-pointer hover:bg-gray-50 transition-all select-none w-full md:w-[350px]"
              >
                <span className="truncate pr-4">
                  {selectedReq ? `${selectedReq.id}: ${selectedReq.title}` : "Select a Requirement"}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 flex-shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </div>

              {isDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-full bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-4 py-3 flex items-center text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 mb-2">
                    <FileText className="w-3.5 h-3.5 mr-2" /> Available Requirements
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {sortedRequirements.length === 0 ? (
                      <div className="px-5 py-4 text-sm text-gray-500 text-center">No requirements found.</div>
                    ) : (
                      sortedRequirements.map(req => {
                        const isCompleted = finishedStatuses.includes(req.status);
                        return (
                          <div 
                            key={req.id}
                            onClick={() => handleSelectRequirement(req)}
                            className={`px-5 py-3 hover:bg-blue-50 cursor-pointer transition-colors ${selectedReq?.id === req.id ? 'bg-blue-50/50 border-l-[3px] border-primary' : 'border-l-[3px] border-transparent'}`}
                          >
                            <div className="flex justify-between items-start mb-0.5">
                              <p className={`text-sm font-bold truncate ${selectedReq?.id === req.id ? 'text-primary' : 'text-navy'}`}>{req.id}</p>
                              {isCompleted && (
                                <span className="bg-green-50 text-green-600 border border-green-200 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                  Completed
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate mt-0.5">{req.title}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-0">
            
            {viewMode === 'empty' && !isAssigned && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-8">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-50 rounded-full flex items-center justify-center text-primary mb-4 md:mb-6">
                  <Users className="w-8 h-8 md:w-10 md:h-10" />
                </div>
                <h3 className="text-lg font-bold text-navy mb-2 text-center">Requirement Backlog</h3>
                <p className="text-sm text-gray-500 mb-6 md:mb-8 max-w-md text-center">
                  Let AI suggest a breakdown of technical tasks, or add tasks to the queue manually before forwarding the backlog to an Engineering Team.
                </p>
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                  <button 
                    onClick={handleAIBreakdown}
                    disabled={!selectedReq}
                    className="w-full sm:w-auto bg-primary hover:bg-blue-600 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-sm flex items-center justify-center disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4 mr-2" /> Suggest Breakdown
                  </button>
                  <button 
                    onClick={() => { setViewMode('manual'); }}
                    disabled={!selectedReq}
                    className="w-full sm:w-auto bg-white border border-gray-200 hover:bg-gray-50 text-navy font-bold px-8 py-3 rounded-xl transition-all disabled:opacity-50 text-center"
                  >
                    Create Manually
                  </button>
                </div>
              </div>
            )}

            {viewMode === 'loading' && (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-20">
                <Loader2 className="w-10 h-10 md:w-12 md:h-12 animate-spin mb-4 text-primary" />
                <p className="font-bold text-navy">Generating Technical Tasks...</p>
              </div>
            )}

            {(viewMode === 'ai' || viewMode === 'manual') && (
              <div className="flex flex-col lg:flex-row flex-1 lg:min-h-0">
                
                {/* --- LEFT SIDE: TASK LIST --- */}
                <div className="w-full lg:w-3/5 lg:border-r border-b lg:border-b-0 border-gray-100 flex flex-col h-[400px] lg:h-full bg-[#FAFAFA]">
                  
                  {viewMode === 'ai' && (
                    <div className="flex flex-col h-full w-full">
                      <div className="p-4 md:p-6 border-b border-gray-200 flex justify-between items-center bg-white flex-shrink-0">
                        <div className="flex items-center text-navy font-bold text-sm md:text-base">
                          <FileText className="w-4 h-4 md:w-5 md:h-5 mr-2 text-primary" /> Task Queue {isAssigned && "(Locked)"}
                        </div>
                        
                        {!isAssigned && (
                          <div className="flex items-center space-x-3 md:space-x-4">
                             <button 
                               onClick={() => setViewMode('manual')} 
                               className="text-[11px] md:text-[13px] flex items-center text-gray-500 font-bold hover:text-primary transition-colors"
                             >
                               <Plus className="w-3 h-3 md:w-4 md:h-4 mr-1" /> Add Manual
                             </button>
                             {generatedTasks.length > 0 && (
                               <button onClick={handleAIBreakdown} className="text-[11px] md:text-[13px] text-primary font-bold hover:underline flex items-center">
                                 <Sparkles className="w-3 h-3 md:w-4 md:h-4 mr-1" /> Regenerate Queue
                               </button>
                             )}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 md:space-y-4">
                        {isFetchingTasks ? (
                           <div className="flex justify-center py-10">
                              <Loader2 className="w-8 h-8 text-primary animate-spin" />
                           </div>
                        ) : generatedTasks.length === 0 ? (
                          <div className="text-center py-10 md:py-20">
                             <CheckCircle2 className="w-12 h-12 md:w-16 md:h-16 text-green-400 mx-auto mb-4 opacity-50" />
                             <h3 className="font-bold text-navy text-lg md:text-xl">Queue Empty!</h3>
                             <p className="text-gray-500 text-[13px] md:text-sm mt-2 px-4">Generate tasks with AI or create them manually.</p>
                          </div>
                        ) : (
                          generatedTasks.map((task, index) => {
                            const isAssignedToTeam = task.status !== 'Unassigned';

                            return (
                              <div 
                                key={index} 
                                className="bg-white p-4 md:p-5 rounded-2xl border border-gray-200 shadow-sm transition-all flex flex-col justify-center relative group"
                              >
                                {!isAssigned && !isAssignedToTeam && (
                                  <button 
                                    onClick={() => handleDeleteTask(task.taskId)}
                                    disabled={isDeleting === task.taskId}
                                    className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                                    title="Remove Task"
                                  >
                                    {isDeleting === task.taskId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                  </button>
                                )}

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                                  <div className="min-w-0 pr-6">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                      <span className="text-[11px] md:text-xs font-bold text-gray-400">{task.displayId}</span>
                                      <span className={`text-[9px] md:text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${getPriorityColor(task.priority)}`}>
                                        {task.priority}
                                      </span>
                                      <span className="text-[9px] md:text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-600">
                                        {task.requiredRole}
                                      </span>
                                    </div>
                                    <h4 className="font-bold text-navy text-[13px] md:text-[15px] leading-snug">{task.title}</h4>
                                  </div>
                                  
                                  <div className="flex items-center flex-shrink-0 self-start sm:self-auto mt-2 sm:mt-0">
                                    {isAssigned ? (
                                      <div className="flex items-center text-[11px] md:text-[12px] font-bold text-green-600 bg-green-50 border border-green-100 px-3 py-1.5 rounded-xl">
                                        <Lock className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1.5 text-green-500" /> Assigned
                                      </div>
                                    ) : isAssignedToTeam ? (
                                      <div className="flex items-center text-[11px] md:text-[12px] font-bold text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
                                        <Lock className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1.5 text-gray-400" /> Locked to Team
                                      </div>
                                    ) : (
                                      <div className="flex items-center text-[11px] md:text-[12px] font-bold text-orange-500 bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-xl">
                                        In Queue
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {viewMode === 'manual' && !isAssigned && (
                    <div className="flex flex-col h-full w-full">
                      <div className="p-4 md:p-6 border-b border-gray-200 bg-white font-bold text-navy flex-shrink-0 flex justify-between items-center text-sm md:text-base">
                        <span>Add Task to Queue</span>
                        <button onClick={() => setViewMode(generatedTasks.length > 0 ? 'ai' : 'empty')} className="text-[11px] md:text-[13px] font-bold text-gray-500 hover:text-primary transition-colors bg-gray-50 hover:bg-blue-50 px-4 py-2 rounded-lg">
                          ← Back to Queue
                        </button>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-[#FAFAFA]">
                        <div className="space-y-6 w-full max-w-3xl mx-auto bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
                          
                          <div>
                            <label className="block text-[11px] md:text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Task ID</label>
                            <input 
                              type="text" 
                              value={manualPreviewId} 
                              disabled
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[13px] md:text-[14px] font-bold text-gray-400 outline-none cursor-not-allowed"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] md:text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Task Name</label>
                            <input 
                              type="text" 
                              value={manualForm.title}
                              onChange={e => setManualForm({...manualForm, title: e.target.value})}
                              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] md:text-[14px] font-semibold text-navy outline-none focus:border-primary shadow-sm transition-colors" 
                              placeholder="e.g. Build authentication API"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] md:text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Required Role</label>
                            <div className="relative">
                              <div 
                                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] md:text-[14px] font-semibold text-navy outline-none focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 shadow-sm cursor-pointer flex justify-between items-center transition-all"
                              >
                                {manualForm.requiredRole}
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
                              </div>

                              {isRoleDropdownOpen && (
                                <div className="absolute z-10 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl py-2 animate-in fade-in zoom-in-95 duration-200">
                                  {roleOptions.map(role => (
                                    <div
                                      key={role}
                                      onClick={() => {
                                        setManualForm({...manualForm, requiredRole: role});
                                        setIsRoleDropdownOpen(false);
                                      }}
                                      className={`px-5 py-3 text-[13px] md:text-[14px] cursor-pointer transition-colors ${
                                        manualForm.requiredRole === role 
                                          ? 'bg-blue-50 text-primary font-bold' 
                                          : 'text-gray-600 hover:bg-gray-50 hover:text-navy font-semibold'
                                      }`}
                                    >
                                      {role}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] md:text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Priority Level</label>
                            <div className="flex space-x-3">
                              {['Low', 'Medium', 'High'].map(p => (
                                <button 
                                  key={p}
                                  onClick={() => setManualForm({...manualForm, priority: p})}
                                  className={`flex-1 py-3 rounded-xl text-[12px] md:text-[13px] font-bold transition-colors ${manualForm.priority === p ? getPriorityColor(p) : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                >
                                  {p}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="pt-4">
                             <button 
                               onClick={handleAddManualTask}
                               disabled={!manualForm.title.trim() || isSavingManual}
                               className="w-full bg-primary hover:bg-blue-600 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-sm flex justify-center items-center disabled:opacity-50 text-[13px] md:text-[14px]"
                             >
                               {isSavingManual ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                               Add to Queue
                             </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* --- RIGHT SIDE: TEAM ASSIGNMENT --- */}
                <div className="w-full lg:w-2/5 flex flex-col h-[400px] lg:h-full bg-white relative">
                  
                  {isAssigned ? (
                    <div className="p-6">
                      <div className="bg-white rounded-2xl border border-green-200 shadow-sm overflow-hidden ring-1 ring-green-50">
                        <div className="px-6 py-5 border-b border-green-100 bg-green-50/80 flex items-center gap-3">
                          <ShieldCheck className="w-6 h-6 text-green-600" />
                          <h3 className="font-bold text-green-800 text-[16px]">Requirement Forwarded</h3>
                        </div>
                        <div className="p-6">
                          <p className="text-sm text-gray-600 mb-5 leading-relaxed">
                            This requirement has been locked. The task backlog is currently being managed and worked on by:
                          </p>
                          <div className="border border-gray-100 rounded-xl p-5 bg-gray-50/50 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-[#0B1A28] text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm">
                              {selectedReq.teamLeaderName ? selectedReq.teamLeaderName.substring(0,2).toUpperCase() : "TM"}
                            </div>
                            <div>
                              <h4 className="font-bold text-navy text-[16px]">{selectedReq.teamLeaderName || "Engineering Team"}</h4>
                              <p className="text-xs font-bold text-green-600 mt-1 uppercase tracking-wide">Active Assignment</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col h-full w-full">
                      <div className="p-4 md:p-6 border-b border-gray-50 flex justify-between items-center text-sm font-bold text-gray-500 flex-shrink-0">
                        <span className="flex items-center"><Users className="w-4 h-4 mr-2" /> Development Teams</span>
                        {pendingTaskCount > 0 && <span className="text-[11px] md:text-xs font-normal text-gray-400">Select Leader to Forward</span>}
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 md:space-y-4 pb-24">
                        
                        {selectedReq && selectedReq.projectType && pendingTaskCount > 0 && (
                          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 md:p-4 mb-4 flex items-start">
                             <Sparkles className="w-4 h-4 text-indigo-500 mt-0.5 mr-2 flex-shrink-0" />
                             <div>
                                <p className="text-[11px] md:text-xs font-bold text-indigo-800">Recommendation</p>
                                <p className="text-[10px] md:text-[11px] text-indigo-600 mt-0.5">This requirement is best suited for a team specializing in <strong>{selectedReq.projectType}</strong>.</p>
                             </div>
                          </div>
                        )}

                        {leaders.map((leader) => {
                          const isOverloaded = leader.currentLoad >= leader.maxLoad;
                          const percent = Math.min((leader.currentLoad / leader.maxLoad) * 100, 100);
                          
                          let barColor = 'bg-green-500';
                          if (isOverloaded) barColor = 'bg-red-500';
                          else if (percent >= 80) barColor = 'bg-orange-500';
                          else if (percent >= 50) barColor = 'bg-yellow-400';

                          // Safely format specialty to avoid crashes
                          const leaderSpec = typeof leader.specialty === 'string' ? leader.specialty : (leader.specialty ? leader.specialty.toString() : '');
                          const reqType = selectedReq?.projectType || '';
                          const isRecommended = selectedReq && reqType && leaderSpec.toLowerCase().includes(reqType.toLowerCase()) && !isOverloaded;

                          return (
                            <div 
                              key={leader.id} 
                              onClick={() => { if (!isOverloaded) setSelectedLeader(leader) }}
                              className={`p-4 md:p-5 rounded-2xl transition-all border ${
                                isOverloaded
                                  ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                                  : selectedLeader?.id === leader.id 
                                    ? 'border-primary ring-2 ring-primary/10 shadow-sm bg-blue-50/20 cursor-pointer' 
                                    : isRecommended 
                                      ? 'border-green-400 shadow-[0_4px_14px_rgba(16,185,129,0.15)] bg-white cursor-pointer ring-1 ring-green-100' 
                                      : 'border-gray-100 hover:shadow-md hover:border-blue-200 bg-white cursor-pointer'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-3 md:mb-4">
                                <div className="flex items-center space-x-3 min-w-0">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0 ${isOverloaded ? 'bg-gray-400' : 'bg-[#0B1A28]'}`}>
                                    {leader.initials}
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="font-bold text-navy text-[14px] md:text-[15px] truncate">{leader.teamName}</h4>
                                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">Specialty: <span className="font-medium text-gray-600">{leaderSpec.replace(/Development/g, 'Dev ')}</span></p>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1 flex-shrink-0 pl-2">
                                   {isRecommended && <span className="bg-green-50 border border-green-200 text-green-700 text-[9px] md:text-[10px] font-bold px-2 py-1 rounded-md shadow-sm uppercase tracking-wider">Best Match</span>}
                                   {isOverloaded && <span className="flex items-center bg-red-50 text-red-600 text-[9px] md:text-[10px] font-bold px-2 py-1 rounded"><AlertCircle className="w-3 h-3 mr-1"/> Max Load</span>}
                                </div>
                              </div>
                              
                              <div>
                                <div className="flex justify-between text-[10px] md:text-[11px] font-bold text-gray-400 mb-1.5">
                                  <span>Active Requirements</span>
                                  <span className={isOverloaded ? 'text-red-500' : ''}>{leader.currentLoad}/{leader.maxLoad}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                  <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${percent}%` }}></div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {pendingTaskCount > 0 && selectedLeader && (
                        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-white border-t border-gray-100 shadow-[0_-10px_20px_rgba(0,0,0,0.03)] z-10">
                          <button 
                            onClick={handleForwardToEngineering}
                            disabled={isForwarding}
                            className="w-full bg-primary hover:bg-blue-600 text-white font-bold px-6 py-4 rounded-xl transition-all shadow-md flex justify-center items-center text-[13px] md:text-[14px]"
                          >
                            {isForwarding ? (
                              <span className="flex items-center"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Forwarding Queue...</span>
                            ) : (
                              <span className="flex items-center"><Send className="w-4 h-4 mr-2" /> Forward {pendingTaskCount} Task{pendingTaskCount > 1 ? 's' : ''} to {selectedLeader.teamName}</span>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}