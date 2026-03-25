import { useState, useEffect } from "react";
import ClientTopBar from "../../components/Client/ClientTopBar";
import ClientSidebar from "../../components/Client/ClientSidebar";
// Importing the new modal component we just created
import RequestModificationModal from "../../components/Client/RequestModificationModal";
import { CheckCircle2, AlertTriangle, Image as ImageIcon, Github, ChevronDown, BotMessageSquare } from "lucide-react";

export default function ClientApprovals() {
  const [approvals, setApprovals] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/client/approvals");
      const data = await response.json();
      if (data.success) {
        setApprovals(data.data);
        // Auto-select the first requirement in the list by default
        if (data.data.length > 0) {
          setSelectedItem(data.data[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching approvals:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedItem || isSubmittingApproval) return;
    setIsSubmittingApproval(true);

    try {
      const response = await fetch(`http://localhost:5000/api/client/approvals/${selectedItem.id}/approve`, {
        method: "POST",
      });
      
      const data = await response.json();
      if (data.success) {
        // Refresh the list, which will remove the newly approved item
        fetchApprovals();
      }
    } catch (error) {
      console.error("Error submitting approval:", error);
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const handleSubmitChangeRequest = async (changeData) => {
    if (!selectedItem) return;

    try {
      const response = await fetch(`http://localhost:5000/api/client/approvals/${selectedItem.id}/request-change`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changeData)
      });
      
      const data = await response.json();
      if (data.success) {
        // Refresh the list, which will remove the modified item
        fetchApprovals();
      }
    } catch (error) {
      console.error("Error submitting change request:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <ClientTopBar />

      <div className="flex max-w-[1600px] mx-auto pt-6 px-4 md:px-6 gap-8">
        <div className="hidden lg:block w-64 flex-shrink-0">
          <ClientSidebar />
        </div>

        {/* Removed fixed height constraint for mobile scrolling */}
        <div className="flex-1 pb-10 flex flex-col h-full lg:h-[calc(100vh-100px)]">
          
          {/* Main Page Header */}
          <div className="mb-6 flex-shrink-0">
            <h1 className="text-[22px] font-bold text-navy">Approvals</h1>
            <p className="text-gray-500 mt-1 text-[13px]">Review evidence and approve or request changes.</p>
          </div>

          {/* Main Split Layout: flex-col on mobile, flex-row on desktop */}
          <div className="flex flex-col lg:flex-row gap-6 flex-1 lg:min-h-0">
            
            {/* LEFT COLUMN: Awaiting Review List */}
            <div className="w-full lg:w-[350px] bg-white border border-gray-100 rounded-3xl shadow-sm flex flex-col overflow-hidden flex-shrink-0 h-[350px] lg:h-auto">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-bold text-navy text-sm">Awaiting Review ({approvals.length})</h3>
              </div>
              
              <div className="overflow-y-auto flex-1 p-3 space-y-2">
                {isLoading ? (
                  <p className="text-center text-gray-400 text-sm py-8">Loading...</p>
                ) : approvals.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-8">No approvals pending!</p>
                ) : (
                  approvals.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                        selectedItem?.id === item.id 
                          ? 'border-blue-200 bg-blue-50/50 shadow-sm' 
                          : 'border-transparent hover:bg-gray-50 hover:border-gray-100'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold text-gray-400">{item.reqId}</span>
                        
                        {/* Evidence & BA Tags */}
                        {item.evidenceSubmitted && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-50 text-green-600 flex items-center">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Evidence Submitted
                          </span>
                        )}
                        {item.baVerified && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-600 flex items-center">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> BA Verified
                          </span>
                        )}
                      </div>
                      
                      <h4 className="font-bold text-navy text-sm mb-1 truncate">{item.title}</h4>
                      <p className="text-xs text-gray-500">by {item.submittedBy} • {item.submittedAt}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Detailed Evidence View */}
            <div className="flex-1 bg-white border border-gray-100 rounded-3xl shadow-sm flex flex-col overflow-hidden min-h-[500px] lg:min-h-0">
              {selectedItem ? (
                <>
                  {/* Right Header */}
                  <div className="p-6 md:p-8 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="text-xs font-bold text-gray-400">{selectedItem.reqId}</span>
                        {selectedItem.evidenceSubmitted && (
                          <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-green-100 text-green-600 flex items-center">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Evidence Submitted
                          </span>
                        )}
                        {selectedItem.baVerified && (
                          <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-blue-100 text-blue-600 flex items-center">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> BA Verified
                          </span>
                        )}
                    </div>
                    <h2 className="text-xl font-bold text-navy leading-snug">{selectedItem.title}</h2>
                    <p className="text-sm text-gray-500 mt-2">Evidence from {selectedItem.submittedBy} • Completed {selectedItem.submittedAt}</p>
                  </div>

                  {/* Scrollable Content */}
                  <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 md:space-y-8">
                    
                    {/* Screenshot Evidence */}
                    <div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Screenshot Evidence</h3>
                      <div className="aspect-[16/9] w-full max-w-lg bg-gray-50 rounded-3xl border border-gray-100 flex items-center justify-center text-gray-300 shadow-inner">
                        {selectedItem.evidenceImage ? (
                          <img src={selectedItem.evidenceImage} alt="Evidence" className="h-full w-full object-contain rounded-3xl" />
                        ) : (
                          <ImageIcon className="w-12 h-12 md:w-16 md:h-16" />
                        )}
                      </div>
                    </div>

                    {/* Commit Link Area */}
                    <div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center"><Github className="w-4 h-4 mr-2"/> Commit Link</h3>
                      <a href={selectedItem.commitLink} target="_blank" rel="noopener noreferrer" className="p-4 md:p-5 bg-blue-50/50 rounded-2xl border border-blue-100 text-primary text-sm font-medium hover:underline flex items-center break-all">
                         {selectedItem.commitLink}
                      </a>
                    </div>

                    {/* View Original Requirement Accordion */}
                    <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                      <details className="group p-5">
                        <summary className="flex justify-between items-center font-bold text-navy text-sm cursor-pointer list-none">
                          View Original Requirement
                          <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" />
                        </summary>
                        <div className="pt-4 text-gray-600 text-sm leading-relaxed whitespace-pre-wrap border-t border-gray-100 mt-4">
                          {selectedItem.description}
                        </div>
                      </details>
                    </div>

                  </div>

                  {/* Right Footer Buttons */}
                  <div className="p-6 md:px-8 md:py-6 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3 bg-white">
                    <button 
                      onClick={() => setIsModalOpen(true)} 
                      className="w-full sm:w-auto text-orange-500 bg-white border border-orange-200 hover:bg-orange-50 px-6 py-3 rounded-2xl font-bold transition-all text-sm flex items-center justify-center"
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" /> Request Change
                    </button>
                    <button 
                      onClick={handleApprove}
                      disabled={isSubmittingApproval}
                      className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-2xl font-bold transition-all disabled:opacity-50 text-sm flex items-center justify-center shadow-lg shadow-green-200"
                    >
                      {isSubmittingApproval ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                      {isSubmittingApproval ? 'Approving...' : 'Approve'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-20 lg:py-0 px-6 text-center">
                  <CheckCircle2 className="w-16 h-16 mb-6 text-gray-200" />
                  <p className='font-bold text-navy text-lg'>Requirement Review</p>
                  <p className='text-sm mt-2 max-w-sm'>Select a requirement from the list on the left to review its submitted evidence and commit history.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Renders the Request Modification Modal */}
      {selectedItem && (
        <RequestModificationModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          requirement={selectedItem} 
          onSubmit={handleSubmitChangeRequest}
        />
      )}

    </div>
  );
}