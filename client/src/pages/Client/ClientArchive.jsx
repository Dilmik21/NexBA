import { useState, useEffect } from "react";
import ClientTopBar from "../../components/Client/ClientTopBar";
import ClientSidebar from "../../components/Client/ClientSidebar";
import { Archive as ArchiveIcon, CheckCircle2, ExternalLink, X, Image as ImageIcon, Github } from "lucide-react";

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

      <div className="flex max-w-[1600px] mx-auto pt-6 px-6 gap-8">
        <div className="hidden lg:block w-64 flex-shrink-0">
          <ClientSidebar />
        </div>

        <div className="flex-1 pb-10 flex flex-col h-[calc(100vh-100px)]">
          
          {/* Header Area matching the design */}
          <div className="mb-6 flex items-start space-x-3 flex-shrink-0">
            <div className="mt-1">
               <ArchiveIcon className="w-6 h-6 text-gray-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-navy">Archive</h1>
              <p className="text-gray-500 mt-1 text-sm">Read-only history of completed and closed requirements.</p>
            </div>
          </div>

          {/* Main Table Container */}
          <div className="bg-white border border-gray-100 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col flex-1 min-h-0 overflow-hidden">
            
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white z-10 border-b border-gray-100">
                  <tr>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Submitted</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Completed</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Developer</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Evidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {isLoading ? (
                    <tr>
                      <td colSpan="7" className="text-center py-8 text-gray-500">Loading archives...</td>
                    </tr>
                  ) : archives.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-8 text-gray-500">No archived requirements found.</td>
                    </tr>
                  ) : (
                    archives.map((req) => (
                      <tr key={req.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="py-5 px-6 text-xs text-gray-400 font-bold tracking-wider">{req.reqId}</td>
                        <td className="py-5 px-6">
                          <span className="font-bold text-navy text-sm max-w-[200px] block whitespace-normal">
                            {req.title}
                          </span>
                        </td>
                        <td className="py-5 px-6 text-sm text-gray-600 font-medium">{req.submittedAt}</td>
                        <td className="py-5 px-6 text-sm text-gray-600 font-medium">{req.completedAt}</td>
                        <td className="py-5 px-6 text-sm text-gray-600">{req.developer}</td>
                        <td className="py-5 px-6">
                          {/* Green status badge matching design */}
                          <span className="text-[11px] font-bold px-3 py-1.5 rounded-md bg-green-50 text-green-600 flex items-center w-max">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                            {req.status}
                          </span>
                        </td>
                        <td className="py-5 px-6">
                          {/* The View button with External Link Icon */}
                          <button 
                            onClick={() => setSelectedEvidence(req)}
                            className="text-primary font-bold text-sm flex items-center hover:underline transition-all"
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

            <div className="px-6 py-4 border-t border-gray-50 text-xs font-medium text-gray-400 bg-gray-50/30 flex-shrink-0">
              Showing {archives.length} archived requirements. This data is read-only.
            </div>
          </div>
        </div>
      </div>

      {/* EVIDENCE VIEWER MODAL */}
      {selectedEvidence && (
        <div className="fixed inset-0 bg-navy/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            
            <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50 rounded-t-[2rem]">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Archived Evidence for {selectedEvidence.reqId}</p>
                <h2 className="text-xl font-bold text-navy">{selectedEvidence.title}</h2>
              </div>
              <button 
                onClick={() => setSelectedEvidence(null)} 
                className="p-2 hover:bg-white border border-transparent hover:border-gray-200 hover:shadow-sm rounded-full text-gray-400 hover:text-navy transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto space-y-8">
              
              {/* Evidence Image Block */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Screenshot Evidence</h3>
                <div className="aspect-[16/9] w-full bg-gray-50 rounded-3xl border border-gray-100 flex items-center justify-center text-gray-300 shadow-inner overflow-hidden">
                  {selectedEvidence.evidenceImage ? (
                    <img src={selectedEvidence.evidenceImage} alt="Evidence" className="h-full w-full object-contain" />
                  ) : (
                    <ImageIcon className="w-16 h-16" />
                  )}
                </div>
              </div>

              {/* Commit Link Block */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center">
                  <Github className="w-4 h-4 mr-2"/> Commit Link
                </h3>
                <a href={selectedEvidence.commitLink} target="_blank" rel="noopener noreferrer" className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 text-primary text-sm font-medium hover:underline flex items-center break-all">
                  {selectedEvidence.commitLink}
                </a>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}