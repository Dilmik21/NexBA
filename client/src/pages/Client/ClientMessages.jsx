import { useState, useEffect, useRef } from "react";
import ClientTopBar from "../../components/Client/ClientTopBar";
import ClientSidebar from "../../components/Client/ClientSidebar";
import { useAuth } from "../../contexts/AuthContext";
import { Send, Paperclip, Loader2, FileText, ChevronDown, Check, MessageSquare, X } from "lucide-react";

export default function ClientMessages() {
  const { currentUser } = useAuth();
  
  const [projects, setProjects] = useState([]);
  const [selectedReqId, setSelectedReqId] = useState("");
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [attachedFile, setAttachedFile] = useState(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isReqDropdownOpen, setIsReqDropdownOpen] = useState(false);

  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const dropdownRef = useRef(null);

  // --- 1. LOAD PROJECTS & UNREAD COUNTS ---
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/client/chat/projects?uid=${currentUser?.uid || ''}`);
        const json = await res.json();
        if (json.success && json.data.length > 0) {
          setProjects(json.data);
          // Removed the auto-select so the user sees the placeholder screen first!
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      }
    };
    if (currentUser?.uid) fetchProjects();
  }, [currentUser]);

  // --- 2. LOAD MESSAGES & MARK AS READ ---
  useEffect(() => {
    if (!selectedReqId || !currentUser?.uid) return;
    
    const fetchMessagesAndMarkRead = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`http://localhost:5000/api/client/chat/${selectedReqId}?uid=${currentUser.uid}`);
        const json = await res.json();
        if (json.success) setMessages(json.data);

        await fetch(`http://localhost:5000/api/client/chat/${selectedReqId}/read?uid=${currentUser.uid}`, { 
          method: "PUT" 
        });
        
        setProjects(prev => prev.map(p => p.id === selectedReqId ? { ...p, unreadCount: 0 } : p));

      } catch (error) {
        console.error("Failed to fetch messages:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMessagesAndMarkRead();
  }, [selectedReqId, currentUser]);

  // --- 3. AUTO-SCROLL TO BOTTOM ---
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedReqId]);

  // --- 4. CLOSE DROPDOWN ON OUTSIDE CLICK ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsReqDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setAttachedFile({ name: file.name, type: file.type, base64: reader.result });
    };
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !attachedFile) || isSending || !selectedReqId) return;
    setIsSending(true);

    try {
      const res = await fetch(`http://localhost:5000/api/client/chat/${selectedReqId}?uid=${currentUser.uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: newMessage, 
          fileData: attachedFile,
          senderName: currentUser?.displayName || "Client User" 
        })
      });
      const json = await res.json();
      
      if (json.success) {
        setMessages(prev => [...prev, json.data]);
        setNewMessage("");
        setAttachedFile(null);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const activeReq = projects.find(p => p.id === selectedReqId);
  const totalUnreadCount = projects.reduce((sum, p) => sum + (p.unreadCount || 0), 0);
  
  // DYNAMIC BA NAME LOGIC
  const currentBAName = activeReq?.baName || "Business Analyst";
  const initial = currentBAName ? currentBAName.charAt(0).toUpperCase() : "B";

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <ClientTopBar />
      
      <div className="flex max-w-[1600px] mx-auto pt-6 px-4 md:px-6 gap-8">
        
        <div className="hidden lg:block w-64 flex-shrink-0">
          <ClientSidebar />
        </div>

        <div className="flex-1 pb-10 flex flex-col h-[calc(100vh-100px)]">
          
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 gap-4 relative z-20">
            <div>
              <h1 className="text-[22px] md:text-2xl font-bold text-navy">Messages</h1>
              <p className="text-sm text-gray-500 mt-1">Direct communication regarding your project requirements.</p>
            </div>

            <div className="relative w-full sm:w-72" ref={dropdownRef}>
              <button 
                onClick={() => setIsReqDropdownOpen(!isReqDropdownOpen)}
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between shadow-sm w-full hover:bg-gray-50 transition-all"
              >
                <div className="flex items-center text-navy font-bold text-sm truncate">
                  <span className={`w-2 h-2 rounded-full mr-3 ${activeReq ? "bg-green-500" : "bg-gray-300"}`}></span>
                  <span className="truncate">{activeReq ? `Project: ${activeReq.id}` : "Select Requirement"}</span>
                  
                  {totalUnreadCount > 0 && (
                    <span className="ml-3 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                      {totalUnreadCount} New
                    </span>
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isReqDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {isReqDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-xl py-1 max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 z-30">
                  {projects.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500 text-center">No projects found.</div>
                  ) : (
                    projects.map((req) => (
                      <button
                        key={req.id}
                        onClick={() => { 
                          setSelectedReqId(req.id); 
                          setIsReqDropdownOpen(false); 
                        }}
                        className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between group border-b border-gray-50 last:border-0 transition-colors ${selectedReqId === req.id ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                      >
                        <div className="flex flex-col min-w-0 pr-2">
                          <div className="flex items-center">
                             <span className={`font-bold ${selectedReqId === req.id ? "text-primary" : "text-navy"}`}>
                               {req.id}
                             </span>
                             {selectedReqId === req.id && <Check className="w-3.5 h-3.5 text-primary ml-2 flex-shrink-0" />}
                          </div>
                          <span className="text-[11px] text-gray-500 truncate">{req.title}</span>
                        </div>

                        {req.unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex-shrink-0">
                            {req.unreadCount}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* DYNAMIC CONTENT AREA: Chat Box OR Welcome Placeholder */}
          {selectedReqId ? (
            <div className="bg-white border border-gray-100 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col flex-1 min-h-0 overflow-hidden z-10 animate-in fade-in duration-300">
              
              <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-white flex-shrink-0">
                <div className="flex items-center">
                   <div className="w-10 h-10 rounded-full bg-[#007BFF] text-white flex items-center justify-center font-bold mr-4 shadow-sm text-lg">
                     {initial}
                   </div>
                   <div>
                     <h2 className="text-[14px] font-bold text-navy leading-tight">{currentBAName}</h2>
                     <div className="flex items-center text-[10px] text-green-500 font-bold uppercase tracking-wider mt-1">
                       <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2 animate-pulse"></span> Online
                     </div>
                   </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 bg-[#F8FAFC]">
                {isLoading ? (
                  <div className="flex justify-center items-center h-full"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                     <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
                     <p className="text-sm font-medium">No messages yet. Send a message to start.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {messages.map((msg) => {
                      const isMe = msg.senderRole === "Client";
                      const isSystem = msg.type === 'System Alert';

                      if (isSystem) {
                         return (
                           <div key={msg.id} className="flex justify-center my-4">
                             <span className="bg-blue-50 text-blue-600 text-[11px] font-bold px-4 py-1.5 rounded-full border border-blue-100 text-center max-w-[80%]">
                               {msg.text}
                             </span>
                           </div>
                         );
                      }

                      return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                          <span className="text-[10px] font-bold text-gray-400 mb-1 ml-1 mr-1 uppercase">
                            {msg.senderName} • {msg.timeStr}
                          </span>
                          
                          <div className={`max-w-[70%] px-5 py-3.5 rounded-2xl text-[14px] leading-relaxed shadow-sm ${
                            isMe ? "bg-primary text-white rounded-tr-sm" : "bg-white text-navy border border-gray-100 rounded-tl-sm"
                          }`}>
                            {msg.text && <p>{msg.text}</p>}
                            
                            {msg.fileUrl && (
                              <div className={`mt-3 pt-3 border-t ${isMe ? 'border-blue-400/50' : 'border-gray-100'}`}>
                                 {msg.fileUrl.startsWith('data:image') ? (
                                    <img src={msg.fileUrl} alt="Attachment" className="rounded-lg max-h-48 object-cover" />
                                 ) : (
                                    <a href={msg.fileUrl} download={msg.fileName} className="flex items-center text-sm font-bold underline">
                                      <FileText className="w-4 h-4 mr-2" /> {msg.fileName}
                                    </a>
                                 )}
                               </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>

              <div className="p-4 bg-white border-t border-gray-100 flex-shrink-0">
                <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                  
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current.click()} 
                    className={`p-3.5 border rounded-xl transition-all ${attachedFile ? 'bg-blue-50 border-primary text-primary' : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-primary'}`}
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  
                  <div className="flex-1 relative">
                     {attachedFile && (
                       <div className="absolute -top-12 left-0 bg-blue-50 text-primary text-xs font-bold px-3 py-1.5 rounded-lg border border-blue-100 flex items-center shadow-sm">
                         <FileText className="w-3 h-3 mr-1.5" /> {attachedFile.name}
                         <button type="button" onClick={() => setAttachedFile(null)} className="ml-3 text-red-400 hover:text-red-600">
                           <X className="w-3.5 h-3.5" />
                         </button>
                       </div>
                     )}
                    <input
                      type="text"
                      disabled={!selectedReqId}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl text-[14px] px-5 py-3.5 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all outline-none text-navy"
                    />
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={isSending || !selectedReqId || (!newMessage.trim() && !attachedFile)} 
                    className="bg-[#007BFF] text-white p-3.5 rounded-xl shadow-sm hover:scale-105 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center"
                  >
                    {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-0.5" />}
                  </button>
                </form>
              </div>
              
            </div>
          ) : (
            /* WELCOME PLACEHOLDER WHEN NO PROJECT IS SELECTED */
            <div className="bg-white border border-gray-100 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col flex-1 min-h-0 items-center justify-center text-center p-8 z-10 animate-in fade-in duration-500">
               <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <MessageSquare className="w-12 h-12 text-[#007BFF]" />
               </div>
               <h2 className="text-[22px] font-bold text-navy mb-3">Project Communication Hub</h2>
               <p className="text-[14px] text-gray-500 max-w-[450px] leading-relaxed">
                  Select a project requirement from the dropdown menu above to view your conversation history, attach files, and communicate directly with your dedicated Business Analyst.
               </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}