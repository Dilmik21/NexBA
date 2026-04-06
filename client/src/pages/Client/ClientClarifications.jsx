import { useState, useEffect, useRef } from "react";
import ClientTopBar from "../../components/Client/ClientTopBar";
import ClientSidebar from "../../components/Client/ClientSidebar";
import { useAuth } from "../../contexts/AuthContext"; 
import { User, Paperclip, Send, Loader2, MessageSquare, CheckCircle2, FileText, X } from "lucide-react";

export default function ClientClarifications() {
  const { currentUser } = useAuth(); 
  const [questions, setQuestions] = useState([]);
  const [hasHistory, setHasHistory] = useState(false); 
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  
  const [answerText, setAnswerText] = useState("");
  const [attachedFile, setAttachedFile] = useState(null); 
  const fileInputRef = useRef(null); 

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentUser) {
      fetchClarifications();
    }
  }, [currentUser]);

  const fetchClarifications = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/client/clarifications?uid=${currentUser.uid}`);
      const json = await response.json();
      if (json.success) {
        setHasHistory(json.data.length > 0);
        // Only show questions that are still pending action from the client
        const pendingQuestions = json.data.filter(q => q.status === "Pending Client");
        setQuestions(pendingQuestions);
        
        if (pendingQuestions.length > 0) {
          setSelectedQuestion(pendingQuestions[0]);
        } else {
          setSelectedQuestion(null);
        }
      }
    } catch (error) {
      console.error("Error fetching clarifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- FIXED: PERFECTLY CLEARS WORK WHEN SWITCHING QUESTIONS ---
  const handleSelect = (q) => {
    setSelectedQuestion(q);
    setAnswerText(""); 
    setAttachedFile(null); 
    if (fileInputRef.current) fileInputRef.current.value = ""; // Wipes browser file memory
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) { 
        alert("File is too large. Please select a file under 15MB.");
        if (fileInputRef.current) fileInputRef.current.value = ""; // Clear bad file
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedFile({
          name: file.name,
          data: reader.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // --- FIXED: PERFECTLY CLEARS WORK AFTER SUBMISSION ---
  const handleSendAnswer = async () => {
    if (!answerText.trim() || !selectedQuestion) return;
    
    setIsSubmitting(true);
    try {
      const payload = { 
        uid: currentUser.uid,
        reqId: selectedQuestion.reqId, 
        answer: answerText.trim(),
        status: "Answered", 
        answeredAt: new Date().toLocaleString(),
        fileName: attachedFile ? attachedFile.name : null,
        fileData: attachedFile ? attachedFile.data : null
      };

      const response = await fetch(`http://localhost:5000/api/client/clarifications/${selectedQuestion.id}/answer?uid=${currentUser.uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Server rejected request with status: ${response.status}`);
      }

      const json = await response.json();
      
      if (json.success) {
        // Remove from current list immediately
        const remainingQuestions = questions.filter(q => q.id !== selectedQuestion.id);
        setQuestions(remainingQuestions);
        
        if (remainingQuestions.length > 0) {
          setSelectedQuestion(remainingQuestions[0]);
        } else {
          setSelectedQuestion(null);
        }
        
        // Wipe all inputs completely clean
        setAnswerText("");
        setAttachedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = ""; 
      } else {
        alert("Server received the answer but failed to save it.");
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
      alert("Failed to send response. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeAttachment = () => {
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = ""; // Wipes memory so they can re-upload same file if needed
  };

  const timeAgo = (dateString) => {
    if (!dateString) return "Just now";
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    return `${Math.floor(diffInHours / 24)} days ago`;
  };

  const getPriorityBadge = (priority) => {
    const p = priority || 'Medium'; 
    if (p === 'Urgent' || p === 'High') return <span className="bg-red-50 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded">High</span>;
    if (p === 'Medium') return <span className="bg-yellow-50 text-yellow-600 text-[10px] font-bold px-2 py-0.5 rounded">Medium</span>;
    return <span className="bg-gray-50 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded">Low</span>;
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <ClientTopBar />

      <div className="flex max-w-[1600px] mx-auto pt-6 px-4 md:px-6 gap-8">
        <div className="hidden lg:block flex-shrink-0">
          <ClientSidebar />
        </div>

        <div className="flex-1 pb-10 flex flex-col h-full lg:h-[calc(100vh-100px)]">
          <div className="mb-6 flex-shrink-0">
            <h1 className="text-[22px] font-bold text-navy">Clarifications</h1>
            <p className="text-gray-500 mt-1 text-[13px]">
              {questions.length} pending clarification(s) requires your input.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 flex-1 lg:min-h-0">
            
            {/* LEFT LIST PANE */}
            <div className="w-full lg:w-[350px] bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden flex flex-col flex-shrink-0 h-[350px] lg:h-auto">
              <div className="p-5 border-b border-gray-50 font-bold text-[13px] text-gray-500 bg-gray-50/30 uppercase tracking-widest">
                Pending Actions ({questions.length})
              </div>
              
              <div className="overflow-y-auto flex-1 p-2 space-y-1">
                {isLoading ? (
                  <div className="p-8 text-center text-gray-400 flex flex-col items-center">
                    <Loader2 className="w-6 h-6 animate-spin mb-2 text-primary" />
                    <p className="text-sm">Fetching queries...</p>
                  </div>
                ) : questions.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 h-full flex flex-col items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 mb-4 text-primary opacity-30" />
                    <p className="font-bold text-navy text-sm">All Resolved!</p>
                    <p className="text-[11px] mt-1">There are no questions waiting for you.</p>
                  </div>
                ) : (
                  questions.map(q => (
                    <div 
                      key={q.id}
                      onClick={() => handleSelect(q)}
                      className={`p-4 rounded-2xl cursor-pointer transition-all border ${selectedQuestion?.id === q.id ? 'bg-white shadow-md border-transparent ring-1 ring-black/5' : 'border-transparent hover:bg-gray-50'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-[11px] font-bold text-gray-400">{q.reqId}</span>
                          <span className="bg-blue-50 text-primary text-[9px] font-bold px-1.5 py-0.5 rounded">BA</span>
                        </div>
                        {getPriorityBadge(q.priority)}
                      </div>
                      <h4 className={`font-bold text-[13px] truncate mb-1 ${selectedQuestion?.id === q.id ? 'text-navy' : 'text-gray-600'}`}>{q.title}</h4>
                      <p className="text-[10px] text-gray-400">{timeAgo(q.createdAt)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* RIGHT DETAIL PANE */}
            {selectedQuestion ? (
              <div className="flex-1 bg-white rounded-[24px] border border-gray-100 shadow-sm flex flex-col min-h-[500px] lg:min-h-0 overflow-hidden">
                <div className="p-6 md:p-8 border-b border-gray-50 bg-white">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="text-[11px] font-bold text-gray-400">{selectedQuestion.reqId}</span>
                    {getPriorityBadge(selectedQuestion.priority)}
                  </div>
                  <h2 className="text-[20px] font-bold text-navy mb-1">{selectedQuestion.title}</h2>
                  <p className="text-[12px] text-gray-400 font-medium">Inquiry from {selectedQuestion.baName}</p>
                </div>

                <div className="p-6 md:p-8 flex-1 overflow-y-auto bg-[#F8FAFC]/50 space-y-8">
                  <div>
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Requirement Context</h3>
                    <div className="bg-white p-5 rounded-2xl text-gray-500 text-[13px] leading-relaxed border border-gray-100 shadow-sm italic">
                      "{selectedQuestion.regarding}"
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border-l-[4px] border-l-primary shadow-sm flex items-start">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                       <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-navy">{selectedQuestion.baName}</span>
                        <span className="text-[10px] bg-blue-50 text-primary px-2 py-0.5 rounded font-bold uppercase">BA Question</span>
                      </div>
                      <p className="text-sm text-navy font-medium leading-relaxed">{selectedQuestion.question}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Your Response</h3>
                    <div className="bg-white border border-gray-200 rounded-[1.5rem] overflow-hidden focus-within:ring-4 focus-within:ring-primary/5 transition-all">
                      <textarea 
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        placeholder="Provide your feedback or answer here..."
                        className="w-full h-36 p-6 text-sm text-navy resize-none outline-none placeholder-gray-400 bg-transparent"
                      />
                      
                      {attachedFile && (
                        <div className="mx-6 mb-4 p-3 bg-blue-50 rounded-xl flex items-center justify-between border border-blue-100">
                          <div className="flex items-center text-xs font-bold text-primary">
                            <FileText className="w-4 h-4 mr-2" />
                            <span className="truncate max-w-[200px]">{attachedFile.name}</span>
                          </div>
                          {/* UPDATED: Uses the safe remove function */}
                          <button onClick={removeAttachment} className="p-1 hover:text-red-500"><X className="w-4 h-4" /></button>
                        </div>
                      )}

                      <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                        <button 
                          onClick={() => fileInputRef.current.click()}
                          className="flex items-center text-xs font-bold text-gray-500 hover:text-primary"
                        >
                          <Paperclip className="w-4 h-4 mr-2" /> Attach File
                        </button>
                        <button 
                          onClick={handleSendAnswer}
                          disabled={!answerText.trim() || isSubmitting}
                          className="w-full sm:w-auto bg-primary text-white text-xs font-bold px-8 py-3 rounded-full shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
                        >
                          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />} 
                          Send Answer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 bg-white rounded-[24px] border border-gray-100 flex flex-col items-center justify-center text-gray-400 p-12">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-primary mb-6">
                   {hasHistory ? <CheckCircle2 className="w-10 h-10" /> : <MessageSquare className="w-10 h-10" />}
                </div>
                <h3 className="font-bold text-navy text-xl">Inbox Clean</h3>
                <p className="text-sm text-gray-500 text-center max-w-xs mt-2">No pending clarifications found. Your project is moving forward smoothly!</p>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}