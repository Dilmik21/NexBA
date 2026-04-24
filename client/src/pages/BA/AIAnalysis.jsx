import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import BATopBar from "../../components/BA/BATopBar";
import BASidebar from "../../components/BA/BASidebar";
import { useAuth } from "../../contexts/AuthContext";
import { FileText, Sparkles, X, Loader2, Inbox, RefreshCw, Download, Plus, ChevronDown, Edit3, Save } from "lucide-react";

// --- Crash-Proof Document Viewer Component ---
const DocumentViewer = ({ fileName, fileData }) => {
  const safeName = fileName || "document.pdf";
  const ext = safeName.split('.').pop().toLowerCase();
  const isImage = fileData?.startsWith('data:image') || ['jpeg', 'jpg', 'gif', 'png'].includes(ext);
  const isViewable = isImage || ext === 'pdf';

  if (!fileData) {
      return (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-gray-400" />
                  <div>
                      <p className="text-sm font-bold text-navy">{safeName}</p>
                      <p className="text-[10px] text-gray-500">File content unavailable (Legacy project)</p>
                  </div>
              </div>
          </div>
      );
  }

  if (!isViewable) {
      return (
           <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0 pr-4">
                  <FileText className="w-6 h-6 text-primary flex-shrink-0" />
                  <div className="min-w-0">
                      <p className="text-sm font-bold text-navy truncate">{safeName}</p>
                      <p className="text-[10px] text-primary">Click download to view</p>
                  </div>
              </div>
              <a href={fileData} download={safeName} className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-white rounded-full text-primary hover:bg-primary hover:text-white transition-colors shadow-sm">
                  <Download className="w-4 h-4" />
              </a>
           </div>
      );
  }

  return (
      <div className="flex flex-col border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
          <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2 min-w-0 pr-4">
                  <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-xs font-bold text-navy truncate">{safeName}</span>
              </div>
              <a href={fileData} download={safeName} className="text-primary hover:text-blue-700 p-1 flex-shrink-0" title="Download">
                  <Download className="w-4 h-4" />
              </a>
          </div>
          <div className="h-[400px] w-full bg-gray-100 relative flex items-center justify-center">
              {isImage ? (
                  <img src={fileData} alt="Document" className="max-w-full max-h-full object-contain p-2" />
              ) : (
                  <iframe src={fileData} className="w-full h-full absolute inset-0" title="Document Viewer" />
              )}
          </div>
      </div>
  );
}

// --- THE FIX: Bulletproof Highlighted Text Component ---
const HighlightedText = ({ text, terms }) => {
  if (!text) return <p className="text-gray-500 italic">No original text found in database for this requirement.</p>;
  
  const hasTerms = terms && terms.length > 0;

  // Helper function to apply highlights to any string segment
  const renderWithHighlights = (str, isBold) => {
    if (!hasTerms) return isBold ? <strong className="font-bold text-navy">{str}</strong> : <span>{str}</span>;

    // Filter out empty terms and escape regex characters safely
    const validTerms = terms.filter(t => t.term && t.term.trim() !== '');
    if (validTerms.length === 0) return isBold ? <strong className="font-bold text-navy">{str}</strong> : <span>{str}</span>;

    const termWords = validTerms.map(t => t.term.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    
    // Removed the \b word boundaries so exact substrings trigger the highlight even if punctuation touches them!
    const regex = new RegExp(`(${termWords})`, 'gi');
    const blocks = str.split(regex);

    return blocks.map((block, bIdx) => {
      const termMatch = validTerms.find(t => t.term.trim().toLowerCase() === block.toLowerCase());
      if (termMatch) {
        return (
          <span key={bIdx} className={`text-orange-500 font-semibold cursor-help relative group border-b border-orange-500 border-dashed pb-[1px] ${isBold ? 'font-extrabold' : ''}`}>
            {block}
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2 bg-gray-900 text-white text-xs rounded-xl opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none shadow-xl text-center leading-relaxed font-normal tracking-normal">
              <span className="font-bold text-orange-300 block mb-1">AI Suggestion:</span>
              {termMatch.suggestion}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
            </span>
          </span>
        );
      }
      return isBold ? <strong key={bIdx} className="font-bold text-navy">{block}</strong> : <span key={bIdx}>{block}</span>;
    });
  };

  const paragraphs = text.split(/\n+/);

  return (
    <div className="space-y-4 text-[14px] text-[#334155] leading-[1.8]">
      {paragraphs.map((para, pIdx) => {
        // Split by markdown bold tags
        const parts = para.split(/(\*\*.*?\*\*)/g);
        return (
          <p key={pIdx}>
            {parts.map((part, i) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                // Pass the bold text through the highlighter too!
                const innerText = part.slice(2, -2);
                return <span key={i}>{renderWithHighlights(innerText, true)}</span>;
              }
              // Normal text
              return <span key={i}>{renderWithHighlights(part, false)}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
};

const getSafeValue = (val, fallback) => {
  if (!val || val === "undefined" || val === "null" || val.trim() === "") return fallback;
  return val;
};

export default function AIAnalysis() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const { currentUser, userData } = useAuth(); 
  
  const reqId = searchParams.get("reqId");

  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [reqDetails, setReqDetails] = useState(null);
  const [aiData, setAiData] = useState(null);
  
  const [isEditingAI, setIsEditingAI] = useState(false);
  const [editedAIData, setEditedAIData] = useState(null);

  const [aiSuggestedQuestions, setAiSuggestedQuestions] = useState([]);
  const [draftedQuestions, setDraftedQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [isSending, setIsSending] = useState(false);
  
  const [existingClarifications, setExistingClarifications] = useState([]);
  const [isRefreshingAns, setIsRefreshingAns] = useState(false);

  const [historyList, setHistoryList] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const finishedStatuses = ['Complete', 'Completed', 'Approved & Live', 'Live', 'Closed', 'Done'];

  const fetchClarifications = async () => {
    if (!currentUser?.uid || !reqId) return [];
    setIsRefreshingAns(true);
    try {
      const res = await fetch(`http://localhost:5000/api/ba/analyze/${reqId}/clarifications?uid=${currentUser.uid}`);
      const json = await res.json();
      if (json.success) {
        setExistingClarifications(json.data);
        return json.data;
      }
    } catch (e) {
      console.error("Failed to fetch clarifications");
    } finally {
      setTimeout(() => setIsRefreshingAns(false), 500);
    }
    return [];
  };

  const processAI = async (id, isSilent = false) => {
    if (!id || !currentUser?.uid) return;
    
    if (!aiData && !isSilent) {
      setIsLoading(true);
    }

    try {
      const response = await fetch(`http://localhost:5000/api/ba/analyze/${id}?uid=${currentUser.uid}`, { method: "POST" });
      const json = await response.json();
      
      if (json.success) {
        setReqDetails(json.reqDetails);
        setAiData(json.data);
        setEditedAIData(json.data);
        setIsEditingAI(false);
        setDraftedQuestions([]); 
        
        fetchClarifications().then(fetchedClarifications => {
          const filteredAIQuestions = json.data.suggestedQuestions?.filter(aiQ => 
            !fetchedClarifications.some(sq => sq.question.trim().toLowerCase() === aiQ.trim().toLowerCase())
          ) || [];
            
          setAiSuggestedQuestions(filteredAIQuestions);
        });
      }
    } catch (error) {
      console.error("AI Fetch Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (reqId) processAI(reqId, false);
  }, [reqId, currentUser]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    const fetchHistory = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/ba/history?uid=${currentUser.uid}`);
        const json = await response.json();
        if (json.success) setHistoryList(json.data);
      } catch (error) {
        console.error("History Error:", error);
      }
    };
    fetchHistory();
  }, [currentUser, reqId]);

  const handleRegenerate = async () => {
    if (!currentUser?.uid || !reqId) return;
    setIsRegenerating(true);
    try {
      const response = await fetch(`http://localhost:5000/api/ba/analyze/${reqId}/regenerate?uid=${currentUser.uid}`, { method: "POST" });
      const json = await response.json();
      if (json.success) {
        await processAI(reqId, true); 
      } else {
        alert("Failed to regenerate. Please check your backend terminal for errors.");
      }
    } catch (error) {
      console.error("Regeneration Failed:", error);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSaveEdits = async () => {
    if (!currentUser?.uid || !reqId) return;
    setIsSaving(true);
    try {
      const response = await fetch(`http://localhost:5000/api/ba/analyze/${reqId}?uid=${currentUser.uid}`, {
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

  const addAISuggestionToDraft = (questionText) => {
    setAiSuggestedQuestions(aiSuggestedQuestions.filter(q => q !== questionText));
    setDraftedQuestions([...draftedQuestions, questionText]);
  };

  const removeDraftedQuestion = (indexToRemove) => {
    const questionToRemove = draftedQuestions[indexToRemove];
    setDraftedQuestions(draftedQuestions.filter((_, index) => index !== indexToRemove));
    if (aiData?.suggestedQuestions?.includes(questionToRemove)) {
      setAiSuggestedQuestions([...aiSuggestedQuestions, questionToRemove]);
    }
  };

  const addCustomQuestion = (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      e.preventDefault();
      if (newQuestion.trim()) {
        setDraftedQuestions([...draftedQuestions, newQuestion.trim()]);
        setNewQuestion("");
      }
    }
  };

  const sendToClient = async () => {
    if (draftedQuestions.length === 0 || !currentUser?.uid) return;
    setIsSending(true);
    try {
      const payload = { 
        reqId: reqId, 
        questions: draftedQuestions, 
        uid: currentUser.uid,
        baName: userData?.fullName || currentUser?.displayName || "Business Analyst" 
      };
      
      const response = await fetch("http://localhost:5000/api/ba/clarifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.success) {
        setDraftedQuestions([]); 
        const freshAnswers = await fetchClarifications();
        setAiSuggestedQuestions(prev => prev.filter(aiQ => 
          !freshAnswers.some(sq => sq.question.trim().toLowerCase() === aiQ.trim().toLowerCase())
        ));
      }
    } catch (error) {
      console.error("Failed to send questions:", error);
    } finally {
      setIsSending(false);
    }
  };

  const displayTitle = getSafeValue(reqDetails?.title, 'Untitled Requirement');
  const displayDesc = getSafeValue(aiData?.processedText, getSafeValue(reqDetails?.description, getSafeValue(reqDetails?.text, null)));

  const sortedHistory = [...historyList].sort((a, b) => {
    const aFinished = finishedStatuses.includes(a.status);
    const bFinished = finishedStatuses.includes(b.status);
    if (aFinished && !bFinished) return 1;
    if (!aFinished && bFinished) return -1;
    return a.id.localeCompare(b.id);
  });

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <BATopBar />

      <div className="flex max-w-[1600px] mx-auto pt-6 px-4 md:px-6 gap-8">
        <div className="hidden lg:block flex-shrink-0">
          <BASidebar />
        </div>

        <div className="flex-1 pb-10 flex flex-col">
          
          <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h1 className="text-[22px] font-bold text-navy">AI Analysis Workspace</h1>
              <p className="text-sm text-gray-500 mt-1">Extract constraints, detect ambiguities, and generate user stories using NexBA AI.</p>
            </div>
            
            <div className="relative w-full md:w-auto">
              <div onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="bg-white px-5 py-3 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between font-bold text-navy text-sm cursor-pointer hover:bg-gray-50 transition-all select-none w-full md:w-[350px]">
                <span className="truncate pr-4">{reqId ? `${reqId}: ${displayTitle}` : "Select a Requirement"}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </div>
              {isDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-full bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                   <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 mb-1">Analysis History</div>
                   <div className="max-h-[300px] overflow-y-auto">
                    {sortedHistory.map(item => {
                      const isCompleted = finishedStatuses.includes(item.status);
                      return (
                        <div 
                          key={item.id} 
                          onClick={() => { setIsDropdownOpen(false); navigate(`/ba/analysis?reqId=${item.id}`); }} 
                          className={`px-5 py-3 hover:bg-blue-50 cursor-pointer transition-colors border-l-[4px] ${item.id === reqId ? 'border-primary bg-blue-50/30' : 'border-transparent'}`}
                        >
                          <div className="flex justify-between items-start mb-0.5">
                            <p className={`text-sm font-bold ${item.id === reqId ? 'text-primary' : 'text-navy'}`}>{item.id}</p>
                            {isCompleted && (
                              <span className="bg-green-50 text-green-600 border border-green-200 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                Completed
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 truncate mt-0.5">{getSafeValue(item.title, 'Untitled')}</p>
                        </div>
                      );
                    })}
                   </div>
                </div>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
               <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
               <p className="font-bold text-navy text-lg">Loading Workspace...</p>
               <p className="text-sm text-gray-400 mt-2">Fetching requirement details.</p>
            </div>
          ) : !reqId ? (
            <div className="flex-1 bg-white rounded-[2rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center p-12 text-center">
                <Sparkles className="w-12 h-12 text-blue-100 mb-6" />
                <h3 className="text-xl font-bold text-navy mb-2">Ready to Analyze</h3>
                <p className="text-sm text-gray-400 max-w-sm mb-8">Please select a requirement from the history or inbox to start.</p>
                
                <button 
                  onClick={() => navigate('/ba/inbox')}
                  className="bg-primary hover:bg-blue-600 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-sm flex items-center"
                >
                  <Inbox className="w-4 h-4 mr-2" /> Go to Requirement Inbox
                </button>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* REQUIREMENT CONTEXT CARD */}
              <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    <FileText className="w-4 h-4 mr-2 text-primary" /> Provided Materials
                  </div>
                </div>

                {reqDetails?.fileName && reqDetails.fileName !== "No file attached" && (
                  <div className="mb-8">
                    <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Attached Document</h4>
                    <DocumentViewer fileName={reqDetails.fileName} fileData={reqDetails.fileUrl || reqDetails.fileData} />
                  </div>
                )}
                
                {displayDesc && displayDesc !== "No description provided." && (
                  <div className="mb-4">
                    <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Text Description & Analysis</h4>
                    <HighlightedText text={displayDesc} terms={aiData?.ambiguousTerms} />
                    
                    {aiData?.ambiguousTerms && aiData.ambiguousTerms.length > 0 && (
                      <div className="mt-6 flex items-center text-[12px] text-gray-400 font-medium">
                        <div className="w-3.5 h-1.5 bg-orange-500 rounded-full mr-2 opacity-80"></div>
                        Highlights indicate ambiguous terms — hover for AI suggestion
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* AI RESULTS CARD - WITH RISK FACTORS INCLUDED */}
              <div className={`bg-white rounded-[2rem] shadow-sm border transition-all p-8 ${isEditingAI ? 'border-primary ring-4 ring-primary/5' : 'border-gray-100'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                  <h3 className="font-bold text-navy text-lg">AI Results</h3>
                  
                  <div className="flex flex-wrap gap-3">
                    {isEditingAI ? (
                       <>
                         <button onClick={() => { setIsEditingAI(false); setEditedAIData(aiData); }} className="bg-gray-50 text-gray-500 hover:bg-gray-100 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors">
                           Cancel
                         </button>
                         <button onClick={handleSaveEdits} disabled={isSaving} className="bg-[#10B981] hover:bg-[#059669] text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center transition-colors disabled:opacity-50">
                           {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Save Changes
                         </button>
                       </>
                    ) : (
                      <>
                        <button onClick={() => setIsEditingAI(true)} className="bg-white border border-gray-200 text-navy hover:bg-gray-50 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center">
                           <Edit3 className="w-4 h-4 mr-2" /> Edit Results
                        </button>
                        <button onClick={handleRegenerate} disabled={isRegenerating} className="bg-primary hover:bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center disabled:opacity-50">
                          {isRegenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Sparkles className="w-4 h-4 mr-2"/>} Regenerate
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isEditingAI && (
                  <div className="mb-6 bg-blue-50 border border-blue-100 p-4 rounded-xl text-[13px] text-blue-800 flex items-center">
                    <Edit3 className="w-4 h-4 mr-2 flex-shrink-0" />
                    <strong>Edit Mode Active:</strong> You can modify the text below. For lists, place each new item on a new line.
                  </div>
                )}

                <div className="space-y-8">
                   <div>
                     <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Executive Summary</h4>
                     {isEditingAI ? (
                       <textarea 
                         value={editedAIData?.summary || ""} 
                         onChange={(e) => setEditedAIData({...editedAIData, summary: e.target.value})} 
                         className="w-full bg-white border-2 border-gray-200 rounded-xl p-4 text-[14px] text-navy min-h-[100px] outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-inner" 
                       />
                     ) : (
                       <p className="text-[14px] text-navy leading-relaxed">{aiData?.summary || "No summary available."}</p>
                     )}
                   </div>

                   {['businessRequirements', 'softwareRequirements', 'userStories', 'acceptanceCriteria', 'riskFactors'].map((field) => {
                     const isRisk = field === 'riskFactors';
                     
                     return (
                       <div key={field}>
                         <h4 className={`text-sm font-bold uppercase tracking-widest mb-4 capitalize ${isRisk ? 'text-red-500' : 'text-gray-400'}`}>
                           {field.replace(/([A-Z])/g, ' $1')}
                         </h4>
                         
                         {isEditingAI ? (
                            <textarea 
                              value={Array.isArray(editedAIData?.[field]) ? editedAIData[field].join('\n') : ''} 
                              onChange={(e) => handleArrayChange(field, e.target.value)} 
                              placeholder={`Enter each ${field.replace(/([A-Z])/g, ' $1').toLowerCase()} on a new line...`}
                              className={`w-full bg-white border-2 rounded-xl p-4 text-[14px] min-h-[140px] outline-none transition-all shadow-inner leading-relaxed ${isRisk ? 'text-red-900 border-red-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' : 'text-navy border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10'}`} 
                            />
                         ) : (
                           <ul className="space-y-3">
                             {aiData?.[field]?.map((item, i) => (
                               <li key={i} className={`flex items-start text-[14px] p-3.5 rounded-xl border ${isRisk ? 'bg-red-50/50 border-red-100 text-red-900' : 'bg-gray-50/50 border-gray-50 text-navy'}`}>
                                 <div className={`w-1.5 h-1.5 rounded-full mt-2 mr-3 flex-shrink-0 ${isRisk ? 'bg-red-500' : 'bg-primary'}`} />{item}
                               </li>
                             ))}
                           </ul>
                         )}
                       </div>
                     );
                   })}
                </div>
              </div>

              {/* CLARIFICATIONS CARD */}
              <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm">
                 <h3 className="font-bold text-navy text-lg mb-8">Clarifications</h3>
                 <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                       <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Suggestions</p>
                       {aiSuggestedQuestions.map((q, i) => (
                         <div key={i} className="bg-purple-50/50 border border-purple-100 p-4 rounded-2xl flex justify-between items-start group gap-4">
                            <p className="text-sm text-purple-900 font-medium leading-relaxed">{q}</p>
                            <button onClick={() => addAISuggestionToDraft(q)} className="p-2 bg-white text-purple-600 hover:bg-purple-600 hover:text-white transition-colors rounded-lg flex-shrink-0 shadow-sm"><Plus className="w-4 h-4" /></button>
                         </div>
                       ))}
                       {aiSuggestedQuestions.length === 0 && (
                         <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                           <p className="text-sm text-gray-400">All current AI suggestions have been drafted or sent.</p>
                         </div>
                       )}
                    </div>

                    <div className="space-y-4">
                       <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Draft Questions</p>
                       {draftedQuestions.map((q, i) => (
                         <div key={i} className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl flex justify-between items-start gap-4">
                            <p className="text-sm text-blue-900 font-medium leading-relaxed">{q}</p>
                            <button onClick={() => removeDraftedQuestion(i)} className="text-blue-400 hover:text-red-500 transition-colors p-1 flex-shrink-0"><X className="w-5 h-5" /></button>
                         </div>
                       ))}
                       <div className="relative">
                          <input value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} onKeyDown={addCustomQuestion} placeholder="Add custom question..." className="w-full bg-white border border-gray-200 rounded-xl px-5 py-4 text-sm outline-none focus:border-primary shadow-sm" />
                          <button onClick={addCustomQuestion} className="absolute right-4 top-1/2 -translate-y-1/2 text-primary font-bold text-xs uppercase hover:text-blue-700 transition-colors">Add</button>
                       </div>
                       <button onClick={sendToClient} disabled={draftedQuestions.length === 0 || isSending} className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center disabled:opacity-50 transition-colors shadow-sm">
                          {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send to Client"}
                       </button>
                    </div>
                 </div>
              </div>

              {/* CLIENT RESPONSES CARD */}
              <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-8 py-5 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                  <h3 className="font-bold text-navy text-lg">Client Responses</h3>
                  <button 
                    onClick={fetchClarifications} 
                    disabled={isRefreshingAns}
                    className="text-primary text-xs font-bold flex items-center bg-white border border-gray-200 shadow-sm px-4 py-2 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshingAns ? 'animate-spin' : ''}`} /> 
                    {isRefreshingAns ? 'Refreshing...' : 'Refresh Answers'}
                  </button>
                </div>
                <div className="p-8 space-y-4">
                  {existingClarifications.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-sm italic">No clarifications have been sent for this requirement yet.</div>
                  ) : (
                    existingClarifications.map(c => (
                      <div key={c.id} className="p-6 rounded-2xl border border-gray-100 bg-[#F8FAFC]">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Question:</p>
                        <p className="text-[14px] text-navy font-bold mb-4">{c.question}</p>
                        <div className="p-5 bg-white rounded-xl border border-green-100 shadow-sm">
                           <p className="text-xs font-bold text-green-600 uppercase tracking-widest mb-2">Answer:</p>
                           
                           <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                             {c.answer || <span className="text-gray-400 italic">Waiting for client response...</span>}
                           </p>

                           {c.fileName && (
                             <div className="mt-4">
                               <DocumentViewer fileName={c.fileName} fileData={c.fileData} />
                             </div>
                           )}

                           {c.answeredAt && <p className="text-[10px] text-gray-400 mt-3 font-medium">Received: {c.answeredAt}</p>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}