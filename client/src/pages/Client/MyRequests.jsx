import { useState, useEffect } from "react";
// Added 'X' to the imports for the modal close button!
import { Search, Filter, Plus, Eye, FileText, File as FileIcon, X } from "lucide-react";
import ClientTopBar from "../../components/Client/ClientTopBar";
import ClientSidebar from "../../components/Client/ClientSidebar";
import NewProjectModal from "../../components/Client/NewProjectModal";

export default function MyRequests() {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filtering and Modals
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStage, setFilterStage] = useState("All Stages");
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // State to hold the specific request when the eye icon is clicked
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/client/requests");
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

  const getStageStyle = (stage) => {
    switch (stage) {
      // UPDATED: Removed 'Pending BA Review', kept only 'Analysis'
      case "Analysis":
        return "bg-orange-50 text-orange-600 ring-1 ring-orange-500/20";
      case "Development":
        return "bg-blue-50 text-blue-600 ring-1 ring-blue-500/20";
      case "UAT":
        return "bg-purple-50 text-purple-600 ring-1 ring-purple-500/20";
      case "Live":
        return "bg-green-50 text-green-600 ring-1 ring-green-500/20";
      case "Draft":
        return "bg-gray-100 text-gray-600 ring-1 ring-gray-500/20";
      default:
        return "bg-gray-50 text-gray-500 ring-1 ring-gray-500/20";
    }
  };

  const getPriorityColor = (priority) => {
    if (priority === 'High') return 'text-red-500 font-bold';
    if (priority === 'Medium') return 'text-orange-500 font-bold';
    if (priority === 'Low') return 'text-green-500 font-bold';
    return 'text-gray-500';
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = req.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          req.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = filterStage === "All Stages" || req.stage === filterStage;
    return matchesSearch && matchesStage;
  });

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      
      <NewProjectModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          fetchRequests(); 
        }} 
      />

      <ClientTopBar />

      <div className="flex max-w-[1600px] mx-auto pt-6 px-6 gap-8">
        
        <div className="hidden lg:block w-64 flex-shrink-0">
          <ClientSidebar />
        </div>

        <div className="flex-1 pb-10">
          
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-navy">My Requests</h1>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-primary hover:bg-blue-600 text-white px-6 py-2.5 rounded-full font-bold flex items-center shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5"
            >
              <Plus className="w-5 h-5 mr-2" strokeWidth={3} /> New Project
            </button>
          </div>

          {/* Controls: Search & Filter */}
          <div className="flex space-x-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Search by ID or keyword..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-gray-100 text-navy placeholder-gray-400 pl-12 pr-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
              />
            </div>
            
            <div className="relative">
              <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 flex items-center shadow-sm cursor-pointer hover:bg-gray-50 transition-colors">
                <Filter className="w-5 h-5 text-gray-400 mr-3" />
                <select 
                  value={filterStage}
                  onChange={(e) => setFilterStage(e.target.value)}
                  className="bg-transparent outline-none text-navy font-semibold cursor-pointer appearance-none pr-4"
                >
                  <option value="All Stages">All Stages</option>
                  {/* UPDATED: Removed "Pending BA Review" option here */}
                  <option value="Analysis">Analysis</option>
                  <option value="Development">Development</option>
                  <option value="UAT">UAT</option>
                  <option value="Live">Live</option>
                </select>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white border border-gray-100 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">ID</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Title</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Submitted</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Stage</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Priority</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-500">Loading requests...</td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-500">No requests found.</td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="py-4 px-6 text-sm text-gray-400 font-bold">{req.id}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <span className="font-bold text-navy text-sm">{req.title}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center space-x-1 ${req.type === 'document' ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'}`}>
                            {req.type === 'document' ? 'File' : 'Text'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-500 font-medium">{req.date}</td>
                      <td className="py-4 px-6">
                        <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${getStageStyle(req.stage)}`}>
                          {req.stage}
                        </span>
                      </td>
                      <td className={`py-4 px-6 text-sm ${getPriorityColor(req.priority)}`}>
                        {req.priority}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {/* THE BUTTON: Click this to open the modal! */}
                        <button 
                          onClick={() => setSelectedRequest(req)} 
                          className="text-gray-400 hover:text-primary transition-colors p-2 rounded-xl hover:bg-blue-50"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            
            <div className="px-6 py-4 border-t border-gray-50 text-xs font-semibold text-gray-400 bg-gray-50/30">
              Showing {filteredRequests.length} of {requests.length} requirements
            </div>
          </div>

        </div>
      </div>

      {/* ========================================= */}
      {/* THE NEW "VIEW DETAILS" MODAL */}
      {/* ========================================= */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-navy/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50 rounded-t-[2rem]">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Requirement Details</p>
                <h2 className="text-xl font-bold text-navy">{selectedRequest.title}</h2>
              </div>
              <button 
                onClick={() => setSelectedRequest(null)} 
                className="p-2 hover:bg-white border border-transparent hover:border-gray-200 hover:shadow-sm rounded-full text-gray-400 hover:text-navy transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto">
              
              {/* Top Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">ID</p>
                  <p className="font-bold text-navy">{selectedRequest.id}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Submitted</p>
                  <p className="font-bold text-navy">{selectedRequest.date}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Priority</p>
                  <p className={getPriorityColor(selectedRequest.priority)}>{selectedRequest.priority}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Stage</p>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${getStageStyle(selectedRequest.stage)}`}>
                    {selectedRequest.stage}
                  </span>
                </div>
              </div>

              {/* Dynamic Content: Description OR File */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center">
                  {selectedRequest.type === 'document' ? <FileIcon className="w-4 h-4 mr-2"/> : <FileText className="w-4 h-4 mr-2"/>}
                  {selectedRequest.type === 'document' ? 'Attached Document' : 'Full Description'}
                </p>
                
                {selectedRequest.type === 'document' ? (
                  <div className="flex items-center space-x-4 bg-orange-50 p-5 rounded-2xl border border-orange-100">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-orange-500 shadow-sm">
                      <FileIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-navy">{selectedRequest.fileName}</p>
                      <p className="text-xs text-gray-500 mt-1">This document is currently under review by the Business Analyst.</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 text-gray-600 whitespace-pre-wrap text-sm leading-relaxed shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
                    {selectedRequest.description}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}