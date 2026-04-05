import { useState, useEffect } from "react";
import ClientTopBar from "../../components/Client/ClientTopBar";
import ClientSidebar from "../../components/Client/ClientSidebar";
import { useAuth } from "../../contexts/AuthContext";
import { Loader2, CheckCircle2, ExternalLink, Archive as ArchiveIcon } from "lucide-react";

export default function ClientArchive() {
  const { currentUser } = useAuth();
  const [archives, setArchives] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.uid) {
      fetchArchives();
    }
  }, [currentUser]);

  const fetchArchives = async () => {
    setIsLoading(true);
    try {
      // First try the singular endpoint
      let response = await fetch(`http://localhost:5000/api/client/archive?uid=${currentUser.uid}`);
      
      // If 404, fallback to plural endpoints commonly used in NexBA routing
      if (!response.ok) {
         response = await fetch(`http://localhost:5000/api/client/archives?uid=${currentUser.uid}`);
      }

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setArchives(data.data);
        }
      }
    } catch (error) {
      console.error("Error fetching archives:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>

      <div className="h-screen bg-[#F5F7FA] overflow-hidden flex flex-col">
        <ClientTopBar />

        <div className="flex max-w-[1600px] w-full mx-auto pt-6 px-4 md:px-6 gap-8 pb-6 flex-1 min-h-0">
          
          {/* Sidebar */}
          <div className="hidden lg:block flex-shrink-0 h-full">
            <ClientSidebar />
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 h-full">
            
            {/* Header */}
            <div className="mb-6 flex-shrink-0">
              <h1 className="text-[20px] md:text-[24px] font-bold text-navy flex items-center gap-2">
                 Archive
              </h1>
              <p className="text-[13px] md:text-[15px] text-gray-500 mt-1">Read-only history of completed and closed requirements.</p>
            </div>

            {/* White Data Card */}
            <div className="flex-1 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              
              {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-[#007BFF]" />
                </div>
              ) : archives.length === 0 ? (
                <>
                  {/* Empty State Table Header */}
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                          <th className="p-6 w-[15%]">ID</th>
                          <th className="p-6 w-[25%]">Title</th>
                          <th className="p-6 w-[15%]">Submitted</th>
                          <th className="p-6 w-[15%]">Completed</th>
                          <th className="p-6 w-[15%]">Developer</th>
                          <th className="p-6 w-[10%]">Status</th>
                          <th className="p-6 w-[5%] text-right">Evidence</th>
                        </tr>
                      </thead>
                    </table>
                  </div>
                  {/* Empty State Message */}
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-6">
                    <ArchiveIcon className="w-12 h-12 mb-4 opacity-20" />
                    <p className="font-medium text-sm italic">No archived requirements found.</p>
                  </div>
                </>
              ) : (
                <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar w-full">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead className="sticky top-0 bg-white/95 backdrop-blur-sm z-10">
                      <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-widest shadow-[0_4px_6px_-6px_rgba(0,0,0,0.05)]">
                        <th className="p-6">ID</th>
                        <th className="p-6">Title</th>
                        <th className="p-6">Submitted</th>
                        <th className="p-6">Completed</th>
                        <th className="p-6">Developer</th>
                        <th className="p-6">Status</th>
                        <th className="p-6 text-right">Evidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {archives.map((item) => (
                        <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                          
                          <td className="p-6 text-[13px] font-bold text-[#007BFF]">
                            {item.reqId}
                          </td>
                          
                          <td className="p-6 text-[14px] font-bold text-navy max-w-[250px] truncate">
                            {item.title}
                          </td>
                          
                          <td className="p-6 text-[13px] text-gray-500 whitespace-nowrap">
                            {item.submittedAt}
                          </td>
                          
                          <td className="p-6 text-[13px] text-gray-500 font-medium whitespace-nowrap">
                            {item.completedAt}
                          </td>
                          
                          <td className="p-6 text-[13px] text-gray-600 truncate max-w-[150px]">
                            {item.developer}
                          </td>
                          
                          <td className="p-6">
                            <span className="bg-green-50 text-green-600 border border-green-100 px-2.5 py-1 rounded-md text-[10px] font-bold flex items-center w-max gap-1.5 uppercase tracking-wide">
                              <CheckCircle2 className="w-3 h-3" /> {item.status}
                            </span>
                          </td>
                          
                          <td className="p-6 text-right">
                            {item.commitLink ? (
                              <a 
                                href={item.commitLink} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-[#007BFF] hover:underline text-[12px] font-bold flex items-center justify-end gap-1"
                              >
                                View Link <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-gray-400 text-[12px] font-medium bg-gray-50 px-2 py-1 rounded">Internal</span>
                            )}
                          </td>
                          
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* Footer text */}
              <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex-shrink-0 text-[11px] text-gray-400 font-medium">
                Showing {archives.length} archived requirements. This data is read-only.
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}