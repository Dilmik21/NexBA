import { useState, useEffect, useRef } from "react";
import BATopBar from "../../components/BA/BATopBar";
import BASidebar from "../../components/BA/BASidebar";
import { useAuth } from "../../contexts/AuthContext";
import { MessageSquare, Paperclip, Send, Loader2, User, Users, FileText } from "lucide-react";

export default function CommunicationHub() {
  const { currentUser } = useAuth();
  
  const [reqList, setReqList] = useState([]);
  const [selectedReq, setSelectedReq] = useState(null);
  
  const [activeChannel, setActiveChannel] = useState('Client'); // 'Client' or 'Developer'
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [attachedFile, setAttachedFile] = useState(null);
  
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (currentUser?.uid) fetchReqList();
  }, [currentUser]);

  useEffect(() => {
    if (selectedReq && currentUser?.uid) {
      fetchMessages();
      markAsRead();
    }
  }, [selectedReq, activeChannel, currentUser]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchReqList = async () => {
    setIsLoadingList(true);
    try {
      const res = await fetch(`http://localhost:5000/api/ba/chat/list?uid=${currentUser.uid}`);
      const json = await res.json();
      if (json.success) {
        setReqList(json.data);
        if (json.data.length > 0 && !selectedReq) setSelectedReq(json.data[0]);
      }
    } catch (error) {
      console.error("Failed to fetch chat list:", error);
    } finally {
      setIsLoadingList(false);
    }
  };

  const fetchMessages = async () => {
    setIsLoadingMessages(true);
    try {
      const res = await fetch(`http://localhost:5000/api/ba/chat/${selectedReq.id}/${activeChannel}?uid=${currentUser.uid}`);
      const json = await res.json();
      if (json.success) {
        setMessages(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const markAsRead = async () => {
    // Only send the read request if there are actually unread messages
    const currentUnread = activeChannel === 'Client' ? selectedReq.unreadClient : selectedReq.unreadDev;
    if (currentUnread === 0) return;

    try {
      await fetch(`http://localhost:5000/api/ba/chat/${selectedReq.id}/${activeChannel}/read?uid=${currentUser.uid}`, {
        method: "PUT"
      });
      
      // Instantly clear the badges in the UI
      setReqList(prev => prev.map(req => {
        if (req.id === selectedReq.id) {
          return { ...req, [activeChannel === 'Client' ? 'unreadClient' : 'unreadDev']: 0 };
        }
        return req;
      }));

      setSelectedReq(prev => ({
        ...prev,
        [activeChannel === 'Client' ? 'unreadClient' : 'unreadDev']: 0
      }));

    } catch (error) { 
      console.error("Failed to mark as read"); 
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setAttachedFile({
        name: file.name,
        type: file.type,
        base64: reader.result
      });
    };
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() && !attachedFile) return;
    setIsSending(true);

    try {
      const res = await fetch(`http://localhost:5000/api/ba/chat/${selectedReq.id}/${activeChannel}?uid=${currentUser.uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: inputText, 
          fileData: attachedFile,
          senderName: currentUser?.displayName || "Business Analyst" // dynamically getting the BA's real name
        })
      });
      const json = await res.json();
      
      if (json.success) {
        setMessages(prev => [...prev, json.data]);
        setInputText("");
        setAttachedFile(null);
        fetchReqList();
      }
    } catch (error) {
      console.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <BATopBar />

      <div className="flex max-w-[1600px] mx-auto pt-6 px-4 md:px-6 gap-8">
        <div className="hidden lg:block flex-shrink-0">
          <BASidebar />
        </div>

        <div className="flex-1 pb-10 flex flex-col h-full lg:h-[calc(100vh-100px)]">
          
          <div className="mb-6 flex-shrink-0">
            <h1 className="text-[22px] font-bold text-navy flex items-center">
              Communication Hub
            </h1>
            <p className="text-sm text-gray-500 mt-1">Manage project-specific communication with Clients and Developers.</p>
          </div>

          <div className="flex flex-col lg:flex-row flex-1 lg:min-h-0 gap-6">
            
            {/* LEFT PANE: Requirements List */}
            <div className="w-full lg:w-1/3 flex flex-col h-[400px] lg:h-full bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="p-5 border-b border-gray-50">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                  Active Projects
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {isLoadingList ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : reqList.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-10">No active projects found.</p>
                ) : (
                  reqList.map((req) => {
                    const totalUnread = req.unreadClient + req.unreadDev;
                    return (
                      <div 
                        key={req.id} 
                        onClick={() => setSelectedReq(req)}
                        className={`p-4 rounded-xl cursor-pointer transition-all border ${
                          selectedReq?.id === req.id 
                            ? 'bg-blue-50/50 border-primary ring-1 ring-primary/30' 
                            : 'bg-white border-gray-100 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[12px] font-bold text-primary">{req.id}</span>
                          
                          {/* SHOWS TOTAL UNREAD COUNT FOR THE PROJECT */}
                          {totalUnread > 0 && (
                            <span className="bg-red-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                              {totalUnread}
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-navy text-[13px] leading-snug truncate">{req.title}</h4>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT PANE: Chat Window */}
            <div className="w-full lg:w-2/3 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col relative overflow-hidden">
              {selectedReq ? (
                <>
                  <div className="p-5 border-b border-gray-100 bg-white flex-shrink-0 z-10">
                    <h2 className="text-lg font-bold text-navy mb-4 truncate">{selectedReq.id}: {selectedReq.title}</h2>
                    <div className="flex bg-gray-50 p-1 rounded-xl">
                      
                      <button 
                        onClick={() => setActiveChannel('Client')}
                        className={`flex-1 py-2.5 rounded-lg text-[13px] font-bold flex items-center justify-center transition-all ${activeChannel === 'Client' ? 'bg-white text-primary shadow-sm ring-1 ring-gray-100' : 'text-gray-500 hover:text-navy'}`}
                      >
                        <User className="w-4 h-4 mr-2" /> Client: {selectedReq.clientName}
                        
                        {/* SPECIFIC CLIENT UNREAD NUMBER BADGE */}
                        {selectedReq.unreadClient > 0 && (
                          <span className="ml-2 bg-red-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                            {selectedReq.unreadClient}
                          </span>
                        )}
                      </button>

                      <button 
                        onClick={() => setActiveChannel('Developer')}
                        className={`flex-1 py-2.5 rounded-lg text-[13px] font-bold flex items-center justify-center transition-all ${activeChannel === 'Developer' ? 'bg-white text-[#10B981] shadow-sm ring-1 ring-gray-100' : 'text-gray-500 hover:text-navy'}`}
                      >
                        <Users className="w-4 h-4 mr-2" /> Dev: {selectedReq.devName}
                        
                        {/* SPECIFIC DEVELOPER UNREAD NUMBER BADGE */}
                        {selectedReq.unreadDev > 0 && (
                          <span className="ml-2 bg-red-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                            {selectedReq.unreadDev}
                          </span>
                        )}
                      </button>

                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 bg-[#F8FAFC]">
                    {isLoadingMessages ? (
                       <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                    ) : messages.length === 0 ? (
                       <div className="h-full flex flex-col items-center justify-center text-gray-400">
                         <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
                         <p className="font-medium text-sm">No messages yet. Start the conversation!</p>
                       </div>
                    ) : (
                      <div className="space-y-6">
                        {messages.map((msg) => {
                          const isMe = msg.senderRole === 'BA';
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
                            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                              <span className="text-[10px] text-gray-400 font-bold mb-1 ml-1 mr-1">
                                {msg.senderName} • {msg.timeStr}
                              </span>
                              <div className={`max-w-[80%] rounded-2xl p-4 text-[14px] leading-relaxed shadow-sm ${
                                isMe 
                                  ? 'bg-primary text-white rounded-tr-sm' 
                                  : 'bg-white border border-gray-100 text-navy rounded-tl-sm'
                              }`}>
                                {msg.text}
                                
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

                  <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-100 flex items-end gap-3 flex-shrink-0 z-10">
                    
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    
                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current.click()}
                      className={`p-3.5 rounded-xl transition-colors ${attachedFile ? 'bg-blue-50 text-primary' : 'bg-gray-50 text-gray-400 hover:text-primary hover:bg-blue-50'}`}
                      title="Attach File"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>

                    <div className="flex-1 relative">
                       {attachedFile && (
                         <div className="absolute -top-10 left-0 bg-blue-50 text-primary text-xs font-bold px-3 py-1.5 rounded-lg border border-blue-100 flex items-center shadow-sm">
                           <FileText className="w-3 h-3 mr-1.5" /> {attachedFile.name}
                           <button type="button" onClick={() => setAttachedFile(null)} className="ml-3 text-red-400 hover:text-red-600">×</button>
                         </div>
                       )}
                       
                       <input 
                         type="text" 
                         value={inputText}
                         onChange={(e) => setInputText(e.target.value)}
                         placeholder={`Message the ${activeChannel}...`}
                         className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-3.5 text-[14px] text-navy outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                       />
                    </div>

                    <button 
                      type="submit"
                      disabled={isSending || (!inputText.trim() && !attachedFile)}
                      className="p-3.5 rounded-xl bg-primary hover:bg-blue-600 text-white transition-colors disabled:opacity-50 flex items-center justify-center shadow-sm"
                    >
                      {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>

                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-[#F8FAFC]">
                   <MessageSquare className="w-12 h-12 mb-4 opacity-30" />
                   <p className="font-medium">Select a project to view communication</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}