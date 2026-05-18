import { useState, useEffect, useRef } from "react";
import BATopBar from "../../components/BA/BATopBar";
import BASidebar from "../../components/BA/BASidebar";
import { useAuth } from "../../contexts/AuthContext";
import { Camera, Loader2 } from "lucide-react";
import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";

export default function BASettings() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("General"); 
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  
  const [profileData, setProfileData] = useState({
    fullName: currentUser?.displayName || "",
    email: currentUser?.email || "",
    organization: "",
    role: "Business Analyst",
    profileImage: currentUser?.photoURL || null
  });

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [notifications, setNotifications] = useState({
    email: true,
    inApp: true,
    weeklyDigest: false
  });

  // Fetch the rest of the database info silently in the background!
  useEffect(() => {
    if (currentUser?.uid) fetchSettings();
  }, [currentUser]);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/ba/settings?uid=${currentUser.uid}`);
      const json = await res.json();
      if (json.success && json.data) {
        setProfileData(prev => ({
          ...prev,
          fullName: json.data.fullName || prev.fullName,
          organization: json.data.organization || prev.organization,
          profileImage: json.data.profileImage || prev.profileImage
        }));
        if (json.data.notifications) setNotifications(json.data.notifications);
      }
    } catch (error) {
      console.error("Failed to fetch settings silently");
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData(prev => ({ ...prev, profileImage: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setProfileData(prev => ({ ...prev, profileImage: null }));
  };

  const handleGeneralSave = async () => {
    setIsSaving(true);
    try {
      await fetch(`http://localhost:5000/api/ba/settings/general?uid=${currentUser.uid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData)
      });
      alert("General settings updated successfully!");
      
      window.dispatchEvent(new CustomEvent("profileUpdated", {
        detail: { profileImage: profileData.profileImage, fullName: profileData.fullName }
      }));
    } catch (error) {
      alert("Failed to update settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSave = async () => {
    if (!passwords.currentPassword) {
      return alert("Please enter your current password.");
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      return alert("New passwords do not match!");
    }
    if (passwords.newPassword.length < 6) {
      return alert("Password must be at least 6 characters long.");
    }
    
    setIsSaving(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (user && user.email) {
        const credential = EmailAuthProvider.credential(user.email, passwords.currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, passwords.newPassword);
        
        alert("Password updated successfully!");
        setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" }); 
      }
    } catch (error) {
      console.error("Password update error:", error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        alert("Incorrect current password. Please try again.");
      } else {
        alert("Failed to update password: " + error.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleNotification = async (key) => {
    const newValue = !notifications[key];
    setNotifications(prev => ({ ...prev, [key]: newValue }));
    try {
      await fetch(`http://localhost:5000/api/ba/settings/notifications?uid=${currentUser.uid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: newValue })
      });
    } catch (error) {
      setNotifications(prev => ({ ...prev, [key]: !newValue }));
    }
  };

  const getInitials = (name) => {
    if (!name) return "BA";
    const parts = name.split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <BATopBar />

      <div className="flex max-w-[1600px] mx-auto pt-6 px-4 md:px-6 gap-8 pb-10">
        <div className="hidden lg:block flex-shrink-0">
          <BASidebar />
        </div>

        <div className="flex-1 flex flex-col h-full">
          <h1 className="text-[22px] font-bold text-navy mb-6">Profile & Settings</h1>

          <div className="bg-white border border-gray-100 rounded-[24px] shadow-sm flex flex-col md:flex-row min-h-[600px] overflow-hidden">
            
            <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-gray-50 py-8 flex flex-col">
              <button
                onClick={() => setActiveTab("General")}
                className={`w-full text-left px-8 py-3 text-[14px] transition-colors ${
                  activeTab === "General" ? "border-l-[3px] border-[#007BFF] text-[#007BFF] font-bold" : "border-l-[3px] border-transparent text-gray-500 hover:text-navy font-medium"
                }`}
              >
                General
              </button>
              <button
                onClick={() => setActiveTab("Security")}
                className={`w-full text-left px-8 py-3 text-[14px] transition-colors mt-2 ${
                  activeTab === "Security" ? "border-l-[3px] border-[#007BFF] text-[#007BFF] font-bold" : "border-l-[3px] border-transparent text-gray-500 hover:text-navy font-medium"
                }`}
              >
                Security
              </button>
              <button
                onClick={() => setActiveTab("Notifications")}
                className={`w-full text-left px-8 py-3 text-[14px] transition-colors mt-2 ${
                  activeTab === "Notifications" ? "border-l-[3px] border-[#007BFF] text-[#007BFF] font-bold" : "border-l-[3px] border-transparent text-gray-500 hover:text-navy font-medium"
                }`}
              >
                Notifications
              </button>
            </div>

            <div className="flex-1 p-8 md:p-12">
              
              {/* GENERAL TAB */}
              {activeTab === "General" && (
                <div className="animate-in fade-in duration-300 max-w-3xl">
                  <div className="flex items-center gap-6 mb-10">
                    <div className="relative flex-shrink-0">
                      <div className="w-[88px] h-[88px] rounded-full bg-[#007BFF] text-white flex items-center justify-center text-3xl font-bold overflow-hidden shadow-sm">
                        {profileData.profileImage ? (
                          <img src={profileData.profileImage} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          getInitials(profileData.fullName)
                        )}
                      </div>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 p-1.5 bg-white rounded-full shadow-md border border-gray-100 text-gray-500 hover:text-primary transition-colors"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                      <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                    </div>
                    
                    <div className="flex flex-col justify-center">
                      <h3 className="font-bold text-navy text-[18px]">{profileData.fullName || "Your Name"}</h3>
                      <p className="text-[14px] text-gray-500">{profileData.email}</p>
                      
                      {profileData.profileImage && (
                        <button 
                          onClick={handleRemovePhoto}
                          className="mt-1.5 text-[13px] font-bold text-gray-400 hover:text-red-500 text-left transition-colors w-max"
                        >
                          Remove Profile Photo
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-8">
                    <div>
                      <label className="block text-[13px] font-bold text-gray-500 mb-2">Full Name</label>
                      <input 
                        type="text" 
                        value={profileData.fullName}
                        onChange={(e) => setProfileData({...profileData, fullName: e.target.value})}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-[14px] text-navy focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-bold text-gray-500 mb-2">Email</label>
                      <input 
                        type="email" 
                        value={profileData.email}
                        onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-[14px] text-navy focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-bold text-gray-500 mb-2">Organization</label>
                      <input 
                        type="text" 
                        value={profileData.organization}
                        onChange={(e) => setProfileData({...profileData, organization: e.target.value})}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-[14px] text-navy focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-bold text-gray-500 mb-2">Role</label>
                      <input 
                        type="text" 
                        value={profileData.role}
                        disabled
                        className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-3.5 text-[14px] text-gray-500 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handleGeneralSave}
                    disabled={isSaving}
                    className="bg-[#007BFF] text-white px-8 py-3.5 rounded-xl text-sm font-bold flex items-center justify-center shadow-sm hover:bg-blue-600 transition-colors disabled:opacity-50 w-max mt-4"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Save Changes
                  </button>
                </div>
              )}

              {/* SECURITY TAB */}
              {activeTab === "Security" && (
                <div className="animate-in fade-in duration-300 max-w-md">
                  <div className="space-y-6 mb-8">
                    <div>
                      <label className="block text-[13px] font-bold text-gray-500 mb-2">Current Password</label>
                      <input 
                        type="password" 
                        placeholder="••••••••"
                        value={passwords.currentPassword}
                        onChange={(e) => setPasswords({...passwords, currentPassword: e.target.value})}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-[14px] text-navy focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-bold text-gray-500 mb-2">New Password</label>
                      <input 
                        type="password" 
                        placeholder="••••••••"
                        value={passwords.newPassword}
                        onChange={(e) => setPasswords({...passwords, newPassword: e.target.value})}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-[14px] text-navy focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-bold text-gray-500 mb-2">Confirm New Password</label>
                      <input 
                        type="password" 
                        placeholder="••••••••"
                        value={passwords.confirmPassword}
                        onChange={(e) => setPasswords({...passwords, confirmPassword: e.target.value})}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-[14px] text-navy focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handlePasswordSave}
                    disabled={isSaving || !passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword}
                    className="bg-[#007BFF] text-white px-8 py-3.5 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-600 transition-colors disabled:opacity-50 w-max"
                  >
                    {isSaving ? "Updating..." : "Update Password"}
                  </button>
                </div>
              )}

              {/* NOTIFICATIONS TAB */}
              {activeTab === "Notifications" && (
                <div className="animate-in fade-in duration-300 max-w-2xl">
                  <div className="flex items-center justify-between py-5 border-b border-gray-100">
                    <div>
                      <h4 className="text-[14px] font-bold text-navy">Email Notifications</h4>
                      <p className="text-[13px] text-gray-500 mt-1">Receive updates regarding your project via email.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={notifications.email} onChange={() => handleToggleNotification('email')} />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#007BFF]"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between py-5 border-b border-gray-100">
                    <div>
                      <h4 className="text-[14px] font-bold text-navy">In-App Notifications</h4>
                      <p className="text-[13px] text-gray-500 mt-1">Show notification alerts within the dashboard.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={notifications.inApp} onChange={() => handleToggleNotification('inApp')} />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#007BFF]"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between py-5">
                    <div>
                      <h4 className="text-[14px] font-bold text-navy">Weekly Digest</h4>
                      <p className="text-[13px] text-gray-500 mt-1">Receive a weekly summary of your project's progress.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={notifications.weeklyDigest} onChange={() => handleToggleNotification('weeklyDigest')} />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#007BFF]"></div>
                    </label>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}