import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BATopBar from "../../components/BA/BATopBar";
import BASidebar from "../../components/BA/BASidebar";
import { useAuth } from "../../contexts/AuthContext";
import { LayoutGrid, List, User, ArrowRight, Loader2, Inbox, UserPlus, Activity, FileText, Download, Eye, ArrowLeft, Calendar, ExternalLink, File } from "lucide-react";

// --- Document Viewer Component ---
const DocumentViewer = ({ fileName, fileData }) => {
  const safeName = fileName || "document.pdf";
  const ext = safeName.split('.').pop().toLowerCase();
  const isImage = fileData?.startsWith('data:image') || ['jpeg', 'jpg', 'gif', 'png'].includes(ext);
  const isViewable = isImage || ext === 'pdf';

  if (!fileData) {
      return (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-gray-400" />
                  <div>
                      <p className="text-sm font-bold text-navy">{safeName}</p>
                      <p className="text-[10px] text-gray-500">File content unavailable (Legacy project)</p>
                  </div>
              </div>
          </div>
      );
  }

  if (!isViewable) {
      return (
           <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0 pr-4">
                  <FileText className="w-6 h-6 text-primary flex-shrink-0" />
                  <div className="min-w-0">
                      <p className="text-sm font-bold text-navy truncate">{safeName}</p>
                      <p className="text-[10px] text-primary">Click download to view</p>
                  </div>
              </div>
              <a href={fileData} download={safeName} className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-white rounded-full text-primary hover:bg-primary hover:text-white transition-colors shadow-sm">
                  <Download className="w-4 h-4" />
              </a>
           </div>
      );
  }

  return (
      <div className="flex flex-col border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm h-full">
          <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0 pr-4">
                  <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-xs font-bold text-navy truncate">{safeName}</span>
              </div>
              <a href={fileData} download={safeName} className="text-primary hover:text-blue-700 p-1 flex-shrink-0" title="Download">
                  <Download className="w-4 h-4" />
              </a>
          </div>
          <div className="h-[400px] w-full bg-gray-100 relative flex items-center justify-center">
              {isImage ? (
                  <img src={fileData} alt="Document" className="max-w-full max-h-full object-contain p-2" />
              ) : (
                  <iframe src={fileData} className="w-full h-full absolute inset-0" title="Document Viewer" />
              )}
          </div>
      </div>
  );
}

export default function RequirementInbox() {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState("cards"); 
  const [requirements, setRequirements] = useState([]);
  const [selectedReq, setSelectedReq] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [viewingDocument, setViewingDocument] = useState(false);

  const fetchInbox = async () => {
    if (!currentUser) return;
    try {
      const response = await fetch(`http://localhost:5000/api/ba/inbox?uid=${currentUser.uid}`);
      const json = await response.json();
      if (json.success) {
        setRequirements(json.data);
        if (json.data.length > 0) {
          setSelectedReq(json.data[0]);
          setViewingDocument(false);
        } else {
          setSelectedReq(null);
        }
      }
    } catch (error) {
      console.error("Error fetching inbox:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, [currentUser]);

  const handleCardClick = (req) => {
    setSelectedReq(req);
    setViewingDocument(false);
    setViewMode("list");
  };

  const handleActionClick = async (req) => {
    if (!req.isNew) {
      navigate(`/ba/analysis?reqId=${req.id}`);
      return;
    }

    setIsClaiming(true);
    try {
      const baName = userData?.fullName || "Business Analyst";
      const res = await fetch(`http://localhost:5000/api/ba/claim/${req.id}?uid=${currentUser.uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baName })
      });
      
      const json = await res.json();
      if (json.success) {
        navigate(`/ba/analysis?reqId=${req.id}`);
      } else {
        alert("Failed to claim. Another BA might have already grabbed this requirement!");
        fetchInbox(); 
      }
    } catch (error) {
      console.error("Failed to claim requirement:", error);
      alert("Network error while claiming requirement.");
    }
    setIsClaiming(false);
  };

  const hasFile = selectedReq ? (selectedReq.type === 'File' || (selectedReq.fileName && selectedReq.fileName !== "No file attached") || selectedReq.fileUrl || selectedReq.fileData) : false;
  const displayFileName = selectedReq && selectedReq.fileName && selectedReq.fileName !== "No file attached" ? selectedReq.fileName : "Attached_Document.pdf";
  const displayExt = displayFileName.split('.').pop().toLowerCase();
  const isFileViewable = ['pdf', 'png', 'jpg', 'jpeg', 'gif'].includes(displayExt);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA]">
        <BATopBar />
        <div className="flex max-w-[1600px] mx-auto pt-6 px-4 md:px-6 gap-8">
          <div className="hidden lg:block flex-shrink-0">
            <BASidebar />
          </div>
          <div className="flex-1 pb-10 flex flex-col items-center justify-center h-[calc(100vh-100px)]">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-gray-500 font-medium">Syncing Requirement Inbox...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <style>{`
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: #cbd5e1 #f8fafc; }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; border-radius: 8px; margin-block: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; border: 2px solid #f8fafc; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>

      <BATopBar />

      <div className="flex max-w-[1600px] mx-auto pt-6 px-4 md:px-6 gap-8">
        <div className="hidden lg:block flex-shrink-0">
          <BASidebar />
        </div>

        
        <div className={`flex-1 pb-10 flex flex-col ${viewMode === 'list' && requirements.length > 0 ? 'h-[calc(100vh-100px)]' : 'min-h-[calc(100vh-100px)]'}`}>
          
          {/* HEADER & TOGGLE */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-6 flex-shrink-0 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-navy">Requirement Inbox</h1>
              <p className="text-gray-500 mt-1 text-sm">{requirements.length} active requirements in your inbox.</p>
            </div>
            
            <div className="flex bg-white rounded-xl shadow-sm border border-gray-100 p-1 self-start sm:self-auto">
              <button 
                onClick={() => setViewMode("cards")}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === "cards" ? "bg-blue-50 text-primary" : "text-gray-500 hover:text-navy"}`}
              >
                <LayoutGrid className="w-4 h-4 mr-2" /> Cards
              </button>
              <button 
                onClick={() => {
                  setViewMode("list");
                  setViewingDocument(false);
                }}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === "list" ? "bg-blue-50 text-primary" : "text-gray-500 hover:text-navy"}`}
              >
                <List className="w-4 h-4 mr-2" /> List
              </button>
            </div>
          </div>

          {requirements.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-3xl border border-gray-100 py-20">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <Inbox className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-navy">Inbox Zero!</h2>
              <p className="text-gray-500 mt-2 text-center px-4">All client requirements have been claimed or completed.</p>
            </div>
          ) : viewMode === "cards" ? (
            
            
            <div className="flex-1 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {requirements.map((req) => (
                  <div 
                    key={req.id} 
                    onClick={() => handleCardClick(req)}
                    className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group relative flex flex-col h-64"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex space-x-2">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${req.priority === 'High' ? 'bg-red-50 text-red-600' : req.priority === 'Medium' ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'}`}>
                          {req.priority}
                        </span>
                        {!req.isNew && (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-purple-50 text-purple-600">
                            {req.status}
                          </span>
                        )}
                      </div>
                      {req.isNew && (
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                      )}
                    </div>

                    <p className="text-sm text-gray-500 line-clamp-3 mb-4 flex-1">
                      {req.description && req.description !== "No description provided." 
                        ? req.description 
                        : req.fileName ? `Attached Document: ${req.fileName}` : "No description provided."}
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
            <div className="flex flex-col lg:flex-row gap-6 flex-1 lg:min-h-0">
              
              {/* LEFT PANE */}
              <div className="w-full lg:w-80 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col flex-shrink-0 h-[350px] lg:h-full">
                <div className="p-4 border-b border-gray-50 flex items-center justify-between text-gray-500 font-semibold text-sm flex-shrink-0">
                  <div className="flex items-center">
                    <Inbox className="w-4 h-4 mr-2" /> Inbox
                  </div>
                  <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">{requirements.length}</span>
                </div>
                <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                  {requirements.map(req => (
                    <div 
                      key={req.id}
                      onClick={() => {
                        setSelectedReq(req);
                        setViewingDocument(false);
                      }}
                      className={`p-4 rounded-2xl cursor-pointer transition-colors border border-transparent ${selectedReq?.id === req.id ? 'bg-blue-50 border-blue-100' : 'hover:bg-gray-50 hover:border-gray-100'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {req.isNew ? (
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          ) : (
                            <div className="w-2 h-2 bg-transparent rounded-full"></div>
                          )}
                          <span className="text-xs font-bold text-gray-400">{req.id}</span>
                        </div>
                        <div className="flex space-x-1.5">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${req.priority === 'High' ? 'text-red-600 bg-red-50' : req.priority === 'Medium' ? 'text-yellow-600 bg-yellow-50' : 'text-green-600 bg-green-50'}`}>
                            {req.priority}
                          </span>
                        </div>
                      </div>
                      <h4 className={`font-bold text-sm truncate ${selectedReq?.id === req.id ? 'text-primary' : 'text-navy'}`}>{req.title}</h4>
                      <p className="text-xs text-gray-400 mt-1 truncate">{req.submitter} • {req.timeAgo}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* RIGHT PANE */}
              {selectedReq && (
                <div className="flex-1 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col min-h-[500px] lg:min-h-0 overflow-hidden">
                  
                  {/* TOP HEADER */}
                  <div className="p-4 md:p-5 border-b border-gray-50 flex-shrink-0 bg-white z-10">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-gray-400">{selectedReq.id}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${selectedReq.priority === 'High' ? 'bg-red-50 text-red-600' : selectedReq.priority === 'Medium' ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'}`}>
                        {selectedReq.priority}
                      </span>
                    </div>
                    <h2 className="text-xl font-black text-navy mb-2 leading-tight truncate">{selectedReq.title}</h2>
                    <div className="flex flex-wrap items-center text-xs text-gray-500 gap-y-1 gap-x-4">
                      <span className="flex items-center"><User className="w-3.5 h-3.5 mr-1.5 text-gray-400"/> {selectedReq.submitter}</span>
                      <span className="hidden md:inline text-gray-300">•</span>
                      <span className="font-medium text-gray-600 truncate max-w-[150px]">{selectedReq.company}</span>
                      <span className="hidden md:inline text-gray-300">•</span>
                      <span className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-1.5 text-gray-400"/> {selectedReq.fullDate}</span>
                    </div>
                  </div>

                  {/* MIDDLE SCROLLABLE CONTENT */}
                  <div className="p-4 md:p-6 flex-1 overflow-y-auto bg-[#FAFAFA] custom-scrollbar pr-2 md:pr-4">
                    
                    {/* IF VIEWING DOCUMENT: Show the Iframe Viewer */}
                    {viewingDocument ? (
                      <div className="flex flex-col h-full w-full animate-in fade-in">
                        <div className="flex items-center justify-between mb-4 bg-blue-50 p-3 md:p-4 rounded-xl border border-blue-100 shadow-sm flex-shrink-0">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-[#007BFF] shadow-sm flex-shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 pr-4">
                              <p className="font-bold text-navy text-sm truncate">{displayFileName}</p>
                              <p className="text-[10px] text-[#007BFF] font-medium mt-0.5">Document Viewer</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <a 
                              href={selectedReq.fileUrl || selectedReq.fileData} 
                              download={displayFileName}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 text-[#007BFF] hover:bg-blue-100 rounded-full transition-colors"
                              title="Download File"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                            <button 
                              onClick={() => setViewingDocument(false)} 
                              className="text-[11px] font-bold bg-white text-[#007BFF] border border-[#007BFF]/20 px-3 py-1.5 rounded-lg hover:bg-[#007BFF] hover:text-white transition-colors flex items-center shadow-sm"
                            >
                              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
                            </button>
                          </div>
                        </div>

                        <div className="flex-1 min-h-[300px]">
                          <DocumentViewer fileName={displayFileName} fileData={selectedReq.fileUrl || selectedReq.fileData} />
                        </div>
                      </div>
                    ) : (
                      
                      /* ELSE: Show the Standard Details View */
                      <div className="space-y-5 animate-in fade-in pb-4">
                        
                        {/* --- Attached Document Section --- */}
                        {hasFile && (
                          <div>
                            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Attached Document</h3>
                            <div 
                              className="flex items-center justify-between p-3 md:p-4 border border-blue-200 rounded-xl bg-blue-50/40 shadow-sm w-full hover:border-[#007BFF] hover:bg-blue-50 transition-all cursor-pointer group"
                              onClick={() => {
                                const fileData = selectedReq.fileUrl || selectedReq.fileData;
                                
                                if (!fileData) {
                                  alert("⚠️ OLD PROJECT DETECTED!\n\nThis project was saved before the file system was fully upgraded. The actual file content is missing from the database.\n\nPlease test with a newly created project.");
                                  return;
                                }

                                if (isFileViewable) {
                                  setViewingDocument(true);
                                } else {
                                  const link = document.createElement('a');
                                  link.href = fileData;
                                  link.download = displayFileName;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }
                              }}
                            >
                              <div className="flex items-center space-x-3 min-w-0 pr-4">
                                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-[#007BFF] flex-shrink-0 group-hover:bg-[#007BFF] group-hover:text-white transition-colors shadow-sm">
                                  <FileText className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-navy text-[13px] md:text-[14px] truncate group-hover:text-[#007BFF] transition-colors">
                                    {displayFileName}
                                  </p>
                                  <p className="text-[10px] text-gray-500 mt-0.5">Click to view or download</p>
                                </div>
                              </div>
                              
                              <div className="w-8 h-8 rounded-full bg-white text-gray-400 flex items-center justify-center flex-shrink-0 group-hover:bg-[#007BFF] group-hover:text-white transition-colors shadow-sm">
                                {isFileViewable ? <Eye className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                              </div>
                            </div>
                            <p className="text-[9px] text-gray-400 mt-1.5 ml-1 italic">
                              * PDFs and Images will open in a viewer. Word Documents (.docx) will download.
                            </p>
                          </div>
                        )}

                        {/* --- Description Section --- */}
                        {selectedReq.description && selectedReq.description !== "No description provided." && (
                          <div>
                            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Client Description</h3>
                            <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-200 text-navy text-[13px] md:text-[14px] leading-relaxed whitespace-pre-wrap shadow-sm">
                              {selectedReq.description}
                            </div>
                          </div>
                        )}

                        {/* Fallback if somehow neither exists */}
                        {!hasFile && (!selectedReq.description || selectedReq.description === "No description provided.") && (
                           <div className="text-center py-8 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                              <FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
                              <p className="text-xs">No detailed content or documents were provided.</p>
                           </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* BOTTOM ACTION FOOTER */}
                  <div className="p-4 border-t border-gray-50 bg-white rounded-b-3xl flex-shrink-0 z-10">
                    {selectedReq.isNew ? (
                      <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-primary flex items-center justify-center flex-shrink-0">
                            <UserPlus className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-primary text-[13px] mb-0.5">Unassigned Requirement</h4>
                            <p className="text-[11px] text-blue-900/70 hidden sm:block">Claim to move it to your workspace.</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleActionClick(selectedReq)}
                          disabled={isClaiming}
                          className="w-full md:w-auto flex-shrink-0 bg-primary hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold text-xs transition-colors shadow-sm flex items-center justify-center disabled:opacity-50"
                        >
                          {isClaiming ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : null}
                          Claim & Analyze <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="bg-green-50/50 p-4 rounded-xl border border-green-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                            <Activity className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-green-700 text-[13px] mb-0.5">Active Requirement</h4>
                            <p className="text-[11px] text-green-900/70 hidden sm:block">Status: <strong className="text-green-800">{selectedReq.status}</strong></p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleActionClick(selectedReq)}
                          className="w-full md:w-auto flex-shrink-0 bg-[#10B981] hover:bg-[#059669] text-white px-5 py-2.5 rounded-lg font-bold text-xs transition-colors shadow-sm flex items-center justify-center"
                        >
                          Open AI Workspace <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                        </button>
                      </div>
                    )}
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