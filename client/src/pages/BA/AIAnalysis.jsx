import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import BATopBar from "../../components/BA/BATopBar";
import BASidebar from "../../components/BA/BASidebar";
import { FileText, File as FileIcon, Sparkles, X, Send, AlertTriangle, CheckCircle2, ChevronDown, Plus, Loader2, Edit3, Save, User, History, MessageSquare, Inbox, Paperclip, RefreshCw } from "lucide-react";

// Advanced Text Parser
const HighlightedText = ({ text, terms }) => {
  if (!text) return <p className="text-gray-500">No text provided.</p>;
  
  const hasTerms = terms && terms.length > 0;
  const paragraphs = text.split(/\n+/);

  return (
    <div className="space-y-4 text-[14px] text-[#334155] leading-[1.8]">
      {paragraphs.map((para, pIdx) => {
        const parts = para.split(/(\*\*.*?\*\*)/g);
        return (
          <p key={pIdx}>
            {parts.map((part, i) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="font-bold text-navy">{part.slice(2, -2)}</strong>;
              }

              if (hasTerms) {
                const termWords = terms.map(t => t.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
                const regex = new RegExp(`\\b(${termWords})\\b`, 'gi');
                const blocks = part.split(regex);
                
                return (
                  <span key={i}>
                    {blocks.map((block, bIdx) => {
                      const termMatch = terms.find(t => t.term.toLowerCase() === block.toLowerCase());
                      if (termMatch) {
                        return (
                          <span key={bIdx} className="text-red-500 font-semibold cursor-help relative group border-b border-red-500 border-dashed pb-[1px]">
                            {block}
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2 bg-gray-900 text-white text-xs rounded-xl opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none shadow-xl text-center leading-relaxed">
                              <span className="font-bold text-orange-300 block mb-1">AI Suggestion:</span>
                              {termMatch.suggestion}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                            </span>
                          </span>
                        );
                      }
                      return <span key={bIdx}>{block}</span>;
                    })}
                  </span>
                );
              }
              return <span key={i}>{part}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
};

export default function AIAnalysis() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reqId = searchParams.get("reqId");

  const [isLoading, setIsLoading] = useState(!!reqId);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [reqDetails, setReqDetails] = useState(null);
  const [aiData, setAiData] = useState(null);
  
  const [isEditingAI, setIsEditingAI] = useState(false);
  const [editedAIData, setEditedAIData] = useState(null);

  const [clarificationQuestions, setClarificationQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [isSending, setIsSending] = useState(false);
  
  const [existingClarifications, setExistingClarifications] = useState([]);
  const [isRefreshingAns, setIsRefreshingAns] = useState(false);

  const [historyList, setHistoryList] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Fetch Clarifications
  const fetchClarifications = async () => {
    setIsRefreshingAns(true);
    try {
      const res = await fetch(`http://localhost:5000/api/ba/analyze/${reqId}/clarifications`);
      const json = await res.json();
      if (json.success) {
        setExistingClarifications(json.data);
        // Clean up any drafts that are already sent!
        setClarificationQuestions(prev => 
          prev.filter(q => !json.data.some(sent => sent.question === q.text))
        );
      }
    } catch (e) {
      console.error("Failed to fetch existing clarifications");
    } finally {
      setIsRefreshingAns(false);
    }
  };

  useEffect(() => {
    if (!reqId) {
      setIsLoading(false);
      return;
    }

    const processAI = async () => {
      setIsLoading(true); 
      try {
        const response = await fetch(`http://localhost:5000/api/ba/analyze/${reqId}`, { method: "POST" });
        const json = await response.json();
        
        if (json.success) {
          setReqDetails(json.reqDetails);
          setAiData(json.data);
          setEditedAIData(json.data);
          setIsEditingAI(false);
          
          // Fetch existing clarifications BEFORE setting the draft questions
          const res = await fetch(`http://localhost:5000/api/ba/analyze/${reqId}/clarifications`);
          const clarifJson = await res.json();
          
          let sentQuestions = [];
          if (clarifJson.success) {
            setExistingClarifications(clarifJson.data);
            sentQuestions = clarifJson.data;
          }

          // FIXED: Filter out AI questions that have already been sent to the client!
          const filteredAIQuestions = json.data.suggestedQuestions
            .filter(aiQ => !sentQuestions.some(sq => sq.question === aiQ))
            .map(q => ({ text: q, isAI: true }));
            
          setClarificationQuestions(filteredAIQuestions);
        }
      } catch (error) {
        console.error("AI Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    processAI();
  }, [reqId]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/ba/history");
        const json = await response.json();
        if (json.success) setHistoryList(json.data);
      } catch (error) {
        console.error("History Error:", error);
      }
    };
    fetchHistory();
  }, []);

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const response = await fetch(`http://localhost:5000/api/ba/analyze/${reqId}/regenerate`, { method: "POST" });
      const json = await response.json();
      if (json.success) {
        setAiData(json.data);
        setEditedAIData(json.data);
        
        // FIXED: Filter out already sent questions even during regeneration
        const filteredAIQuestions = json.data.suggestedQuestions
          .filter(aiQ => !existingClarifications.some(sq => sq.question === aiQ))
          .map(q => ({ text: q, isAI: true }));
          
        setClarificationQuestions(filteredAIQuestions);
        setIsEditingAI(false);
      }
    } catch (error) {
      console.error("Regeneration Failed:", error);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSaveEdits = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`http://localhost:5000/api/ba/analyze/${reqId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedAIData)
      });
      const json = await response.json();
      if (json.success) {
        setAiData(editedAIData);
        setIsEditingAI(false);
      }
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleArrayChange = (field, value) => {
    setEditedAIData({ ...editedAIData, [field]: value.split('\n').filter(line => line.trim() !== '') });
  };

  const removeQuestion = (indexToRemove) => {
    setClarificationQuestions(clarificationQuestions.filter((_, index) => index !== indexToRemove));
  };

  const addCustomQuestion = (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      e.preventDefault();
      if (newQuestion.trim()) {
        setClarificationQuestions([...clarificationQuestions, { text: newQuestion.trim(), isAI: false }]);
        setNewQuestion("");
      }
    }
  };

  const sendToClient = async () => {
    if (clarificationQuestions.length === 0) return;
    setIsSending(true);
    try {
      const payload = { reqId: reqId, questions: clarificationQuestions.map(q => q.text) };
      const response = await fetch("http://localhost:5000/api/ba/clarifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.success) {
        // Instantly clears the list of draft questions and pulls them into the Client Responses list
        setClarificationQuestions([]); 
        await fetchClarifications(); 
      }
    } catch (error) {
      console.error("Failed to send questions:", error);
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA]">
        <BATopBar />
        <div className="flex max-w-[1600px] mx-auto pt-6 px-6 gap-8">
          <BASidebar />
          <div className="flex-1 flex flex-col items-center justify-center h-[calc(100vh-100px)] bg-white rounded-[24px] border border-gray-100 shadow-sm">
            <Sparkles className="w-16 h-16 text-primary animate-pulse mb-6" />
            <h2 className="text-xl font-bold text-navy">NexBA AI is analyzing the requirement...</h2>
            <p className="text-gray-500 mt-2 text-sm">Extracting constraints, detecting ambiguities, and generating user stories.</p>
          </div>
        </div>
      </div>
    );
  }

  const isFile = reqDetails?.type === 'File' || reqDetails?.fileName;

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <BATopBar />

      <div className="flex max-w-[1600px] mx-auto pt-6 px-6 gap-8">
        <div className="hidden lg:block flex-shrink-0">
          <BASidebar />
        </div>

        <div className="flex-1 pb-10 flex flex-col">
          
          {/* HEADER & DROPDOWN */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-3">
              <Sparkles className="w-6 h-6 text-primary" />
              <h1 className="text-[22px] font-bold text-navy">AI Analysis Workspace</h1>
            </div>
            
            <div className="relative">
              <div 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="bg-white px-5 py-2.5 rounded-full border border-gray-200 shadow-sm flex items-center font-semibold text-navy text-sm cursor-pointer hover:bg-gray-50 transition-all select-none"
              >
                {reqId ? `${reqId}: ${reqDetails?.title}` : "Select a Requirement"}
                <ChevronDown className={`w-4 h-4 ml-3 text-gray-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </div>

              {isDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-4 py-3 flex items-center text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 mb-2">
                    <History className="w-3.5 h-3.5 mr-2" /> Previously Analyzed
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {historyList.length === 0 ? (
                      <div className="px-5 py-4 text-sm text-gray-500 text-center">No previous records found.</div>
                    ) : (
                      historyList.map(item => (
                        <div 
                          key={item.id}
                          onClick={() => {
                            setIsDropdownOpen(false);
                            navigate(`/ba/analysis?reqId=${item.id}`);
                          }}
                          className={`px-5 py-3 hover:bg-blue-50 cursor-pointer transition-colors ${item.id === reqId ? 'bg-blue-50/50 border-l-[3px] border-primary' : 'border-l-[3px] border-transparent'}`}
                        >
                          <p className={`text-sm font-bold truncate ${item.id === reqId ? 'text-primary' : 'text-navy'}`}>{item.id}</p>
                          <p className="text-xs text-gray-500 truncate mt-0.5">{item.title}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* EMPTY STATE */}
          {!reqId ? (
            <div className="flex-1 bg-white rounded-[24px] shadow-sm border border-gray-100 flex flex-col items-center justify-center py-20 text-center px-4 mt-6">
              <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-primary mb-6 shadow-sm">
                <Sparkles className="w-12 h-12" />
              </div>
              <h2 className="text-2xl font-black text-navy mb-3">AI Intelligence Hub</h2>
              <p className="text-gray-500 max-w-md leading-relaxed text-sm">
                Select a requirement from the dropdown menu above, or choose one from your Inbox to extract constraints, detect ambiguities, and generate user stories using NexBA AI.
              </p>
              <button 
                onClick={() => navigate('/ba/inbox')} 
                className="mt-8 bg-white border border-gray-200 text-navy font-bold py-3.5 px-8 rounded-full hover:bg-gray-50 transition-all shadow-sm flex items-center text-sm hover:shadow-md"
              >
                <Inbox className="w-4 h-4 mr-2 text-gray-400" /> Go to Requirement Inbox
              </button>
            </div>
          ) : (
            <>
              {/* SECTION 1: RAW TEXT / DOCUMENT VIEW */}
              <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden mb-6">
                <div className="px-8 py-5 flex justify-between items-center border-b border-gray-50">
                  <div className="flex items-center space-x-2 text-[15px] font-bold text-gray-400">
                    {isFile ? <FileIcon className="w-4 h-4 text-orange-500" /> : <FileText className="w-4 h-4 text-primary" />}
                    <span>{isFile ? 'Document Source' : 'Original Requirement'}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-md ${isFile ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-primary'}`}>
                    {isFile ? 'File' : 'Text'}
                  </span>
                </div>
                
                <div className="p-8">
                  {isFile && (
                    <div className="mb-6 p-4 bg-purple-50 rounded-xl flex items-center space-x-3 border border-purple-100">
                      <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0" />
                      <p className="text-sm text-purple-700 font-medium">This text was extracted from the uploaded document ({reqDetails.fileName}) via AI OCR. You can edit it before proceeding.</p>
                    </div>
                  )}

                  <HighlightedText text={aiData?.processedText} terms={aiData?.ambiguousTerms} />

                  <div className="mt-8 flex items-center text-[12px] font-semibold text-gray-400 border-t border-gray-50 pt-4">
                    <div className="w-3 h-1 bg-red-500 rounded-full mr-2"></div>
                    Highlight indicates ambiguous terms — hover for AI suggestion
                  </div>
                </div>
              </div>

              {/* SECTION 2: AI PROCESSING RESULTS */}
              <div className={`bg-white rounded-[24px] shadow-sm border overflow-hidden mb-6 transition-all duration-300 ${isEditingAI ? 'border-primary ring-4 ring-primary/10' : 'border-gray-100'}`}>
                <div className={`px-8 py-5 flex justify-between items-center border-b transition-colors ${isEditingAI ? 'border-blue-100 bg-blue-50/30' : 'border-gray-50'}`}>
                  <h3 className={`font-bold text-sm ${isEditingAI ? 'text-primary' : 'text-gray-400'}`}>
                    {isEditingAI ? 'Editing AI Output...' : 'AI Processing'}
                  </h3>
                  
                  <div className="flex space-x-3">
                    {isEditingAI ? (
                      <>
                        <button onClick={() => {setIsEditingAI(false); setEditedAIData(aiData);}} className="text-gray-500 hover:text-gray-700 text-[13px] font-bold px-4 py-2 transition-colors">Cancel</button>
                        <button onClick={handleSaveEdits} disabled={isSaving} className="bg-green-500 text-white text-[13px] font-bold px-6 py-2 rounded-full hover:bg-green-600 transition-colors shadow-sm flex items-center">
                          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5"/> : <Save className="w-3.5 h-3.5 mr-1.5"/>} Save Edits
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={handleRegenerate} disabled={isRegenerating} className="bg-primary text-white text-[13px] font-bold px-6 py-2 rounded-full hover:bg-blue-600 transition-colors shadow-sm flex items-center disabled:opacity-70">
                          {isRegenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5"/> : <Sparkles className="w-3.5 h-3.5 mr-1.5"/>} Regenerate
                        </button>
                        <button onClick={() => setIsEditingAI(true)} className="bg-white text-gray-600 border border-gray-200 text-[13px] font-bold px-6 py-2 rounded-full hover:bg-gray-50 transition-colors flex items-center shadow-sm">
                          <Edit3 className="w-3.5 h-3.5 mr-1.5"/> Edit
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                <div className={`p-8 space-y-8 ${isRegenerating ? 'opacity-50 pointer-events-none' : ''}`}>
                  
                  <div>
                    <h4 className="font-bold text-navy text-[15px] mb-3">Summary</h4>
                    {isEditingAI ? (
                      <textarea 
                        value={editedAIData.summary} 
                        onChange={(e) => setEditedAIData({...editedAIData, summary: e.target.value})} 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 min-h-[80px]"
                      />
                    ) : (
                      <p className="text-sm text-gray-600 leading-relaxed">{aiData?.summary}</p>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-navy text-[15px] mb-4">Key Requirements</h4>
                    {isEditingAI ? (
                      <textarea 
                        value={editedAIData.softwareRequirements.join('\n')} 
                        onChange={(e) => handleArrayChange('softwareRequirements', e.target.value)} 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 min-h-[120px]"
                        placeholder="One requirement per line"
                      />
                    ) : (
                      <ul className="space-y-3">
                        {aiData?.softwareRequirements.map((req, i) => (
                          <li key={i} className="flex items-start text-sm text-gray-600 leading-relaxed">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 mr-3 flex-shrink-0"></div>
                            {req}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-navy text-[15px] mb-4">Acceptance Criteria</h4>
                    {isEditingAI ? (
                      <textarea 
                        value={editedAIData.acceptanceCriteria.join('\n')} 
                        onChange={(e) => handleArrayChange('acceptanceCriteria', e.target.value)} 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 min-h-[100px]"
                        placeholder="One criteria per line"
                      />
                    ) : (
                      <ul className="space-y-3">
                        {aiData?.acceptanceCriteria.map((crit, i) => (
                          <li key={i} className="flex items-start text-sm text-gray-600 leading-relaxed">
                            <CheckCircle2 className="w-4 h-4 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                            {crit}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-navy text-[15px] mb-4">Risk Factors</h4>
                    {isEditingAI ? (
                      <textarea 
                        value={editedAIData.riskFactors.join('\n')} 
                        onChange={(e) => handleArrayChange('riskFactors', e.target.value)} 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 min-h-[80px]"
                        placeholder="One risk per line"
                      />
                    ) : (
                      <ul className="space-y-3">
                        {aiData?.riskFactors.map((risk, i) => (
                          <li key={i} className="flex items-start text-sm text-gray-600 leading-relaxed">
                            <AlertTriangle className="w-4 h-4 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                            {risk}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                </div>
              </div>

              {/* SECTION 3: CLARIFICATION BUILDER */}
              <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden mb-6">
                <div className="px-8 py-6 border-b border-gray-50">
                  <h3 className="font-bold text-navy text-[15px]">Clarification Builder</h3>
                  <p className="text-xs text-gray-400 mt-1 font-medium">Draft and send questions to the client</p>
                </div>
                
                <div className="p-8 space-y-4 bg-[#F8FAFC]">
                  {/* Empty State Message */}
                  {clarificationQuestions.length === 0 && (
                    <div className="text-center py-4 border-2 border-dashed border-gray-200 rounded-[16px] bg-white">
                      <p className="text-sm text-gray-400 font-medium">No questions queued. Add a custom question below.</p>
                    </div>
                  )}

                  {clarificationQuestions.map((q, i) => (
                    <div key={i} className="bg-white p-5 rounded-[16px] border border-gray-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] relative group flex items-start pr-12 transition-all hover:border-purple-200">
                      {q.isAI ? (
                        <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0 mt-1 mr-3" />
                      ) : (
                        <User className="w-4 h-4 text-blue-500 flex-shrink-0 mt-1 mr-3" />
                      )}
                      <div>
                        {q.isAI && <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block mb-1.5">AI Suggested</span>}
                        <p className="text-[14px] text-navy font-medium leading-relaxed">{q.text}</p>
                      </div>
                      <button 
                        onClick={() => removeQuestion(i)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}

                  <div className="relative mt-6">
                    <input 
                      type="text" 
                      placeholder="Add your own question..." 
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      onKeyDown={addCustomQuestion}
                      className="w-full bg-white border border-gray-100 text-sm text-navy px-6 py-4 rounded-full outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all pr-14 shadow-sm"
                    />
                    <button 
                      onClick={addCustomQuestion}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-primary hover:bg-blue-50 rounded-full transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  <button 
                    onClick={sendToClient}
                    disabled={clarificationQuestions.length === 0 || isSending}
                    className="w-full mt-8 bg-primary hover:bg-blue-600 text-white font-bold py-4 rounded-full shadow-[0_8px_20px_rgba(10,102,194,0.2)] transition-all hover:-translate-y-0.5 flex items-center justify-center disabled:opacity-50 disabled:hover:translate-y-0 text-sm"
                  >
                    {isSending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" /> 
                        Send {clarificationQuestions.length} Questions to Client
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* SECTION 4: CLIENT RESPONSES */}
              {existingClarifications.length > 0 && (
                <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden mt-6">
                  
                  <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <MessageSquare className="w-5 h-5 text-green-500" />
                      <div>
                        <h3 className="font-bold text-navy text-[15px]">Client Responses</h3>
                        <p className="text-xs text-gray-400 mt-1 font-medium">Previously sent questions and answers</p>
                      </div>
                    </div>
                    <button 
                      onClick={fetchClarifications}
                      className="flex items-center px-4 py-2 bg-blue-50 text-primary text-xs font-bold rounded-xl hover:bg-blue-100 transition-colors shadow-sm"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isRefreshingAns ? 'animate-spin' : ''}`} />
                      Refresh Answers
                    </button>
                  </div>

                  <div className="p-8 space-y-4">
                    {existingClarifications.map(c => (
                      <div key={c.id} className="p-6 rounded-[16px] border border-gray-100 bg-[#F8FAFC]">
                        <div className="flex justify-between items-start mb-3">
                          <p className="text-[14px] text-navy font-bold leading-relaxed pr-6">{c.question}</p>
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md flex-shrink-0 ${c.status === 'Pending Client' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>
                            {c.status}
                          </span>
                        </div>
                        {c.answer ? (
                          <div className="mt-4 p-5 bg-white rounded-2xl border border-green-100 shadow-sm relative">
                            <div className="absolute top-0 left-4 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-white -mt-2"></div>
                            
                            <div className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-wrap">
                              <span className="font-bold text-green-600 mr-2">Client Reply:</span>
                              {c.answer}
                            </div>
                            
                            {c.fileName && (
                              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center">
                                <a 
                                  href={c.fileData} 
                                  download={c.fileName}
                                  className="flex items-center px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 text-primary text-xs font-bold transition-colors cursor-pointer shadow-sm"
                                >
                                  <Paperclip className="w-3.5 h-3.5 mr-2" />
                                  Download Attachment: {c.fileName}
                                </a>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-[12px] text-gray-400 mt-2 italic flex items-center"><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin text-orange-400"/> Awaiting client response...</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}