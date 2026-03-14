import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Bell, ChevronDown, User, LogOut, Loader2, X } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import logoDark from '../../assets/logo-dark.png';

export default function BATopBar() {
  const { currentUser, userData, logout } = useAuth();
  const navigate = useNavigate();
  
  // Dropdown States
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  
  // Notification States
  const [notifications, setNotifications] = useState([]);
  const [hasNewNotifications, setHasNewNotifications] = useState(false); 
  
  // Refs to handle clicking outside to close boxes
  const profileRef = useRef(null);
  const notifRef = useRef(null);
  
  // Search States
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);

  // --- FETCH NOTIFICATIONS ---
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!currentUser?.uid || userData?.notifications?.inApp === false) {
        setHasNewNotifications(false);
        setNotifications([]);
        return;
      }

      try {
        // We can reuse the same notification endpoint since it searches by UID
        const response = await fetch(`http://localhost:5000/api/client/notifications?uid=${currentUser.uid}`);
        const data = await response.json();
        if (data.success) {
          setNotifications(data.data);
          setHasNewNotifications(data.unreadCount > 0);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };
    
    fetchNotifications();
  }, [currentUser, userData?.notifications?.inApp]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getInitials = (name) => {
    if (!name || name === "Loading...") return "BA";
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

  // --- BA SPECIFIC SEARCH ---
  const handleSearch = async (e) => {
    if (e.key === 'Enter' && searchTerm.trim() !== "") {
      setIsSearching(true);
      try {
        // Hits the new BA search endpoint
        const response = await fetch(`http://localhost:5000/api/ba/search?q=${searchTerm}`);
        const data = await response.json();
        if (data.success) setSearchResults(data.data);
      } catch (error) {
        console.error("Error communicating with backend:", error);
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handleBellClick = async () => {
    setIsNotifOpen(!isNotifOpen);
    setIsProfileOpen(false);
    
    if (hasNewNotifications) {
      setHasNewNotifications(false);
      try {
        await fetch('http://localhost:5000/api/client/notifications/read', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json'},
          body: JSON.stringify({ uid: currentUser.uid })
        });
        setNotifications(prev => prev.map(n => ({...n, isRead: true})));
      } catch (error) {
        console.error("Failed to mark notifications read", error);
      }
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 h-20 flex items-center justify-between px-6">
      
      <div className="flex-shrink-0 w-64">
        <Link to="/ba/dashboard">
          <img src={logoDark} alt="NexBA Logo" className="h-8 w-auto object-contain" />
        </Link>
      </div>

      {/* SEARCH BAR (BA Specific Placeholder) */}
      <div className="flex-1 max-w-2xl px-4 relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearch} 
            placeholder="Search requirements or tasks by ID..." 
            className="w-full bg-[#F7F9FC] text-navy placeholder-gray-400 pl-12 pr-10 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all border border-transparent focus:border-blue-100"
          />
          {isSearching && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary animate-spin" />
          )}
          {searchTerm && !isSearching && (
            <button 
              onClick={() => { setSearchTerm(''); setSearchResults(null); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* SEARCH RESULTS DROPDOWN */}
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
              <p className="text-sm text-gray-500 p-4 text-center">No results match your search.</p>
            ) : (
              searchResults.map((item, index) => (
                <div key={index} className="p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors mb-1 border border-transparent hover:border-gray-100 flex items-center justify-between group">
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center space-x-2">
                      {/* Distinguish between REQ and TASK in UI */}
                      <span className={`font-bold text-sm ${item.type === 'Task' ? 'text-purple-600' : 'text-primary'}`}>
                        {item.id}
                      </span>
                      <span className="text-xs text-gray-500 truncate">{item.title}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2.5 py-1 rounded-md font-bold flex-shrink-0 transition-colors ${
                    item.type === 'Task' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-primary'
                  }`}>
                    {item.status || item.type}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* RIGHT CONTROLS */}
      <div className="flex items-center space-x-6 flex-shrink-0">
        
        {/* NOTIFICATION BELL */}
        <div className="relative" ref={notifRef}>
          <button 
            className={`relative p-2 text-gray-500 hover:text-navy transition-colors rounded-full ${isNotifOpen ? 'bg-blue-50 text-primary' : 'hover:bg-gray-50'}`}
            onClick={handleBellClick}
          >
            <Bell className="w-6 h-6" />
            {hasNewNotifications && (
              <span className="absolute top-1.5 right-1.5 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                <p className="font-bold text-navy text-sm">Notifications</p>
                {userData?.notifications?.inApp === false && (
                  <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold">Disabled</span>
                )}
              </div>
              
              <div className="max-h-80 overflow-y-auto">
                {userData?.notifications?.inApp === false ? (
                  <div className="p-6 text-center">
                    <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">In-app notifications are disabled.</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <p className="text-sm text-gray-500 p-6 text-center">You have no notifications.</p>
                ) : (
                  notifications.map(notif => (
                    <div key={notif.id} className={`px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${notif.isRead ? 'opacity-70' : 'bg-blue-50/20'}`}>
                      <p className="text-sm font-bold text-navy">{notif.title}</p>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">{notif.message}</p>
                      <p className="text-[10px] text-gray-400 mt-2 font-medium">{notif.time}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* USER PROFILE DROPDOWN (BA Specific Links) */}
        <div className="relative" ref={profileRef}>
          <button 
            onClick={() => {
              setIsProfileOpen(!isProfileOpen);
              setIsNotifOpen(false); 
            }}
            className="flex items-center space-x-3 focus:outline-none group"
          >
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:shadow-md transition-shadow overflow-hidden ring-2 ring-white">
              {userData?.profileImage ? (
                <img src={userData.profileImage} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                getInitials(userData?.fullName)
              )}
            </div>

            <div className="hidden md:flex items-center space-x-1">
              <span className="text-sm font-semibold text-navy">
                {userData?.fullName || "Loading..."}
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
                {/* BA-SPECIFIC SETTINGS LINK */}
                <Link 
                  to="/ba/settings" 
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