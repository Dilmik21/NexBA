import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import ClientTopBar from "../../components/Client/ClientTopBar";
import ClientSidebar from "../../components/Client/ClientSidebar";
import { useAuth } from "../../contexts/AuthContext";
import { Search, Send, Paperclip, Loader2, MessageSquare, ArrowLeft, X, FileText, User, Users2 } from "lucide-react";

export default function ClientMessages() {
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [projects, setProjects] = useState([]);
  const [selectedReqId, setSelectedReqId] = useState("");
  
  const targetTab = searchParams.get("tab");
  const [activeChannel, setActiveChannel] = useState(targetTab === 'Group' ? 'Group' : 'Client');
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [attachedFile, setAttachedFile] = useState(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (targetTab === 'Group') setActiveChannel('Group');
    else if (targetTab === 'Client') setActiveChannel('Client');
  }, [targetTab]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/client/chat/projects?uid=${currentUser?.uid || ''}`);
        const json = await res.json();
        
        if (json.success && Array.isArray(json.data)) {
          setProjects(json.data);
          
          const requestedId = location.state?.selectedReqId || searchParams.get("reqId");
          
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
          const url = activeChannel === 'Group' 
            ? `http://localhost:5000/api/client/chat/${selectedReqId}?uid=${currentUser.uid}&channel=Group`
            : `http://localhost:5000/api/client/chat/${selectedReqId}?uid=${currentUser.uid}`;

          const res = await fetch(url);
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
  }, [selectedReqId, currentUser, activeChannel]);

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
      senderName: currentUser?.displayName || "Client",
      channel: activeChannel 
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

  const renderTextWithLinks = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, i) => 
      urlRegex.test(part) ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline font-bold text-blue-100">{part}</a> : part
    );
  };

  return (
    /* h-screen locks the page from scrolling internally. overflow-y-scroll forces the dummy external track so sizes align. */
    <div className="h-screen bg-[#F5F7FA] overflow-y-scroll flex flex-col">
      <ClientTopBar />

      <div className="flex max-w-[1600px] w-full mx-auto pt-6 px-4 md:px-6 gap-8 pb-6 flex-1 min-h-0">
        
        <div className="hidden lg:block w-[260px] flex-shrink-0 h-full">
          <ClientSidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0 h-full">
          
          <div className="mb-4 flex-shrink-0 mt-2">
            <h1 className="text-[20px] md:text-[24px] font-bold text-navy">Messages</h1>
            <p className="text-[13px] md:text-[15px] text-gray-500 mt-1">Direct communication regarding your project requirements.</p>
          </div>

          <div className="flex-1 min-h-0 flex flex-col lg:flex-row w-full bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            
            {/* LEFT PANE: Project List */}
            <div className={`w-full lg:w-[35%] flex-col border-r border-gray-100 bg-[#FAFAFA] ${selectedReqId ? 'hidden lg:flex' : 'flex'} h-full flex-shrink-0 lg:flex-shrink`}>
              <div className="p-5 border-b border-gray-100 bg-white flex-shrink-0">
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

              {/* Native internal scrollbar automatically enabled with overflow-y-auto */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 pr-2">
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
                      className={`p-4 rounded-xl cursor-pointer transition-all border ${
                        selectedReqId === project.id ? 'bg-blue-50/50 border-[#007BFF] ring-1 ring-[#007BFF]/30 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-300 shadow-sm hover:shadow'
                      } mb-2`}
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
            <div className={`w-full lg:w-[65%] flex-col bg-[#F8FAFC] ${!selectedReqId ? 'hidden lg:flex' : 'flex'} relative h-full min-w-0`}>
              {!selectedReqId ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                  <MessageSquare className="w-16 h-16 mb-4 opacity-30 text-[#007BFF]" />
                  <p className="font-medium text-navy text-lg">Select a project</p>
                  <p className="text-sm mt-1">Choose a project from the left to contact your Business Analyst.</p>
                </div>
              ) : (
                <>
                  <div className="bg-white p-4 md:p-5 border-b border-gray-100 flex-shrink-0 z-10">
                    <div className="flex items-center justify-between gap-4 mb-4">
                       <div className="flex bg-gray-50 p-1 rounded-xl w-full max-w-[400px]">
                          <button 
                            onClick={() => setActiveChannel('Client')}
                            className={`flex-1 py-2.5 rounded-lg text-[13px] font-bold flex items-center justify-center transition-all ${activeChannel === 'Client' ? 'bg-white text-[#007BFF] shadow-sm ring-1 ring-gray-100' : 'text-gray-500 hover:text-navy'}`}
                          >
                            <User className="w-4 h-4 mr-2" /> Direct Chat
                          </button>
                          <button 
                            onClick={() => setActiveChannel('Group')}
                            className={`flex-1 py-2.5 rounded-lg text-[13px] font-bold flex items-center justify-center transition-all ${activeChannel === 'Group' ? 'bg-white text-purple-600 shadow-sm ring-1 ring-gray-100' : 'text-gray-500 hover:text-navy'}`}
                          >
                            <Users2 className="w-4 h-4 mr-2" /> Group Hub
                          </button>
                       </div>

                       <div className="hidden sm:flex flex-col items-end text-right min-w-0">
                         <span className="text-[10px] font-bold text-[#007BFF] uppercase tracking-wider mb-0.5">
                           {activeReq?.id}
                         </span>
                         <p className="text-[13px] font-bold text-navy truncate max-w-[180px] md:max-w-[250px]">
                           {activeReq?.title}
                         </p>
                       </div>
                    </div>

                    <div className="flex items-center gap-3 min-w-0">
                      <button onClick={() => setSelectedReqId("")} className="lg:hidden text-gray-500 hover:text-[#007BFF] p-1 -ml-1">
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      
                      {activeChannel === 'Group' ? (
                         <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
                           <Users2 className="w-5 h-5" />
                         </div>
                      ) : activeReq?.baImage ? (
                        <img src={activeReq.baImage} alt="BA Profile" className="w-10 h-10 rounded-full object-cover shadow-sm flex-shrink-0 border border-gray-100" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#007BFF] text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
                          {initials}
                        </div>
                      )}

                      <div className="min-w-0">
                        <h3 className="font-bold text-navy text-[15px] truncate">
                          {activeChannel === 'Group' ? 'Project Group Hub' : currentBAName}
                          {activeChannel !== 'Group' && <span className="text-gray-400 font-normal ml-1">(BA)</span>}
                        </h3>
                        {activeChannel !== 'Group' && (
                           <div className="flex items-center text-[11px] text-gray-500 font-medium mt-0.5">
                             {activeReq?.isOnline ? (
                               <><div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></div> Online</>
                             ) : (
                               <><div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-1.5"></div> Offline</>
                             )}
                           </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Native scrollbar automatically appears with overflow-y-auto (NO CUSTOM WEBKIT CSS) */}
                  <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 pr-2">
                    {messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400 py-10">
                        <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
                        <p className="font-medium text-sm">
                          {activeChannel === 'Group' ? 'Welcome to the Group Hub. The Client, BA, and Developer can chat here.' : 'No messages yet. Say hello to your Business Analyst!'}
                        </p>
                      </div>
                    ) : (
                      messages.map((msg, idx) => {
                        const isMe = msg.senderRole === 'Client';
                        const displayTime = msg.timeStr || formatTimeSafe(msg.timestamp || msg.createdAt);
                        
                        let messageColor = 'bg-white border border-gray-100 text-navy rounded-tl-sm';
                        if (isMe) messageColor = 'bg-[#007BFF] text-white rounded-tr-sm'; 
                        else if (msg.senderRole === 'Developer' || msg.senderRole === 'Dev') messageColor = 'bg-[#10B981] text-white rounded-tl-sm'; 

                        const hasFileUrl = typeof msg.fileUrl === 'string' && msg.fileUrl.trim() !== '';
                        const hasAttachment = msg.attachment && typeof msg.attachment.dataUrl === 'string' && msg.attachment.dataUrl.trim() !== '';
                        const isImage = (hasFileUrl && msg.fileUrl.startsWith('data:image')) || (hasAttachment && msg.attachment.dataUrl.startsWith('data:image'));
                        const downloadUrl = hasFileUrl ? msg.fileUrl : (hasAttachment ? msg.attachment.dataUrl : '#');
                        const downloadName = msg.fileName || msg.attachment?.name || 'Attached File';

                        return (
                          <div key={msg.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            
                            <span className="text-[10px] text-gray-400 font-bold mb-1 ml-1 mr-1">
                              {isMe ? 'You' : (msg.senderName || msg.senderRole)} • {displayTime}
                            </span>

                            <div className={`max-w-[85%] md:max-w-[70%] px-4 py-3 rounded-2xl text-[14px] leading-relaxed flex flex-col shadow-sm ${messageColor}`}>
                              
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

                              {msg.text && <span className="whitespace-pre-wrap">{renderTextWithLinks(msg.text)}</span>}
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {attachedFile && (
                    <div className="px-4 py-2 bg-blue-50 border-t border-blue-100 flex items-center justify-between flex-shrink-0 z-10">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#007BFF]" />
                        <span className="text-xs font-semibold text-[#007BFF] truncate max-w-[200px] md:max-w-md">{attachedFile.name}</span>
                      </div>
                      <button onClick={() => setAttachedFile(null)} className="p-1 rounded-full hover:bg-blue-100 text-[#007BFF] transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="p-3 md:p-4 bg-white border-t border-gray-100 flex-shrink-0 z-10">
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
                        className="p-3 rounded-xl text-gray-400 hover:text-[#007BFF] transition-colors hover:bg-blue-50 flex-shrink-0 bg-gray-50 border border-transparent"
                      >
                        <Paperclip className="w-5 h-5" />
                      </button>
                      
                      <input 
                        type="text" 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={activeChannel === 'Group' ? "Message everyone in the Group Hub..." : "Message your Business Analyst..."}
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-5 py-3.5 text-[13px] md:text-sm focus:outline-none focus:border-[#007BFF] focus:ring-1 focus:ring-[#007BFF]/20"
                      />
                      
                      <button 
                        type="submit" 
                        disabled={(!newMessage.trim() && !attachedFile) || isSending}
                        className="p-3.5 bg-[#007BFF] text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 shadow-sm flex-shrink-0"
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
  );
}