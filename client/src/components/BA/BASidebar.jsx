import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Inbox, 
  Cpu, 
  ListTodo, 
  GitPullRequest, 
  CheckSquare, 
  MessageSquare, 
  BarChart2, 
  Settings 
} from "lucide-react";

export default function BASidebar() {
  const location = useLocation();

  const navItems = [
    { name: "Dashboard", path: "/ba/dashboard", icon: LayoutDashboard },
    { name: "Requirement Inbox", path: "/ba/inbox", icon: Inbox },
    { name: "AI Analysis", path: "/ba/analysis", icon: Cpu },
    { name: "Task & Assignment", path: "/ba/tasks", icon: ListTodo },
    { name: "Change Management", path: "/ba/changes", icon: GitPullRequest },
    { name: "Verification Queue", path: "/ba/verification", icon: CheckSquare },
    { name: "Communication Hub", path: "/ba/communication", icon: MessageSquare },
    { name: "Progress & Reports", path: "/ba/reports", icon: BarChart2 },
  ];

  return (
    <div className="w-64 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col h-[calc(100vh-7rem)] sticky top-24 overflow-hidden">
      
      <div className="flex-1 py-8 px-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          // Using includes() here is helpful for BA if you add sub-pages later (like /ba/inbox/REQ-1001)
          const isActive = location.pathname.includes(item.path);

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
                {/* Active dot indicator */}
                {isActive && (
                  <div className="w-2 h-2 rounded-full bg-primary shadow-sm" />
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Settings Area */}
      <div className="p-4 border-t border-gray-50">
        <Link
          to="/ba/settings"
          className={`flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-200 group ${
            location.pathname.includes("/ba/settings")
              ? "bg-blue-50 text-primary font-semibold" 
              : "text-gray-500 hover:bg-blue-50 hover:text-primary font-medium"
          }`}
        >
          <div className="flex items-center space-x-4">
            <Settings className={`w-5 h-5 transition-colors ${
              location.pathname.includes("/ba/settings") ? "text-primary" : "text-gray-400 group-hover:text-primary"
            }`} />
            <span className="text-sm">Settings</span>
          </div>

          {location.pathname.includes("/ba/settings") && (
            <div className="w-2 h-2 rounded-full bg-primary shadow-sm" />
          )}
        </Link>
      </div>

    </div>
  );
}