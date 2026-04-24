import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DevTopBar from "../../components/Developer/DevTopBar";
import DevSidebar from "../../components/Developer/DevSidebar";
import { useAuth } from "../../contexts/AuthContext";
import { ListChecks, Clock, CheckCircle2, AlertTriangle, ArrowRight, FolderKanban } from "lucide-react";

export default function DevDashboard() {
  const { currentUser, userData } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (currentUser?.uid) {
      fetchDashboardData();
    }
  }, [currentUser]);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/dev/dashboard?uid=${currentUser.uid}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch dev dashboard:", error);
    }
  };

  const getFirstName = () => userData?.fullName?.split(" ")[0] || "Developer";

  const formatDateTime = (dateInput) => {
    if (!dateInput) return "Recently";
    try {
      let d = new Date();
      if (typeof dateInput === 'string' || typeof dateInput === 'number') d = new Date(dateInput);
      else if (dateInput._seconds) d = new Date(dateInput._seconds * 1000);
      else if (dateInput.seconds) d = new Date(dateInput.seconds * 1000);
      
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' at ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch(e) { return "Recently"; }
  };

  return (
    // THE FIX: Removed overflow-hidden and flex-col to allow standard native scrolling!
    <div className="min-h-screen bg-[#F5F7FA]">
      <DevTopBar />

      <div className="flex max-w-[1600px] w-full mx-auto pt-6 px-4 md:px-6 gap-8 pb-12">
        
        {/* THE FIX: The Sidebar Wrapper is now perfectly Sticky just like the Client side! */}
        <div className="hidden lg:block w-[260px] flex-shrink-0">
          <div className="sticky top-[100px] h-[calc(100vh-130px)]">
            <DevSidebar />
          </div>
        </div>

        {/* Main Content Area naturally scrolls down externally */}
        <div className="flex-1 min-w-0">
          
          <div className="mb-6 md:mb-8 flex-shrink-0">
            <h1 className="text-[20px] md:text-[24px] font-bold text-navy">Developer Dashboard</h1>
            <p className="text-[13px] md:text-[15px] text-gray-500 mt-1">Good morning, {getFirstName()}. Here's your work summary.</p>
          </div>

          {/* --- KPI CARDS --- */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
            <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-6 border border-gray-100 shadow-sm flex flex-col justify-center transition-transform hover:shadow-md">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4 md:mb-6">
                <ListChecks className="w-5 h-5 md:w-6 md:h-6 text-[#007BFF]" />
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-navy mb-1">{data?.stats?.assigned || 0}</h2>
              <p className="text-[12px] md:text-[14px] font-medium text-gray-500 truncate">Assigned Projects</p>
            </div>

            <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-6 border border-gray-100 shadow-sm flex flex-col justify-center transition-transform hover:shadow-md">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-yellow-50 rounded-xl flex items-center justify-center mb-4 md:mb-6">
                <Clock className="w-5 h-5 md:w-6 md:h-6 text-yellow-600" />
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-navy mb-1">{data?.stats?.inProgress || 0}</h2>
              <p className="text-[12px] md:text-[14px] font-medium text-gray-500 truncate">In Progress Projects</p>
            </div>

            <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-6 border border-gray-100 shadow-sm flex flex-col justify-center transition-transform hover:shadow-md">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-green-50 rounded-xl flex items-center justify-center mb-4 md:mb-6">
                <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-navy mb-1">{data?.stats?.completedProjects || 0}</h2>
              <p className="text-[12px] md:text-[14px] font-medium text-gray-500 truncate">Completed Projects</p>
            </div>

            <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-6 border border-gray-100 shadow-sm flex flex-col justify-center transition-transform hover:shadow-md">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-red-50 rounded-xl flex items-center justify-center mb-4 md:mb-6">
                <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-red-500" />
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-navy mb-1">{data?.stats?.overdue || 0}</h2>
              <p className="text-[12px] md:text-[14px] font-medium text-gray-500 truncate">Overdue Projects</p>
            </div>
          </div>

          {/* New Assignments */}
          <div className="bg-white rounded-[20px] md:rounded-[24px] border border-blue-100 shadow-sm mb-6 md:mb-8 overflow-hidden ring-1 ring-blue-50">
            <div className="px-5 md:px-6 py-4 md:py-5 border-b border-blue-50 bg-blue-50/30 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-[#007BFF]" />
                <h3 className="font-bold text-navy text-[15px] md:text-[16px]">New Assignments</h3>
              </div>
              <span className="bg-[#007BFF] text-white text-[10px] md:text-[11px] font-bold px-2 py-1 rounded-full">
                {data?.newAssignments?.length || 0} New
              </span>
            </div>
            <div className="divide-y divide-gray-50">
              {(!data?.newAssignments || data.newAssignments.length === 0) ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  {data === null ? "Loading new assignments..." : "There are no new requirements waiting for your team."}
                </div>
              ) : (
                data.newAssignments.map((assignment, idx) => (
                  <div key={idx} className="p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-bold text-[#007BFF] bg-blue-50 px-2 py-0.5 rounded">{assignment.reqId}</span>
                        <span className="text-[11px] text-gray-400">{assignment.timeAgo}</span>
                      </div>
                      <h4 className="font-bold text-navy text-[14px] md:text-[15px]">{assignment.title}</h4>
                      <p className="text-[12px] text-gray-500 mt-1">{assignment.taskCount} tasks pending completion</p>
                    </div>
                    <Link 
                      to="/dev/tasks" 
                      state={{ selectedReqId: assignment.reqId }}
                      className="inline-flex items-center justify-center bg-white border border-gray-200 hover:border-[#007BFF] hover:text-[#007BFF] text-navy font-semibold text-[13px] px-4 py-2 rounded-xl transition-all shadow-sm w-full sm:w-auto"
                    >
                      View in My Tasks <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Requirement Progress */}
          <div className="bg-white rounded-[20px] md:rounded-[24px] border border-gray-100 shadow-sm mb-6 md:mb-8 overflow-hidden">
            <div className="px-5 md:px-6 py-4 md:py-5 border-b border-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-navy text-[15px] md:text-[16px]">Requirement Progress</h3>
              <span className="text-[11px] md:text-[12px] font-semibold text-gray-400">Assigned to you</span>
            </div>
            <div className="p-5 md:p-6 space-y-6 md:space-y-8">
              {(!data?.requirementProgress || data.requirementProgress.length === 0) ? (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-500">
                    {data === null ? "Loading project progress..." : "No active requirements are currently in progress."}
                  </p>
                  {data !== null && <p className="text-[12px] text-gray-400 mt-1">Start a task in a "New Assignment" to track progress here.</p>}
                </div>
              ) : (
                data.requirementProgress.map((req, idx) => (
                  <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-10">
                    
                    <div className="w-full md:w-[35%] min-w-0">
                      <p className="text-[11px] md:text-[12px] font-bold text-gray-400 mb-0.5 tracking-wide">{req.reqId}</p>
                      <h4 className="font-medium text-navy text-[14px] md:text-[15px] truncate">{req.title}</h4>
                      <p className="text-[10px] text-gray-400 mt-1">Updated {formatDateTime(req.rawDate)}</p>
                    </div>
                    
                    <div className="w-full md:w-[65%] flex items-center gap-3 md:gap-4">
                      <span className={`px-3 py-1 rounded-md text-[10px] md:text-[11px] font-bold min-w-[90px] md:min-w-[100px] text-center ${req.stageColor}`}>
                        {req.stage}
                      </span>
                      
                      <div className="flex-1 bg-gray-100 rounded-full h-3.5 md:h-4 overflow-hidden relative">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 flex items-center justify-end px-2 ${req.barColor}`} 
                          style={{ width: `${Math.max(req.progress, 5)}%` }}
                        >
                          {req.progress > 5 && (
                            <span className="text-[9px] md:text-[10px] font-bold text-white leading-none z-10">
                              {req.progress}%
                            </span>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-[20px] md:rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 md:px-6 py-4 md:py-5 border-b border-gray-50">
              <h3 className="font-bold text-navy text-[15px] md:text-[16px]">Recent Activity</h3>
            </div>
            <div className="p-0">
              {(!data?.recentActivity || data.recentActivity.length === 0) ? (
                <p className="text-sm text-gray-500 text-center py-8">
                   {data === null ? "Loading activity..." : "No recent activity."}
                </p>
              ) : (
                data.recentActivity.map((activity, idx) => (
                  <div key={idx} className="flex items-start px-5 md:px-6 py-4 md:py-5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <div className={`w-2 h-2 mt-1.5 rounded-full mr-3 md:mr-4 flex-shrink-0 ${
                      activity.type === 'evidence' ? 'bg-green-500' : 'bg-[#007BFF]'
                    }`}></div>
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-[13px] md:text-[14px] text-navy leading-relaxed truncate md:whitespace-normal">
                        <span className="font-bold">{activity.refId}</span> — {activity.text}
                      </p>
                    </div>
                    <span className="text-[11px] md:text-[12px] font-medium text-gray-400 flex-shrink-0 mt-0.5">{activity.timeAgo}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}