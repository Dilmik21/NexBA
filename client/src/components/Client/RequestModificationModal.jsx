import React, { useState } from 'react';
import { X, AlertTriangle, BugPlay, BoxSelect, Loader2 } from 'lucide-react';

export default function RequestModificationModal({ isOpen, onClose, requirement, onSubmit }) {
  const [changeType, setChangeType] = useState('Bug Report');
  const [changeDescription, setChangeDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Passing the data back to the parent component for the API call
    await onSubmit({ changeType, changeDescription });
    setIsSubmitting(false);
    onClose();
    // Reset form state for next use
    setChangeType('Bug Report');
    setChangeDescription('');
  };

  if (!isOpen) return null;

  const isFormValid = changeDescription.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-navy/40 backdrop-blur-sm z-[150] flex items-center justify-center p-0 md:p-4">
      {/* Container: Full height on mobile, max-width on desktop */}
      <div className="bg-white w-full max-w-xl md:rounded-[2.5rem] shadow-2xl flex flex-col h-full md:max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-5 md:px-8 md:py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-shrink-0">
          <div className="min-w-0 pr-4">
            <h2 className="text-lg md:text-xl font-bold text-navy flex items-center flex-wrap">
              Request Modification
              <span className='text-gray-400 font-medium ml-2 text-sm md:text-base'>{requirement.reqId}</span>
            </h2>
            <p className="text-xs md:text-sm text-gray-500 mt-1 truncate">{requirement.title}</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white border border-transparent hover:border-gray-200 hover:shadow-sm rounded-full text-gray-400 hover:text-navy transition-all flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 md:p-8 space-y-6 md:space-y-8 overflow-y-auto flex-1">
          
          {/* AI Impact Analysis Box */}
          <div className="flex items-start space-x-3 md:space-x-4 bg-orange-50 p-5 md:p-6 rounded-2xl border border-orange-100">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-xl flex items-center justify-center text-orange-500 shadow-sm flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <p className="font-bold text-orange-900 text-xs md:text-sm uppercase tracking-wide">AI Impact Analysis</p>
              <p className="text-[11px] md:text-xs text-orange-700 mt-1.5 leading-relaxed">
                Changing this requirement may delay the timeline by <span className='font-black'>2 days</span>. Consider discussing with your BA first.
              </p>
            </div>
          </div>

          {/* Change Type Selection */}
          <div>
            <h3 className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Selection Type</h3>
            {/* Grid stacks on mobile (grid-cols-1) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              
              {/* Bug Report Option */}
              <label className={`relative p-4 md:p-5 rounded-2xl border flex items-center space-x-4 cursor-pointer transition-all ${
                changeType === 'Bug Report' ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200'
              }`}>
                <input type="radio" name="changeType" value="Bug Report" checked={changeType === 'Bug Report'} onChange={(e) => setChangeType(e.target.value)} className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500" />
                <BugPlay className={`w-5 h-5 md:w-6 md:h-6 flex-shrink-0 ${changeType === 'Bug Report' ? 'text-red-500' : 'text-gray-400'}`} />
                <div className="min-w-0">
                  <p className="font-bold text-[13px] md:text-sm text-navy">Bug Report</p>
                  <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 leading-tight">Evidence doesn't match spec.</p>
                </div>
              </label>

              {/* Scope Change Option */}
              <label className={`relative p-4 md:p-5 rounded-2xl border flex items-center space-x-4 cursor-pointer transition-all ${
                changeType === 'Scope Change' ? 'bg-orange-50 border-orange-200 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200'
              }`}>
                <input type="radio" name="changeType" value="Scope Change" checked={changeType === 'Scope Change'} onChange={(e) => setChangeType(e.target.value)} className="w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500" />
                <BoxSelect className={`w-5 h-5 md:w-6 md:h-6 flex-shrink-0 ${changeType === 'Scope Change' ? 'text-orange-500' : 'text-gray-400'}`} />
                <div className="min-w-0">
                  <p className="font-bold text-[13px] md:text-sm text-navy">Scope Change</p>
                  <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 leading-tight">I need a new feature added.</p>
                </div>
              </label>

            </div>
          </div>

          {/* Description Textarea */}
          <div className="flex flex-col flex-1">
            <h3 className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Description of Change</h3>
            <textarea
              value={changeDescription}
              onChange={(e) => setChangeDescription(e.target.value)}
              placeholder="Describe the issue or the change you need..."
              className="w-full flex-1 md:h-32 min-h-[120px] p-4 md:p-5 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none text-[13px] md:text-sm text-navy"
            />
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-5 md:px-8 md:py-6 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3 bg-gray-50/50 md:rounded-b-[2.5rem] flex-shrink-0">
          <button 
            onClick={onClose} 
            className="w-full sm:w-auto text-gray-600 hover:bg-gray-200/50 px-6 py-3 md:py-2.5 rounded-xl font-bold transition-all text-sm order-2 sm:order-1"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={!isFormValid || isSubmitting}
            className="w-full sm:w-auto bg-navy hover:bg-navy/90 text-white px-6 py-3 md:py-2.5 rounded-xl font-bold transition-all disabled:opacity-50 text-sm flex items-center justify-center shadow-lg shadow-navy/20 order-1 sm:order-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {isSubmitting ? 'Submitting...' : 'Submit Change Request'}
          </button>
        </div>

      </div>
    </div>
  );
}