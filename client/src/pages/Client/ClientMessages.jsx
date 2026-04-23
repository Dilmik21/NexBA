import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ClientTopBar from "../../components/Client/ClientTopBar";
import ClientSidebar from "../../components/Client/ClientSidebar";
import { useAuth } from "../../contexts/AuthContext";
import { Search, Send, Paperclip, Loader2, MessageSquare, ArrowLeft, X, FileText, User } from "lucide-react";

export default function ClientMessages() {
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [projects, setProjects] = useState([]);
  const [selectedReqId, setSelectedReqId] = useState("");
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [attachedFile, setAttachedFile] = useState(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/client/chat/projects?uid=${currentUser?.uid || ''}`);
        const json = await res.json();
        
        if (json.success && Array.isArray(json.data)) {
          setProjects(json.data);
          
          const requestedId = location.state?.selectedReqId;
          
          if (requestedId && json.data.some(p => p.id === requestedId)) {
             setSelectedReqId(requestedId);
             navigate(location.pathname, { replace: true, state: {} });
          } else if (json.data.length > 0 && window.innerWidth >= 1024 && !selectedReqId) {
             setSelectedReqId(json.data[0].id);
          }
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUser?.uid) {
      fetchProjects();
    } else {
      const timer = setTimeout(() => setIsLoading(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [currentUser, location.state, navigate, location.pathname, selectedReqId]);

  useEffect(() => {
    let interval;
    if (selectedReqId && currentUser?.uid) {
      const fetchMessagesAndMarkRead = async () => {
        try {
          const res = await fetch(`http://localhost:5000/api/client/chat/${selectedReqId}?uid=${currentUser.uid}`);
          const json = await res.json();
          
          if (json.success && Array.isArray(json.data)) {
            setMessages(json.data);
          }

          await fetch(`http://localhost:5000/api/client/chat/${selectedReqId}/read?uid=${currentUser.uid}`, { 
            method: "PUT" 
          });
          
          setProjects(prev => prev.map(p => p.id === selectedReqId ? { ...p, unreadCount: 0 } : p));
        } catch (error) {
          console.error("Failed to fetch messages:", error);
        }
      };

      fetchMessagesAndMarkRead();
      interval = setInterval(fetchMessagesAndMarkRead, 5000);
    }
    return () => clearInterval(interval);
  }, [selectedReqId, currentUser]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedReqId]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setAttachedFile({ name: file.name, type: file.type, base64: reader.result });
    };
    e.target.value = null;
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !attachedFile) || isSending || !selectedReqId) return;
    setIsSending(true);

    const payload = { 
      text: newMessage, 
      fileData: attachedFile,
      senderName: currentUser?.displayName || "Client" 
    };

    const tempMsg = {
        ...payload,
        id: Date.now(),
        senderRole: 'Client',
        senderId: currentUser.uid,
        createdAt: new Date(),
        timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    if (attachedFile) {
        tempMsg.attachment = { name: attachedFile.name, dataUrl: attachedFile.base64 };
    }
    
    setMessages(prev => [...prev, tempMsg]);
    setNewMessage("");
    setAttachedFile(null);

    try {
      await fetch(`http://localhost:5000/api/client/chat/${selectedReqId}?uid=${currentUser.uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const formatTimeSafe = (dateInput) => {
    if (!dateInput) return "";
    try {
      let d = new Date();
      if (typeof dateInput === 'string' || typeof dateInput === 'number') {
        d = new Date(dateInput);
      } else if (dateInput._seconds) {
        d = new Date(dateInput._seconds * 1000); 
      } else if (dateInput.seconds) {
        d = new Date(dateInput.seconds * 1000); 
      }
      if (isNaN(d.getTime())) return ""; 
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (err) {
      return "";
    }
  };

  const getInitials = (name) => {
    if (!name) return "BA";
    const cleanName = name.trim();
    if (cleanName === "Business Analyst" || cleanName === "Unknown BA") return "BA";
    
    const parts = cleanName.split(/\s+/); 
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return cleanName.substring(0, 2).toUpperCase();
  };

  const activeReq = projects.find(p => p.id === selectedReqId);
  const currentBAName = activeReq?.baName || "Business Analyst";
  const initials = getInitials(currentBAName);

  const filteredProjects = projects.filter(p => 
    (p.title || "").toLowerCase().includes((searchQuery || "").toLowerCase()) || 
    (p.id || "").toLowerCase().includes((searchQuery || "").toLowerCase())
  );

  return (
    <>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
      
      <div className="min-h-screen bg-[#F5F7FA] overflow-x-hidden">
        <ClientTopBar />

        <div className="flex max-w-[1600px] mx-auto pt-6 px-4 md:px-6 gap-8 pb-10 h-[calc(100vh-80px)]">
          <div className="hidden lg:block flex-shrink-0 h-full">
            <ClientSidebar />
          </div>

          <div className="flex-1 flex flex-col min-w-0 h-full">
            
            <div className="mb-6 flex-shrink-0">
              <h1 className="text-[20px] md:text-[24px] font-bold text-navy">Messages</h1>
              <p className="text-[13px] md:text-[15px] text-gray-500 mt-1">Direct communication regarding your project requirements.</p>
            </div>

            <div className="flex flex-col lg:flex-row flex-1 min-h-0 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              
              {/* LEFT PANE: Project List */}
              <div className={`w-full lg:w-[35%] flex-col border-r border-gray-100 bg-[#FAFAFA] ${selectedReqId ? 'hidden lg:flex' : 'flex'}`}>
                <div className="p-5 border-b border-gray-100 bg-white">
                  <h2 className="text-[15px] font-bold text-navy mb-4">Active Projects</h2>
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search projects..." 
                      className="w-full bg-gray-50 border border-gray-200 text-sm rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-[#007BFF] focus:ring-1 focus:ring-[#007BFF]/20 transition-all"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-[#007BFF] mb-3" />
                      <p className="text-sm text-gray-400 font-medium">Loading projects...</p>
                    </div>
                  ) : filteredProjects.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">
                      {projects.length === 0 ? "No active projects yet." : "No projects match your search."}
                    </p>
                  ) : (
                    filteredProjects.map(project => (
                      <div 
                        key={project.id}
                        onClick={() => setSelectedReqId(project.id)}
                        className={`p-4 border-b border-gray-50 cursor-pointer transition-colors ${
                          selectedReqId === project.id ? 'bg-blue-50/50 border-l-4 border-l-[#007BFF]' : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[11px] font-bold text-[#007BFF]">{project.id}</span>
                          {project.unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                              {project.unreadCount}
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-navy text-[14px] truncate mb-1">{project.title}</h4>
                        <div className="flex items-center text-[11px] text-gray-500 mt-1">
                           {project.baImage ? (
                             <img src={project.baImage} alt="" className="w-4 h-4 rounded-full mr-1.5 object-cover" />
                           ) : (
                             <User className="w-3 h-3 mr-1" />
                           )}
                           BA: {project.baName}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* RIGHT PANE: Chat Window */}
              <div className={`w-full lg:w-[65%] flex-col bg-[#F8FAFC] ${!selectedReqId ? 'hidden lg:flex' : 'flex'}`}>
                {!selectedReqId ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                    <MessageSquare className="w-16 h-16 mb-4 opacity-30" />
                    <p className="font-medium text-navy text-lg">Select a project</p>
                    <p className="text-sm mt-1">Choose a project from the left to contact your Business Analyst.</p>
                  </div>
                ) : (
                  <>
                    {/* --- UPDATED: Chat Header with Requirement Info --- */}
                    <div className="bg-white p-4 md:p-5 border-b border-gray-100 flex items-center justify-between gap-4 flex-shrink-0">
                      
                      {/* Left: BA Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <button onClick={() => setSelectedReqId("")} className="lg:hidden text-gray-500 hover:text-[#007BFF] p-1 -ml-1">
                          <ArrowLeft className="w-5 h-5" />
                        </button>
                        
                        {activeReq?.baImage ? (
                          <img 
                            src={activeReq.baImage} 
                            alt="BA Profile" 
                            className="w-10 h-10 rounded-full object-cover shadow-sm flex-shrink-0 border border-gray-100" 
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#007BFF] text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
                            {initials}
                          </div>
                        )}

                        <div className="min-w-0">
                          <h3 className="font-bold text-navy text-[15px] truncate">{currentBAName} <span className="text-gray-400 font-normal">(BA)</span></h3>
                          <div className="flex items-center text-[11px] text-gray-500 font-medium mt-0.5">
                            {activeReq?.isOnline ? (
                              <><div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></div> Online</>
                            ) : (
                              <><div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-1.5"></div> Offline</>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Requirement Info */}
                      <div className="hidden sm:flex flex-col items-end text-right min-w-0 border-l border-gray-100 pl-4">
                        <span className="text-[10px] font-bold text-[#007BFF] uppercase tracking-wider mb-0.5">
                          {activeReq?.id}
                        </span>
                        <p className="text-[13px] font-bold text-navy truncate max-w-[180px] md:max-w-[250px]">
                          {activeReq?.title}
                        </p>
                      </div>

                    </div>

                    {/* Chat Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
                      {messages.length === 0 ? (
                        <p className="text-center text-sm text-gray-400 mt-10">No messages yet. Say hello to your Business Analyst!</p>
                      ) : (
                        messages.map((msg, idx) => {
                          const isMe = msg.senderRole === 'Client';
                          const displayTime = msg.timeStr || formatTimeSafe(msg.timestamp || msg.createdAt);
                          
                          const hasFileUrl = typeof msg.fileUrl === 'string' && msg.fileUrl.trim() !== '';
                          const hasAttachment = msg.attachment && typeof msg.attachment.dataUrl === 'string' && msg.attachment.dataUrl.trim() !== '';
                          const isImage = (hasFileUrl && msg.fileUrl.startsWith('data:image')) || (hasAttachment && msg.attachment.dataUrl.startsWith('data:image'));
                          const downloadUrl = hasFileUrl ? msg.fileUrl : (hasAttachment ? msg.attachment.dataUrl : '#');
                          const downloadName = msg.fileName || msg.attachment?.name || 'Attached File';

                          return (
                            <div key={msg.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                              
                              <span className="text-[10px] text-gray-400 font-bold mb-1 ml-1 mr-1">
                                {isMe ? 'You' : (msg.senderName || 'Business Analyst')} • {displayTime}
                              </span>

                              <div className={`max-w-[85%] md:max-w-[70%] px-4 py-3 rounded-2xl text-[14px] leading-relaxed flex flex-col ${
                                isMe 
                                  ? 'bg-[#007BFF] text-white rounded-tr-sm shadow-sm' 
                                  : 'bg-white border border-gray-100 text-navy rounded-tl-sm shadow-sm'
                              }`}>
                                
                                {(hasFileUrl || hasAttachment) && (
                                  <div className={`mb-2 ${isImage ? 'mt-1' : ''}`}>
                                    {isImage ? (
                                      <img src={downloadUrl} alt="Attachment" className="rounded-lg max-h-48 object-cover shadow-sm" />
                                    ) : (
                                      <a 
                                        href={downloadUrl} 
                                        download={downloadName}
                                        className={`flex items-center gap-2 p-2 rounded-lg text-sm font-semibold transition-colors ${isMe ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-gray-50 hover:bg-gray-100 text-[#007BFF]'}`}
                                      >
                                        <Paperclip className="w-4 h-4 flex-shrink-0" />
                                        <span className="truncate max-w-[200px]">{downloadName}</span>
                                      </a>
                                    )}
                                  </div>
                                )}

                                {msg.text && <span>{msg.text}</span>}
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Attachment Preview Area */}
                    {attachedFile && (
                      <div className="px-4 py-2 bg-blue-50 border-t border-blue-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[#007BFF]" />
                          <span className="text-xs font-semibold text-[#007BFF] truncate max-w-[200px] md:max-w-md">{attachedFile.name}</span>
                        </div>
                        <button onClick={() => setAttachedFile(null)} className="p-1 rounded-full hover:bg-blue-100 text-[#007BFF] transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Message Input Form */}
                    <div className="p-3 md:p-4 bg-white border-t border-gray-100">
                      <form onSubmit={handleSendMessage} className="flex items-center gap-2 md:gap-3">
                        
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleFileChange} 
                          className="hidden" 
                        />
                        
                        <button 
                          type="button" 
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2 text-gray-400 hover:text-[#007BFF] transition-colors rounded-full hover:bg-gray-50 flex-shrink-0"
                        >
                          <Paperclip className="w-5 h-5" />
                        </button>
                        
                        <input 
                          type="text" 
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type your message..."
                          className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-[13px] md:text-sm focus:outline-none focus:border-[#007BFF] focus:ring-1 focus:ring-[#007BFF]/20"
                        />
                        
                        <button 
                          type="submit" 
                          disabled={(!newMessage.trim() && !attachedFile) || isSending}
                          className="p-2.5 bg-[#007BFF] text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 shadow-sm flex-shrink-0"
                        >
                          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
                        </button>
                      </form>
                    </div>
                  </>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}