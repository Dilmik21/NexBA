import { useState, useEffect } from "react";
import { Link } from "react-router-dom"; 
import BATopBar from "../../components/BA/BATopBar"; 
import BASidebar from "../../components/BA/BASidebar";
import { useAuth } from "../../contexts/AuthContext";
import { Inbox, ClipboardCheck, AlertTriangle, FileText, ArrowRight, Activity, Users, MessageSquare, Briefcase, Loader2, Send } from "lucide-react";

export default function BAOverview() {
  const { currentUser, userData } = useAuth(); 
  
  const [data, setData] = useState({
    stats: { pendingReviews: 0, verificationQueue: 0, criticalRisks: 0, activeRequirements: 0 },
    inbox: [], changeRequests: [], developerLoad: [], verificationQueue: []
  });
  
  const [progressTimeline, setProgressTimeline] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentUser) return; 
      
      try {
        const [overviewRes, progressRes] = await Promise.all([
          fetch(`http://localhost:5000/api/ba/overview?uid=${currentUser.uid}`),
          fetch(`http://localhost:5000/api/ba/progress?uid=${currentUser.uid}`).catch(() => null)
        ]);

        const overviewJson = await overviewRes.json();
        if (overviewJson.success) setData(overviewJson.data);

        if (progressRes && progressRes.ok) {
           const progressJson = await progressRes.json();
           if (progressJson.success && progressJson.data?.timeline) {
              setProgressTimeline(progressJson.data.timeline);
           }
        }
      } catch (error) {
        console.error("Error fetching BA data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [currentUser]); 

  const firstName = userData?.fullName?.split(" ")[0] || "BA";

  const getDevLoadStyle = (count) => {
    let color = "bg-[#10B981]"; 
    let textColor = "text-white";
    
    if (count >= 8) { 
      color = "bg-red-500"; 
    } else if (count >= 4) { 
      color = "bg-yellow-500"; 
    }
    
    const widthPercent = Math.min((count / 10) * 100, 100); 
    const finalWidth = widthPercent < 5 ? 5 : widthPercent; 
    
    return { color, textColor, widthPercent: finalWidth };
  };

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

  const unclaimedInbox = data.inbox.filter(item => item.isNew);

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <BATopBar />

      <div className="flex max-w-[1600px] mx-auto pt-6 px-4 md:px-6 gap-8">
        <div className="hidden lg:block flex-shrink-0">
          <BASidebar />
        </div>

        <div className="flex-1 pb-10 flex flex-col space-y-6">
          
          {/* Header */}
          <div>
            <h1 className="text-[22px] md:text-2xl font-bold text-navy">BA Dashboard</h1>
            <p className="text-gray-500 mt-1 text-[13px] md:text-sm">Good morning, {firstName}. Here's your command center overview.</p>
          </div>

          {/* 4 STAT CARDS */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-6">
            <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm flex flex-col">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center mb-2 md:mb-4"><Inbox className="w-4 h-4 md:w-5 md:h-5" /></div>
              <h2 className="text-2xl md:text-4xl font-black text-navy">{isLoading ? <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin text-gray-300" /> : data.stats.pendingReviews}</h2>
              <p className="text-[11px] md:text-sm font-medium text-gray-500 mt-1">Requirement Inbox</p>
            </div>
            <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm flex flex-col">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-yellow-50 text-yellow-500 flex items-center justify-center mb-2 md:mb-4"><ClipboardCheck className="w-4 h-4 md:w-5 md:h-5" /></div>
              <h2 className="text-2xl md:text-4xl font-black text-navy">{isLoading ? <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin text-gray-300" /> : data.stats.verificationQueue}</h2>
              <p className="text-[11px] md:text-sm font-medium text-gray-500 mt-1">Verify Queue</p>
            </div>
            <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm flex flex-col">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-red-50 text-red-500 flex items-center justify-center mb-2 md:mb-4"><AlertTriangle className="w-4 h-4 md:w-5 md:h-5" /></div>
              <h2 className="text-2xl md:text-4xl font-black text-navy">{isLoading ? <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin text-gray-300" /> : data.stats.criticalRisks}</h2>
              <p className="text-[11px] md:text-sm font-medium text-gray-500 mt-1">Critical Risks</p>
            </div>
            <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm flex flex-col">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-green-50 text-green-500 flex items-center justify-center mb-2 md:mb-4"><FileText className="w-4 h-4 md:w-5 md:h-5" /></div>
              <h2 className="text-2xl md:text-4xl font-black text-navy">{isLoading ? <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin text-gray-300" /> : data.stats.activeRequirements}</h2>
              <p className="text-[11px] md:text-sm font-medium text-gray-500 mt-1 truncate">Active Requirement</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            
            {/* REQUIREMENT INBOX */}
            <div className="bg-white rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="px-4 py-3 md:px-6 md:py-4 border-b border-gray-50 flex justify-between items-center flex-shrink-0">
                <div className="flex items-center space-x-2 md:space-x-3">
                  <Inbox className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                  <h3 className="font-bold text-navy text-[13px] md:text-base">Unclaimed Requirements</h3>
                  {!isLoading && data.stats.pendingReviews > 0 && (
                    <span className="hidden sm:inline-block bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                      {data.stats.pendingReviews} new
                    </span>
                  )}
                </div>
                <Link to="/ba/inbox" className="text-xs md:text-sm font-bold text-primary flex items-center hover:underline whitespace-nowrap">
                  View All <ArrowRight className="w-3 h-3 md:w-4 md:h-4 ml-1"/>
                </Link>
              </div>
              <div className="divide-y divide-gray-50 flex-1 overflow-y-auto max-h-[300px]">
                {isLoading ? (
                  <div className="px-6 py-8 text-center text-gray-500 text-sm flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Syncing...</div>
                ) : unclaimedInbox.length === 0 ? (
                  <div className="px-6 py-8 text-center text-gray-500 text-[13px] md:text-sm">You're all caught up! No pending requirements in the requirement inbox.</div>
                ) : (
                  unclaimedInbox.map((item, i) => (
                    <div key={i} className="px-4 py-3 md:px-6 md:py-4 flex justify-between items-center hover:bg-gray-50 cursor-pointer transition-colors">
                      <div className="flex items-start space-x-3 md:space-x-4 min-w-0 pr-4">
                        {item.isNew ? (
                          <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 md:mt-2 flex-shrink-0 shadow-sm shadow-blue-200 animate-pulse"></div>
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-transparent mt-1.5 md:mt-2 flex-shrink-0"></div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-navy text-[13px] md:text-sm truncate">{item.title}</p>
                          <p className="text-[11px] md:text-xs text-gray-500 mt-0.5 truncate">{item.client} • {item.id}</p>
                        </div>
                      </div>
                      <span className="text-[10px] md:text-xs font-medium text-gray-400 whitespace-nowrap flex-shrink-0">{item.time}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* PENDING CHANGE REQUESTS */}
            <div className="bg-white rounded-2xl md:rounded-3xl border-l-4 border-orange-500 shadow-sm overflow-hidden flex flex-col border-y border-r border-gray-100">
              <div className="px-4 py-3 md:px-6 md:py-4 border-b border-gray-50 flex justify-between items-center bg-orange-50/30 flex-shrink-0">
                <div className="flex items-center space-x-2 md:space-x-3">
                  <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-orange-500" />
                  <h3 className="font-bold text-navy text-[13px] md:text-base">Pending Changes</h3>
                  {!isLoading && data.changeRequests.length > 0 && (
                    <span className="hidden sm:inline-block bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                      {data.changeRequests.length}
                    </span>
                  )}
                </div>
                <Link to="/ba/changes" className="text-xs md:text-sm font-bold text-primary flex items-center hover:underline whitespace-nowrap">
                  Review All <ArrowRight className="w-3 h-3 md:w-4 md:h-4 ml-1"/>
                </Link>
              </div>
              <div className="divide-y divide-gray-50 flex-1 overflow-y-auto max-h-[300px]">
                {isLoading ? (
                  <div className="px-6 py-8 text-center text-gray-500 text-sm flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Syncing...</div>
                ) : data.changeRequests.length === 0 ? (
                  <div className="px-6 py-8 text-center text-gray-500 text-[13px] md:text-sm">No pending change requests in your workspace.</div>
                ) : (
                  data.changeRequests.map((req, i) => (
                    <div key={i} className="px-4 py-3 md:px-6 md:py-4 flex justify-between items-center hover:bg-gray-50 cursor-pointer transition-colors">
                      <div className="min-w-0 pr-4">
                        <p className="font-bold text-navy text-[13px] md:text-sm truncate">{req.id}: {req.title}</p>
                        <p className="text-[11px] md:text-xs text-gray-500 mt-0.5 truncate">From {req.from} • {req.time}</p>
                      </div>
                      <span className={`text-[9px] md:text-[10px] font-bold px-2 md:px-2.5 py-1 rounded-md flex-shrink-0 ${req.risk === 'High' ? 'bg-red-50 text-red-600' : req.risk === 'Medium' ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'}`}>
                        {req.risk} Risk
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            
            {/* DEVELOPER LOAD */}
            <div className="bg-white rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="px-4 py-3 md:px-6 md:py-4 border-b border-gray-50 flex justify-between items-center flex-shrink-0">
                <div className="flex items-center space-x-2 md:space-x-3">
                  <Users className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                  <h3 className="font-bold text-navy text-[13px] md:text-base">Developer Load</h3>
                </div>
                <Link to="/ba/tasks" className="text-xs md:text-sm font-bold text-primary flex items-center hover:underline whitespace-nowrap">
                  Assign Tasks <ArrowRight className="w-3 h-3 md:w-4 md:h-4 ml-1"/>
                </Link>
              </div>
              <div className="p-4 md:p-6 space-y-3 md:space-y-4 flex-1 overflow-y-auto max-h-[300px]">
                {isLoading ? (
                  <div className="text-center text-gray-500 text-sm flex items-center justify-center py-4"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Syncing loads...</div>
                ) : (
                  data.developerLoad.map((dev, i) => {
                    const { color, textColor, widthPercent } = getDevLoadStyle(dev.count || 0);
                    
                    return (
                      <div key={i} className="flex items-center text-xs md:text-sm">
                        <div className="w-24 md:w-40 text-gray-600 font-medium truncate pr-2 md:pr-4">{dev.name}</div>
                        <div className="flex-1 h-5 md:h-6 bg-gray-50 rounded-md overflow-hidden relative">
                          <div 
                            className={`h-full ${color} rounded-md flex items-center justify-end px-2 md:px-3 transition-all duration-500`}
                            style={{ width: `${widthPercent}%` }}
                          >
                            <span className={`text-[10px] md:text-xs font-bold ${textColor}`}>
                              {dev.count}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* VERIFICATION QUEUE */}
            <div className="bg-white rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="px-4 py-3 md:px-6 md:py-4 border-b border-gray-50 flex justify-between items-center flex-shrink-0">
                <h3 className="font-bold text-navy text-[13px] md:text-base">My Verification Queue</h3>
                <Link to="/ba/verification" className="text-xs md:text-sm font-bold text-primary flex items-center hover:underline whitespace-nowrap">
                  View All <ArrowRight className="w-3 h-3 md:w-4 md:h-4 ml-1"/>
                </Link>
              </div>
              <div className="divide-y divide-gray-50 flex-1 overflow-y-auto max-h-[300px]">
                {isLoading ? (
                  <div className="px-6 py-8 text-center text-gray-500 text-sm flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Syncing...</div>
                ) : data.verificationQueue.length === 0 ? (
                  <div className="px-6 py-8 text-center text-gray-500 text-[13px] md:text-sm">No items pending verification for your requirements.</div>
                ) : (
                  data.verificationQueue.map((item, i) => (
                    <div key={i} className="px-4 py-3 md:px-6 md:py-4 hover:bg-gray-50 cursor-pointer transition-colors">
                      <p className="font-bold text-navy text-[13px] md:text-sm truncate">{item.title}</p>
                      <p className="text-[11px] md:text-xs text-gray-500 mt-1 truncate">{item.dev} • {item.date}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* QUICK ACTIONS */}
          <div>
            <h3 className="font-bold text-navy mb-3 md:mb-4 px-2 text-[15px] md:text-base">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <Link to="/ba/analysis" className="bg-white border border-gray-200 hover:border-primary hover:text-primary hover:bg-blue-50 transition-all text-gray-600 font-semibold p-4 rounded-xl md:rounded-2xl flex items-center text-[13px] md:text-sm shadow-sm">
                <Activity className="w-4 h-4 md:w-5 md:h-5 mr-3 text-blue-500" /> AI Workspace
              </Link>
              <Link to="/ba/tasks" className="bg-white border border-gray-200 hover:border-primary hover:text-primary hover:bg-blue-50 transition-all text-gray-600 font-semibold p-4 rounded-xl md:rounded-2xl flex items-center text-[13px] md:text-sm shadow-sm">
                <Briefcase className="w-4 h-4 md:w-5 md:h-5 mr-3 text-purple-500" /> Assign Tasks
              </Link>
              <Link to="/ba/communication" className="bg-white border border-gray-200 hover:border-primary hover:text-primary hover:bg-blue-50 transition-all text-gray-600 font-semibold p-4 rounded-xl md:rounded-2xl flex items-center text-[13px] md:text-sm shadow-sm">
                <MessageSquare className="w-4 h-4 md:w-5 md:h-5 mr-3 text-green-500" /> Comms Hub
              </Link>
              <Link to="/ba/reports" className="bg-white border border-gray-200 hover:border-primary hover:text-primary hover:bg-blue-50 transition-all text-gray-600 font-semibold p-4 rounded-xl md:rounded-2xl flex items-center text-[13px] md:text-sm shadow-sm">
                <ClipboardCheck className="w-4 h-4 md:w-5 md:h-5 mr-3 text-orange-500" /> Client Status
              </Link>
            </div>
          </div>

          {/* EXACT DEVELOPER PROGRESS TRACKER */}
          <div className="bg-white rounded-[20px] md:rounded-[24px] border border-gray-100 shadow-sm mb-6 md:mb-8 overflow-hidden">
            <div className="px-5 md:px-6 py-4 md:py-5 border-b border-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-navy text-[15px] md:text-[16px] flex items-center">
                <Activity className="w-4 h-4 text-[#007BFF] mr-2" /> Developer Updates
              </h3>
              <span className="text-[11px] md:text-[12px] font-semibold text-gray-400">Live Team Progress</span>
            </div>
            <div className="p-5 md:p-6 space-y-6 md:space-y-8">
              {isLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
              ) : (!progressTimeline || progressTimeline.length === 0) ? (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-500">No active requirements are currently being worked on by developers.</p>
                </div>
              ) : (
                progressTimeline.map((req, idx) => (
                  <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-8 py-2">
                    
                    {/* LEFT SIDE (30%) */}
                    <div className="w-full md:w-[30%] min-w-0">
                      <p className="text-[11px] md:text-[12px] font-bold text-gray-400 mb-0.5 tracking-wide">{req.reqId}</p>
                      <h4 className="font-medium text-navy text-[14px] md:text-[15px] truncate">{req.title}</h4>
                      <p className="text-[10px] text-gray-400 mt-1">Updated {formatDateTime(req.rawDate)}</p>
                    </div>

                    {/* RIGHT SIDE (70%) */}
                    <div className="w-full md:w-[70%] flex items-center gap-3 md:gap-4">
                      
                      <span className={`px-3 py-1 rounded-md text-[10px] md:text-[11px] font-bold min-w-[90px] md:min-w-[100px] text-center flex-shrink-0 ${req.stageColor}`}>
                        {req.stage}
                      </span>
                      
                      {/* THE PROGRESS BAR WITH INTERNAL PERCENTAGE */}
                      <div className="flex-1 bg-gray-100 rounded-full h-3.5 md:h-4 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 flex items-center justify-end px-2 ${req.barColor}`} 
                          style={{ width: `${Math.max(req.progress, 5)}%` }}
                        >
                          {req.progress > 8 && (
                            <span className="text-[9px] md:text-[10px] font-bold text-white leading-none mb-0.5">
                              {req.progress}%
                            </span>
                          )}
                        </div>
                      </div>

                      {/* QUICK UPDATE BUTTON */}
                      <Link 
                        to={`/ba/communication?reqId=${req.reqId}&tab=Developer`} 
                        className="flex-shrink-0 flex items-center justify-center bg-white border border-gray-200 text-navy hover:border-[#007BFF] hover:text-[#007BFF] font-bold text-[11px] px-3 py-2 rounded-lg transition-all shadow-sm"
                      >
                        <Send className="w-3.5 h-3.5 mr-1.5" /> Quick Update
                      </Link>

                    </div>
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