import { useState, useEffect } from "react";
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
      case "Pending BA Review":
      case "Analysis": 
      case "In Analysis":
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
    
    // Ensure the filter works even if the DB has the old "Analysis" text
    const displayStage = (req.stage === "Analysis" || req.stage === "In Analysis") ? "Pending BA Review" : req.stage;
    const matchesStage = filterStage === "All Stages" || displayStage === filterStage;
    
    return matchesSearch && matchesStage;
  });

  // Helper to cleanly format the text on the UI
  const getDisplayStageText = (stage) => {
    if (stage === "Analysis" || stage === "In Analysis") return "Pending BA Review";
    return stage;
  };

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

        {/* UPDATED: Added h-[calc(100vh-100px)] and flex flex-col to match other pages */}
        <div className="flex-1 pb-10 flex flex-col h-[calc(100vh-100px)]">
          
          {/* Header */}
          <div className="flex justify-between items-center mb-8 flex-shrink-0">
            <h1 className="text-2xl font-bold text-navy">My Requests</h1>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-primary hover:bg-blue-600 text-white px-6 py-2.5 rounded-full font-bold flex items-center shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5"
            >
              <Plus className="w-5 h-5 mr-2" strokeWidth={3} /> New Project
            </button>
          </div>

          {/* Controls: Search & Filter */}
          <div className="flex space-x-4 mb-6 flex-shrink-0">
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
                  <option value="Pending BA Review">Pending BA Review</option>
                  <option value="Development">Development</option>
                  <option value="UAT">UAT</option>
                  <option value="Live">Live</option>
                </select>
              </div>
            </div>
          </div>

          {/* Data Table Container - UPDATED to handle scrolling */}
          <div className="bg-white border border-gray-100 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col flex-1 min-h-0 overflow-hidden">
            
            {/* Scrollable Area */}
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-left border-collapse">
                {/* UPDATED: Sticky Header so it stays at the top while scrolling */}
                <thead className="sticky top-0 bg-gray-50/95 backdrop-blur-sm z-10 border-b border-gray-100">
                  <tr>
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
                          <span className={`text-[11px] font-bold px-3 py-1 rounded-full inline-block whitespace-nowrap ${getStageStyle(req.stage)}`}>
                            {getDisplayStageText(req.stage)}
                          </span>
                        </td>
                        <td className={`py-4 px-6 text-sm ${getPriorityColor(req.priority)}`}>
                          {req.priority}
                        </td>
                        <td className="py-4 px-6 text-center">
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
            </div>

            {/* Footer attached to the bottom of the table container */}
            <div className="px-6 py-4 border-t border-gray-50 text-xs font-semibold text-gray-400 bg-gray-50/30 flex-shrink-0">
              Showing {filteredRequests.length} of {requests.length} requirements
            </div>
          </div>

        </div>
      </div>

      {/* THE VIEW DETAILS MODAL */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-navy/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            
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

            <div className="p-8 overflow-y-auto">
              
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
                  {/* ADDED whitespace-nowrap and inline-block to fix the wrapping issue in the modal! */}
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-md inline-block whitespace-nowrap ${getStageStyle(selectedRequest.stage)}`}>
                    {getDisplayStageText(selectedRequest.stage)}
                  </span>
                </div>
              </div>

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