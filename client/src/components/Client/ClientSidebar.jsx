import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  FileText, 
  MessageSquare, 
  CheckSquare, 
  MessageCircle, 
  Archive, 
  Settings 
} from "lucide-react";

export default function ClientSidebar() {
  const location = useLocation(); 
  
  const [stats, setStats] = useState({ 
    pendingClarifications: 0, 
    pendingApprovals: 0, 
    unreadMessages: 0 
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/sidebar-stats");
        const data = await response.json();
        if (data.success) {
          setStats(data.stats);
        }
      } catch (error) {
        console.error("Failed to load sidebar stats:", error);
      }
    };
    fetchStats();
  }, []);

  
  const menuItems = [
    { name: "Overview", path: "/client/overview", icon: LayoutDashboard },
    { name: "My Requests", path: "/client/requests", icon: FileText },
    { name: "Clarifications", path: "/client/clarifications", icon: MessageSquare, badge: stats.pendingClarifications },
    { name: "Approvals", path: "/client/approvals", icon: CheckSquare, badge: stats.pendingApprovals },
    { name: "Messages", path: "/client/messages", icon: MessageCircle, badge: stats.unreadMessages },
    { name: "Archive", path: "/client/archive", icon: Archive },
  ];

  return (
    <div className="w-64 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col h-[calc(100vh-7rem)] sticky top-24 overflow-hidden">
      
      <div className="flex-1 py-8 px-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.name}
              to={item.path}
             
              className={`flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-200 group ${
                isActive 
                  ? "bg-blue-50 text-primary font-semibold" 
                  : "text-gray-500 hover:bg-blue-50 hover:text-primary font-medium"
              }`}
            >
              <div className="flex items-center space-x-4">
                
                <item.icon className={`w-5 h-5 transition-colors ${
                  isActive ? "text-primary" : "text-gray-400 group-hover:text-primary"
                }`} />
                <span className="text-sm">{item.name}</span>
              </div>

              <div className="flex items-center space-x-2">
                {item.badge > 0 && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors ${
                    isActive ? "bg-white text-primary" : "bg-red-50 text-red-500 group-hover:bg-white group-hover:text-red-600"
                  }`}>
                    {item.badge}
                  </span>
                )}
                
                {isActive && (
                  <div className="w-2 h-2 rounded-full bg-primary shadow-sm" />
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-gray-50">
        <Link
          to="/client/settings"
          className={`flex items-center px-4 py-3 rounded-2xl transition-all duration-200 group ${
            location.pathname === "/client/settings" 
              ? "bg-blue-50 text-primary font-semibold" 
              : "text-gray-500 hover:bg-blue-50 hover:text-primary font-medium"
          }`}
        >
          
          <Settings className={`w-5 h-5 mr-4 transition-colors ${
            location.pathname === "/client/settings" ? "text-primary" : "text-gray-400 group-hover:text-primary"
          }`} />
          <span className="text-sm">Settings</span>
        </Link>
      </div>

    </div>
  );
}