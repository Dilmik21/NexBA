import React, { useState } from 'react';
import { X, AlertTriangle, BugPlay, BoxSelect } from 'lucide-react';

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
    <div className="fixed inset-0 bg-navy/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header exactly like image_4.png */}
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-navy">Request Modification for <span className='text-gray-400 font-medium ml-2'>{requirement.reqId}</span></h2>
            <p className="text-sm text-gray-500 mt-1">{requirement.title}</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white border border-transparent hover:border-gray-200 hover:shadow-sm rounded-full text-gray-400 hover:text-navy transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-8 space-y-8 overflow-y-auto">
          
          {/* AI Impact Analysis Box - exactly mirroring image_4.png */}
          <div className="flex items-start space-x-4 bg-orange-50 p-6 rounded-2xl border border-orange-100">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-orange-500 shadow-sm flex-shrink-0 mt-1">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-orange-900 text-sm">AI Impact Analysis</p>
              <p className="text-xs text-orange-700 mt-1.5 leading-relaxed">
                Changing this requirement may delay the project timeline by approx. <span className='font-bold'>2 days</span> based on AI analysis. Consider discussing with your BA first.
              </p>
            </div>
          </div>

          {/* Change Type Radio Group with Icons */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Change Type</h3>
            <div className="grid grid-cols-2 gap-4">
              
              {/* Bug Report Option */}
              <label className={`relative p-5 rounded-2xl border flex items-center space-x-4 cursor-pointer transition-all ${
                changeType === 'Bug Report' ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200'
              }`}>
                <input type="radio" name="changeType" value="Bug Report" checked={changeType === 'Bug Report'} onChange={(e) => setChangeType(e.target.value)} className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500" />
                <BugPlay className={`w-6 h-6 ${changeType === 'Bug Report' ? 'text-red-500' : 'text-gray-400'}`} />
                <div>
                  <p className="font-bold text-sm text-navy">Bug Report</p>
                  <p className="text-xs text-gray-500 mt-1">The evidence doesn't match the original requirement specification.</p>
                </div>
              </label>

              {/* Scope Change Option */}
              <label className={`relative p-5 rounded-2xl border flex items-center space-x-4 cursor-pointer transition-all ${
                changeType === 'Scope Change' ? 'bg-orange-50 border-orange-200 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200'
              }`}>
                <input type="radio" name="changeType" value="Scope Change" checked={changeType === 'Scope Change'} onChange={(e) => setChangeType(e.target.value)} className="w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500" />
                <BoxSelect className={`w-6 h-6 ${changeType === 'Scope Change' ? 'text-orange-500' : 'text-gray-400'}`} />
                <div>
                  <p className="font-bold text-sm text-navy">Scope Change</p>
                  <p className="text-xs text-gray-500 mt-1">I want a new feature or different functionality added to this requirement.</p>
                </div>
              </label>

            </div>
          </div>

          {/* Description of Change Textarea */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Description of Change</h3>
            <textarea
              value={changeDescription}
              onChange={(e) => setChangeDescription(e.target.value)}
              placeholder="Describe the issue or the change you need..."
              className="w-full h-32 p-5 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none text-sm text-navy"
            />
          </div>

        </div>

        {/* Modal Footer with Action Buttons */}
        <div className="px-8 py-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50 rounded-b-[2.5rem]">
          <button 
            onClick={onClose} 
            className="text-gray-600 hover:bg-gray-100 px-6 py-2.5 rounded-xl font-bold transition-all text-sm"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={!isFormValid || isSubmitting}
            // Greyed out if description is empty, as seen in image_4.png
            className="bg-navy hover:bg-navy/90 text-white px-6 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50 text-sm flex items-center shadow-lg shadow-navy/20"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Change Request'}
          </button>
        </div>

      </div>
    </div>
  );
}