import { useState, useEffect, useRef } from "react";
import DevTopBar from "../../components/Developer/DevTopBar";
import DevSidebar from "../../components/Developer/DevSidebar";
import { useAuth } from "../../contexts/AuthContext";
import { Search, Send, Paperclip, Link as LinkIcon, Loader2, MessageSquare, ArrowLeft, ChevronDown, X, User } from "lucide-react";

export default function DevCommunication() {
  const { currentUser, userData } = useAuth();
  
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [attachment, setAttachment] = useState(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isTaskOpen, setIsTaskOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const taskDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (taskDropdownRef.current && !taskDropdownRef.current.contains(event.target)) {
        setIsTaskOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchChatList = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/dev/chats?uid=${currentUser.uid}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setChats(json.data);
          // Auto-select first project on desktop only
          if (json.data.length > 0 && window.innerWidth >= 1024) {
             setActiveChat(json.data[0]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch chats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUser?.uid) {
      fetchChatList();
    } else {
      const timer = setTimeout(() => setIsLoading(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [currentUser]);

  useEffect(() => {
    let interval;
    if (activeChat && currentUser?.uid) {
      const fetchMessages = async () => {
        try {
          const res = await fetch(`http://localhost:5000/api/dev/messages/${activeChat.reqId}?uid=${currentUser.uid}`);
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setMessages(json.data);
            setChats(prev => prev.map(chat => 
              chat.reqId === activeChat.reqId ? { ...chat, unreadCount: 0 } : chat
            ));
          }
        } catch (error) {
          console.error("Failed to fetch messages:", error);
        }
      };

      fetchMessages();
      interval = setInterval(fetchMessages, 5000);
    }
    return () => clearInterval(interval);
  }, [activeChat, currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setAttachment({ name: file.name, type: file.type, dataUrl: reader.result });
    };
    e.target.value = null;
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !attachment) || isSending || !activeChat) return; 
    setIsSending(true);

    const payload = {
      reqId: activeChat.reqId,
      senderId: currentUser.uid,
      senderName: userData?.fullName || "Developer",
      receiverId: activeChat.baId,
      text: newMessage,
      taskId: selectedTaskId || null,
      attachment: attachment 
    };

    const tempMsg = { 
      ...payload, 
      id: Date.now(), 
      timestamp: new Date(),
      createdAt: new Date(),
      senderRole: "Developer" 
    };
    setMessages(prev => [...prev, tempMsg]);
    
    setNewMessage("");
    setSelectedTaskId("");
    setAttachment(null);

    try {
      await fetch(`http://localhost:5000/api/dev/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      alert("Failed to send message.");
    } finally {
      setIsSending(false);
    }
  };

  const formatTimeSafe = (dateInput) => {
    if (!dateInput) return "";
    try {
      let d = new Date();
      if (typeof dateInput === 'string' || typeof dateInput === 'number') d = new Date(dateInput);
      else if (dateInput._seconds) d = new Date(dateInput._seconds * 1000); 
      else if (dateInput.seconds) d = new Date(dateInput.seconds * 1000); 
      if (isNaN(d.getTime())) return ""; 
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (err) { return ""; }
  };

  // --- SMART INITIALS LOGIC ---
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

  const filteredChats = (chats || []).filter(chat => 
    (chat.title || "").toLowerCase().includes((searchQuery || "").toLowerCase()) || 
    (chat.reqId || "").toLowerCase().includes((searchQuery || "").toLowerCase())
  );

  const selectedTaskObj = activeChat?.tasks?.find(t => t.displayId === selectedTaskId);

  // --- THE FIX: KEEP SIDEBAR VISIBLE DURING INITIAL LOAD ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] overflow-x-hidden flex flex-col">
        <DevTopBar />
        <div className="flex max-w-[1600px] w-full mx-auto pt-6 px-4 md:px-6 gap-8 pb-10 h-[calc(100vh-80px)]">
          <div className="hidden lg:block flex-shrink-0 h-full">
            <DevSidebar />
          </div>
          <div className="flex-1 flex flex-col min-w-0 h-full items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#007BFF]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] overflow-x-hidden">
      <DevTopBar />

      <div className="flex max-w-[1600px] mx-auto pt-6 px-4 md:px-6 gap-8 pb-10 h-[calc(100vh-80px)]">
        <div className="hidden lg:block flex-shrink-0 h-full">
          <DevSidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0 h-full">
          
          {/* --- RESTORED GLOBAL HEADER --- */}
          <div className="mb-6 flex-shrink-0">
            <h1 className="text-[20px] md:text-[24px] font-bold text-navy">Communication Hub</h1>
            <p className="text-[13px] md:text-[15px] text-gray-500 mt-1">Direct communication with your Business Analyst regarding assigned tasks.</p>
          </div>

          <div className="flex flex-col lg:flex-row flex-1 min-h-0 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            
            {/* LEFT PANE */}
            <div className={`w-full lg:w-[35%] flex-col border-r border-gray-100 bg-[#FAFAFA] ${activeChat ? 'hidden lg:flex' : 'flex'}`}>
              <div className="p-5 border-b border-gray-100 bg-white">
                <h2 className="text-[15px] font-bold text-navy mb-4">Active Projects</h2>
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search projects by name or ID..." 
                    className="w-full bg-gray-50 border border-gray-200 text-sm rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-[#007BFF] focus:ring-1 focus:ring-[#007BFF]/20 transition-all"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {filteredChats.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">
                    {chats.length === 0 ? "No assigned projects yet." : "No projects match your search."}
                  </p>
                ) : (
                  filteredChats.map(chat => (
                    <div 
                      key={chat.reqId}
                      onClick={() => setActiveChat(chat)}
                      className={`p-4 border-b border-gray-50 cursor-pointer transition-colors ${
                        activeChat?.reqId === chat.reqId ? 'bg-blue-50/50 border-l-4 border-l-[#007BFF]' : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[11px] font-bold text-[#007BFF]">{chat.reqId}</span>
                        {chat.unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-navy text-[14px] truncate mb-1">{chat.title}</h4>
                      <div className="flex items-center text-[11px] text-gray-500 mt-1">
                         {chat.baImage ? (
                           <img src={chat.baImage} alt="" className="w-4 h-4 rounded-full mr-1.5 object-cover" />
                         ) : (
                           <User className="w-3 h-3 mr-1" />
                         )}
                         BA: {chat.baName}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* RIGHT PANE */}
            <div className={`w-full lg:w-[65%] flex-col bg-[#F8FAFC] ${!activeChat ? 'hidden lg:flex' : 'flex'}`}>
              {!activeChat ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                  <MessageSquare className="w-16 h-16 mb-4 opacity-30" />
                  <p className="font-medium text-navy text-lg">Select a project</p>
                  <p className="text-sm mt-1">Choose a project from the left to contact your Business Analyst.</p>
                </div>
              ) : (
                <>
                  <div className="bg-white p-4 border-b border-gray-100 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setActiveChat(null)} className="lg:hidden text-gray-500 hover:text-[#007BFF] p-1">
                        <ArrowLeft className="w-5 h-5" />
                      </button>

                      {activeChat?.baImage ? (
                        <img 
                          src={activeChat.baImage} 
                          alt="BA Profile" 
                          className="w-10 h-10 rounded-full object-cover shadow-sm flex-shrink-0 border border-gray-100" 
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#007BFF] text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
                          {getInitials(activeChat.baName)}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-navy text-[15px] truncate">{activeChat.baName} <span className="text-gray-400 font-normal">(BA)</span></h3>
                        <div className="flex items-center text-[11px] text-gray-500 font-medium">
                          {activeChat?.isOnline ? (
                            <><div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></div> Online</>
                          ) : (
                            <><div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-1.5"></div> Offline</>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full border-t border-gray-50 pt-2 mt-1">
                      <LinkIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-[12px] text-gray-500 font-medium flex-shrink-0 hidden sm:block">Reference Task:</span>
                      
                      <div className="relative flex-1" ref={taskDropdownRef}>
                        <button
                          onClick={() => setIsTaskOpen(!isTaskOpen)}
                          className="flex items-center justify-between w-full sm:max-w-md bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-[12px] font-medium text-navy hover:border-[#007BFF] transition-colors"
                        >
                          <span className="truncate">
                            {selectedTaskObj ? `${selectedTaskObj.displayId}: ${selectedTaskObj.title}` : "None (General Project Chat)"}
                          </span>
                          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                        </button>

                        {isTaskOpen && (
                          <div className="absolute top-full left-0 mt-1 w-full sm:max-w-md bg-white border border-gray-100 rounded-xl shadow-xl z-20 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1">
                            <button
                              onClick={() => { setSelectedTaskId(""); setIsTaskOpen(false); }}
                              className={`w-full text-left px-4 py-2.5 text-[12px] transition-colors ${!selectedTaskId ? 'bg-blue-50 text-[#007BFF] font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                              None (General Project Chat)
                            </button>
                            {activeChat.tasks.map(t => (
                              <button
                                key={t.taskId}
                                onClick={() => { setSelectedTaskId(t.displayId); setIsTaskOpen(false); }}
                                className={`w-full text-left px-4 py-2.5 text-[12px] transition-colors truncate ${selectedTaskId === t.displayId ? 'bg-blue-50 text-[#007BFF] font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                              >
                                {t.displayId}: {t.title}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                    {messages.length === 0 ? (
                      <p className="text-center text-sm text-gray-400 mt-10">No messages yet. Start the conversation!</p>
                    ) : (
                      messages.map((msg, idx) => {
                        const isMe = msg.senderId === currentUser.uid || msg.senderRole === 'Developer' || msg.senderRole === 'Dev';
                        const displayTime = formatTimeSafe(msg.timestamp || msg.createdAt);
                        
                        const hasFileUrl = typeof msg.fileUrl === 'string' && msg.fileUrl.trim() !== '';
                        const hasAttachment = msg.attachment && typeof msg.attachment.dataUrl === 'string' && msg.attachment.dataUrl.trim() !== '';
                        const isImage = (hasFileUrl && msg.fileUrl.startsWith('data:image')) || (hasAttachment && msg.attachment.dataUrl.startsWith('data:image'));
                        const downloadUrl = hasFileUrl ? msg.fileUrl : (hasAttachment ? msg.attachment.dataUrl : '#');
                        const downloadName = msg.fileName || msg.attachment?.name || 'Attached File';

                        return (
                          <div key={msg.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <span className="text-[10px] text-gray-400 font-bold mb-1 ml-1 mr-1">
                              {msg.senderName || (isMe ? 'You' : 'Business Analyst')} • {displayTime}
                            </span>

                            {msg.taskId && (
                              <div className={`mb-1 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${isMe ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-500'}`}>
                                <LinkIcon className="w-3 h-3" /> {msg.taskId}
                              </div>
                            )}
                            
                            <div className={`max-w-[85%] md:max-w-[70%] px-4 py-3 rounded-2xl text-[14px] leading-relaxed flex flex-col ${
                              isMe ? 'bg-[#00B87C] text-white rounded-tr-sm shadow-sm' : 'bg-white border border-gray-100 text-navy rounded-tl-sm shadow-sm'
                            }`}>
                              {(hasFileUrl || hasAttachment) && (
                                <div className={`mb-2 ${isImage ? 'mt-1' : ''}`}>
                                  {isImage ? (
                                    <img src={downloadUrl} alt="Attachment" className="rounded-lg max-h-48 object-cover shadow-sm" />
                                  ) : (
                                    <a href={downloadUrl} download={downloadName} className={`flex items-center gap-2 p-2 rounded-lg text-sm font-semibold transition-colors ${isMe ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-gray-50 hover:bg-gray-100 text-[#007BFF]'}`}>
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
                    <div ref={messagesEndRef} />
                  </div>

                  {attachment && (
                    <div className="px-4 py-2 bg-blue-50 border-t border-blue-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-[#007BFF]" />
                        <span className="text-xs font-semibold text-[#007BFF] truncate max-w-[200px] md:max-w-md">{attachment.name}</span>
                      </div>
                      <button onClick={() => setAttachment(null)} className="p-1 rounded-full hover:bg-blue-100 text-[#007BFF] transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="p-3 md:p-4 bg-white border-t border-gray-100">
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2 md:gap-3">
                      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-[#007BFF] transition-colors rounded-full hover:bg-gray-50 flex-shrink-0">
                        <Paperclip className="w-5 h-5" />
                      </button>
                      <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-[13px] md:text-sm focus:outline-none focus:border-[#007BFF] focus:ring-1 focus:ring-[#007BFF]/20" />
                      <button type="submit" disabled={isSending || (!newMessage.trim() && !attachment)} className="p-2.5 bg-[#007BFF] text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 shadow-sm flex-shrink-0">
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