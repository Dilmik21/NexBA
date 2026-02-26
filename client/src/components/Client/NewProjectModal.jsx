import { useState, useRef } from "react";
import { X, FileText, Folder, Sparkles, ArrowRight, ArrowLeft, Rocket, Loader2, UploadCloud, File as FileIcon, AlertCircle } from "lucide-react";

export default function NewProjectModal({ isOpen, onClose }) {
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAIPopup, setShowAIPopup] = useState(false);
  
  // NEW: State to hold the AI rejection error
  const [aiError, setAiError] = useState(null);

  const [uploadedFile, setUploadedFile] = useState(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: "",
    type: "", 
    description: "",
    priority: "Medium"
  });

  if (!isOpen) return null;

  const isStep1Valid = formData.title.trim() !== "" && formData.type !== "";
  const isStep2Valid = formData.type === 'text' 
    ? formData.description.trim() !== "" 
    : uploadedFile !== null; 
  
  const canContinue = (step === 1 && isStep1Valid) || (step === 2 && isStep2Valid);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
      const extension = file.name.split('.').pop().toUpperCase();
      
      setUploadedFile({
        name: file.name,
        size: `${sizeInMB} MB`,
        type: extension,
        rawFile: file 
      });
    }
  };

  const handleAIStructure = async () => {
    if (!formData.description) return;
    setIsGenerating(true);
    setAiError(null); // Clear any previous errors

    try {
      const response = await fetch("http://localhost:5000/api/ai/structure-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: formData.description })
      });
      const data = await response.json();
      
      if (data.success) {
        // AI succeeded!
        setFormData({ ...formData, description: data.structuredText });
        setShowAIPopup(false);
      } else if (data.isInvalidInput) {
        // AI Gatekeeper rejected it! Show the error.
        setAiError(data.error);
        setShowAIPopup(false);
      } else {
        // Standard backend error fallback
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
    
    const finalPayload = {
      ...formData,
      fileName: uploadedFile ? uploadedFile.name : null,
      fileSize: uploadedFile ? uploadedFile.size : null
    };

    try {
      const response = await fetch("http://localhost:5000/api/client/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalPayload)
      });
      const data = await response.json();
      if (data.success) {
        // Reset everything on success
        setStep(1);
        setFormData({ title: "", type: "", description: "", priority: "Medium" });
        setUploadedFile(null);
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
    <div className="fixed inset-0 bg-navy/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-[2rem] shadow-2xl flex flex-col h-[650px]">
        
        {/* HEADER & PROGRESS BAR */}
        <div className="px-8 py-6 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-navy">New Project</h2>
            <p className="text-sm text-gray-400 mt-1">
              {step === 1 ? "The Basics" : step === 2 ? "Content" : "Review & Submit"}
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {[1, 2, 3].map((num) => (
                <div key={num} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    step >= num ? "bg-primary text-white" : "bg-gray-100 text-gray-400"
                  }`}>
                    {num}
                  </div>
                  {num !== 3 && <div className={`w-8 h-0.5 mx-2 ${step > num ? "bg-primary" : "bg-gray-100"}`}></div>}
                </div>
              ))}
            </div>
            
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors ml-4 text-gray-400 hover:text-navy">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 px-8 py-4 overflow-y-auto">
          
          {/* STEP 1: Title & Type */}
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <input 
                  type="text" 
                  placeholder="Give your feature a name..." 
                  className="w-full text-3xl font-bold text-navy placeholder-gray-300 outline-none border-b-2 border-gray-100 pb-4 focus:border-primary transition-colors bg-transparent"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-500 mb-4">How would you like to describe it?</p>
                <div className="grid grid-cols-2 gap-6">
                  <div 
                    onClick={() => setFormData({...formData, type: 'text'})}
                    className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                      formData.type === 'text' ? "border-primary bg-blue-50/50" : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="w-12 h-12 bg-white rounded-xl border border-gray-100 flex items-center justify-center shadow-sm mb-4">
                      <FileText className={`w-6 h-6 ${formData.type === 'text' ? 'text-primary' : 'text-gray-600'}`} />
                    </div>
                    <h3 className="font-bold text-navy">Text Description</h3>
                    <p className="text-sm text-gray-500 mt-2">Write a detailed description of your feature or requirement.</p>
                  </div>

                  <div 
                    onClick={() => setFormData({...formData, type: 'document'})}
                    className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                      formData.type === 'document' ? "border-primary bg-blue-50/50" : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="w-12 h-12 bg-white rounded-xl border border-gray-100 flex items-center justify-center shadow-sm mb-4">
                      <Folder className={`w-6 h-6 ${formData.type === 'document' ? 'text-primary' : 'text-gray-600'}`} />
                    </div>
                    <h3 className="font-bold text-navy">Document Upload</h3>
                    <p className="text-sm text-gray-500 mt-2">Upload a spec document, PDF, or requirements file.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Text Description Path */}
          {step === 2 && formData.type === 'text' && (
            <div className="h-full flex flex-col relative animate-in fade-in slide-in-from-right-4 duration-500">
              
              {/* THE NEW AI ERROR BOX */}
              {aiError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start space-x-3 animate-in slide-in-from-top-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-red-800">Invalid Input Detected</h4>
                    <p className="text-sm text-red-600 mt-1">{aiError}</p>
                  </div>
                </div>
              )}

              <textarea 
                className={`w-full h-full p-6 bg-gray-50 rounded-2xl resize-none outline-none focus:ring-2 focus:ring-primary/20 transition-all text-navy ${aiError ? 'border-2 border-red-200' : ''}`}
                placeholder="Describe the feature in detail. Who is it for? What should it do?"
                value={formData.description}
                onChange={(e) => {
                  setFormData({...formData, description: e.target.value});
                  if (aiError) setAiError(null); // Clear error as soon as they start typing again
                }}
              />
              
              {/* Only show the Sparkles button if there isn't an active error taking up space */}
              {!aiError && (
                <button 
                  onClick={() => setShowAIPopup(!showAIPopup)}
                  className="absolute top-4 right-4 bg-purple-100 text-purple-600 p-3 rounded-xl hover:bg-purple-200 transition-colors shadow-sm flex items-center justify-center"
                >
                  <Sparkles className="w-5 h-5" />
                </button>
              )}

              {showAIPopup && (
                <div className="absolute top-16 right-4 w-72 bg-white rounded-2xl shadow-xl border border-purple-100 p-5 z-10 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center space-x-2 text-purple-600 font-bold text-sm">
                      <Sparkles className="w-4 h-4" />
                      <span>AI Writing Assistant</span>
                    </div>
                    <button onClick={() => setShowAIPopup(false)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                    Type a rough idea and let AI structure it into a proper requirement.
                  </p>
                  <button 
                    onClick={handleAIStructure}
                    disabled={!formData.description || isGenerating}
                    className="w-full bg-purple-50 text-purple-600 hover:bg-purple-100 font-semibold py-2 rounded-xl text-sm flex items-center justify-center transition-colors disabled:opacity-50"
                  >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Structure my text with AI"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Document Upload Path */}
          {step === 2 && formData.type === 'document' && (
            <div className="h-full flex flex-col justify-center animate-in fade-in slide-in-from-right-4 duration-500">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                accept=".pdf,.docx,.txt" 
              />
              {!uploadedFile ? (
                <div 
                  onClick={() => fileInputRef.current.click()}
                  className="border-2 border-dashed border-gray-200 rounded-3xl h-[300px] flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-primary transition-colors group"
                >
                  <div className="w-16 h-16 bg-gray-50 group-hover:bg-white rounded-2xl flex items-center justify-center mb-4 transition-colors">
                    <UploadCloud className="w-8 h-8 text-gray-400 group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-navy font-bold">Click to upload or drag and drop</p>
                  <p className="text-gray-400 text-sm mt-1">Supports PDF, DOCX, TXT</p>
                </div>
              ) : (
                <div className="border border-gray-100 rounded-2xl p-6 flex items-center justify-between bg-white shadow-sm mt-8">
                  <div className="flex items-center space-x-6">
                    <div className="w-14 h-14 bg-red-50 rounded-xl flex items-center justify-center text-red-500">
                      <FileIcon className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="font-bold text-navy">{uploadedFile.name}</p>
                      <p className="text-sm text-gray-400 mt-1">
                        {uploadedFile.type} · {uploadedFile.size} · Uploaded just now
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setUploadedFile(null)} 
                    className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Review & Submit */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Title</p>
                  <p className="font-bold text-navy text-lg">{formData.title}</p>
                </div>
                
                <div className={`${formData.type === 'text' ? 'mb-4 pb-4 border-b border-gray-200' : ''}`}>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Type</p>
                  
                  {formData.type === 'text' ? (
                    <div className="flex items-center text-sm font-semibold text-primary">
                      <FileText className="w-4 h-4 mr-2" /> Text Description
                    </div>
                  ) : (
                    <div className="flex items-center text-sm font-semibold text-navy">
                      <FileIcon className="w-4 h-4 text-red-500 mr-2" /> {uploadedFile?.name}
                    </div>
                  )}
                </div>

                {formData.type === 'text' && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description Preview</p>
                    <p className="text-sm text-gray-600 line-clamp-3 bg-white p-3 rounded-xl border border-gray-100 whitespace-pre-wrap">
                      {formData.description}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-bold text-gray-400 mb-3">Priority Level</p>
                <div className="flex space-x-4">
                  {['Low', 'Medium', 'High'].map(level => (
                    <button 
                      key={level}
                      onClick={() => setFormData({...formData, priority: level})}
                      className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${getPriorityStyles(level)}`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 rounded-2xl p-5 flex items-start space-x-4 border border-blue-100">
                <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-navy text-sm">What happens next?</p>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    Your requirement will be sent directly to the Business Analyst. They will review it, run AI analysis to detect ambiguities, and break it into actionable tasks.
                  </p>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* FOOTER CONTROLS */}
        <div className="px-8 py-5 border-t border-gray-50 flex items-center justify-between bg-white rounded-b-[2rem]">
          <div className="w-24">
            {step > 1 && (
              <button 
                onClick={() => setStep(step - 1)}
                className="flex items-center text-gray-500 font-semibold hover:text-navy transition-colors py-2"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </button>
            )}
          </div>

          {step < 3 ? (
            <button 
              onClick={() => setStep(step + 1)}
              disabled={!canContinue} 
              className={`px-8 py-2.5 rounded-full font-bold flex items-center transition-all duration-300 ${
                canContinue 
                  ? "bg-primary text-white hover:bg-blue-600 shadow-lg shadow-blue-500/30 hover:-translate-y-0.5" 
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          ) : (
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-primary hover:bg-blue-600 text-white px-8 py-2.5 rounded-full font-bold flex items-center shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-70"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Rocket className="w-5 h-5 mr-2" />}
              Launch Request
            </button>
          )}
        </div>

      </div>
    </div>
  );
}