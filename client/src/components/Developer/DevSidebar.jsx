import { Link, useLocation } from "react-router-dom";
import { LayoutGrid, ListTodo, MessageSquare, UploadCloud, BarChart2, Settings } from "lucide-react";

export default function DevSidebar() {
  const location = useLocation();

  const navLinks = [
    { name: "Dashboard", path: "/dev/dashboard", icon: LayoutGrid },
    { name: "My Tasks", path: "/dev/tasks", icon: ListTodo },
    { name: "Communication Hub", path: "/dev/communication", icon: MessageSquare },
    { name: "Submit Evidence", path: "/dev/evidence", icon: UploadCloud },
    { name: "Performance", path: "/dev/performance", icon: BarChart2 },
  ];

  return (
    <>
      <style>{`
        /* Keeps the sidebar scrollbar minimal so it looks clean */
        .sidebar-scroll::-webkit-scrollbar { width: 4px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
      
      {/* THE FIX: h-full ensures the sidebar fills out the sticky container perfectly! */}
      <div className="w-full bg-white rounded-[24px] shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden">
        
        <div className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto sidebar-scroll">
          {navLinks.map((link) => {
            const isActive = location.pathname.includes(link.path);
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                to={link.path}
                className={`flex items-center px-4 py-3 rounded-xl text-[14px] font-semibold transition-all ${
                  isActive 
                    ? 'bg-blue-50/50 text-[#007BFF]' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-navy'
                }`}
              >
                <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-[#007BFF]' : 'text-gray-400'}`} />
                {link.name}
              </Link>
            );
          })}
        </div>

        <div className="p-6 border-t border-gray-50 flex-shrink-0">
          <Link 
            to="/dev/settings" 
            className={`flex items-center px-4 py-3 rounded-xl text-[14px] font-semibold transition-all ${
              location.pathname.includes('/dev/settings') 
                ? 'bg-blue-50/50 text-[#007BFF]' 
                : 'text-gray-500 hover:bg-gray-50 hover:text-navy'
            }`}
          >
            <Settings className={`w-5 h-5 mr-3 ${location.pathname.includes('/dev/settings') ? 'text-[#007BFF]' : 'text-gray-400'}`} />
            Settings
          </Link>
        </div>
        
      </div>
    </>
  );
}