import { useState, useEffect } from "react";
import DevTopBar from "../../components/Developer/DevTopBar";
import DevSidebar from "../../components/Developer/DevSidebar";
import { useAuth } from "../../contexts/AuthContext";
import { Loader2, CheckCircle2, TrendingUp, Clock, AlertTriangle, Target, SearchX } from "lucide-react";

export default function Performance() {
  const { currentUser } = useAuth();
  const [performanceData, setPerformanceData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPerformanceData = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/dev/performance?uid=${currentUser.uid}`);
      const json = await res.json();
      if (json.success) {
        setPerformanceData(json);
      }
    } catch (error) {
      console.error("Failed to fetch performance data:", error);
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.uid) {
      fetchPerformanceData(false);
      
      const intervalId = setInterval(() => {
        fetchPerformanceData(true);
      }, 5000);
      
      return () => clearInterval(intervalId);
    }
  }, [currentUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex flex-col">
        <DevTopBar />
        <div className="flex max-w-[1600px] w-full mx-auto pt-6 px-4 md:px-6 gap-8 pb-10 flex-1">
          <div className="hidden lg:block flex-shrink-0 sticky top-[104px] h-[calc(100vh-104px)]">
            <DevSidebar />
          </div>
          <div className="flex-1 flex flex-col min-w-0 items-center justify-center min-h-[500px]">
            <Loader2 className="w-8 h-8 animate-spin text-[#007BFF]" />
          </div>
        </div>
      </div>
    );
  }

  const { stats, weeklyData, recentCompletions } = performanceData || {
    stats: { completed: 0, onTimeRate: 0, avgDays: 0, activeTasks: 0 },
    weeklyData: [],
    recentCompletions: []
  };

  const maxTasksInAWeek = Math.max(...weeklyData.map(w => w.onTime + w.late), 1);

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col">
      <DevTopBar />

      <div className="flex max-w-[1600px] w-full mx-auto pt-6 px-4 md:px-6 gap-8 pb-10 flex-1">
        
        <div className="hidden lg:block flex-shrink-0 sticky top-[104px] h-[calc(100vh-104px)]">
          <DevSidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0 pb-6">
          
          <div className="mb-6 flex-shrink-0">
            <h1 className="text-[20px] md:text-[24px] font-bold text-navy">Performance</h1>
            <p className="text-[13px] md:text-[15px] text-gray-500 mt-1">Track your sprint velocity, task completion rates, and recent activity.</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
            
            <div className="bg-white rounded-2xl p-6 border-l-[5px] border-[#10B981] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
                </div>
                <span className="text-[12px] font-bold text-gray-500 uppercase tracking-widest">Tasks Completed</span>
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-extrabold text-navy leading-none">{stats.completed}</h2>
                <p className="text-[13px] text-gray-400 font-medium mt-1.5">This Week</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border-l-[5px] border-[#007BFF] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-[#007BFF]" />
                </div>
                <span className="text-[12px] font-bold text-gray-500 uppercase tracking-widest">On Time Rate</span>
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-extrabold text-navy leading-none">{stats.onTimeRate}%</h2>
                <p className="text-[13px] text-gray-400 font-medium mt-1.5">Consistency</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border-l-[5px] border-yellow-400 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-full bg-yellow-50 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-500" />
                </div>
                <span className="text-[12px] font-bold text-gray-500 uppercase tracking-widest">Avg Completion</span>
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-extrabold text-navy leading-none">
                  {stats.avgDays} <span className="text-xl text-gray-400 font-semibold ml-1">days</span>
                </h2>
                <p className="text-[13px] text-gray-400 font-medium mt-1.5">Per task</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border-l-[5px] border-purple-500 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center">
                  <Target className="w-5 h-5 text-purple-500" />
                </div>
                <span className="text-[12px] font-bold text-gray-500 uppercase tracking-widest">Active Workload</span>
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-extrabold text-navy leading-none">{stats.activeTasks}</h2>
                <p className="text-[13px] text-gray-400 font-medium mt-1.5">Tasks in progress</p>
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* --- RESTORED: THICK BAR CHART DESIGN WITH LEGEND --- */}
            <div className="bg-white rounded-[24px] p-7 md:p-8 border border-gray-100 shadow-sm flex flex-col">
              <div className="mb-10">
                <h3 className="font-bold text-navy text-[18px]">Weekly Completion</h3>
                <p className="text-[13px] text-gray-400 font-medium mt-1">On Time vs Late — Last 4 weeks</p>
              </div>

              <div className="flex-1 flex flex-col justify-center space-y-7">
                {weeklyData.length === 0 ? (
                  <div className="text-center text-gray-400 italic text-sm">Not enough data to chart.</div>
                ) : (
                  weeklyData.map((week, idx) => {
                    const total = week.onTime + week.late;
                    
                    const barWidthPercent = total === 0 ? 0 : (total / maxTasksInAWeek) * 100;
                    const onTimePercent = total === 0 ? 0 : (week.onTime / total) * 100;
                    const latePercent = total === 0 ? 0 : (week.late / total) * 100;

                    return (
                      <div key={idx} className="flex items-center gap-4">
                        <span className="text-[13px] font-bold text-gray-500 w-14 flex-shrink-0">{week.week}</span>
                        
                        <div className="flex-1 flex h-9 items-center">
                          {total === 0 ? (
                             <div className="w-full h-full bg-gray-50 border border-dashed border-gray-200 rounded-lg flex items-center px-4">
                               <span className="text-[12px] text-gray-400 font-medium italic">No tasks completed</span>
                             </div>
                          ) : (
                             <div 
                               className="h-full flex rounded-lg overflow-hidden shadow-sm transition-all duration-700"
                               style={{ width: `${barWidthPercent}%`, minWidth: '4rem' }}
                             >
                               {week.onTime > 0 && (
                                 <div 
                                   className="bg-[#10B981] h-full flex items-center px-3 transition-all duration-500"
                                   style={{ width: `${onTimePercent}%` }}
                                 >
                                   <span className="text-[12px] font-bold text-white">{week.onTime}</span>
                                 </div>
                               )}
                               {week.late > 0 && (
                                 <div 
                                   className="bg-red-500 h-full flex items-center justify-end px-3 transition-all duration-500 border-l border-white/20"
                                   style={{ width: `${latePercent}%` }}
                                 >
                                   <span className="text-[12px] font-bold text-white">{week.late}</span>
                                 </div>
                               )}
                             </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* RESTORED: Legend at the bottom */}
              <div className="flex items-center gap-6 mt-10 pt-6 border-t border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-3.5 h-3.5 rounded-sm bg-[#10B981] shadow-sm"></div>
                  <span className="text-[13px] font-bold text-gray-500">On Time</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-3.5 h-3.5 rounded-sm bg-red-500 shadow-sm"></div>
                  <span className="text-[13px] font-bold text-gray-500">Late</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm flex flex-col h-[450px]">
              <div className="p-7 md:p-8 pb-4 flex-shrink-0 border-b border-gray-50">
                <h3 className="font-bold text-navy text-[18px]">Recent Completions</h3>
                <p className="text-[13px] text-gray-400 font-medium mt-1">Tasks submitted for review</p>
              </div>

              {/* CHANGED: Removed custom-scrollbar class so it uses the native browser scrollbar */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {recentCompletions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-10 text-center">
                     <SearchX className="w-12 h-12 text-gray-200 mb-3" />
                     <p className="text-gray-400 font-bold text-[14px]">No recent completions</p>
                  </div>
                ) : (
                  recentCompletions.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-4 rounded-[14px] border border-gray-100 hover:border-blue-100 hover:shadow-sm transition-all group bg-white mx-2">
                      
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm transition-transform group-hover:scale-105 ${
                          task.status === 'On Time' ? 'bg-green-50' : 'bg-red-50'
                        }`}>
                          {task.status === 'On Time' 
                            ? <CheckCircle2 className="w-5 h-5 text-[#10B981]" /> 
                            : <AlertTriangle className="w-5 h-5 text-red-500" />
                          }
                        </div>
                        
                        <div className="min-w-0 pr-4">
                          <h4 className="text-[14px] font-bold text-navy truncate group-hover:text-[#007BFF] transition-colors">{task.title}</h4>
                          <p className="text-[12px] font-semibold text-gray-400 mt-1">{task.taskId}</p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end flex-shrink-0">
                        <span className="text-[12px] font-bold text-navy mb-1.5">{task.dateStr}</span>
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${
                          task.status === 'On Time' ? 'bg-green-50 text-[#10B981]' : 'bg-red-50 text-red-500'
                        }`}>
                          {task.status}
                        </span>
                      </div>

                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}