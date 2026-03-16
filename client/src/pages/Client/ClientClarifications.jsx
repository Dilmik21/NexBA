import { useState, useEffect, useRef } from "react";
import ClientTopBar from "../../components/Client/ClientTopBar";
import ClientSidebar from "../../components/Client/ClientSidebar";
import { Sparkles, User, Paperclip, Send, Loader2, MessageSquare, CheckCircle2, FileText, X } from "lucide-react";

export default function ClientClarifications() {
  const [questions, setQuestions] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  
  const [answerText, setAnswerText] = useState("");
  const [attachedFile, setAttachedFile] = useState(null); 
  const fileInputRef = useRef(null); 

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchClarifications();
  }, []);

  const fetchClarifications = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/client/clarifications");
      const json = await response.json();
      if (json.success) {
        // Only show questions that still need an answer!
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

  const handleSelect = (q) => {
    setSelectedQuestion(q);
    setAnswerText(""); 
    setAttachedFile(null); 
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { 
        alert("File is too large. Please select a file under 2MB.");
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

  const handleSendAnswer = async () => {
    if (!answerText.trim() || !selectedQuestion) return;
    
    setIsSubmitting(true);
    try {
      const payload = { 
        answer: answerText,
        fileName: attachedFile ? attachedFile.name : null,
        fileData: attachedFile ? attachedFile.data : null
      };

      // FIXED: Changed method to "POST" to perfectly match your backend routes!
      const response = await fetch(`http://localhost:5000/api/client/clarifications/${selectedQuestion.id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await response.json();
      
      if (json.success) {
        // Remove the answered question from the list immediately!
        const remainingQuestions = questions.filter(q => q.id !== selectedQuestion.id);
        setQuestions(remainingQuestions);
        
        // Auto-select the next question, or clear the screen if done
        if (remainingQuestions.length > 0) {
          setSelectedQuestion(remainingQuestions[0]);
        } else {
          setSelectedQuestion(null);
        }
        
        setAnswerText("");
        setAttachedFile(null);
      } else {
        console.error("Failed to save answer:", json.message);
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const timeAgo = (dateString) => {
    if (!dateString) return "Just now";
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 48) return "Yesterday";
    return `${Math.floor(diffInHours / 24)} days ago`;
  };

  const getPriorityBadge = (priority) => {
    if (priority === 'Urgent' || priority === 'High') return <span className="bg-red-50 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded">Urgent</span>;
    if (priority === 'Medium') return <span className="bg-yellow-50 text-yellow-600 text-[10px] font-bold px-2 py-0.5 rounded">Medium</span>;
    return <span className="bg-gray-50 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded">Low</span>;
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <ClientTopBar />

      <div className="flex max-w-[1600px] mx-auto pt-6 px-6 gap-8">
        <div className="hidden lg:block flex-shrink-0">
          <ClientSidebar />
        </div>

        <div className="flex-1 pb-10 flex flex-col h-[calc(100vh-100px)]">
          
          <div className="mb-6 flex-shrink-0">
            <h1 className="text-[22px] font-bold text-navy">Clarifications</h1>
            <p className="text-gray-500 mt-1 text-[13px]">
              {questions.length} questions from your Business Analyst need a response.
            </p>
          </div>

          <div className="flex gap-6 flex-1 min-h-0">
            
            {/* LEFT PANE - LIST */}
            <div className="w-[350px] bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden flex flex-col flex-shrink-0">
              <div className="p-5 border-b border-gray-50 font-bold text-[13px] text-gray-500 bg-gray-50/30">
                Action Items ({questions.length})
              </div>
              
              <div className="overflow-y-auto flex-1 p-2 space-y-1">
                {isLoading ? (
                  <div className="p-8 text-center text-gray-400 flex flex-col items-center">
                    <Loader2 className="w-6 h-6 animate-spin mb-2 text-primary" />
                    <p className="text-sm">Loading questions...</p>
                  </div>
                ) : questions.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-400 opacity-50" />
                    <p className="font-bold text-navy">All Caught Up!</p>
                    <p className="text-sm mt-1 text-gray-400">You have answered all questions.</p>
                  </div>
                ) : (
                  questions.map(q => (
                    <div 
                      key={q.id}
                      onClick={() => handleSelect(q)}
                      className={`p-4 rounded-2xl cursor-pointer transition-colors border ${selectedQuestion?.id === q.id ? 'bg-white shadow-[0_4px_20px_rgb(0,0,0,0.06)] border-transparent' : 'border-transparent hover:bg-gray-50'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-[11px] font-bold text-gray-400">{q.reqId}</span>
                          {q.isAI ? (
                            <span className="flex items-center bg-purple-50 text-purple-600 text-[10px] font-bold px-1.5 py-0.5 rounded">
                              <Sparkles className="w-2.5 h-2.5 mr-1" /> AI
                            </span>
                          ) : (
                            <span className="flex items-center bg-blue-50 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded">
                              <User className="w-2.5 h-2.5 mr-1" /> BA
                            </span>
                          )}
                        </div>
                        {getPriorityBadge(q.priority)}
                      </div>
                      <h4 className={`font-bold text-[13px] truncate mb-1 ${selectedQuestion?.id === q.id ? 'text-navy' : 'text-gray-700'}`}>{q.title}</h4>
                      <p className="text-[11px] text-gray-400 truncate">{q.baName} • {timeAgo(q.createdAt)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* RIGHT PANE - DETAIL VIEW */}
            {selectedQuestion ? (
              <div className="flex-1 bg-white rounded-[24px] border border-gray-100 shadow-sm flex flex-col min-h-0">
                
                {/* Header */}
                <div className="p-8 border-b border-gray-50 flex-shrink-0">
                  <div className="flex items-center space-x-3 mb-4">
                    <span className="text-[11px] font-bold text-gray-400">{selectedQuestion.reqId}</span>
                    {getPriorityBadge(selectedQuestion.priority)}
                  </div>
                  <h2 className="text-[20px] font-bold text-navy mb-1">{selectedQuestion.title}</h2>
                  <p className="text-[13px] text-gray-400">Question from {selectedQuestion.baName}</p>
                </div>

                {/* Scrollable Content */}
                <div className="p-8 flex-1 overflow-y-auto bg-gray-50/30">
                  
                  <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Regarding</h3>
                  <div className="bg-[#F8FAFC] p-5 rounded-[16px] text-[#475569] text-[14px] leading-relaxed italic border border-gray-100 mb-8 line-clamp-3">
                    "{selectedQuestion.regarding}"
                  </div>

                  <div className="bg-white p-6 rounded-[16px] border border-purple-100 shadow-sm relative group flex items-start border-l-[4px] border-l-purple-500 mb-8">
                    <div className="w-8 h-8 bg-purple-50 rounded-full flex items-center justify-center flex-shrink-0 mr-4">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <div className="flex items-center mb-1">
                        <span className="text-[12px] font-bold text-navy mr-2">{selectedQuestion.baName}</span>
                        <span className="text-[11px] text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded">AI Generated Question</span>
                      </div>
                      <p className="text-[15px] text-navy font-medium leading-relaxed mt-2">{selectedQuestion.question}</p>
                    </div>
                  </div>

                  {/* Response Area */}
                  <div>
                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Your Response</h3>
                    
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      className="hidden" 
                    />

                    <div className="bg-white border border-gray-200 rounded-[16px] overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all shadow-sm">
                      <textarea 
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        placeholder="Type your answer here..."
                        className="w-full h-32 p-5 text-[14px] text-navy resize-none outline-none placeholder-gray-400 bg-transparent"
                      />
                      
                      {attachedFile && (
                        <div className="mx-5 mb-3 p-3 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center justify-between">
                          <div className="flex items-center text-xs font-bold text-primary">
                            <FileText className="w-4 h-4 mr-2" />
                            <span className="truncate max-w-[200px]">{attachedFile.name}</span>
                          </div>
                          <button onClick={() => setAttachedFile(null)} className="p-1 hover:bg-blue-100 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex justify-between items-center">
                        <button 
                          onClick={() => fileInputRef.current.click()}
                          className="flex items-center text-[13px] font-semibold text-gray-500 hover:text-primary transition-colors"
                        >
                          <Paperclip className="w-4 h-4 mr-2" /> Attach File
                        </button>
                        <button 
                          onClick={handleSendAnswer}
                          disabled={!answerText.trim() || isSubmitting}
                          className="bg-gray-200 hover:bg-primary hover:text-white text-gray-600 text-[13px] font-bold px-6 py-2.5 rounded-full transition-all flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
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
              <div className="flex-1 bg-white rounded-[24px] border border-gray-100 shadow-sm flex flex-col items-center justify-center text-gray-400">
                <CheckCircle2 className="w-16 h-16 mb-4 text-green-400 opacity-40" />
                <h3 className="font-bold text-navy text-xl">You're all caught up!</h3>
                <p className="mt-2 text-sm text-gray-500">There are no pending questions for you to review.</p>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}