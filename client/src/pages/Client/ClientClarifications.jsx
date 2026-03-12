import { useState, useEffect } from "react";
import ClientTopBar from "../../components/Client/ClientTopBar";
import ClientSidebar from "../../components/Client/ClientSidebar";
import { Sparkles, User, Paperclip, Send, CheckCircle2 } from "lucide-react";

export default function ClientClarifications() {
  const [clarifications, setClarifications] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [answerText, setAnswerText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchClarifications();
  }, []);

  const fetchClarifications = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/client/clarifications");
      const data = await response.json();
      if (data.success) {
        setClarifications(data.data);
        // Auto-select the first pending item if it exists
        if (data.data.length > 0) {
          setSelectedItem(data.data[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching clarifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendAnswer = async () => {
    if (!answerText.trim() || !selectedItem) return;
    setIsSubmitting(true);

    try {
      const response = await fetch(`http://localhost:5000/api/client/clarifications/${selectedItem.id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: answerText })
      });
      
      const data = await response.json();
      if (data.success) {
        setAnswerText("");
        fetchClarifications(); // Refresh the list
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to format the time roughly like your design
  const timeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 48) return "Yesterday";
    return `${Math.floor(diffInHours / 24)} days ago`;
  };

  const pendingCount = clarifications.filter(c => c.status === 'Pending').length;

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <ClientTopBar />

      <div className="flex max-w-[1600px] mx-auto pt-6 px-6 gap-8">
        <div className="hidden lg:block w-64 flex-shrink-0">
          <ClientSidebar />
        </div>

        <div className="flex-1 pb-10 flex flex-col h-[calc(100vh-100px)]">
          
          {/* Header */}
          <div className="mb-6 flex-shrink-0">
            <h1 className="text-2xl font-bold text-navy">Clarifications</h1>
            <p className="text-gray-500 mt-1 text-sm">
              {pendingCount} questions from your Business Analyst need a response.
            </p>
          </div>

          {/* Main Split Layout */}
          <div className="flex gap-6 flex-1 min-h-0">
            
            {/* LEFT COLUMN: List */}
            <div className="w-1/3 bg-white border border-gray-100 rounded-3xl shadow-sm flex flex-col overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-bold text-navy text-sm">Questions ({clarifications.length})</h3>
              </div>
              
              <div className="overflow-y-auto flex-1 p-3 space-y-2">
                {isLoading ? (
                  <p className="text-center text-gray-400 text-sm py-8">Loading...</p>
                ) : clarifications.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-8">No clarifications needed!</p>
                ) : (
                  clarifications.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                        selectedItem?.id === item.id 
                          ? 'border-blue-200 bg-blue-50/50 shadow-sm' 
                          : 'border-transparent hover:bg-gray-50 hover:border-gray-100'
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-[10px] font-bold text-gray-400">{item.reqId}</span>
                        
                        {/* Source Tag */}
                        {item.source === 'AI' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-600 flex items-center">
                            <Sparkles className="w-3 h-3 mr-1" /> AI
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-600 flex items-center">
                            <User className="w-3 h-3 mr-1" /> BA
                          </span>
                        )}

                        {/* Priority / Status Tag */}
                        {item.status === 'Answered' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-100 text-green-600 flex items-center">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Answered
                          </span>
                        ) : (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            item.priority === 'Urgent' ? 'bg-red-100 text-red-600' :
                            item.priority === 'Medium' ? 'bg-orange-100 text-orange-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {item.priority}
                          </span>
                        )}
                      </div>
                      
                      <h4 className="font-bold text-navy text-sm mb-1 truncate">{item.title}</h4>
                      <p className="text-xs text-gray-500">{item.baName} • {timeAgo(item.createdAt)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Details & Response */}
            <div className="flex-1 bg-white border border-gray-100 rounded-3xl shadow-sm flex flex-col overflow-hidden">
              {selectedItem ? (
                <>
                  {/* Right Header */}
                  <div className="p-8 border-b border-gray-50">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="text-xs font-bold text-gray-400">{selectedItem.reqId}</span>
                      {selectedItem.status !== 'Answered' && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          selectedItem.priority === 'Urgent' ? 'bg-red-100 text-red-600' :
                          selectedItem.priority === 'Medium' ? 'bg-orange-100 text-orange-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {selectedItem.priority}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-navy">{selectedItem.title}</h2>
                    <p className="text-sm text-gray-500 mt-1">Question from {selectedItem.baName}</p>
                  </div>

                  {/* Scrollable Content */}
                  <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    
                    {/* Regarding Block */}
                    <div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Regarding</h3>
                      <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 text-gray-600 text-sm italic">
                        "{selectedItem.regarding}"
                      </div>
                    </div>

                    {/* Question Block */}
                    <div className={`p-6 rounded-2xl border-l-4 shadow-sm ${
                      selectedItem.source === 'AI' 
                        ? 'border-purple-500 bg-purple-50/30' 
                        : 'border-blue-500 bg-blue-50/30'
                    }`}>
                      <div className="flex items-center space-x-2 mb-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${
                          selectedItem.source === 'AI' ? 'bg-purple-500' : 'bg-blue-500'
                        }`}>
                          {selectedItem.source === 'AI' ? <Sparkles className="w-4 h-4" /> : <User className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-navy">{selectedItem.baName}</p>
                          <p className={`text-[10px] font-semibold ${
                            selectedItem.source === 'AI' ? 'text-purple-600' : 'text-blue-600'
                          }`}>
                            {selectedItem.source === 'AI' ? 'AI Generated Question' : 'Manual Question'}
                          </p>
                        </div>
                      </div>
                      <p className="text-navy font-medium text-sm leading-relaxed">
                        {selectedItem.question}
                      </p>
                    </div>

                    {/* Response Area */}
                    {selectedItem.status === 'Answered' ? (
                      <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Your Response</h3>
                        <div className="p-5 bg-green-50/50 rounded-2xl border border-green-100 text-navy text-sm">
                          {selectedItem.answer}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Your Response</h3>
                        <textarea
                          value={answerText}
                          onChange={(e) => setAnswerText(e.target.value)}
                          placeholder="Type your answer here..."
                          className="w-full h-32 p-5 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none text-sm text-navy"
                        />
                        <div className="flex justify-between items-center mt-4">
                          <button className="flex items-center text-sm font-semibold text-gray-500 hover:text-navy transition-colors">
                            <Paperclip className="w-4 h-4 mr-2" /> Attach File
                          </button>
                          <button
                            onClick={handleSendAnswer}
                            disabled={!answerText.trim() || isSubmitting}
                            className="bg-gray-200 hover:bg-primary text-gray-500 hover:text-white px-6 py-2.5 rounded-xl font-bold flex items-center transition-all disabled:opacity-50 disabled:hover:bg-gray-200 disabled:hover:text-gray-500"
                          >
                            <Send className="w-4 h-4 mr-2" /> 
                            {isSubmitting ? 'Sending...' : 'Send Answer'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                  <Sparkles className="w-12 h-12 mb-4 text-gray-200" />
                  <p>Select a question from the list to view details.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}