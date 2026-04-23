import { useState, useRef } from "react";
import { X, FileText, Sparkles, ArrowRight, ArrowLeft, Rocket, Loader2, UploadCloud, File as FileIcon, AlertCircle } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

export default function NewProjectModal({ isOpen, onClose }) {
  const { currentUser } = useAuth();

  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAIPopup, setShowAIPopup] = useState(false);
  
  const [aiError, setAiError] = useState(null);

  const [uploadedFile, setUploadedFile] = useState(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "Medium"
  });

  if (!isOpen) return null;

  const isStep1Valid = formData.title.trim() !== "";
  const isStep2Valid = formData.description.trim() !== "" || uploadedFile !== null; 
  
  const canContinue = (step === 1 && isStep1Valid) || (step === 2 && isStep2Valid);

  // FIXED: Now properly converts the file into Base64 data so the database can store the actual document!
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("File is too large. Please keep uploads under 10MB.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
      const extension = file.name.split('.').pop().toUpperCase();
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedFile({
          name: file.name,
          size: `${sizeInMB} MB`,
          type: extension,
          base64: reader.result // <--- The actual file content
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAIStructure = async () => {
    if (!formData.description) return;
    setIsGenerating(true);
    setAiError(null); 

    try {
      const response = await fetch("http://localhost:5000/api/ai/structure-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: formData.description })
      });
      const data = await response.json();
      
      if (data.success) {
        setFormData({ ...formData, description: data.structuredText });
        setShowAIPopup(false);
      } else if (data.isInvalidInput) {
        setAiError(data.error);
        setShowAIPopup(false);
      } else {
        setAiError("Something went wrong connecting to the AI. Please try again.");
      }
    } catch (error) {
      console.error("AI failed:", error);
      setAiError("Network error. Please check your connection.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    // FIXED: Now includes fileData in the payload
    const finalPayload = {
      ...formData,
      type: uploadedFile ? 'document' : 'text',
      fileName: uploadedFile ? uploadedFile.name : null,
      fileSize: uploadedFile ? uploadedFile.size : null,
      fileData: uploadedFile ? uploadedFile.base64 : null,
      uid: currentUser?.uid
    };

    try {
      const response = await fetch("http://localhost:5000/api/client/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalPayload)
      });
      const data = await response.json();
      if (data.success) {
        setStep(1);
        setFormData({ title: "", description: "", priority: "Medium" });
        setUploadedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setShowAIPopup(false);
        setAiError(null);
        onClose();
      }
    } catch (error) {
      console.error("Submit failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityStyles = (level) => {
    if (formData.priority !== level) return 'bg-gray-50 text-gray-500 hover:bg-gray-100';
    if (level === 'Low') return 'bg-green-50 text-green-600 ring-2 ring-green-500/30';
    if (level === 'Medium') return 'bg-orange-50 text-orange-600 ring-2 ring-orange-500/30';
    if (level === 'High') return 'bg-red-50 text-red-600 ring-2 ring-red-500/30';
  };

  return (
    <div className="fixed inset-0 bg-navy/40 backdrop-blur-sm z-[100] flex items-center justify-center p-0 md:p-4">
      <div className="bg-white w-full max-w-3xl rounded-none md:rounded-[2rem] shadow-2xl flex flex-col h-full md:h-[650px] overflow-hidden">
        
        <div className="px-6 py-5 md:px-8 md:py-6 flex justify-between items-start border-b md:border-b-0 border-gray-100">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-navy">New Project</h2>
            <p className="text-[12px] md:text-sm text-gray-400 mt-1">
              {step === 1 ? "The Basics" : step === 2 ? "Requirements & Files" : "Review & Submit"}
            </p>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="flex items-center">
              {[1, 2, 3].map((num) => (
                <div key={num} className="flex items-center">
                  <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold transition-colors ${
                    step >= num ? "bg-primary text-white" : "bg-gray-100 text-gray-400"
                  }`}>
                    {num}
                  </div>
                  {num !== 3 && <div className={`w-4 md:w-8 h-0.5 mx-1 md:mx-2 ${step > num ? "bg-primary" : "bg-gray-100"}`}></div>}
                </div>
              ))}
            </div>
            
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-navy">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 px-6 py-6 md:px-8 md:py-4 overflow-y-auto custom-scrollbar">
          
          {step === 1 && (
            <div className="h-full flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
              <label className="text-xs md:text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">Project Name</label>
              <input 
                type="text" 
                placeholder="E.g., User Authentication Flow..." 
                className="w-full text-2xl md:text-4xl font-bold text-navy placeholder-gray-300 outline-none border-b-2 border-gray-100 pb-3 md:pb-4 focus:border-primary transition-colors bg-transparent"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                autoFocus
              />
            </div>
          )}

          {step === 2 && (
            <div className="h-full flex flex-col relative animate-in fade-in slide-in-from-right-4 duration-500 space-y-4">
              
              <div className="flex-1 flex flex-col relative min-h-[250px]">
                {aiError && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs md:text-sm font-bold text-red-800">Invalid Input</h4>
                      <p className="text-[11px] md:text-sm text-red-600 mt-1">{aiError}</p>
                    </div>
                  </div>
                )}

                <textarea 
                  className={`w-full flex-1 p-5 md:p-6 bg-gray-50 rounded-2xl resize-none outline-none focus:ring-2 focus:ring-primary/20 transition-all text-navy text-sm md:text-base ${aiError ? 'border-2 border-red-200' : 'border border-transparent'}`}
                  placeholder="Describe the feature in detail (Optional if you are attaching a file)..."
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({...formData, description: e.target.value});
                    if (aiError) setAiError(null); 
                  }}
                />
                
                {!aiError && (
                  <button 
                    onClick={() => setShowAIPopup(!showAIPopup)}
                    className="absolute top-3 right-3 md:top-4 md:right-4 bg-purple-100 text-purple-600 p-2.5 rounded-xl hover:bg-purple-200 transition-colors shadow-sm"
                  >
                    <Sparkles className="w-5 h-5" />
                  </button>
                )}

                {showAIPopup && (
                  <div className="absolute top-14 right-0 w-full sm:w-72 bg-white rounded-2xl shadow-xl border border-purple-100 p-5 z-20 animate-in fade-in zoom-in-95">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center space-x-2 text-purple-600 font-bold text-sm">
                        <Sparkles className="w-4 h-4" />
                        <span>AI Assistant</span>
                      </div>
                      <button onClick={() => setShowAIPopup(false)} className="text-gray-400 hover:text-navy"><X className="w-4 h-4" /></button>
                    </div>
                    <p className="text-[11px] text-gray-500 mb-4">Let AI structure your rough thoughts into a professional requirement.</p>
                    <button 
                      onClick={handleAIStructure}
                      disabled={!formData.description || isGenerating}
                      className="w-full bg-purple-50 text-purple-600 hover:bg-purple-100 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center transition-colors disabled:opacity-50"
                    >
                      {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Format with AI"}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-shrink-0 pt-2">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.docx,.txt,.png,.jpg,.jpeg" />
                {!uploadedFile ? (
                  <div 
                    onClick={() => fileInputRef.current.click()}
                    className="border-2 border-dashed border-gray-200 rounded-2xl p-5 flex items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-primary transition-colors text-center"
                  >
                    <UploadCloud className="w-6 h-6 text-gray-400 mr-4" />
                    <div className="text-left">
                      <p className="text-navy font-bold text-sm">Attach a supporting document (Optional)</p>
                      <p className="text-gray-400 text-[11px] mt-0.5">PDF, DOCX, TXT, Images supported</p>
                    </div>
                  </div>
                ) : (
                  <div className="border border-gray-100 rounded-2xl p-4 flex items-center justify-between bg-white shadow-sm ring-1 ring-black/5">
                    <div className="flex items-center space-x-4 min-w-0">
                      <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500 flex-shrink-0">
                        <FileIcon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-navy text-sm truncate">{uploadedFile.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 truncate">{uploadedFile.size} · Uploaded</p>
                      </div>
                    </div>
                    <button onClick={() => { setUploadedFile(null); if(fileInputRef.current) fileInputRef.current.value = ""; }} className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="bg-gray-50 rounded-2xl p-5 md:p-6 border border-gray-100">
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Title</p>
                  <p className="font-bold text-navy text-base md:text-lg">{formData.title}</p>
                </div>
                
                <div className="mb-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Provided Materials</p>
                  <div className="flex flex-col gap-2">
                    {formData.description.trim() !== "" && (
                      <div className="flex items-center text-sm font-semibold text-primary">
                        <FileText className="w-4 h-4 mr-2" /> Manual Description Added
                      </div>
                    )}
                    {uploadedFile && (
                      <div className="flex items-center text-sm font-semibold text-red-500">
                        <FileIcon className="w-4 h-4 mr-2" /> {uploadedFile.name} Attached
                      </div>
                    )}
                  </div>
                </div>

                {formData.description.trim() !== "" && (
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Description Preview</p>
                    <p className="text-xs text-gray-600 line-clamp-3 bg-white p-3 rounded-xl border border-gray-100 whitespace-pre-wrap">
                      {formData.description}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-3 tracking-widest">Priority</p>
                <div className="flex space-x-2 md:space-x-4">
                  {['Low', 'Medium', 'High'].map(level => (
                    <button key={level} onClick={() => setFormData({...formData, priority: level})} className={`flex-1 py-2.5 md:py-3 rounded-xl font-bold text-xs md:text-sm transition-all ${getPriorityStyles(level)}`}>
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 rounded-2xl p-4 flex items-start space-x-3 border border-blue-100">
                <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Your requirement will be sent to the BA for ambiguity detection and task breakdown.
                </p>
              </div>
            </div>
          )}

        </div>

        <div className="px-6 py-4 md:px-8 md:py-5 border-t border-gray-50 flex items-center justify-between bg-white md:rounded-b-[2rem] flex-shrink-0">
          <div className="w-20 md:w-24">
            {step > 1 && (
              <button onClick={() => setStep(step - 1)} className="flex items-center text-gray-500 font-bold hover:text-navy text-sm transition-colors">
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
              </button>
            )}
          </div>

          <button 
            onClick={step < 3 ? () => setStep(step + 1) : handleSubmit}
            disabled={step < 3 ? !canContinue : isSubmitting} 
            className={`px-8 py-3 md:py-2.5 rounded-xl md:rounded-full font-bold flex items-center justify-center transition-all ${
              (step < 3 ? canContinue : !isSubmitting)
                ? "bg-primary text-white shadow-lg hover:bg-blue-600 hover:scale-105 active:scale-95" 
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            } text-sm`}
          >
            {step < 3 ? (
              <>Next <ArrowRight className="w-4 h-4 ml-2" /></>
            ) : (
              <>{isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Rocket className="w-5 h-5 mr-2" />} Launch</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}