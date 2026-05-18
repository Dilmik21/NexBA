import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom"; 
import BATopBar from "../../components/BA/BATopBar";
import BASidebar from "../../components/BA/BASidebar";
import { useAuth } from "../../contexts/AuthContext";
import { MessageSquare, Paperclip, Send, Loader2, User, Users, FileText, Download, X, Video, Users2, ArrowLeft } from "lucide-react";

// Shared Document Viewer Component
const DocumentViewer = ({ fileName, fileData }) => {
  const isImage = fileData?.startsWith('data:image') || fileName?.match(/\.(jpeg|jpg|gif|png)$/i) != null;
  const isViewable = isImage || fileName?.match(/\.(pdf)$/i) != null;

  if (!fileData) {
      return (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-gray-400" />
                  <div>
                      <p className="text-sm font-bold text-navy">{fileName}</p>
                      <p className="text-[10px] text-gray-500">File content unavailable (Legacy project)</p>
                  </div>
              </div>
          </div>
      )
  }

  if (!isViewable) {
      return (
           <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0 pr-4">
                  <FileText className="w-6 h-6 text-primary flex-shrink-0" />
                  <div className="min-w-0">
                      <p className="text-sm font-bold text-navy truncate">{fileName}</p>
                      <p className="text-[10px] text-primary">Click download to view</p>
                  </div>
              </div>
              <a href={fileData} download={fileName} className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-white rounded-full text-primary hover:bg-primary hover:text-white transition-colors shadow-sm">
                  <Download className="w-4 h-4" />
              </a>
           </div>
      )
  }

  return (
      <div className="flex flex-col border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
          <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2 min-w-0 pr-4">
                  <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-xs font-bold text-navy truncate">{fileName}</span>
              </div>
              <a href={fileData} download={fileName} className="text-primary hover:text-blue-700 p-1 flex-shrink-0" title="Download">
                  <Download className="w-4 h-4" />
              </a>
          </div>
          <div className="h-[300px] w-full bg-gray-100 relative flex items-center justify-center">
              {isImage ? (
                  <img src={fileData} alt="Document" className="max-w-full max-h-full object-contain p-2" />
              ) : (
                  <iframe src={fileData} className="w-full h-full absolute inset-0" title="Document Viewer" />
              )}
          </div>
      </div>
  )
}

export default function CommunicationHub() {
  const { currentUser } = useAuth();
  
  const [searchParams] = useSearchParams();
  const targetReqId = searchParams.get("reqId");
  const targetTab = searchParams.get("tab");
  
  const [reqList, setReqList] = useState([]);
  const [selectedReq, setSelectedReq] = useState(null);
  
  const [activeChannel, setActiveChannel] = useState(targetTab === 'Developer' ? 'Developer' : 'Client'); 
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [attachedFile, setAttachedFile] = useState(null);
  
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (targetTab === 'Developer') setActiveChannel('Developer');
    else if (targetTab === 'Client') setActiveChannel('Client');
  }, [targetTab]);

  useEffect(() => {
    const fetchReqList = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/ba/chat/list?uid=${currentUser.uid}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setReqList(json.data);
          
          if (json.data.length > 0) {
             if (targetReqId) {
                const found = json.data.find(r => r.id === targetReqId);
                setSelectedReq(found || json.data[0]); 
             } else if (!selectedReq) {
                setSelectedReq(json.data[0]);
             }
          }
        }
      } catch (error) {
        console.error("Failed to fetch chat list:", error);
      } finally {
        setIsLoadingList(false);
      }
    };

    if (currentUser?.uid) {
      fetchReqList();
    } else {
      const timer = setTimeout(() => setIsLoadingList(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [currentUser, targetReqId]);

  useEffect(() => {
    if (!selectedReq?.id || !currentUser?.uid) return;

    setMessages([]); 
    setIsLoadingMessages(true);

    const fetchMessages = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/ba/chat/${selectedReq.id}/${activeChannel}?uid=${currentUser.uid}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setMessages(json.data);
        }
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    fetchMessages(); 
    const interval = setInterval(fetchMessages, 5000); 
    
    return () => clearInterval(interval);
  }, [selectedReq?.id, activeChannel, currentUser?.uid]);

  useEffect(() => {
    if (!selectedReq || !currentUser?.uid) return;

    let currentUnread = 0;
    if (activeChannel === 'Client') currentUnread = selectedReq.unreadClient;
    else if (activeChannel === 'Developer') currentUnread = selectedReq.unreadDev;
    else if (activeChannel === 'Group') currentUnread = selectedReq.unreadGroup || 0;
    
    if (currentUnread > 0) {
      const markAsRead = async () => {
        try {
          await fetch(`http://localhost:5000/api/ba/chat/${selectedReq.id}/${activeChannel}/read?uid=${currentUser.uid}`, { method: "PUT" });
          
          let updateKey = activeChannel === 'Client' ? 'unreadClient' : (activeChannel === 'Developer' ? 'unreadDev' : 'unreadGroup');
          setReqList(prev => prev.map(req => req.id === selectedReq.id ? { ...req, [updateKey]: 0 } : req));
          setSelectedReq(prev => ({ ...prev, [updateKey]: 0 }));
        } catch (error) {
          console.error("Failed to mark as read:", error);
        }
      };
      markAsRead();
    }
  }, [selectedReq, activeChannel, currentUser?.uid]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    if ((!inputText.trim() && !attachedFile) || isSending) return;
    setIsSending(true);

    try {
      const res = await fetch(`http://localhost:5000/api/ba/chat/${selectedReq.id}/${activeChannel}?uid=${currentUser.uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: inputText, 
          fileData: attachedFile,
          senderName: currentUser?.displayName || "Business Analyst" 
        })
      });
      const json = await res.json();
      
      if (json.success) {
        setMessages(prev => [...prev, json.data]);
        setInputText("");
        setAttachedFile(null);
      }
    } catch (error) {
      console.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleStartVideoMeeting = async () => {
    if (isSending) return;
    setIsSending(true);
    
    const randomHash = Math.random().toString(36).substring(2, 8);
    const meetingUrl = `https://meet.jit.si/NexBA-${selectedReq.id}-${randomHash}`;
    
    const messageText = `🎥 **Live Meeting Started!**\n\nThe Business Analyst has initiated a live video meeting for this project.\n\nClick here to join instantly: ${meetingUrl}`;

    try {
      const res = await fetch(`http://localhost:5000/api/ba/chat/${selectedReq.id}/Group?uid=${currentUser.uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: messageText, 
          fileData: null,
          senderName: currentUser?.displayName || "Business Analyst" 
        })
      });
      const json = await res.json();
      
      if (json.success) {
        setMessages(prev => [...prev, json.data]);
        window.open(meetingUrl, '_blank');
      }
    } catch (error) {
      console.error("Failed to start meeting");
      alert("Failed to start video meeting. Please try again.");
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

  const getInitials = (name) => {
    if (!name) return "U";
    const cleanName = name.trim();
    const parts = cleanName.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return cleanName.substring(0, 2).toUpperCase();
  };

  return (
    /* overflow-y-scroll safely forces the dummy external track, while internal boxes use native overflow-y-auto */
    <div className="h-screen bg-[#F5F7FA] overflow-y-scroll flex flex-col">
      <BATopBar />

      <div className="flex max-w-[1600px] mx-auto pt-6 px-4 md:px-6 gap-8 pb-6 flex-1 min-h-0 w-full">
        <div className="hidden lg:block flex-shrink-0 w-[260px] h-full">
          <BASidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0 h-full">
          
          <div className="mb-4 flex-shrink-0 mt-2">
            <h1 className="text-[20px] md:text-[24px] font-bold text-navy">Communication Hub</h1>
            <p className="text-[13px] md:text-[15px] text-gray-500 mt-1">Manage project-specific communication with Clients and Developers.</p>
          </div>

          <div className="flex-1 min-h-0 flex flex-col lg:flex-row w-full bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            
            <div className="w-full lg:w-1/3 flex flex-col h-full border-r border-gray-100 bg-[#FAFAFA] flex-shrink-0 lg:flex-shrink">
              <div className="p-5 border-b border-gray-100 bg-white flex-shrink-0">
                <h2 className="text-[15px] font-bold text-navy mb-4">Active Projects</h2>
                <div className="relative">
                  {/* Fake Search Bar for Visual Consistency */}
                  <div className="w-full bg-gray-50 border border-gray-200 text-sm rounded-xl pl-9 pr-4 py-2.5 text-gray-400">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </span>
                    Search projects...
                  </div>
                </div>
              </div>
              
              {/* NATIVE SCROLLBAR RESTORED: Removed 'custom-scrollbar' class */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 pr-2">
                {isLoadingList ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-[#007BFF]" /></div>
                ) : (reqList || []).length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-10">No active projects found.</p>
                ) : (
                  reqList.map((req) => {
                    const totalUnread = (req.unreadClient || 0) + (req.unreadDev || 0) + (req.unreadGroup || 0);
                    return (
                      <div 
                        key={req.id} 
                        onClick={() => setSelectedReq(req)}
                        className={`p-4 rounded-xl cursor-pointer transition-all border ${
                          selectedReq?.id === req.id 
                            ? 'bg-blue-50/50 border-[#007BFF] ring-1 ring-[#007BFF]/30 shadow-sm' 
                            : 'bg-white border-gray-100 hover:border-gray-300 shadow-sm hover:shadow'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[12px] font-bold text-[#007BFF]">{req.id}</span>
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

            <div className="w-full lg:w-2/3 bg-white flex flex-col relative h-full min-w-0">
              {selectedReq ? (
                <>
                  <div className="p-4 md:p-5 border-b border-gray-100 bg-white flex-shrink-0 z-10">
                    
                    {/* Header Structure Matches Dev/Client now */}
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <div className="flex bg-gray-50 p-1 rounded-xl w-full max-w-[400px]">
                        <button 
                          onClick={() => setActiveChannel('Client')}
                          className={`flex-1 py-2.5 rounded-lg text-[13px] font-bold flex items-center justify-center transition-all ${activeChannel === 'Client' ? 'bg-white text-[#007BFF] shadow-sm ring-1 ring-gray-100' : 'text-gray-500 hover:text-navy'}`}
                        >
                          <User className="w-4 h-4 mr-2" /> Direct: Client
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
                          <Users className="w-4 h-4 mr-2" /> Direct: Dev
                          {selectedReq.unreadDev > 0 && (
                            <span className="ml-2 bg-red-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                              {selectedReq.unreadDev}
                            </span>
                          )}
                        </button>

                        <button 
                          onClick={() => setActiveChannel('Group')}
                          className={`flex-1 py-2.5 rounded-lg text-[13px] font-bold flex items-center justify-center transition-all ${activeChannel === 'Group' ? 'bg-white text-purple-600 shadow-sm ring-1 ring-gray-100' : 'text-gray-500 hover:text-navy'}`}
                        >
                          <Users2 className="w-4 h-4 mr-2" /> Group Hub
                          {selectedReq.unreadGroup > 0 && (
                            <span className="ml-2 bg-red-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                              {selectedReq.unreadGroup}
                            </span>
                          )}
                        </button>
                      </div>

                      {/* Right: Requirement Info */}
                      <div className="hidden sm:flex flex-col items-end text-right min-w-0 border-l border-gray-100 pl-4">
                        <span className="text-[10px] font-bold text-[#007BFF] uppercase tracking-wider mb-0.5">
                          {selectedReq?.id}
                        </span>
                        <p className="text-[13px] font-bold text-navy truncate max-w-[180px] md:max-w-[250px]" title={selectedReq?.title}>
                          {selectedReq?.title}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 min-w-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <button onClick={() => setSelectedReq(null)} className="lg:hidden text-gray-500 hover:text-[#007BFF] p-1 -ml-1">
                          <ArrowLeft className="w-5 h-5" />
                        </button>

                        {activeChannel === 'Group' ? (
                           <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
                             <Users2 className="w-5 h-5" />
                           </div>
                        ) : activeChannel === 'Developer' ? (
                          selectedReq?.devImage ? (
                            <img src={selectedReq.devImage} alt="Dev Profile" className="w-10 h-10 rounded-full object-cover shadow-sm flex-shrink-0 border border-gray-100" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-[#10B981] text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
                              {getInitials(selectedReq?.devName)}
                            </div>
                          )
                        ) : (
                          selectedReq?.clientImage ? (
                            <img src={selectedReq.clientImage} alt="Client Profile" className="w-10 h-10 rounded-full object-cover shadow-sm flex-shrink-0 border border-gray-100" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-[#007BFF] text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
                              {getInitials(selectedReq?.clientName)}
                            </div>
                          )
                        )}

                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-navy text-[15px] truncate">
                            {activeChannel === 'Group' ? 'Project Group Hub' : (activeChannel === 'Developer' ? selectedReq.devName : selectedReq.clientName)} 
                            {activeChannel !== 'Group' && <span className="text-gray-400 font-normal ml-1">({activeChannel === 'Developer' ? 'Developer' : 'Client'})</span>}
                          </h3>
                          {activeChannel !== 'Group' && (
                            <div className="flex items-center text-[11px] text-gray-500 font-medium mt-0.5">
                              {(activeChannel === 'Developer' ? selectedReq?.devIsOnline : selectedReq?.clientIsOnline) ? (
                                <><div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></div> Online</>
                              ) : (
                                <><div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-1.5"></div> Offline</>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right side of bottom header: Video Meeting Button */}
                      {activeChannel === 'Group' && (
                        <button 
                          onClick={handleStartVideoMeeting}
                          disabled={isSending}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl text-sm transition-all shadow-sm flex items-center disabled:opacity-50"
                        >
                           <Video className="w-4 h-4 mr-2" /> Start Video Meeting
                        </button>
                      )}
                    </div>
                  </div>

                  
                  <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-[#F8FAFC] pr-2">
                    
                    {activeChannel === 'Client' && selectedReq.description && selectedReq.description !== "No description provided." && (
                      <div className="mb-8 border-b border-gray-200 pb-8">
                         <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Requirement Context</h3>
                         <div className="bg-white p-5 rounded-2xl text-navy text-sm leading-relaxed mb-4 border border-gray-200 shadow-sm whitespace-pre-wrap">
                            {selectedReq.description}
                         </div>
                         {selectedReq.fileName && selectedReq.fileName !== "No file attached" && (
                            <div className="mb-4">
                               <DocumentViewer fileName={selectedReq.fileName} fileData={selectedReq.fileData} />
                            </div>
                         )}
                      </div>
                    )}

                    {isLoadingMessages ? (
                       <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-[#007BFF]" /></div>
                    ) : messages.length === 0 ? (
                       <div className="h-full flex flex-col items-center justify-center text-gray-400 py-10">
                         <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
                         <p className="font-medium text-sm">
                           {activeChannel === 'Group' ? 'Welcome to the Group Hub. Client, BA, and Developer can all chat here!' : 'No messages yet. Start the conversation!'}
                         </p>
                       </div>
                    ) : (
                      messages.map((msg, idx) => {
                        const isMe = msg.senderRole === 'BA';
                        const isSystem = msg.type === 'System Alert';
                        const displayTime = msg.timeStr || formatTimeSafe(msg.timestamp || msg.createdAt);

                        if (isSystem) {
                           return (
                             <div key={msg.id} className="flex justify-center my-4">
                               <span className="bg-blue-50 text-blue-600 text-[11px] font-bold px-4 py-1.5 rounded-full border border-blue-100 text-center max-w-[80%]">
                                 {msg.text}
                               </span>
                             </div>
                           );
                        }

                        let messageColor = 'bg-white border-gray-100 text-navy rounded-tl-sm'; // Default (Client)
                        if (isMe) messageColor = 'bg-[#007BFF] text-white rounded-tr-sm'; // BA
                        else if (msg.senderRole === 'Developer' || msg.senderRole === 'Dev') messageColor = 'bg-[#10B981] text-white rounded-tl-sm'; // Developer

                        const renderTextWithLinks = (text) => {
                          const urlRegex = /(https?:\/\/[^\s]+)/g;
                          return text.split(urlRegex).map((part, i) => 
                            urlRegex.test(part) ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className={`underline font-bold ${isMe ? 'text-blue-100' : 'text-[#007BFF]'}`}>{part}</a> : part
                          );
                        };

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

                            <div className={`max-w-[85%] md:max-w-[70%] px-4 py-3 rounded-2xl text-[14px] leading-relaxed flex flex-col shadow-sm border ${messageColor}`}>
                              
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
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={activeChannel === 'Group' ? "Message everyone in the Group Hub..." : `Message the ${activeChannel}...`}
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-[13px] md:text-sm focus:outline-none focus:border-[#007BFF] focus:ring-1 focus:ring-[#007BFF]/20"
                      />
                      
                      <button 
                        type="submit" 
                        disabled={(!inputText.trim() && !attachedFile) || isSending}
                        className="p-3.5 bg-[#007BFF] text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 shadow-sm flex-shrink-0"
                      >
                        {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-[#F8FAFC]">
                   <MessageSquare className="w-12 h-12 mb-4 opacity-30 text-[#007BFF]" />
                   <p className="font-medium text-navy text-lg">Select a project</p>
                   <p className="text-sm mt-1 text-center px-4 max-w-sm">Choose a project from the left to contact the Client or Developer.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}