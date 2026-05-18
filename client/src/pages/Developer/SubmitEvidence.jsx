import { useState, useEffect, useRef } from "react";
import DevTopBar from "../../components/Developer/DevTopBar";
import DevSidebar from "../../components/Developer/DevSidebar";
import { useAuth } from "../../contexts/AuthContext";
import { Loader2, Search, AlertTriangle, Link as LinkIcon, FileText, UploadCloud, CheckCircle2, X, Info, Clock, ArrowLeft, ExternalLink, Download } from "lucide-react";

export default function SubmitEvidence() {
  const { currentUser } = useAuth();
  
  const [submissions, setSubmissions] = useState([]);
  const [selectedReq, setSelectedReq] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [githubLink, setGithubLink] = useState("");
  const [notes, setNotes] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef(null);

  const fetchSubmissions = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true); 
    
    try {
      const res = await fetch(`http://localhost:5000/api/dev/evidence?uid=${currentUser.uid}`);
      const json = await res.json();
      
      let rawData = [];
      if (json.success && Array.isArray(json.data)) rawData = json.data;
      else if (json.data && Array.isArray(json.data.queue)) rawData = json.data.queue;
      else if (json.data && Array.isArray(json.data.data)) rawData = json.data.data;
      else if (Array.isArray(json)) rawData = json;
      
      const terminalStatuses = ['Completed', 'Done', 'Approved & Live', 'Closed', 'Client UAT'];
      const activeSubmissions = rawData.filter(req => !terminalStatuses.includes(req.status));

      setSubmissions(activeSubmissions);
      
      setSelectedReq(prev => {
        if (prev) {
          const updated = activeSubmissions.find(c => c.reqId === prev.reqId);
          return updated || null; 
        }
        if (activeSubmissions.length > 0 && !isBackground && window.innerWidth >= 1024) {
          return activeSubmissions[0];
        }
        return null;
      });

    } catch (error) {
      console.error("Error fetching submissions:", error);
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.uid) {
      fetchSubmissions(false); 
      
      const intervalId = setInterval(() => {
        fetchSubmissions(true);
      }, 5000);
      
      return () => clearInterval(intervalId); 
    }
  }, [currentUser]);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        setUploadedFiles(prev => [...prev, { name: file.name, type: file.type, base64: reader.result }]);
      };
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReq || !currentUser?.uid) return;
    
    if (!githubLink && uploadedFiles.length === 0 && !notes) {
      alert("Please provide at least a link, file, or some notes as evidence.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const payload = { githubLink, notes, files: uploadedFiles };

      const res = await fetch(`http://localhost:5000/api/dev/evidence/${selectedReq.reqId}/submit?uid=${currentUser.uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      const json = await res.json();
      if (json.success) {
        alert("Evidence submitted successfully to the BA!");
        const updatedList = submissions.map(r => r.reqId === selectedReq.reqId ? { ...r, status: 'Pending Verification', rejectionReason: null } : r);
        setSubmissions(updatedList);
        setSelectedReq({ ...selectedReq, status: 'Pending Verification', rejectionReason: null });
      } else {
        alert("Failed to submit evidence. " + json.message);
      }
    } catch (error) {
      console.error("Error submitting evidence:", error);
      alert("Network Error: Could not reach the server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = submissions.filter(req => 
    (req.title || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
    (req.reqId || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isSelectedBaReject = selectedReq?.rejectionReason && !selectedReq.rejectionReason.startsWith('Client Feedback:');
  const isSelectedChangeReq = (selectedReq?.isChangeRequest || selectedReq?.rejectionReason?.startsWith('Client Feedback:')) && !isSelectedBaReject;

  if (isLoading) {
    return (
      <div className="h-screen bg-[#F5F7FA] overflow-y-scroll flex flex-col">
        <DevTopBar />
        <div className="flex max-w-[1600px] w-full mx-auto pt-6 px-4 md:px-6 gap-8 pb-6 flex-1 min-h-0">
          <div className="hidden lg:block w-[260px] flex-shrink-0 h-full">
            <DevSidebar />
          </div>
          <div className="flex-1 flex flex-col min-w-0 items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-[#007BFF]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#F5F7FA] overflow-y-scroll flex flex-col">
      <DevTopBar />

      <div className="flex max-w-[1600px] w-full mx-auto pt-6 px-4 md:px-6 gap-8 pb-6 flex-1 min-h-0">
        
        <div className="hidden lg:block w-[260px] flex-shrink-0 h-full">
          <DevSidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0 h-full">
          
          <div className="mb-4 flex-shrink-0 mt-2">
            <h1 className="text-[20px] md:text-[24px] font-bold text-navy">Submit Evidence</h1>
            <p className="text-[13px] md:text-[15px] text-gray-500 mt-1">Submit visual proof and commit links for your completed requirements to the Business Analyst for verification.</p>
          </div>

          <div className="flex-1 min-h-0 flex flex-col lg:flex-row w-full bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            
            <div className={`w-full lg:w-[35%] flex-col bg-[#FAFAFA] border-r border-gray-100 h-full flex-shrink-0 lg:flex-shrink ${selectedReq ? 'hidden lg:flex' : 'flex'}`}>
              <div className="p-5 border-b border-gray-100 bg-white flex-shrink-0">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-navy text-[15px]">Pending Review & Submissions</h3>
                  <span className="bg-blue-50 text-[#007BFF] text-xs font-bold px-2 py-1 rounded-full">{submissions.length}</span>
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search ID or Title..." 
                    className="w-full bg-gray-50 border border-gray-200 text-sm rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-[#007BFF] focus:ring-1 focus:ring-[#007BFF]/20 transition-all"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filteredItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <CheckCircle2 className="w-12 h-12 text-green-400 mb-3 opacity-50" />
                    <p className="font-bold text-gray-500">All Caught Up!</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-[200px]">You have no requirements pending evidence submission.</p>
                  </div>
                ) : (
                  filteredItems.map(req => {
                    const isBaReject = req.rejectionReason && !req.rejectionReason.startsWith('Client Feedback:');
                    const isChangeReq = (req.isChangeRequest || req.rejectionReason?.startsWith('Client Feedback:')) && !isBaReject;

                    return (
                      <div 
                        key={req.reqId}
                        onClick={() => {
                          setSelectedReq(req);
                          setGithubLink(""); setNotes(""); setUploadedFiles([]);
                        }}
                        className={`p-4 rounded-2xl cursor-pointer transition-all border relative overflow-hidden ${
                          selectedReq?.reqId === req.reqId 
                            ? 'bg-blue-50/50 border-[#007BFF] ring-1 ring-[#007BFF]/30 shadow-sm' 
                            : 'bg-white border-transparent hover:border-gray-200 hover:shadow'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[11px] font-bold text-[#007BFF]">{req.reqId}</span>
                          
                          {req.status === 'Pending Verification' ? (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-yellow-50 text-yellow-600 border border-yellow-100 flex items-center">
                              <Clock className="w-3 h-3 mr-1" /> Under Review
                            </span>
                          ) : isBaReject ? (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-red-50 text-red-600 border border-red-100 flex items-center">
                              <AlertTriangle className="w-3 h-3 mr-1" /> Rejected
                            </span>
                          ) : isChangeReq ? (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-100 flex items-center">
                              <Info className="w-3 h-3 mr-1" /> Change Req
                            </span>
                          ) : (req.status === 'Ready for Review') ? (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-green-50 text-green-600 border border-green-100 flex items-center">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Ready
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">
                              In Progress
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-navy text-[14px] leading-tight line-clamp-2">{req.title}</h4>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className={`w-full lg:w-[65%] flex-col h-full bg-white relative min-w-0 ${!selectedReq ? 'hidden lg:flex' : 'flex'}`}>
              
              {!selectedReq ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-[#F8FAFC]">
                  <UploadCloud className="w-16 h-16 mb-4 opacity-30 text-[#007BFF]" />
                  <p className="font-medium text-navy text-lg">Submit Your Work</p>
                  <p className="text-sm mt-1 max-w-sm text-center">Select a requirement from the queue to upload evidence and commit links.</p>
                </div>
              ) : (
                <>
                  <div className="p-6 md:p-8 border-b border-gray-100 bg-white flex-shrink-0 z-10 flex items-start gap-3">
                    <button onClick={() => setSelectedReq(null)} className="lg:hidden mt-1 text-gray-500 hover:text-[#007BFF] p-1 -ml-2 rounded-full hover:bg-blue-50">
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <span className="text-[12px] font-bold text-[#007BFF] bg-blue-50 px-2 py-1 rounded-md mb-3 inline-block">{selectedReq.reqId}</span>
                      <h2 className="text-[20px] md:text-[24px] font-bold text-navy">{selectedReq.title}</h2>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#F8FAFC]">
                    
                    {selectedReq.status === 'Pending Verification' ? (
                      <div className="bg-green-50 border border-green-200 rounded-2xl p-10 mt-10 shadow-sm flex flex-col items-center justify-center text-center animate-in zoom-in-95">
                        <div className="bg-green-500 p-4 rounded-full shadow-md mb-4">
                          <CheckCircle2 className="w-8 h-8 text-white" />
                        </div>
                        <h4 className="font-bold text-green-800 text-xl mb-2">Evidence Submitted!</h4>
                        <p className="text-green-700 text-[14px] leading-relaxed max-w-md">
                          Your work is currently under review by the Business Analyst. You will be notified once it is approved and sent to the client, or if further changes are required.
                        </p>
                      </div>
                    ) : (
                      <>
                        {isSelectedBaReject ? (
                          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-8 shadow-sm flex items-start gap-4">
                            <div className="bg-red-100 p-2 rounded-full flex-shrink-0 mt-0.5">
                              <AlertTriangle className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                              <h4 className="font-bold text-red-800 text-[14px] mb-1">BA Rejected Previous Submission</h4>
                              <p className="text-red-700 text-[13px] leading-relaxed">{selectedReq.rejectionReason}</p>
                            </div>
                          </div>
                        ) : isSelectedChangeReq ? (
                          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 mb-8 shadow-sm flex items-start gap-4">
                            <div className="bg-orange-100 p-2 rounded-full flex-shrink-0 mt-0.5">
                              <Info className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                              <h4 className="font-bold text-orange-800 text-[14px] mb-1">Active Change Request</h4>
                              <p className="text-orange-700 text-[13px] leading-relaxed">
                                {selectedReq.rejectionReason 
                                  ? selectedReq.rejectionReason.replace('Client Feedback: ', 'The client requested: "') + '"'
                                  : "The client has requested modifications to this requirement."}
                              </p>
                            </div>
                          </div>
                        ) : null}

                        <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                            <h4 className="text-[11px] font-bold text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                              Visual Proof *
                            </h4>
                            
                            <div 
                              onClick={() => fileInputRef.current?.click()}
                              className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-gray-50 hover:border-[#007BFF] transition-all cursor-pointer mb-4"
                            >
                                <UploadCloud className="w-10 h-10 text-gray-400 mb-3" />
                                <p className="text-[14px] font-bold text-navy mb-1">Click to upload files</p>
                                <p className="text-[12px] text-gray-500">SVG, PNG, JPG or GIF (max. 10MB)</p>
                                <input 
                                  type="file" 
                                  multiple 
                                  className="hidden" 
                                  ref={fileInputRef} 
                                  onChange={handleFileUpload} 
                                  accept="image/*,video/*,.pdf" 
                                />
                            </div>

                            {uploadedFiles.length > 0 && (
                              <div className="space-y-2 mb-6">
                                {uploadedFiles.map((file, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-lg">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                      <FileText className="w-4 h-4 text-[#007BFF] flex-shrink-0" />
                                      <span className="text-[13px] font-semibold text-navy truncate">{file.name}</span>
                                    </div>
                                    <button type="button" onClick={() => removeFile(idx)} className="p-1 hover:bg-blue-100 rounded-full text-gray-500 hover:text-red-500 transition-colors">
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="mb-5">
                              <label className="text-[12px] font-bold text-gray-600 block mb-2">Project Link (GitHub/Figma)</label>
                              <div className="relative">
                                <LinkIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                                <input 
                                  type="url" 
                                  value={githubLink}
                                  onChange={(e) => setGithubLink(e.target.value)}
                                  placeholder="https://github.com/..." 
                                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[14px] text-navy outline-none focus:ring-2 focus:ring-[#007BFF]/20 focus:border-[#007BFF] transition-all"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[12px] font-bold text-gray-600 block mb-2">Developer Notes</label>
                              <textarea 
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add any specific instructions for the BA to verify..." 
                                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-[14px] text-navy outline-none focus:ring-2 focus:ring-[#007BFF]/20 focus:border-[#007BFF] transition-all h-32 resize-none"
                              />
                            </div>
                          </div>
                        </form>
                      </>
                    )}
                  </div>

                  {selectedReq.status !== 'Pending Verification' && (
                    <div className="p-5 md:p-6 bg-white border-t border-gray-100 flex justify-end gap-3 flex-shrink-0 z-10 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.05)]">
                      <button 
                        type="button"
                        onClick={() => {
                          setGithubLink(""); setNotes(""); setUploadedFiles([]); setSelectedReq(null);
                        }}
                        disabled={isSubmitting}
                        className="px-6 py-3.5 rounded-xl text-gray-600 text-[14px] font-bold hover:bg-gray-100 transition-colors disabled:opacity-50" 
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleSubmit}
                        disabled={isSubmitting || (!githubLink && uploadedFiles.length === 0 && !notes)}
                        className="px-8 py-3.5 rounded-xl bg-[#007BFF] hover:bg-blue-600 flex items-center justify-center text-white text-[14px] font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50 gap-2" 
                      >
                        {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <><CheckCircle2 className="w-4 h-4" /> Submit to BA</>}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}