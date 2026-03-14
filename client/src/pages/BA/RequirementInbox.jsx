import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BATopBar from "../../components/BA/BATopBar";
import BASidebar from "../../components/BA/BASidebar";
import { LayoutGrid, List, FileText, File, Calendar, User, ArrowRight, Loader2, Inbox } from "lucide-react";

export default function RequirementInbox() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState("cards"); 
  const [requirements, setRequirements] = useState([]);
  const [selectedReq, setSelectedReq] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInbox = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/ba/inbox");
        const json = await response.json();
        if (json.success) {
          setRequirements(json.data);
          if (json.data.length > 0) setSelectedReq(json.data[0]);
        }
      } catch (error) {
        console.error("Error fetching inbox:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInbox();
  }, []);

  const handleCardClick = (req) => {
    setSelectedReq(req);
    setViewMode("list");
  };

  const handleProcessAI = (reqId) => {
    navigate(`/ba/analysis?reqId=${reqId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA]">
        <BATopBar />
        <div className="flex max-w-[1600px] mx-auto pt-6 px-6 gap-8">
          <div className="hidden lg:block flex-shrink-0">
            <BASidebar />
          </div>
          <div className="flex-1 pb-10 flex flex-col items-center justify-center h-[calc(100vh-100px)]">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-gray-500 font-medium">Syncing Inbox...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <BATopBar />

      <div className="flex max-w-[1600px] mx-auto pt-6 px-6 gap-8">
        <div className="hidden lg:block flex-shrink-0">
          <BASidebar />
        </div>

        <div className="flex-1 pb-10 flex flex-col h-[calc(100vh-100px)]">
          
          {/* HEADER & TOGGLE */}
          <div className="flex justify-between items-end mb-6 flex-shrink-0">
            <div>
              <h1 className="text-2xl font-bold text-navy">Requirement Inbox</h1>
              <p className="text-gray-500 mt-1 text-sm">{requirements.length} new requirements awaiting review.</p>
            </div>
            
            <div className="flex bg-white rounded-xl shadow-sm border border-gray-100 p-1">
              <button 
                onClick={() => setViewMode("cards")}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === "cards" ? "bg-blue-50 text-primary" : "text-gray-500 hover:text-navy"}`}
              >
                <LayoutGrid className="w-4 h-4 mr-2" /> Cards
              </button>
              <button 
                onClick={() => setViewMode("list")}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === "list" ? "bg-blue-50 text-primary" : "text-gray-500 hover:text-navy"}`}
              >
                <List className="w-4 h-4 mr-2" /> List
              </button>
            </div>
          </div>

          {requirements.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-3xl border border-gray-100 py-20">
              <Inbox className="w-16 h-16 text-gray-200 mb-4" />
              <h2 className="text-xl font-bold text-navy">Inbox is Empty</h2>
              <p className="text-gray-500 mt-2">You have no pending requirements to review.</p>
            </div>
          ) : viewMode === "cards" ? (
            
            /* CARDS VIEW */
            <div className="flex-1 overflow-y-auto pr-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {requirements.map((req) => (
                  <div 
                    key={req.id} 
                    onClick={() => handleCardClick(req)}
                    className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group relative flex flex-col h-64"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex space-x-2">
                        <span className={`flex items-center text-[10px] font-bold px-2.5 py-1 rounded-md ${req.type === 'Text' ? 'bg-blue-50 text-primary' : 'bg-orange-50 text-orange-600'}`}>
                          {req.type === 'Text' ? <FileText className="w-3 h-3 mr-1"/> : <File className="w-3 h-3 mr-1"/>}
                          {req.type}
                        </span>
                        {/* FIXED: Uses req.priority instead of req.risk */}
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${req.priority === 'High' ? 'bg-red-50 text-red-600' : req.priority === 'Medium' ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'}`}>
                          {req.priority}
                        </span>
                      </div>
                      {req.isNew && (
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                      )}
                    </div>

                    <p className="text-sm text-gray-500 line-clamp-3 mb-4 flex-1">
                      {req.type === 'File' ? req.fileName : req.description}
                    </p>

                    <div className="mt-auto">
                      <h3 className="font-bold text-navy truncate group-hover:text-primary transition-colors">{req.title}</h3>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-400">{req.submitter}</span>
                        <span className="text-xs text-gray-400 font-medium">{req.timeAgo}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          ) : (

            /* LIST VIEW */
            <div className="flex gap-6 flex-1 min-h-0">
              
              <div className="w-80 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-50 flex items-center text-gray-500 font-semibold text-sm flex-shrink-0">
                  <Inbox className="w-4 h-4 mr-2" /> All Requests ({requirements.length})
                </div>
                <div className="overflow-y-auto flex-1 p-2 space-y-1">
                  {requirements.map(req => (
                    <div 
                      key={req.id}
                      onClick={() => setSelectedReq(req)}
                      className={`p-4 rounded-2xl cursor-pointer transition-colors border border-transparent ${selectedReq?.id === req.id ? 'bg-blue-50 border-blue-100' : 'hover:bg-gray-50 hover:border-gray-100'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {req.isNew && <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>}
                          <span className="text-xs font-bold text-gray-400">{req.id}</span>
                        </div>
                        <div className="flex space-x-1.5">
                          {/* FIXED: Uses req.priority instead of req.risk */}
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${req.priority === 'High' ? 'text-red-600 bg-red-50' : req.priority === 'Medium' ? 'text-yellow-600 bg-yellow-50' : 'text-green-600 bg-green-50'}`}>{req.priority}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${req.type === 'Text' ? 'text-primary bg-blue-50/50' : 'text-orange-600 bg-orange-50'}`}>{req.type}</span>
                        </div>
                      </div>
                      <h4 className={`font-bold text-sm truncate ${selectedReq?.id === req.id ? 'text-primary' : 'text-navy'}`}>{req.title}</h4>
                      <p className="text-xs text-gray-400 mt-1 truncate">{req.submitter} • {req.timeAgo}</p>
                    </div>
                  ))}
                </div>
              </div>

              {selectedReq && (
                <div className="flex-1 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col min-h-0">
                  
                  <div className="p-8 border-b border-gray-50 flex-shrink-0">
                    <div className="flex items-center space-x-3 mb-4">
                      <span className="text-sm font-bold text-gray-400">{selectedReq.id}</span>
                      {/* FIXED: Uses selectedReq.priority */}
                      <span className={`text-xs font-bold px-2 py-1 rounded-md ${selectedReq.priority === 'High' ? 'bg-red-50 text-red-600' : selectedReq.priority === 'Medium' ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'}`}>{selectedReq.priority}</span>
                      <span className={`flex items-center text-xs font-bold px-2 py-1 rounded-md ${selectedReq.type === 'Text' ? 'bg-blue-50 text-primary' : 'bg-orange-50 text-orange-600'}`}>
                        {selectedReq.type === 'Text' ? <FileText className="w-3 h-3 mr-1"/> : <File className="w-3 h-3 mr-1"/>}
                        {selectedReq.type === 'Text' ? 'Text Requirement' : 'Document Requirement'}
                      </span>
                    </div>
                    <h2 className="text-2xl font-black text-navy mb-4">{selectedReq.title}</h2>
                    <div className="flex items-center text-sm text-gray-500 space-x-6">
                      <span className="flex items-center"><User className="w-4 h-4 mr-2 text-gray-400"/> {selectedReq.submitter}</span>
                      <span>—</span>
                      <span className="font-medium text-gray-600">{selectedReq.company}</span>
                      <span className="flex items-center"><Calendar className="w-4 h-4 mr-2 text-gray-400 ml-4"/> {selectedReq.fullDate}</span>
                    </div>
                  </div>

                  <div className="p-8 flex-1 overflow-y-auto">
                    <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">
                      {selectedReq.type === 'Text' ? 'Original Requirement Text' : 'Uploaded Document'}
                    </h3>
                    
                    {selectedReq.type === 'Text' ? (
                      <div className="bg-[#F7F9FC] p-6 rounded-2xl text-navy text-sm leading-relaxed mb-6 border border-transparent whitespace-pre-wrap">
                        {selectedReq.description}
                      </div>
                    ) : (
                      <div className="bg-[#F7F9FC] p-6 rounded-2xl border border-gray-100 flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-bold text-navy text-sm">{selectedReq.fileName}</p>
                            <p className="text-xs text-gray-500 mt-1">PDF • Uploaded {selectedReq.fullDate}</p>
                          </div>
                        </div>
                        <button className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm">
                          Preview
                        </button>
                      </div>
                    )}

                    <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 flex">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-primary flex items-center justify-center flex-shrink-0 mr-4">
                        <Inbox className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-primary text-sm mb-1">
                          {selectedReq.type === 'Text' ? 'Next Step' : 'Document Requirement'}
                        </h4>
                        <p className="text-sm text-blue-900/70">
                          {selectedReq.type === 'Text' 
                            ? "Process this requirement through AI Analysis to generate a summary, detect ambiguities, and build clarification questions."
                            : "This requirement was submitted as a document. Process it through AI Analysis to extract text via OCR and generate a structured summary."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 border-t border-gray-50 flex justify-end items-center flex-shrink-0 bg-white rounded-b-3xl">
                    <button 
                      onClick={() => handleProcessAI(selectedReq.id)}
                      className="bg-primary hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-bold text-sm transition-colors shadow-[0_4px_14px_0_rgba(10,102,194,0.39)] hover:shadow-[0_6px_20px_rgba(10,102,194,0.23)] flex items-center"
                    >
                      Process with AI <ArrowRight className="w-4 h-4 ml-2" />
                    </button>
                  </div>

                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}