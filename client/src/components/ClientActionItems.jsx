import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, MessageSquare, ArrowRight } from "lucide-react";

export default function ClientActionItems() {
  const [data, setData] = useState({ pendingApprovals: [], clarificationsNeeded: [] });

  useEffect(() => {
    const fetchActionItems = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/client/action-items");
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        }
      } catch (error) {
        console.error("Failed to load action items:", error);
      }
    };
    fetchActionItems();
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
      
      {/* LEFT COLUMN: Pending Approvals */}
      <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-6 h-6 text-green-500" />
            <h2 className="text-lg font-bold text-navy">Pending Approvals</h2>
            <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full">
              {data.pendingApprovals.length}
            </span>
          </div>
          {/* PROPER NAVIGATION: View All Link */}
          <Link to="/dashboard/approvals" className="text-sm font-bold text-primary flex items-center hover:text-blue-700 transition-colors">
            View All <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        {/* List Items */}
        <div className="flex-1 p-4 overflow-y-auto">
          {data.pendingApprovals.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors mb-2 border border-transparent hover:border-gray-100">
              <div className="pr-4">
                <p className="text-sm font-bold text-navy">{item.title}</p>
                <p className="text-xs text-gray-500 mt-1">{item.id} · {item.meta}</p>
              </div>
              {/* PROPER NAVIGATION: Review Button */}
              <Link to={`/dashboard/approvals`} className="flex-shrink-0 text-sm font-bold text-primary border border-primary px-4 py-2 rounded-xl hover:bg-blue-50 transition-colors">
                Review
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT COLUMN: Clarifications Needed */}
      <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-3">
            <MessageSquare className="w-6 h-6 text-red-500" />
            <h2 className="text-lg font-bold text-navy">Clarifications Needed</h2>
            <span className="bg-red-100 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full">
              {data.clarificationsNeeded.length}
            </span>
          </div>
          {/* PROPER NAVIGATION: View All Link */}
          <Link to="/dashboard/clarifications" className="text-sm font-bold text-primary flex items-center hover:text-blue-700 transition-colors">
            View All <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        {/* List Items */}
        <div className="flex-1 p-4 overflow-y-auto">
          {data.clarificationsNeeded.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors mb-2 border border-transparent hover:border-gray-100">
              <div className="pr-4">
                <p className="text-sm font-bold text-navy">{item.title}</p>
                <p className="text-xs text-gray-500 mt-1">{item.id} · {item.meta}</p>
                <p className="text-xs text-gray-600 italic mt-2 border-l-2 border-red-200 pl-2">{item.quote}</p>
              </div>
              {/* PROPER NAVIGATION: Respond Button */}
              <Link to={`/dashboard/clarifications`} className="flex-shrink-0 text-sm font-bold text-red-500 border border-red-500 px-4 py-2 rounded-xl hover:bg-red-50 transition-colors">
                Respond
              </Link>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}