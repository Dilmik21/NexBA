import { useState, useEffect, useRef } from "react";
import ClientTopBar from "../../components/Client/ClientTopBar";
import ClientSidebar from "../../components/Client/ClientSidebar";
import { Paperclip, Send, ShieldCheck, FileText, X } from "lucide-react";

export default function ClientMessages() {
  const [messages, setMessages] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [selectedReqId, setSelectedReqId] = useState("");
  
  const [newMessage, setNewMessage] = useState("");
  const [attachedFile, setAttachedFile] = useState(null);
  const [isSending, setIsSending] = useState(false);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchRequirements();
    fetchMessages();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedReqId]);

  const fetchRequirements = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/client/requests");
      const data = await response.json();
      
      console.log("Firebase Requirements Loaded:", data); 
      
      if (data.success) {
        setRequirements(data.data);
        if (data.data.length > 0) {
          setSelectedReqId(data.data[0].reqId);
        }
      }
    } catch (error) {
      console.error("Error fetching requirements:", error);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/client/messages");
      const data = await response.json();
      if (data.success) {
        setMessages(data.data);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFile(e.target.files[0]);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !attachedFile) || isSending) return;
    
    setIsSending(true);
    try {
      const payload = {
        text: newMessage,
        sender: "Client",
        senderName: "Dilmik Rasanjana",
        reqId: selectedReqId || "GLOBAL", 
        fileName: attachedFile ? attachedFile.name : null
      };

      const response = await fetch("http://localhost:5000/api/client/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setNewMessage("");
        setAttachedFile(null); 
        if (fileInputRef.current) fileInputRef.current.value = ""; 
        fetchMessages(); 
      } else {
        alert("Backend connected, but Firebase failed to save the message.");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert(`Network Error: Cannot connect to the backend server. Make sure localhost:5000 is running! Details: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const filteredMessages = messages.filter(msg => msg.reqId === selectedReqId || msg.reqId === "GLOBAL");
  
  // Dynamic BA Info based on the selected requirement
  const activeReq = requirements.find(r => r.reqId === selectedReqId);
  const currentBA = activeReq?.baName || "Bhashi Fernando";
  // Check if they are online (Defaults to true if not explicitly set in database)
  const isBAOnline = activeReq?.baIsOnline !== false;

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <ClientTopBar />

      <div className="flex max-w-[1600px] mx-auto pt-6 px-6 gap-8">
        <div className="hidden lg:block w-64 flex-shrink-0">
          <ClientSidebar />
        </div>

        <div className="flex-1 pb-10 flex flex-col h-[calc(100vh-100px)]">
          
          <div className="bg-white border border-gray-100 rounded-3xl shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden relative">
            
            {/* TOP HEADER */}
            <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-white z-10 flex-shrink-0">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  {currentBA.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-navy">Contact Project Manager</h2>
                  <div className="flex items-center text-sm text-gray-500 mt-0.5">
                    
                    {/* DYNAMIC ONLINE/OFFLINE DOT */}
                    {isBAOnline ? (
                      <span className="relative flex h-2.5 w-2.5 mr-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                      </span>
                    ) : (
                      <span className="relative flex h-2.5 w-2.5 mr-2">
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gray-400"></span>
                      </span>
                    )}
                    
                    {/* DYNAMIC BA NAME */}
                    {currentBA} • Business Analyst
                  </div>
                </div>
              </div>

              <div className="flex items-center bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 shadow-sm">
                <ShieldCheck className="w-4 h-4 text-blue-500 mr-2" />
                <select 
                  value={selectedReqId}
                  onChange={(e) => setSelectedReqId(e.target.value)}
                  className="bg-transparent font-bold text-blue-600 text-sm outline-none cursor-pointer appearance-none pr-4 max-w-[200px] truncate"
                >
                  {requirements.length === 0 ? (
                    <option value="GLOBAL">No Projects Found</option>
                  ) : (
                    requirements.map(req => (
                      <option key={req.id} value={req.reqId}>
                        Project: {req.title || req.reqId}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* SCROLLABLE CHAT AREA */}
            <div className="flex-1 overflow-y-auto p-8 bg-[#F5F7FA]/50 space-y-6">
              {filteredMessages.length === 0 ? (
                <div className="text-center text-gray-400 mt-10 text-sm font-medium">No messages yet. Start the conversation!</div>
              ) : (
                filteredMessages.map((msg) => {
                  const isClient = msg.sender === "Client";
                  
                  return (
                    <div key={msg.id} className={`flex flex-col ${isClient ? "items-end" : "items-start"}`}>
                      <div className={`max-w-[70%] px-6 py-4 rounded-2xl text-sm leading-relaxed ${
                        isClient 
                          ? "bg-[#0A66C2] text-white rounded-br-sm shadow-md shadow-blue-500/20"
                          : "bg-white text-navy border border-gray-100 rounded-bl-sm shadow-sm"
                      }`}>
                        {msg.text && <p>{msg.text}</p>}
                        
                        {msg.fileName && (
                          <div className={`flex items-center mt-3 p-3 rounded-xl border ${isClient ? 'bg-blue-600/50 border-blue-400' : 'bg-gray-50 border-gray-200'}`}>
                            <FileText className="w-5 h-5 mr-3 opacity-80" />
                            <span className="font-semibold truncate">{msg.fileName}</span>
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-semibold text-gray-400 mt-2 mx-1">
                        {msg.senderName} • {msg.timestamp}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* BOTTOM INPUT AREA */}
            <div className="p-5 bg-white border-t border-gray-100 flex-shrink-0 flex flex-col">
              
              {attachedFile && (
                <div className="flex items-center self-start mb-3 bg-blue-50 text-blue-600 border border-blue-100 px-4 py-2 rounded-lg text-sm font-medium shadow-sm">
                  <FileText className="w-4 h-4 mr-2" />
                  <span className="truncate max-w-[200px]">{attachedFile.name}</span>
                  <button onClick={() => setAttachedFile(null)} className="ml-3 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
                
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current.click()}
                  className="p-3 bg-gray-50 border border-gray-200 text-gray-500 hover:text-primary hover:border-primary/30 hover:bg-blue-50 rounded-xl transition-all shadow-sm"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message to your Business Analyst..."
                  className="flex-1 bg-gray-50 border border-gray-200 text-navy placeholder-gray-400 focus:bg-white focus:border-primary/50 focus:ring-2 focus:ring-primary/10 rounded-xl outline-none text-sm px-5 py-3.5 transition-all shadow-inner"
                />
                
                <button 
                  type="submit"
                  disabled={(!newMessage.trim() && !attachedFile) || isSending}
                  className={`p-3.5 rounded-xl flex items-center justify-center transition-all ${
                    newMessage.trim() || attachedFile
                      ? "bg-primary text-white hover:bg-blue-600 shadow-lg shadow-blue-500/30 hover:-translate-y-0.5 cursor-pointer" 
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <Send className="w-5 h-5 ml-0.5" />
                </button>
              </form>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}