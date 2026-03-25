import { useState, useEffect, useRef } from "react";
import ClientTopBar from "../../components/Client/ClientTopBar";
import ClientSidebar from "../../components/Client/ClientSidebar";
import { Paperclip, Send, FileText, X, MessageSquare, ChevronDown, Check } from "lucide-react";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export default function ClientMessages() {
  const [messages, setMessages] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [selectedReqId, setSelectedReqId] = useState("");
  
  const [newMessage, setNewMessage] = useState("");
  const [attachedFile, setAttachedFile] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [isReqDropdownOpen, setIsReqDropdownOpen] = useState(false);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // --- CLEAN LOAD: Runs only when the user logs in ---
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchInitialData(user.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchInitialData = async (uid) => {
    try {
      const response = await fetch(`http://localhost:5000/api/client/requests?uid=${uid}`);
      const data = await response.json();
      
      if (data.success && data.data.length > 0) {
        setRequirements(data.data);
        // Default to the first project
        const firstId = data.data[0].reqId || data.data[0].id;
        setSelectedReqId(firstId);
        fetchMessages(uid, firstId);
      }
    } catch (error) {
      console.error("Load Error:", error);
    }
  };

  const fetchMessages = async (uid, reqId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/client/messages?uid=${uid}`);
      const data = await response.json();
      if (data.success) {
        setMessages(data.data);
      }
    } catch (error) {
      console.error("Message Fetch Error:", error);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsReqDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedReqId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !attachedFile) || isSending) return;
    
    setIsSending(true);
    const auth = getAuth();
    const uid = auth.currentUser.uid;

    try {
      const payload = {
        text: newMessage,
        sender: "Client",
        uid: uid,
        senderName: auth.currentUser.displayName || "Client User",
        reqId: selectedReqId || "GLOBAL", 
        fileName: attachedFile ? attachedFile.name : null
      };

      const response = await fetch("http://localhost:5000/api/client/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if ((await response.json()).success) {
        setNewMessage("");
        setAttachedFile(null); 
        fetchMessages(uid, selectedReqId); // Refresh list immediately after sending
      }
    } catch (error) {
      console.error("Send Error:", error);
    } finally {
      setIsSending(false);
    }
  };

  const filteredMessages = messages.filter(msg => msg.reqId === selectedReqId);
  const activeReq = requirements.find(r => (r.id === selectedReqId || r.reqId === selectedReqId));
  const currentBA = activeReq?.baName || "Bhashi Fernando";

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <ClientTopBar />
      <div className="flex max-w-[1600px] mx-auto pt-6 px-4 md:px-6 gap-8">
        <div className="hidden lg:block w-64 flex-shrink-0">
          <ClientSidebar />
        </div>

        <div className="flex-1 pb-10 flex flex-col h-[calc(100vh-100px)]">
          
          {/* HEADER SECTION */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 gap-4">
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
                  <span className="truncate">{activeReq ? `Project: ${activeReq.reqId || activeReq.id}` : "Select Requirement"}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isReqDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {isReqDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-xl z-50 py-1 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                  {requirements.map((req) => (
                    <button
                      key={req.reqId || req.id}
                      onClick={() => { 
                        setSelectedReqId(req.reqId || req.id); 
                        setIsReqDropdownOpen(false); 
                      }}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center justify-between group border-b border-gray-50 last:border-0"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className={`font-bold ${selectedReqId === (req.reqId || req.id) ? "text-primary" : "text-navy"}`}>
                          {req.reqId || req.id}
                        </span>
                        <span className="text-[11px] text-gray-500 truncate">{req.title}</span>
                      </div>
                      {(selectedReqId === req.reqId || selectedReqId === req.id) && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="px-8 py-5 border-b border-gray-100 flex items-center bg-white z-10">
              <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold mr-4 shadow-sm">
                {currentBA[0]}
              </div>
              <div>
                <h2 className="text-base font-bold text-navy leading-tight">{currentBA}</h2>
                <div className="flex items-center text-[10px] text-green-500 font-bold uppercase tracking-wider mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2"></span> {activeReq ? "Online" : "Select a Project"}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-[#F8FAFC] space-y-6">
              {filteredMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 italic">
                   <p className="text-sm">No messages yet. Send a message to start.</p>
                </div>
              ) : (
                filteredMessages.map((msg) => {
                  const isClient = msg.sender === "Client";
                  return (
                    <div key={msg.id} className={`flex flex-col ${isClient ? "items-end" : "items-start"}`}>
                      <div className={`max-w-[70%] px-5 py-3.5 rounded-2xl text-sm shadow-sm ${
                        isClient ? "bg-primary text-white rounded-br-none" : "bg-white text-navy border border-gray-100 rounded-bl-none"
                      }`}>
                        {msg.text && <p>{msg.text}</p>}
                        {msg.fileName && (
                          <div className={`flex items-center mt-3 p-2.5 rounded-xl border ${isClient ? 'bg-white/10 border-white/20' : 'bg-gray-50 border-gray-100'}`}>
                            <FileText className="w-4 h-4 mr-2" />
                            <span className="font-semibold text-xs truncate">{msg.fileName}</span>
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 mt-2 uppercase mx-1">{msg.timestamp}</span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-6 bg-white border-t border-gray-100">
              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                <input type="file" ref={fileInputRef} onChange={(e) => setAttachedFile(e.target.files[0])} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current.click()} className={`p-3 border rounded-xl transition-all ${attachedFile ? 'bg-blue-50 border-primary text-primary' : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-primary'}`}>
                  <Paperclip className="w-5 h-5" />
                </button>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    disabled={!selectedReqId}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={!selectedReqId ? "Please select a project first" : (attachedFile ? `Attached: ${attachedFile.name}` : "Type your message...")}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl text-sm px-5 py-3.5 focus:bg-white transition-all outline-none"
                  />
                  {attachedFile && <X onClick={() => setAttachedFile(null)} className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 cursor-pointer" />}
                </div>
                <button type="submit" disabled={isSending || !selectedReqId} className="bg-primary text-white p-4 rounded-2xl shadow-lg hover:scale-105 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100">
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}