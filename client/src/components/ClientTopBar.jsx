import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Bell, ChevronDown, User, LogOut, Loader2, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import logoDark from '../assets/logo-dark.png';

export default function ClientTopBar() {
  const { userData, logout } = useAuth();
  const navigate = useNavigate();
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [hasNewNotifications, setHasNewNotifications] = useState(false); 
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);

  useEffect(() => {
    const checkNotifications = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/notifications/unread");
        const data = await response.json();
        if (data.success && data.count > 0) {
          setHasNewNotifications(true);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };
    checkNotifications();
  }, []);

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  // --- UPDATED SEARCH LOGIC ---
  const handleSearch = async (e) => {
    if (e.key === 'Enter' && searchTerm.trim() !== "") {
      setIsSearching(true);
      try {
        // 1. Fixed the URL to match our new backend route
        const response = await fetch(`http://localhost:5000/api/client/search?q=${searchTerm}`);
        const data = await response.json();
        
        if (data.success) {
          // 2. Fixed the data mapping (data.data instead of data.results)
          setSearchResults(data.data);
        }
      } catch (error) {
        console.error("Error communicating with backend:", error);
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handleBellClick = () => {
    setHasNewNotifications(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 h-20 flex items-center justify-between px-6">
      
      <div className="flex-shrink-0 w-64">
        <Link to="/dashboard">
          <img src={logoDark} alt="NexBA Logo" className="h-8 w-auto object-contain" />
        </Link>
      </div>

      {/* SEARCH BAR */}
      <div className="flex-1 max-w-2xl px-4 relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearch} 
            placeholder="Search by ID (e.g., 1004) or Title and press Enter..." 
            className="w-full bg-[#F7F9FC] text-navy placeholder-gray-400 pl-12 pr-10 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all border border-transparent focus:border-blue-100"
          />
          {isSearching && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary animate-spin" />
          )}
          
          {/* Quick Clear Button when typing */}
          {searchTerm && !isSearching && (
            <button 
              onClick={() => { setSearchTerm(''); setSearchResults(null); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* DROPDOWN RESULTS */}
        {searchResults && (
          <div className="absolute top-full left-4 right-4 mt-2 bg-white border border-gray-100 rounded-xl shadow-lg p-2 z-50 max-h-80 overflow-y-auto">
            <div className="flex justify-between items-center px-3 py-2 border-b border-gray-50 mb-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                {searchResults.length} Result{searchResults.length !== 1 && 's'} Found
              </span>
              <button onClick={() => setSearchResults(null)} className="text-xs text-red-500 hover:underline font-semibold">
                Close
              </button>
            </div>
            
            {searchResults.length === 0 ? (
              <p className="text-sm text-gray-500 p-4 text-center">No requirements match your search.</p>
            ) : (
              searchResults.map((req, index) => (
                <div key={index} className="p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors mb-1 border border-transparent hover:border-gray-100 flex items-center justify-between group">
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-primary">{req.id}</span>
                      <span className="text-xs text-gray-500 truncate">{req.title}</span>
                    </div>
                  </div>
                  <span className="text-[10px] bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md font-bold flex-shrink-0 group-hover:bg-blue-50 group-hover:text-primary transition-colors">
                    {req.status}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* RIGHT CONTROLS */}
      <div className="flex items-center space-x-6 flex-shrink-0">
        
        <button 
          className="relative text-gray-500 hover:text-navy transition-colors"
          onClick={handleBellClick}
        >
          <Bell className="w-6 h-6" />
          {hasNewNotifications && (
            <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>
          )}
        </button>

        <div className="relative">
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center space-x-3 focus:outline-none group"
          >
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:shadow-md transition-shadow">
              {getInitials(userData?.fullName)}
            </div>
            <div className="hidden md:flex items-center space-x-1">
              <span className="text-sm font-semibold text-navy">
                {userData?.fullName || "Client User"}
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isProfileOpen ? "rotate-180" : ""}`} />
            </div>
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
              <div className="px-5 py-3 border-b border-gray-50">
                <p className="text-sm font-bold text-navy truncate">{userData?.fullName}</p>
                <p className="text-xs text-gray-500 truncate mt-0.5">{userData?.email}</p>
              </div>
              <div className="py-2">
                <Link 
                  to="/dashboard/settings" 
                  className="flex items-center px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => setIsProfileOpen(false)}
                >
                  <User className="w-4 h-4 mr-3 text-gray-400" />
                  Profile & Settings
                </Link>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center px-5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4 mr-3 text-red-500" />
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}