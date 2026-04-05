import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Search, Bell, ChevronDown, User, LogOut, Loader2, X, Menu, LayoutGrid, ListTodo, MessageSquare, UploadCloud, BarChart2, CheckCircle2, Settings } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../firebase"; 
import { collection, query, where, onSnapshot, writeBatch, doc } from "firebase/firestore";
import logoDark from '../../assets/logo-dark.png';

export default function DevTopBar() {
  const { currentUser, userData, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Profile Dropdown
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Notification Dropdown
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);
  
  // Search State
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);

  const navLinks = [
    { name: "Dashboard", path: "/dev/dashboard", icon: LayoutGrid },
    { name: "My Tasks", path: "/dev/tasks", icon: ListTodo },
    { name: "Submit Evidence", path: "/dev/evidence", icon: UploadCloud },
    { name: "Communication Hub", path: "/dev/communication", icon: MessageSquare },
    { name: "Performance", path: "/dev/performance", icon: BarChart2 },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) setIsProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target)) setIsNotificationsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- INDEX-FREE REAL-TIME NOTIFICATIONS ---
  useEffect(() => {
    if (!currentUser?.uid) return;

    if (userData?.notifications?.inApp === false) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotifs = [];
      let unread = 0;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        
        let timeString = "Just now";
        let rawTime = 0;
        
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          const date = data.createdAt.toDate();
          rawTime = date.getTime();
          timeString = date.toLocaleDateString() + " " + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }

        fetchedNotifs.push({
          id: docSnap.id,
          title: data.title,
          message: data.message,
          isRead: data.isRead === true,
          time: timeString,
          rawTime: rawTime,
          link: data.link || '#'
        });

        if (data.isRead === false) unread++;
      });

      // Sort natively in JavaScript
      fetchedNotifs.sort((a, b) => b.rawTime - a.rawTime);

      setNotifications(fetchedNotifs);
      setUnreadCount(unread);
    }, (error) => {
      console.error("Error fetching real-time notifications:", error);
    });

    return () => unsubscribe();
  }, [currentUser, userData?.notifications?.inApp]);

  const handleMarkAllRead = async () => {
    try {
      const batch = writeBatch(db);
      
      notifications.forEach(notif => {
        if (!notif.isRead) {
          const notifRefDoc = doc(db, "notifications", notif.id);
          batch.update(notifRefDoc, { isRead: true });
        }
      });

      setUnreadCount(0);
      await batch.commit();

    } catch (error) {
      console.error("Failed to mark as read", error);
    }
  };

  const getInitials = (name) => {
    if (!name) return "DV";
    const parts = name.split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  const handleSearch = async (e) => {
    if (e.key === 'Enter' && searchTerm.trim() !== "") {
      setIsSearching(true);
      try {
        const response = await fetch(`http://localhost:5000/api/dev/search?q=${searchTerm}&uid=${currentUser.uid}`);
        const data = await response.json();
        if (data.success) setSearchResults(data.data);
      } catch (error) {
        console.error("Error communicating with backend:", error);
      } finally {
        setIsSearching(false);
      }
    }
  };

  const notificationsDisabled = userData?.notifications?.inApp === false;

  return (
    <>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>

      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 h-20 flex items-center justify-between px-4 md:px-6">
        
        <div className="flex items-center flex-shrink-0 w-auto md:w-64">
          <button onClick={() => setIsMobileMenuOpen(true)} className="mr-3 p-2 text-gray-500 hover:bg-gray-50 rounded-lg lg:hidden">
            <Menu className="w-6 h-6" />
          </button>
          <Link to="/dev/dashboard">
            <img src={logoDark} alt="NexBA Logo" className="h-7 md:h-8 w-auto object-contain" />
          </Link>
        </div>

        <div className="hidden md:flex flex-1 max-w-2xl px-4 relative">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearch} 
              placeholder="Search requirements..." 
              className="w-full bg-[#F7F9FC] text-navy placeholder-gray-400 pl-12 pr-10 py-3 rounded-xl outline-none focus:ring-2 focus:ring-[#007BFF]/20 focus:bg-white transition-all border border-transparent focus:border-blue-100"
            />
            {isSearching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#007BFF] animate-spin" />}
            {searchTerm && !isSearching && (
              <button onClick={() => { setSearchTerm(''); setSearchResults(null); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {searchResults && (
            <div className="absolute top-full left-4 right-4 mt-2 bg-white border border-gray-100 rounded-xl shadow-lg p-2 z-50 max-h-80 overflow-y-auto">
              <div className="flex justify-between items-center px-3 py-2 border-b border-gray-50 mb-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  {searchResults.length} Result{searchResults.length !== 1 && 's'} Found
                </span>
                <button onClick={() => setSearchResults(null)} className="text-xs text-red-500 hover:underline font-semibold">Close</button>
              </div>
              
              {searchResults.length === 0 ? (
                <p className="text-sm text-gray-500 p-4 text-center">No results match your search.</p>
              ) : (
                searchResults.map((item, index) => (
                  <div key={index} className="p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors mb-1 border border-transparent hover:border-gray-100 flex items-center justify-between group">
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center space-x-2">
                        <span className={`font-bold text-sm ${item.type === 'Task' ? 'text-purple-600' : 'text-[#007BFF]'}`}>{item.id}</span>
                        <span className="text-xs text-gray-500 truncate">{item.title}</span>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2.5 py-1 rounded-md font-bold flex-shrink-0 transition-colors ${item.type === 'Task' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-[#007BFF]'}`}>
                      {item.status || item.type}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2 md:space-x-6 flex-shrink-0">
          
          <div className="relative" ref={notifRef}>
            <button 
              onClick={() => { setIsNotificationsOpen(!isNotificationsOpen); setIsProfileOpen(false); }} 
              className={`relative p-2.5 text-gray-500 hover:text-navy transition-colors rounded-full focus:outline-none ${isNotificationsOpen ? 'bg-blue-50 text-primary' : 'hover:bg-gray-50'}`}
            >
              <Bell className="w-5 h-5 md:w-6 md:h-6" />
              {!notificationsDisabled && unreadCount > 0 && (
                <span className="absolute top-2 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 py-1 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-5 py-3 border-b border-gray-50 flex justify-between items-center">
                  <h3 className="text-[14px] font-bold text-navy">Notifications</h3>
                  {!notificationsDisabled && unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="text-[11px] text-[#007BFF] hover:underline font-bold transition-all active:scale-95">
                      Mark all as read
                    </button>
                  )}
                </div>
                
                <div className="max-h-72 overflow-y-auto custom-scrollbar">
                  {notificationsDisabled ? (
                    <div className="p-8 flex flex-col items-center justify-center text-center">
                      <Bell className="w-10 h-10 text-gray-200 mb-3 opacity-50" />
                      <p className="text-[13px] font-bold text-gray-400">Notifications are disabled</p>
                      <p className="text-[11px] text-gray-400 mt-1">Enable them in Profile & Settings</p>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-6 flex flex-col items-center justify-center text-center">
                      <CheckCircle2 className="w-10 h-10 text-gray-200 mb-2" />
                      <p className="text-[13px] font-bold text-gray-400">All caught up!</p>
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <Link 
                        key={notif.id} 
                        to={notif.link !== '#' ? notif.link : '#'}
                        onClick={() => setIsNotificationsOpen(false)}
                        className={`block p-4 border-b border-gray-50/50 hover:bg-gray-50 transition-colors ${!notif.isRead ? 'bg-blue-50/30' : ''}`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <p className={`text-[13px] font-bold ${!notif.isRead ? 'text-navy' : 'text-gray-600'}`}>{notif.title}</p>
                          {!notif.isRead && <div className="w-2 h-2 bg-[#007BFF] rounded-full mt-1.5 flex-shrink-0"></div>}
                        </div>
                        <p className="text-[12px] text-gray-500 line-clamp-2 leading-relaxed">{notif.message}</p>
                        <p className="text-[10px] font-semibold text-gray-400 mt-2 uppercase tracking-wide">{notif.time}</p>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={profileRef}>
            <button 
              onClick={() => { setIsProfileOpen(!isProfileOpen); setIsNotificationsOpen(false); }}
              className="flex items-center space-x-2 md:space-x-3 focus:outline-none group"
            >
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#007BFF] flex items-center justify-center text-white font-bold text-xs md:text-sm shadow-sm group-hover:shadow-md transition-shadow overflow-hidden ring-2 ring-white">
                {userData?.profileImage ? (
                  <img src={userData?.profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  getInitials(userData?.fullName)
                )}
              </div>
              <div className="hidden md:flex items-center space-x-1">
                <span className="text-[14px] font-semibold text-navy">{userData?.fullName || "Developer"}</span>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isProfileOpen ? "rotate-180" : ""}`} />
              </div>
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-3 w-64 bg-white rounded-[20px] shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-5 py-4 border-b border-gray-50">
                  <p className="text-[15px] font-bold text-navy truncate">{userData?.fullName || "Developer"}</p>
                  <p className="text-[13px] text-gray-500 truncate mt-0.5">{userData?.email || currentUser?.email}</p>
                </div>
                
                <div className="py-2 px-2">
                  <Link to="/dev/settings" className="w-full flex items-center px-4 py-2.5 text-[14px] font-medium text-navy hover:bg-gray-50 rounded-xl transition-colors text-left" onClick={() => setIsProfileOpen(false)}>
                    <User className="w-4 h-4 mr-3 text-gray-400" /> Profile & Settings
                  </Link>
                  <button onClick={handleLogout} className="w-full flex items-center px-4 py-2.5 text-[14px] font-medium text-red-500 hover:bg-red-50 rounded-xl transition-colors text-left">
                    <LogOut className="w-4 h-4 mr-3" /> Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-navy/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="relative w-72 max-w-[80vw] bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="p-6 flex justify-between items-center border-b border-gray-50">
              <img src={logoDark} alt="NexBA Logo" className="h-6 w-auto object-contain" />
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg bg-gray-50"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
              <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Menu</p>
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                const Icon = link.icon;
                return (
                  <Link key={link.name} to={link.path} onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive ? 'bg-blue-50 text-primary' : 'text-gray-500 hover:bg-gray-50 hover:text-navy'}`}>
                    <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-primary' : 'text-gray-400'}`} />{link.name}
                  </Link>
                );
              })}
            </div>
            <div className="p-6 border-t border-gray-50">
              <Link to="/dev/settings" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-4 py-3 text-gray-500 hover:text-navy text-sm font-semibold mb-2 rounded-xl hover:bg-gray-50">
                <Settings className="w-5 h-5 mr-3 text-gray-400" /> Settings
              </Link>
              <button onClick={handleLogout} className="w-full flex items-center px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl text-sm font-semibold transition-colors">
                <LogOut className="w-5 h-5 mr-3" /> Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}