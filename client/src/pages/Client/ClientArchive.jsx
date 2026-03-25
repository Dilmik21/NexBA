import { useState, useEffect } from "react";
import ClientTopBar from "../../components/Client/ClientTopBar";
import ClientSidebar from "../../components/Client/ClientSidebar";
import { CheckCircle2, ExternalLink, X, Image as ImageIcon, Github } from "lucide-react";

export default function ClientArchive() {
  const [archives, setArchives] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // State to hold the selected requirement when "View" is clicked
  const [selectedEvidence, setSelectedEvidence] = useState(null);

  useEffect(() => {
    fetchArchives();
  }, []);

  const fetchArchives = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/client/archive");
      const data = await response.json();
      if (data.success) {
        setArchives(data.data);
      }
    } catch (error) {
      console.error("Error fetching archives:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <ClientTopBar />

      <div className="flex max-w-[1600px] mx-auto pt-6 px-4 md:px-6 gap-8">
        <div className="hidden lg:block w-64 flex-shrink-0">
          <ClientSidebar />
        </div>

        <div className="flex-1 pb-10 flex flex-col h-[calc(100vh-100px)]">
          
          {/* Header Area - Icon removed as requested */}
          <div className="mb-6 flex flex-col flex-shrink-0">
            <h1 className="text-[22px] md:text-2xl font-bold text-navy">Archive</h1>
            <p className="text-gray-500 mt-1 text-[13px] md:text-sm">Read-only history of completed and closed requirements.</p>
          </div>

          {/* Container for both Desktop Table and Mobile Cards - Clean white style */}
          <div className="bg-white md:border border-gray-100 rounded-3xl md:rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col flex-1 min-h-0 overflow-hidden">
            
            {/* --- MOBILE VIEW: CARD STACK (Hidden on Desktop) --- */}
            <div className="md:hidden flex flex-col gap-4 overflow-y-auto p-4">
              {isLoading ? (
                <div className="text-center py-8 text-gray-400 text-sm">Loading archives...</div>
              ) : archives.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">No archived requirements found.</div>
              ) : (
                archives.map((req) => (
                  <div key={req.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div className="pr-3">
                        <span className="text-[11px] font-bold text-gray-400">{req.reqId}</span>
                        <h4 className="font-bold text-navy text-[15px] leading-snug mt-1">{req.title}</h4>
                      </div>
                      <button 
                        onClick={() => setSelectedEvidence(req)} 
                        className="bg-blue-50 text-primary p-2.5 rounded-xl flex-shrink-0"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex justify-between items-center bg-gray-50/50 p-3 rounded-xl border border-gray-50">
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Submitted</p>
                        <p className="text-xs text-navy font-semibold">{req.submittedAt}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Completed</p>
                        <p className="text-xs text-navy font-semibold">{req.completedAt}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Developer</p>
                        <p className="text-xs text-gray-700 font-medium">{req.developer}</p>
                      </div>
                      <span className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-green-50 text-green-600 flex items-center">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        {req.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* --- DESKTOP VIEW: DATA TABLE --- */}
            <div className="hidden md:flex overflow-y-auto flex-1 w-full">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white z-10 border-b border-gray-100">
                  <tr className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    <th className="py-6 px-8">ID</th>
                    <th className="py-6 px-6">Title</th>
                    <th className="py-6 px-6">Submitted</th>
                    <th className="py-6 px-6">Completed</th>
                    <th className="py-6 px-6">Developer</th>
                    <th className="py-6 px-6">Status</th>
                    <th className="py-6 px-8 text-right">Evidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {isLoading ? (
                    <tr>
                      <td colSpan="7" className="text-center py-20 text-gray-400 text-sm italic">Loading your archives...</td>
                    </tr>
                  ) : archives.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-20 text-gray-400 text-sm italic">No archived requirements found.</td>
                    </tr>
                  ) : (
                    archives.map((req) => (
                      <tr key={req.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="py-5 px-8 text-xs text-gray-400 font-bold tracking-wider">{req.reqId}</td>
                        <td className="py-5 px-6 font-bold text-navy truncate max-w-[200px]">{req.title}</td>
                        <td className="py-5 px-6 text-sm text-gray-600">{req.submittedAt}</td>
                        <td className="py-5 px-6 text-sm text-gray-600">{req.completedAt}</td>
                        <td className="py-5 px-6 text-sm text-gray-600">{req.developer}</td>
                        <td className="py-5 px-6">
                          <span className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-green-50 text-green-600 flex items-center w-max">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                            {req.status}
                          </span>
                        </td>
                        <td className="py-5 px-8 text-right">
                          <button 
                            onClick={() => setSelectedEvidence(req)}
                            className="text-primary font-bold text-sm flex items-center justify-end hover:underline transition-all"
                          >
                            <ExternalLink className="w-4 h-4 mr-1.5" />
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="hidden md:block px-8 py-5 border-t border-gray-50 text-[11px] font-medium text-gray-400 bg-white flex-shrink-0">
              Showing {archives.length} archived requirements. This data is read-only.
            </div>
          </div>
        </div>
      </div>

      {/* EVIDENCE VIEWER MODAL */}
      {selectedEvidence && (
        <div className="fixed inset-0 bg-navy/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-[2rem]">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Evidence for {selectedEvidence.reqId}</p>
                <h2 className="text-xl font-bold text-navy leading-tight">{selectedEvidence.title}</h2>
              </div>
              <button 
                onClick={() => setSelectedEvidence(null)} 
                className="p-2 hover:bg-white border border-transparent hover:border-gray-200 rounded-full text-gray-400 hover:text-navy transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto space-y-8">
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Screenshot Evidence</h3>
                <div className="aspect-[16/9] w-full bg-gray-50 rounded-[2rem] border border-gray-100 flex items-center justify-center text-gray-300 shadow-inner overflow-hidden">
                  {selectedEvidence.evidenceImage ? (
                    <img src={selectedEvidence.evidenceImage} alt="Evidence" className="h-full w-full object-contain" />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <ImageIcon className="w-12 h-12" />
                      <p className="text-xs font-medium">No image evidence attached</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center">
                  <Github className="w-4 h-4 mr-2"/> Commit Link
                </h3>
                <a href={selectedEvidence.commitLink} target="_blank" rel="noopener noreferrer" className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 text-primary text-sm font-medium hover:underline flex items-center break-all">
                  {selectedEvidence.commitLink || "No commit link provided"}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}