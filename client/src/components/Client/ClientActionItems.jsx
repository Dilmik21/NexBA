import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, MessageSquare, ArrowRight, Loader2 } from "lucide-react";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export default function ClientActionItems() {
  const [data, setData] = useState({ pendingApprovals: [], clarificationsNeeded: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchActionItems(user.uid);
      } else {
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchActionItems = async (uid) => {
    try {
      setIsLoading(true);
      const response = await fetch(`http://localhost:5000/api/client/action-items?uid=${uid}`);
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error("Failed to load action items:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mt-6 md:mt-8">
      
      {/* LEFT COLUMN: Pending Approvals */}
      <div className="bg-white rounded-3xl md:rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden flex flex-col">
        <div className="px-5 py-4 md:px-8 md:py-6 border-b border-gray-50 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2 md:space-x-3 min-w-0">
            <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-green-500 flex-shrink-0" />
            <h2 className="text-base md:text-lg font-bold text-navy truncate">Pending Approvals</h2>
            <span className="bg-green-100 text-green-700 text-[10px] md:text-xs font-bold px-2 py-0.5 md:px-2.5 md:py-1 rounded-full flex-shrink-0">
              {data.pendingApprovals.length}
            </span>
          </div>
          {/* THE FIX: Corrected the route from /dashboard/approvals to /client/approvals */}
          <Link to="/client/approvals" className="text-xs md:text-sm font-bold text-primary flex items-center hover:text-blue-700 transition-colors whitespace-nowrap pl-2">
            View All <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4 ml-1" />
          </Link>
        </div>

        <div className="flex-1 p-3 md:p-4 overflow-y-auto max-h-[400px] lg:max-h-none">
          {isLoading ? (
            <div className="text-center py-10 text-gray-400 text-sm flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
            </div>
          ) : data.pendingApprovals.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">No approvals pending.</div>
          ) : (
            data.pendingApprovals.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors mb-2 border border-transparent hover:border-gray-100">
                <div className="min-w-0 pr-3 md:pr-4">
                  <p className="text-[13px] md:text-sm font-bold text-navy truncate">{item.title}</p>
                  <p className="text-[11px] md:text-xs text-gray-500 mt-1 truncate">{item.id} · {item.meta}</p>
                </div>
                {/* THE FIX: Corrected route and added state to auto-select the project on the next page */}
                <Link 
                  to="/client/approvals" 
                  state={{ id: item.id }} 
                  className="flex-shrink-0 text-[11px] md:text-sm font-bold text-primary border border-primary px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl hover:bg-blue-50 transition-colors"
                >
                  Review
                </Link>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Clarifications Needed */}
      <div className="bg-white rounded-3xl md:rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden flex flex-col">
        <div className="px-5 py-4 md:px-8 md:py-6 border-b border-gray-50 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2 md:space-x-3 min-w-0">
            <MessageSquare className="w-5 h-5 md:w-6 md:h-6 text-red-500 flex-shrink-0" />
            <h2 className="text-base md:text-lg font-bold text-navy truncate">Clarifications Needed</h2>
            <span className="bg-red-100 text-red-600 text-[10px] md:text-xs font-bold px-2 py-0.5 md:px-2.5 md:py-1 rounded-full flex-shrink-0">
              {data.clarificationsNeeded.length}
            </span>
          </div>
          {/* THE FIX: Corrected the route from /dashboard/clarifications to /client/clarifications */}
          <Link to="/client/clarifications" className="text-xs md:text-sm font-bold text-primary flex items-center hover:text-blue-700 transition-colors whitespace-nowrap pl-2">
            View All <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4 ml-1" />
          </Link>
        </div>

        <div className="flex-1 p-3 md:p-4 overflow-y-auto max-h-[400px] lg:max-h-none">
          {isLoading ? (
            <div className="text-center py-10 text-gray-400 text-sm flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
            </div>
          ) : data.clarificationsNeeded.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">No clarifications needed right now.</div>
          ) : (
            data.clarificationsNeeded.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors mb-2 border border-transparent hover:border-gray-100">
                <div className="min-w-0 pr-3 md:pr-4">
                  <p className="text-[13px] md:text-sm font-bold text-navy truncate">{item.title}</p>
                  <p className="text-[11px] md:text-xs text-gray-500 mt-1 truncate">{item.id} · {item.meta}</p>
                  <p className="text-[11px] md:text-xs text-gray-600 italic mt-2 border-l-2 border-red-200 pl-2 line-clamp-2 md:line-clamp-none">{item.quote}</p>
                </div>
                {/* THE FIX: Corrected route and added state to auto-select the project */}
                <Link 
                  to="/client/clarifications" 
                  state={{ id: item.id }} 
                  className="flex-shrink-0 text-[11px] md:text-sm font-bold text-red-500 border border-red-500 px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl hover:bg-red-50 transition-colors"
                >
                  Respond
                </Link>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}