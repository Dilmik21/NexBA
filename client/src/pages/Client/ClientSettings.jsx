import { useState, useEffect, useRef } from "react";
import ClientTopBar from "../../components/Client/ClientTopBar";
import ClientSidebar from "../../components/Client/ClientSidebar";
import { Camera, Trash2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

export default function ClientSettings() {
  // NEW: We grab `refreshUserData` from the global context
  const { currentUser, refreshUserData } = useAuth(); 
  const [activeTab, setActiveTab] = useState("General");
  const [isLoading, setIsLoading] = useState(true);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [role, setRole] = useState("Client");
  
  const [profileImage, setProfileImage] = useState(null);
  const fileInputRef = useRef(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [notifications, setNotifications] = useState({
    email: true,
    inApp: true,
    weeklyDigest: false
  });

  useEffect(() => {
    if (currentUser?.uid) {
      fetchSettings();
    }
  }, [currentUser]);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/client/settings?uid=${currentUser.uid}`);
      const data = await response.json();
      
      if (data.success) {
        setFullName(data.data.fullName || "");
        setEmail(data.data.email || currentUser.email || "");
        setOrganization(data.data.organization || "");
        setRole(data.data.role || "Client");
        setProfileImage(data.data.profileImage || null);
        if (data.data.notifications) {
          setNotifications(data.data.notifications);
        }
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.src = reader.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 250;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          setProfileImage(compressedBase64);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveGeneral = async (e) => {
    e.preventDefault();
    if (!currentUser?.uid) return;

    try {
      const response = await fetch("http://localhost:5000/api/client/settings/general", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          uid: currentUser.uid, 
          fullName, 
          email, 
          organization,
          profileImage 
        })
      });
      
      if (response.status === 413) {
        alert("Error: That photo file is too large to save. Please choose a smaller image.");
        return;
      }

      const data = await response.json();
      if (data.success) {
        alert("Profile and Image updated successfully!");
        
        // NEW: This tells the AuthContext to fetch the fresh data from the DB. 
        // Instantly updates the TopBar and everywhere else!
        await refreshUserData();
        
      } else {
        alert("Failed to save: " + data.message);
      }
    } catch (error) {
      console.error("Error saving profile:", error);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!currentUser?.uid) return;
    if (newPassword !== confirmPassword) {
      alert("New passwords do not match!");
      return;
    }
    setIsUpdatingPassword(true);
    try {
      const response = await fetch("http://localhost:5000/api/client/settings/security", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: currentUser.uid, currentPassword, newPassword })
      });
      const data = await response.json();
      if (data.success) {
        alert("Password securely updated!");
        setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      } else {
        alert("Error: " + data.message); 
      }
    } catch (error) {
      console.error("Error updating password:", error);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleToggleNotification = async (key) => {
    if (!currentUser?.uid) return;
    const newValue = !notifications[key];
    setNotifications({ ...notifications, [key]: newValue });
    try {
      await fetch("http://localhost:5000/api/client/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: currentUser.uid, key, value: newValue })
      });
    } catch (error) {
      setNotifications({ ...notifications, [key]: !newValue });
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <ClientTopBar />

      <div className="flex max-w-[1600px] mx-auto pt-6 px-6 gap-8">
        <div className="hidden lg:block w-64 flex-shrink-0">
          <ClientSidebar />
        </div>

        <div className="flex-1 pb-10 flex flex-col h-[calc(100vh-100px)]">
          <div className="mb-6 flex-shrink-0">
            <h1 className="text-2xl font-bold text-navy">Profile & Settings</h1>
          </div>

          <div className="bg-white border border-gray-100 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-1 min-h-0 overflow-hidden">
            
            <div className="w-64 border-r border-gray-100 bg-white py-6">
              <nav className="flex flex-col space-y-1">
                {["General", "Security", "Notifications"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`text-left px-8 py-4 font-semibold text-sm transition-all border-l-4 ${
                      activeTab === tab 
                        ? "border-primary bg-blue-50 text-primary" 
                        : "border-transparent text-gray-500 hover:bg-gray-50 hover:text-navy"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </nav>
            </div>

            <div className="flex-1 overflow-y-auto p-12">
              {isLoading ? (
                <div className="flex items-center justify-center h-full text-gray-400">Loading settings...</div>
              ) : (
                <>
                  {activeTab === "General" && (
                    <div className="max-w-2xl animate-in fade-in duration-300">
                      
                      <div className="flex items-center space-x-5 mb-10">
                        <div className="relative">
                          <div className="w-20 h-20 bg-[#0A66C2] rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-md overflow-hidden">
                            {profileImage ? (
                              <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                              getInitials(fullName)
                            )}
                          </div>
                          
                          <input 
                            type="file" 
                            accept="image/*"
                            ref={fileInputRef} 
                            onChange={handleImageChange} 
                            className="hidden" 
                          />
                          <button 
                            type="button"
                            onClick={() => fileInputRef.current.click()}
                            className="absolute bottom-0 right-0 bg-gray-50 p-1.5 rounded-full border border-gray-200 text-gray-500 hover:text-primary transition-colors shadow-sm"
                          >
                            <Camera className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div>
                          <h2 className="text-lg font-bold text-navy">{fullName || "New User"}</h2>
                          <p className="text-sm text-gray-500 mb-2">{email || "Email not set"}</p>
                          {profileImage && (
                            <button 
                              type="button"
                              onClick={() => setProfileImage(null)}
                              className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove Photo
                            </button>
                          )}
                        </div>
                      </div>

                      <form onSubmit={handleSaveGeneral} className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <label className="block text-xs font-bold text-gray-400 mb-2">Full Name</label>
                            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-navy font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-400 mb-2">Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-navy font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-400 mb-2">Organization</label>
                            <input type="text" value={organization} onChange={(e) => setOrganization(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-navy font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-400 mb-2">Role</label>
                            <input type="text" value={role} disabled className="w-full px-4 py-3 rounded-xl border border-transparent bg-gray-50 text-gray-500 font-medium cursor-not-allowed" />
                          </div>
                        </div>
                        <button type="submit" className="bg-[#0A66C2] hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md mt-4">Save Changes</button>
                      </form>
                    </div>
                  )}

                  {activeTab === "Security" && (
                    <div className="max-w-xl animate-in fade-in duration-300">
                      <h2 className="text-lg font-bold text-navy mb-8">Change Password</h2>
                      <form onSubmit={handleUpdatePassword} className="space-y-6">
                        <div>
                          <label className="block text-xs font-bold text-gray-400 mb-2">Current Password</label>
                          <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-navy outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-400 mb-2">New Password</label>
                          <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-navy outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-400 mb-2">Confirm New Password</label>
                          <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-navy outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                        </div>
                        <button type="submit" disabled={isUpdatingPassword} className="bg-[#0A66C2] hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md mt-4 disabled:opacity-50">
                          {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                        </button>
                      </form>
                    </div>
                  )}

                  {activeTab === "Notifications" && (
                    <div className="max-w-2xl animate-in fade-in duration-300">
                      <div className="space-y-8">
                        <div className="flex items-center justify-between pb-8 border-b border-gray-100">
                          <div>
                            <h3 className="font-bold text-navy text-sm">Email Notifications</h3>
                            <p className="text-xs text-gray-500 mt-1">Receive updates via email</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={notifications.email} onChange={() => handleToggleNotification('email')} />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0A66C2]"></div>
                          </label>
                        </div>
                        <div className="flex items-center justify-between pb-8 border-b border-gray-100">
                          <div>
                            <h3 className="font-bold text-navy text-sm">In-App Notifications</h3>
                            <p className="text-xs text-gray-500 mt-1">Show notifications within the application</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={notifications.inApp} onChange={() => handleToggleNotification('inApp')} />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0A66C2]"></div>
                          </label>
                        </div>
                        <div className="flex items-center justify-between pb-8">
                          <div>
                            <h3 className="font-bold text-navy text-sm">Weekly Digest</h3>
                            <p className="text-xs text-gray-500 mt-1">Receive a weekly summary of activity</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={notifications.weeklyDigest} onChange={() => handleToggleNotification('weeklyDigest')} />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0A66C2]"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                </>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}