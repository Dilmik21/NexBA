import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import BATopBar from "../../components/BA/BATopBar";
import BASidebar from "../../components/BA/BASidebar";
import { Sparkles, ChevronDown, CheckCircle2, User, Users, Loader2, FileText, AlertCircle, Send, Plus } from "lucide-react";

export default function TaskAssignment() {
  const navigate = useNavigate();
  
  const [requirements, setRequirements] = useState([]);
  const [selectedReq, setSelectedReq] = useState(null);
  const [developers, setDevelopers] = useState([]);
  const [globalTaskCount, setGlobalTaskCount] = useState(500); 
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  
  const [viewMode, setViewMode] = useState('empty');
  
  const [generatedTasks, setGeneratedTasks] = useState([]);
  const [activeTaskIndex, setActiveTaskIndex] = useState(null); 
  const [isAssigning, setIsAssigning] = useState(false);
  
  const [manualTasks, setManualTasks] = useState([]); 
  const [manualForm, setManualForm] = useState({ title: '', priority: 'Medium', requiredRole: 'Full-stack Developer', assignee: null });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const reqsRes = await fetch("http://localhost:5000/api/ba/tasks/ready-requirements");
      const reqsJson = await reqsRes.json();
      if (reqsJson.success) {
        setRequirements(reqsJson.data);
        setGlobalTaskCount(reqsJson.globalTaskCount || 500);

        if (selectedReq) {
          const updatedReq = reqsJson.data.find(r => r.id === selectedReq.id);
          if (updatedReq) {
            setSelectedReq(updatedReq);
            if (updatedReq.unassignedTasks) setGeneratedTasks(updatedReq.unassignedTasks);
          }
        }
      }
      fetchDevelopers();
    } catch (error) { console.error("Error fetching data:", error); }
  };

  const fetchDevelopers = async () => {
    try {
      const devsRes = await fetch("http://localhost:5000/api/ba/tasks/developers");
      const devsJson = await devsRes.json();
      if (devsJson.success) setDevelopers(devsJson.data);
    } catch (error) { console.error("Error fetching developers:", error); }
  };

  const handleSelectRequirement = (req) => {
    setSelectedReq(req);
    setIsDropdownOpen(false);
    setActiveTaskIndex(null);

    if (req.unassignedTasks && req.unassignedTasks.length > 0) {
      setGeneratedTasks(req.unassignedTasks);
      setViewMode('ai');
    } else if (req.status === "Tasks Assigned") {
      setGeneratedTasks([]);
      setViewMode('ai'); 
    } else {
      setGeneratedTasks([]);
      setViewMode('empty');
    }
  };

  const handleAIBreakdown = async () => {
    if (!selectedReq) return;
    setViewMode('loading');
    try {
      const response = await fetch(`http://localhost:5000/api/ba/tasks/generate/${selectedReq.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiProcessedData: selectedReq.aiProcessedData })
      });
      const json = await response.json();
      
      if (json.success) {
        setGeneratedTasks(json.data); 
        setRequirements(prev => prev.map(r => r.id === selectedReq.id ? { ...r, unassignedTasks: json.data } : r));
        
        // AI tasks are saved to DB instantly, so we increment the global count!
        setGlobalTaskCount(prev => prev + json.data.length);
        
        setViewMode('ai');
      }
    } catch (error) {
      console.error("Generation failed:", error);
      setViewMode('empty');
    }
  };

  const handleSelectDeveloper = (dev) => {
    if (dev.currentLoad >= dev.maxLoad) return;

    if (viewMode === 'ai' && activeTaskIndex !== null) {
      const updated = [...generatedTasks];
      updated[activeTaskIndex].assignee = dev;
      setGeneratedTasks(updated);
    } else if (viewMode === 'manual') {
      setManualForm({ ...manualForm, assignee: dev });
    }
  };

  const handleAssignSingleTask = async (index) => {
    const task = generatedTasks[index];
    if (!task || !task.assignee) return;

    setIsAssigning(true);
    const cleanTask = {
      taskId: task.taskId, 
      title: task.title,
      priority: task.priority,
      requiredRole: task.requiredRole,
      assigneeId: task.assignee.id,
      assigneeName: task.assignee.fullName
    };

    try {
      await fetch("http://localhost:5000/api/ba/tasks/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reqId: selectedReq.id, tasks: [cleanTask] })
      });

      const updated = generatedTasks.filter((_, i) => i !== index);
      setGeneratedTasks(updated);
      setActiveTaskIndex(null);

      await fetchDevelopers(); // Update developer workloads
    } catch (error) { console.error("Assignment failed:", error); } 
    finally { setIsAssigning(false); }
  };

  const handleAssignManualTask = async () => {
    if (!manualForm.title.trim() || !manualForm.assignee) return;
    
    setIsAssigning(true);
    const cleanTask = {
      title: manualForm.title,
      priority: manualForm.priority,
      requiredRole: manualForm.requiredRole,
      assigneeId: manualForm.assignee.id,
      assigneeName: manualForm.assignee.fullName
    };

    try {
      await fetch("http://localhost:5000/api/ba/tasks/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reqId: selectedReq.id, tasks: [cleanTask] })
      });

      // Calculate the exact ID this task was given
      const assignedId = `TASK-${String(globalTaskCount + 1).padStart(3, '0')}`;

      // Add to the successfully assigned list on UI
      setManualTasks([...manualTasks, { ...manualForm, displayId: assignedId }]);
      
      // Clear the form
      setManualForm({ title: '', priority: 'Medium', requiredRole: 'Full-stack Developer', assignee: null });

      // IMMEDIATELY UPDATE THE COUNTER SO THE NEXT MANUAL TASK HAS THE NEW ID!
      setGlobalTaskCount(prev => prev + 1);

      await fetchDevelopers(); // Update developer workloads visually
    } catch (error) { console.error("Assignment failed:", error); } 
    finally { setIsAssigning(false); }
  };

  const activeTask = viewMode === 'ai' && activeTaskIndex !== null ? generatedTasks[activeTaskIndex] : 
                     viewMode === 'manual' ? manualForm : null;

  const displayedDevelopers = useMemo(() => {
    return [...developers].sort((a, b) => {
      if (a.currentLoad >= a.maxLoad && b.currentLoad < b.maxLoad) return 1;
      if (b.currentLoad >= b.maxLoad && a.currentLoad < a.maxLoad) return -1;

      if (!activeTask || !activeTask.requiredRole) return a.currentLoad - b.currentLoad; 

      const role = activeTask.requiredRole.toLowerCase();
      const aSkills = a.skills.toLowerCase();
      const bSkills = b.skills.toLowerCase();
      
      const aMatches = aSkills.includes(role) || (role.includes("end") && (aSkills.includes("full stack") || aSkills.includes("full-stack")));
      const bMatches = bSkills.includes(role) || (role.includes("end") && (bSkills.includes("full stack") || bSkills.includes("full-stack")));

      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;

      return a.currentLoad - b.currentLoad;
    });
  }, [developers, activeTask]);

  const getPriorityColor = (p) => {
    if (p === 'High') return 'bg-red-100 text-red-500';
    if (p === 'Medium') return 'bg-orange-100 text-orange-500';
    return 'bg-green-100 text-green-600';
  };

  const roleOptions = ['Front-end Developer', 'Back-end Developer', 'Full-stack Developer', 'Database Developer', 'Mobile App Developer', 'DevOps Engineer', 'AI/ML Developer'];

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <BATopBar />

      <div className="flex max-w-[1600px] mx-auto pt-6 px-6 gap-8">
        <div className="hidden lg:block flex-shrink-0">
          <BASidebar />
        </div>

        <div className="flex-1 pb-10 flex flex-col h-[calc(100vh-100px)]">
          
          <div className="flex justify-between items-center mb-6 flex-shrink-0">
            <div>
              <h1 className="text-[22px] font-bold text-navy">Task & Assignment</h1>
              <p className="text-sm text-gray-500 mt-1">Break down requirements into tasks and assign to developers.</p>
            </div>
            
            <div className="relative">
              <div 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="bg-white px-5 py-2.5 rounded-full border border-gray-200 shadow-sm flex items-center justify-between font-semibold text-navy text-sm cursor-pointer hover:bg-gray-50 transition-all select-none w-[350px]"
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
                    {requirements.length === 0 ? (
                      <div className="px-5 py-4 text-sm text-gray-500 text-center">No requirements found.</div>
                    ) : (
                      requirements.map(req => (
                        <div 
                          key={req.id}
                          onClick={() => handleSelectRequirement(req)}
                          className={`px-5 py-3 hover:bg-blue-50 cursor-pointer transition-colors ${selectedReq?.id === req.id ? 'bg-blue-50/50 border-l-[3px] border-primary' : 'border-l-[3px] border-transparent'}`}
                        >
                          <p className={`text-sm font-bold truncate ${selectedReq?.id === req.id ? 'text-primary' : 'text-navy'}`}>{req.id}</p>
                          <p className="text-xs text-gray-500 truncate mt-0.5">{req.title}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-0">
            
            {viewMode === 'empty' && (
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                {/* CHANGED TO USERS ICON & ROUNDED FULL */}
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-primary mb-6">
                  <Users className="w-10 h-10" />
                </div>
                <h3 className="text-lg font-bold text-navy mb-2">Task Assignment</h3>
                <p className="text-sm text-gray-500 mb-8 max-w-md text-center">
                  Let AI analyze the requirement and suggest a breakdown into technical tasks, or create tasks manually and assign them to your team.
                </p>
                <div className="flex space-x-4">
                  <button 
                    onClick={handleAIBreakdown}
                    disabled={!selectedReq}
                    className="bg-primary hover:bg-blue-600 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-sm flex items-center disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4 mr-2" /> Suggest Breakdown
                  </button>
                  <button 
                    onClick={() => { setViewMode('manual'); }}
                    disabled={!selectedReq}
                    className="bg-white border border-gray-200 hover:bg-gray-50 text-navy font-bold px-8 py-3 rounded-xl transition-all disabled:opacity-50"
                  >
                    Create Manually
                  </button>
                </div>
              </div>
            )}

            {viewMode === 'loading' && (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <Loader2 className="w-12 h-12 animate-spin mb-4 text-primary" />
                <p className="font-bold text-navy">Generating Technical Tasks...</p>
              </div>
            )}

            {(viewMode === 'ai' || viewMode === 'manual') && (
              <div className="flex flex-1 min-h-0">
                
                {/* LEFT PANE: TASK LIST / FORM */}
                <div className="w-3/5 border-r border-gray-100 flex flex-col h-full bg-[#FAFAFA]">
                  
                  {/* --- TASK QUEUE (List) --- */}
                  {viewMode === 'ai' && (
                    <>
                      <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-white flex-shrink-0">
                        <div className="flex items-center text-navy font-bold">
                          <FileText className="w-5 h-5 mr-2 text-primary" /> Task Queue
                        </div>
                        <div className="flex items-center space-x-4">
                           <button 
                             onClick={() => setViewMode('manual')} 
                             className="text-[13px] flex items-center text-gray-500 font-bold hover:text-primary transition-colors"
                           >
                             <Plus className="w-4 h-4 mr-1" /> Add Manual
                           </button>
                           {generatedTasks.length > 0 && (
                             <button onClick={handleAIBreakdown} className="text-[13px] text-primary font-bold hover:underline flex items-center">
                               <Sparkles className="w-4 h-4 mr-1" /> Regenerate AI
                             </button>
                           )}
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {generatedTasks.length === 0 ? (
                          <div className="text-center py-20">
                             <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4 opacity-50" />
                             
                             {selectedReq?.status === 'Tasks Assigned' ? (
                                <>
                                  <h3 className="font-bold text-navy text-xl">All tasks assigned!</h3>
                                  <p className="text-gray-500 text-[13px] mt-2">You have successfully assigned all tasks for this requirement.</p>
                                </>
                             ) : (
                                <>
                                  <h3 className="font-bold text-navy text-xl">Queue Empty!</h3>
                                  <p className="text-gray-500 text-sm mt-2">Generate tasks with AI or create them manually.</p>
                                </>
                             )}

                          </div>
                        ) : (
                          generatedTasks.map((task, index) => (
                            <div 
                              key={index} 
                              className={`bg-white p-5 rounded-2xl border shadow-sm transition-all flex flex-col justify-center ${activeTaskIndex === index ? 'border-primary ring-2 ring-primary/10' : 'border-gray-200'}`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="flex items-center space-x-3 mb-2">
                                    <span className="text-xs font-bold text-gray-400">{task.displayId}</span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${getPriorityColor(task.priority)}`}>
                                      {task.priority}
                                    </span>
                                    {activeTaskIndex === index && task.requiredRole && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-600">
                                        Needs: {task.requiredRole}
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="font-bold text-navy text-[15px]">{task.title}</h4>
                                </div>
                                
                                <div className="flex items-center space-x-3">
                                  {task.assignee ? (
                                    <div 
                                      onClick={() => setActiveTaskIndex(index)}
                                      className="flex items-center text-[13px] font-bold text-green-600 bg-green-50 border border-green-100 px-3 py-1.5 rounded-xl cursor-pointer hover:bg-green-100"
                                    >
                                      <CheckCircle2 className="w-4 h-4 mr-1.5" /> {task.assignee.fullName.split(" ")[0]}
                                    </div>
                                  ) : (
                                    <button 
                                      onClick={() => setActiveTaskIndex(index)}
                                      className={`text-[13px] font-bold transition-colors ${activeTaskIndex === index ? 'text-primary' : 'text-gray-400 hover:text-primary'}`}
                                    >
                                      ← Select developer
                                    </button>
                                  )}

                                  {task.assignee && activeTaskIndex === index && (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleAssignSingleTask(index); }}
                                      disabled={isAssigning}
                                      className="bg-primary hover:bg-blue-600 text-white text-[13px] font-bold px-5 py-2 rounded-xl transition-all shadow-sm flex items-center disabled:opacity-50"
                                    >
                                      {isAssigning ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Send className="w-3.5 h-3.5 mr-1.5" />} Assign
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )}

                  {/* --- MANUAL MODE FORM --- */}
                  {viewMode === 'manual' && (
                    <>
                      <div className="p-5 border-b border-gray-200 bg-white font-bold text-navy flex-shrink-0 flex justify-between items-center">
                        <span>Create Manual Task</span>
                        <button onClick={() => setViewMode(generatedTasks.length > 0 ? 'ai' : 'empty')} className="text-[12px] font-bold text-gray-500 hover:text-primary transition-colors">
                          Back to Queue
                        </button>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-6 bg-[#FAFAFA]">
                        <div className="space-y-4 max-w-lg bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
                          
                          <div>
                            <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Task ID</label>
                            <input 
                              type="text" 
                              value={`TASK-${String(globalTaskCount + 1).padStart(3, '0')}`} 
                              disabled
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13px] font-bold text-gray-400 outline-none cursor-not-allowed"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Task Name</label>
                            <input 
                              type="text" 
                              value={manualForm.title}
                              onChange={e => setManualForm({...manualForm, title: e.target.value})}
                              className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold text-navy outline-none focus:border-primary shadow-sm transition-colors" 
                              placeholder="e.g. Build authentication API"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Required Role</label>
                            <div className="relative">
                              <div 
                                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                                className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold text-navy outline-none focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 shadow-sm cursor-pointer flex justify-between items-center transition-all"
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
                                      className={`px-5 py-2.5 text-[13px] cursor-pointer transition-colors ${
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
                            <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Priority Level</label>
                            <div className="flex space-x-2">
                              {['Low', 'Medium', 'High'].map(p => (
                                <button 
                                  key={p}
                                  onClick={() => setManualForm({...manualForm, priority: p})}
                                  className={`flex-1 py-2 rounded-xl text-[12px] font-bold transition-colors ${manualForm.priority === p ? getPriorityColor(p) : 'bg-white border border-gray-200 text-gray-500'}`}
                                >
                                  {p}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Assignee</label>
                            {manualForm.assignee ? (
                              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-xl">
                                <div className="flex items-center">
                                  <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold mr-3">{manualForm.assignee.initials}</div>
                                  <span className="font-bold text-navy text-[13px]">{manualForm.assignee.fullName}</span>
                                </div>
                                <button onClick={() => setManualForm({...manualForm, assignee: null})} className="text-gray-400 hover:text-red-500 text-[11px] font-bold">Remove</button>
                              </div>
                            ) : (
                              <div className="p-3 border border-dashed border-gray-300 rounded-xl text-[12px] text-primary font-bold text-center bg-blue-50/30">
                                Select Developer from the right panel →
                              </div>
                            )}
                          </div>

                          <div className="pt-3">
                             <button 
                               onClick={handleAssignManualTask}
                               disabled={!manualForm.title.trim() || !manualForm.assignee || isAssigning}
                               className="w-full bg-primary hover:bg-blue-600 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-sm flex justify-center items-center disabled:opacity-50 text-[13px]"
                             >
                               {isAssigning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                               Assign Task
                             </button>
                          </div>
                        </div>

                        {manualTasks.length > 0 && (
                          <div className="mt-6 max-w-lg">
                            <h4 className="text-[10px] font-bold text-gray-400 mb-2.5 uppercase tracking-wide">Recent Assignments</h4>
                            <div className="space-y-2.5">
                              {manualTasks.map((t, i) => (
                                <div key={i} className="bg-green-50 p-3.5 rounded-xl border border-green-100 flex justify-between items-center">
                                  <div>
                                    <h5 className="font-bold text-green-800 text-[13px] flex items-center"><CheckCircle2 className="w-3.5 h-3.5 mr-1.5"/> {t.displayId}: {t.title}</h5>
                                    <p className="text-[11px] text-green-600 mt-1 font-semibold">Assigned to: {t.assignee?.fullName}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* RIGHT PANE: DEVELOPERS LIST */}
                <div className="w-2/5 flex flex-col h-full bg-white">
                  <div className="p-6 border-b border-gray-50 flex justify-between items-center text-sm font-bold text-gray-500 flex-shrink-0">
                    <span className="flex items-center"><User className="w-4 h-4 mr-2" /> Developers</span>
                    {activeTask && <span className="text-xs font-normal text-gray-400">Click to assign</span>}
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {displayedDevelopers.map((dev) => {
                      const isOverloaded = dev.currentLoad >= dev.maxLoad;
                      const percent = Math.min((dev.currentLoad / dev.maxLoad) * 100, 100);
                      
                      let barColor = 'bg-green-500';
                      if (isOverloaded) barColor = 'bg-red-500';
                      else if (percent >= 80) barColor = 'bg-orange-500';
                      else if (percent >= 50) barColor = 'bg-yellow-400';

                      let isRecommended = false;
                      if (activeTask && activeTask.requiredRole && !isOverloaded) {
                        const role = activeTask.requiredRole.toLowerCase();
                        const skills = dev.skills.toLowerCase();
                        isRecommended = skills.includes(role) || (role.includes("end") && (skills.includes("full stack") || skills.includes("full-stack")));
                      }

                      return (
                        <div 
                          key={dev.id} 
                          onClick={() => handleSelectDeveloper(dev)}
                          className={`p-5 rounded-2xl transition-all border ${
                            isOverloaded
                              ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                              : isRecommended 
                                ? 'border-green-300 shadow-[0_4px_14px_rgba(16,185,129,0.1)] bg-white cursor-pointer hover:border-green-400' 
                                : 'border-gray-100 hover:shadow-md hover:border-blue-200 bg-white cursor-pointer'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white ${isOverloaded ? 'bg-gray-400' : 'bg-[#0B1A28]'}`}>
                                {dev.initials}
                              </div>
                              <div>
                                <h4 className="font-bold text-navy text-[15px]">{dev.fullName}</h4>
                                <p className="text-[11px] text-gray-400 mt-0.5">{dev.skills}</p>
                              </div>
                            </div>
                            {isRecommended && <span className="bg-green-50 text-green-600 text-[10px] font-bold px-2 py-1 rounded">Recommended</span>}
                            {isOverloaded && <span className="flex items-center bg-red-50 text-red-600 text-[10px] font-bold px-2 py-1 rounded"><AlertCircle className="w-3 h-3 mr-1"/> Overloaded</span>}
                          </div>
                          
                          <div>
                            <div className="flex justify-between text-[11px] font-bold text-gray-400 mb-1.5">
                              <span>Workload</span>
                              <span className={isOverloaded ? 'text-red-500' : ''}>{dev.currentLoad}/{dev.maxLoad}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${percent}%` }}></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}