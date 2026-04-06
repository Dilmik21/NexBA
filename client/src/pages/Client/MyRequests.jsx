import { useState, useEffect, useRef } from "react";
import { Search, Filter, Plus, Eye, X, ChevronDown, Check } from "lucide-react";
import { getAuth, onAuthStateChanged } from "firebase/auth"; 
import { useLocation, useNavigate } from "react-router-dom"; // IMPORTED ROUTER HOOKS
import ClientTopBar from "../../components/Client/ClientTopBar";
import ClientSidebar from "../../components/Client/ClientSidebar";
import NewProjectModal from "../../components/Client/NewProjectModal";

export default function MyRequests() {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStage, setFilterStage] = useState("All Stages");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [currentUid, setCurrentUid] = useState(null);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();

  const stageOptions = [
    "All Stages",
    "Pending BA Review",
    "In Analysis", 
    "Clarification Needed",
    "Sent to Engineering",
    "In Progress",
    "Ready for Review",
    "Pending Verification",
    "Client UAT",
    "Change Requested",
    "Completed"
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUid(user.uid);
        fetchRequests(user.uid);
      } else {
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchRequests = async (uidToUse) => {
    try {
      setIsLoading(true);
      const response = await fetch(`http://localhost:5000/api/client/requests?uid=${uidToUse}`);
      const data = await response.json();
      if (data.success) {
        setRequests(data.data);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- NEW: AUTO-SELECT AND FILTER FROM TOPBAR SEARCH ---
  useEffect(() => {
    if (!isLoading && requests.length > 0 && location.state?.highlightReqId) {
      const targetId = location.state.highlightReqId;
      
      // Filter the table
      setSearchTerm(targetId);
      setFilterStage("All Stages");
      
      // Auto-open the modal
      const targetReq = requests.find(r => r.id === targetId);
      if (targetReq) {
        setSelectedRequest(targetReq);
      }

      // Clear the background state so it doesn't re-trigger if they close the modal
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [isLoading, requests, location.state, navigate, location.pathname]);

  const getStageStyle = (stage) => {
    const s = stage?.toLowerCase() || "";
    
    if (s === "pending ba review") return "bg-gray-100 text-gray-600 border border-gray-200";
    if (s.includes("analysis")) return "bg-yellow-50 text-yellow-700 border border-yellow-200";
    if (s.includes("clarification")) return "bg-red-50 text-red-600 border border-red-200";
    if (s.includes("sent to engineering")) return "bg-blue-50 text-blue-500 border border-blue-200";
    if (s.includes("in progress")) return "bg-blue-100 text-blue-700 border border-blue-300";
    if (s.includes("ready for review")) return "bg-teal-50 text-teal-700 border border-teal-200";
    if (s.includes("pending verification") || s.includes("awaiting verification")) return "bg-purple-50 text-purple-700 border border-purple-200";
    if (s.includes("change requested") || s.includes("modification requested")) return "bg-orange-50 text-orange-600 border border-orange-200";
    if (s.includes("uat") || s.includes("pending approval")) return "bg-indigo-50 text-indigo-600 border border-indigo-200";
    if (s.includes("complete") || s.includes("done") || s.includes("approved") || s.includes("live")) return "bg-green-50 text-green-700 border border-green-200";
    
    return "bg-gray-50 text-gray-500 border border-gray-200";
  };

  const getPriorityColor = (priority) => {
    if (priority === 'High') return 'text-red-500 font-bold';
    if (priority === 'Medium') return 'text-orange-500 font-bold';
    return 'text-green-500 font-bold';
  };

  const filteredRequests = requests.filter(req => {
    const searchString = searchTerm.toLowerCase();
    const matchesSearch = req.title?.toLowerCase().includes(searchString) || 
                          req.id?.toLowerCase().includes(searchString);
    const matchesStage = filterStage === "All Stages" || req.stage === filterStage;
    return matchesSearch && matchesStage;
  });

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <NewProjectModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          if (currentUid) fetchRequests(currentUid); 
        }} 
      />
      <ClientTopBar />

      <div className="flex max-w-[1600px] mx-auto pt-6 px-4 md:px-6 gap-8">
        <div className="hidden lg:block w-64 flex-shrink-0">
          <ClientSidebar />
        </div>

        <div className="flex-1 pb-10 flex flex-col h-[calc(100vh-100px)]">
          
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 gap-4">
            <div>
              <h1 className="text-[22px] md:text-2xl font-bold text-navy">My Requests</h1>
              <p className="text-gray-500 mt-1 text-[13px] md:text-sm">Manage and track the live progress of your submitted project requirements.</p>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-primary hover:bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center shadow-md transition-all active:scale-95 text-sm"
            >
              <Plus className="w-5 h-5 mr-2" strokeWidth={3} /> New Project
            </button>
          </div>

          {/* SEARCH & FILTER BAR */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8 flex-shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Search by ID or keyword..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-gray-200 text-navy placeholder-gray-400 pl-11 pr-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
              />
            </div>
            
            <div className="relative w-full sm:w-64" ref={filterRef}>
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between shadow-sm w-full hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center text-navy font-semibold text-sm">
                  <Filter className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                  <span className="truncate">{filterStage}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isFilterOpen ? "rotate-180" : ""}`} />
              </button>

              {isFilterOpen && (
                <div className="absolute top-full right-0 mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-xl z-20 py-1 max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                  {stageOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setFilterStage(option);
                        setIsFilterOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between group transition-colors"
                    >
                      <span className={`${filterStage === option ? "font-bold text-primary" : "text-gray-600 group-hover:text-navy"}`}>
                        {option}
                      </span>
                      {filterStage === option && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl md:rounded-[2rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="overflow-y-auto flex-1 w-full">
              <table className="w-full text-left border-collapse relative">
                <thead className="sticky top-0 bg-white z-10 border-b border-gray-100">
                  <tr>
                    <th className="py-6 px-8 text-[11px] font-bold text-gray-400 uppercase tracking-widest w-[15%]">ID</th>
                    <th className="py-6 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest w-[40%]">Title</th>
                    <th className="py-6 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest w-[20%]">Stage</th>
                    <th className="py-6 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest w-[15%]">Priority</th>
                    <th className="py-6 px-8 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-right w-[10%]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {isLoading ? (
                    <tr><td colSpan="5" className="text-center py-20 text-gray-400">Loading your data...</td></tr>
                  ) : filteredRequests.length === 0 ? (
                    <tr><td colSpan="5" className="text-center py-20 text-gray-400">No matching requests found.</td></tr>
                  ) : (
                    filteredRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="py-5 px-8 text-xs font-bold text-gray-400 tracking-wider">{req.id}</td>
                        <td className="py-5 px-6 font-bold text-navy truncate max-w-xs">{req.title}</td>
                        <td className="py-5 px-6 text-left">
                          <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap ${getStageStyle(req.stage)}`}>
                            {req.stage}
                          </span>
                        </td>
                        <td className={`py-5 px-6 text-sm ${getPriorityColor(req.priority)}`}>{req.priority}</td>
                        <td className="py-5 px-8 text-right">
                          <button 
                            onClick={() => setSelectedRequest(req)} 
                            className="text-gray-300 hover:text-primary hover:bg-blue-50 p-2 rounded-xl transition-all"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {!isLoading && (
              <div className="px-8 py-5 border-t border-gray-100 bg-white text-[11px] font-medium text-gray-400 tracking-wide mt-auto">
                Showing {filteredRequests.length} requirement(s). Data is synced in real-time.
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 bg-navy/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-3xl">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Requirement Details</p>
                <h2 className="text-xl font-bold text-navy">{selectedRequest.title}</h2>
              </div>
              <button onClick={() => setSelectedRequest(null)} className="p-2 text-gray-400 hover:bg-white hover:text-navy rounded-full transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8 overflow-y-auto">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 text-gray-600 text-sm leading-relaxed whitespace-pre-wrap shadow-inner">
                {selectedRequest.description || "No description provided."}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}