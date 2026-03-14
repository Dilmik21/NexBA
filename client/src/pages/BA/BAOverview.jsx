import { useState, useEffect } from "react";
import { Link } from "react-router-dom"; 
import BATopBar from "../../components/BA/BATopBar"; 
import BASidebar from "../../components/BA/BASidebar";
import { Inbox, ClipboardCheck, AlertTriangle, FileText, ArrowRight, Activity, Users, MessageSquare, Briefcase, Loader2 } from "lucide-react";

export default function BAOverview() {
  // FIXED: Initialize with a default structure so the page renders instantly!
  const [data, setData] = useState({
    stats: { pendingReviews: 0, verificationQueue: 0, criticalRisks: 0, activeRequirements: 0 },
    inbox: [], changeRequests: [], developerLoad: [], verificationQueue: [], developerUpdates: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/ba/overview");
        const json = await response.json();
        if (json.success) setData(json.data);
      } catch (error) {
        console.error("Error fetching BA data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <BATopBar />

      <div className="flex max-w-[1600px] mx-auto pt-6 px-6 gap-8">
        <div className="hidden lg:block flex-shrink-0">
          <BASidebar />
        </div>

        <div className="flex-1 pb-10 flex flex-col space-y-6">
          
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-navy">BA Dashboard</h1>
            <p className="text-gray-500 mt-1 text-sm">Good morning, Bhashi. Here's your command center overview.</p>
          </div>

          {/* 4 STAT CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center mb-4"><Inbox className="w-5 h-5" /></div>
              <h2 className="text-4xl font-black text-navy">{isLoading ? <Loader2 className="w-6 h-6 animate-spin text-gray-300" /> : data.stats.pendingReviews}</h2>
              <p className="text-sm font-medium text-gray-500 mt-1">Pending Reviews</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-yellow-50 text-yellow-500 flex items-center justify-center mb-4"><ClipboardCheck className="w-5 h-5" /></div>
              <h2 className="text-4xl font-black text-navy">{isLoading ? <Loader2 className="w-6 h-6 animate-spin text-gray-300" /> : data.stats.verificationQueue}</h2>
              <p className="text-sm font-medium text-gray-500 mt-1">Verification Queue</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center mb-4"><AlertTriangle className="w-5 h-5" /></div>
              <h2 className="text-4xl font-black text-navy">{isLoading ? <Loader2 className="w-6 h-6 animate-spin text-gray-300" /> : data.stats.criticalRisks}</h2>
              <p className="text-sm font-medium text-gray-500 mt-1">Critical Risks</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-green-50 text-green-500 flex items-center justify-center mb-4"><FileText className="w-5 h-5" /></div>
              <h2 className="text-4xl font-black text-navy">{isLoading ? <Loader2 className="w-6 h-6 animate-spin text-gray-300" /> : data.stats.activeRequirements}</h2>
              <p className="text-sm font-medium text-gray-500 mt-1">Active Requirements</p>
            </div>
          </div>

          {/* REQUIREMENT INBOX */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <Inbox className="w-5 h-5 text-gray-400" />
                <h3 className="font-bold text-navy">Requirement Inbox</h3>
                {!isLoading && data.stats.pendingReviews > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                    {data.stats.pendingReviews} new
                  </span>
                )}
              </div>
              <Link to="/ba/inbox" className="text-sm font-bold text-primary flex items-center hover:underline">
                View All <ArrowRight className="w-4 h-4 ml-1"/>
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {isLoading ? (
                <div className="px-6 py-8 text-center text-gray-500 text-sm flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Syncing...</div>
              ) : data.inbox.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500 text-sm">You're all caught up! No pending requirements.</div>
              ) : (
                data.inbox.map((item, i) => (
                  <div key={i} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50 cursor-pointer transition-colors">
                    <div className="flex items-start space-x-4">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0 shadow-sm shadow-blue-200"></div>
                      <div>
                        <p className="font-bold text-navy text-sm">{item.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.client} • {item.id}</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-gray-400 whitespace-nowrap ml-4">{item.time}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* PENDING CHANGE REQUESTS */}
          <div className="bg-white rounded-3xl border-l-4 border-orange-500 shadow-sm overflow-hidden border-y border-r border-gray-100">
            <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center bg-orange-50/30">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <h3 className="font-bold text-navy">Pending Change Requests</h3>
                {!isLoading && data.changeRequests.length > 0 && (
                  <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                    {data.changeRequests.length}
                  </span>
                )}
              </div>
              <Link to="/ba/changes" className="text-sm font-bold text-primary flex items-center hover:underline">
                Review All <ArrowRight className="w-4 h-4 ml-1"/>
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {isLoading ? (
                <div className="px-6 py-8 text-center text-gray-500 text-sm flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Syncing...</div>
              ) : data.changeRequests.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500 text-sm">No pending change requests at the moment.</div>
              ) : (
                data.changeRequests.map((req, i) => (
                  <div key={i} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50 cursor-pointer transition-colors">
                    <div>
                      <p className="font-bold text-navy text-sm">{req.id}: {req.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">From {req.from} • {req.time}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${req.risk === 'High' ? 'bg-red-50 text-red-600' : req.risk === 'Medium' ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'}`}>
                      {req.risk} Risk
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* DEVELOPER LOAD */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-gray-400" />
                <h3 className="font-bold text-navy">Developer Load</h3>
              </div>
              <Link to="/ba/tasks" className="text-sm font-bold text-primary flex items-center hover:underline">
                Assign Tasks <ArrowRight className="w-4 h-4 ml-1"/>
              </Link>
            </div>
            <div className="p-6 space-y-4">
              {isLoading ? (
                <div className="text-center text-gray-500 text-sm flex items-center justify-center py-4"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Syncing loads...</div>
              ) : (
                data.developerLoad.map((dev, i) => (
                  <div key={i} className="flex items-center text-sm">
                    <div className="w-40 text-gray-600 font-medium truncate pr-4">{dev.name}</div>
                    <div className="flex-1 h-6 bg-gray-50 rounded-md overflow-hidden relative">
                      <div 
                        className={`h-full ${dev.color} rounded-md flex items-center justify-end px-3 transition-all duration-500`}
                        style={{ width: `${dev.widthPercent}%` }}
                      >
                        <span className={`text-xs font-bold ${dev.textColor}`}>{dev.count}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* VERIFICATION QUEUE */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-navy">Verification Queue</h3>
              <Link to="/ba/verification" className="text-sm font-bold text-primary flex items-center hover:underline">
                View All <ArrowRight className="w-4 h-4 ml-1"/>
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {isLoading ? (
                <div className="px-6 py-8 text-center text-gray-500 text-sm flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Syncing...</div>
              ) : data.verificationQueue.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500 text-sm">No items pending verification at the moment.</div>
              ) : (
                data.verificationQueue.map((item, i) => (
                  <div key={i} className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors">
                    <p className="font-bold text-navy text-sm">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.dev} • {item.date}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* QUICK ACTIONS */}
          <div>
            <h3 className="font-bold text-navy mb-4 px-2">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Link to="/ba/analysis" className="bg-white border border-gray-200 hover:border-primary hover:text-primary hover:bg-blue-50 transition-all text-gray-600 font-semibold p-4 rounded-2xl flex items-center text-sm shadow-sm">
                <Activity className="w-5 h-5 mr-3" /> Open AI Workspace
              </Link>
              <Link to="/ba/tasks" className="bg-white border border-gray-200 hover:border-primary hover:text-primary hover:bg-blue-50 transition-all text-gray-600 font-semibold p-4 rounded-2xl flex items-center text-sm shadow-sm">
                <Briefcase className="w-5 h-5 mr-3" /> Assign Tasks
              </Link>
              <Link to="/ba/communication" className="bg-white border border-gray-200 hover:border-primary hover:text-primary hover:bg-blue-50 transition-all text-gray-600 font-semibold p-4 rounded-2xl flex items-center text-sm shadow-sm">
                <MessageSquare className="w-5 h-5 mr-3" /> Communication Hub
              </Link>
              <Link to="/ba/reports" className="bg-white border border-gray-200 hover:border-primary hover:text-primary hover:bg-blue-50 transition-all text-gray-600 font-semibold p-4 rounded-2xl flex items-center text-sm shadow-sm">
                <ClipboardCheck className="w-5 h-5 mr-3" /> Update Client Status
              </Link>
            </div>
          </div>

          {/* DEVELOPER UPDATES */}
          <div className="bg-white rounded-3xl border-l-4 border-green-500 shadow-sm overflow-hidden border-y border-r border-gray-100 mt-2">
            <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center bg-green-50/30">
              <div className="flex items-center space-x-3">
                <MessageSquare className="w-5 h-5 text-green-500" />
                <h3 className="font-bold text-navy">Developer Updates</h3>
                {!isLoading && data.developerUpdates.length > 0 && (
                  <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                    {data.developerUpdates.length} new
                  </span>
                )}
              </div>
              <Link to="/ba/communication" className="text-sm font-bold text-primary flex items-center hover:underline">
                Open Hub <ArrowRight className="w-4 h-4 ml-1"/>
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {isLoading ? (
                <div className="px-6 py-8 text-center text-gray-500 text-sm flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Syncing...</div>
              ) : data.developerUpdates.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500 text-sm">No new developer updates right now.</div>
              ) : (
                data.developerUpdates.map((update, i) => (
                  <div key={i} className="px-6 py-4 flex items-start space-x-4 hover:bg-gray-50 cursor-pointer transition-colors">
                    <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-bold ${update.color} flex-shrink-0 mt-1 shadow-sm`}>
                      {update.initials}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-navy text-sm">{update.name}</span>
                        {update.task && update.task !== "General" && (
                          <span className="text-[9px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-bold">{update.task}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1 leading-relaxed">{update.message}</p>
                    </div>
                    <span className="text-[10px] font-medium text-gray-400 whitespace-nowrap">{update.time}</span>
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