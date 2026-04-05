import { useState, useEffect, useRef } from "react";
import DevTopBar from "../../components/Developer/DevTopBar";
import DevSidebar from "../../components/Developer/DevSidebar";
import { useAuth } from "../../contexts/AuthContext";
import { Loader2, Camera, Check, Eye, EyeOff } from "lucide-react";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";

export default function DevSettings() {
  const { currentUser } = useAuth();
  // THE FIX: Changed default active tab back to "General"
  const [activeTab, setActiveTab] = useState("General"); 
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef(null);

  // General State
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    organization: "",
    role: "Developer",
    profileImage: null,
    specialty: []
  });

  // Security State
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });

  // Notifications State
  const [notifications, setNotifications] = useState({
    email: true,
    inApp: true,
    weeklyDigest: false
  });

  // Exact specialty list from Registration
  const availableSpecialties = [
    { name: "Web Development", desc: "Websites & web apps" },
    { name: "Mobile Development", desc: "Android & iOS apps" },
    { name: "Desktop Development", desc: "PC software" },
    { name: "Game Development", desc: "Video games" },
    { name: "Embedded Systems Development", desc: "Software for hardware/IoT" },
    { name: "Cloud Development", desc: "Cloud-based apps & services" },
    { name: "DevOps Development", desc: "Deployment & automation" },
    { name: "AI / Machine Learning Development", desc: "Smart systems" },
    { name: "Data Science Development", desc: "Data analysis & insights" },
    { name: "Cybersecurity Development", desc: "System security" }
  ];

  useEffect(() => {
    if (currentUser?.uid) fetchSettings();
  }, [currentUser]);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/dev/settings?uid=${currentUser.uid}`);
      const json = await res.json();
      if (json.success && json.data) {
        setFormData({
          fullName: json.data.fullName || "",
          email: json.data.email || currentUser.email || "",
          organization: json.data.organization || "",
          role: json.data.role || "Developer",
          profileImage: json.data.profileImage || null,
          specialty: Array.isArray(json.data.specialty) ? json.data.specialty : 
                     (typeof json.data.specialty === 'string' && json.data.specialty ? json.data.specialty.split(',').map(s=>s.trim()) : [])
        });
        if (json.data.notifications) setNotifications(json.data.notifications);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, profileImage: reader.result });
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, profileImage: null });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleSpecialty = (specName) => {
    setFormData(prev => {
        const currentList = prev.specialty || [];
        if (currentList.includes(specName)) {
            return { ...prev, specialty: currentList.filter(s => s !== specName) };
        } else {
            return { ...prev, specialty: [...currentList, specName] };
        }
    });
  };

  const handleGeneralSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch(`http://localhost:5000/api/dev/settings/general?uid=${currentUser.uid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const json = await res.json();
      if (json.success) alert("Profile updated successfully!");
      else alert("Failed to update profile: " + json.message);
    } catch (error) {
      alert("Network Error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSecuritySave = async (e) => {
    e.preventDefault();
    if (!passwords.current) return alert("Please enter your current password.");
    if (passwords.new !== passwords.confirm) return alert("New passwords do not match!");
    if (passwords.new.length < 6) return alert("New password must be at least 6 characters long.");
    
    setIsSaving(true);
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, passwords.current);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, passwords.new);
      
      alert("Password updated successfully!");
      setPasswords({ current: "", new: "", confirm: "" });
      
    } catch (error) {
      console.error("Password update error:", error);
      if (error.code === 'auth/invalid-credential') {
        alert("Incorrect current password. Please try again.");
      } else if (error.code === 'auth/requires-recent-login') {
        alert("For security reasons, please log out and log back in before changing your password.");
      } else {
        alert("Failed to update password: " + error.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotificationToggle = async (key) => {
    const newValue = !notifications[key];
    setNotifications({ ...notifications, [key]: newValue });
    try {
      await fetch(`http://localhost:5000/api/dev/settings/notifications?uid=${currentUser.uid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: newValue })
      });
    } catch (error) {
      console.error("Failed to update notification setting");
    }
  };

  const getInitials = (name) => {
    if (!name) return "DV";
    const parts = name.split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex flex-col font-sans">
        <DevTopBar />
        <div className="flex max-w-[1600px] w-full mx-auto pt-6 px-4 md:px-6 gap-8 flex-1 items-start">
          <div className="hidden lg:block flex-shrink-0">
            <DevSidebar />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center h-full min-h-[60vh]">
            <Loader2 className="w-8 h-8 animate-spin text-[#007BFF]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col font-sans">
      <DevTopBar />

      <div className="flex max-w-[1600px] w-full mx-auto pt-6 px-4 md:px-6 gap-8 pb-12 flex-1 items-start">
        
        <div className="hidden lg:block flex-shrink-0 sticky top-[104px]">
          <DevSidebar />
        </div>

        <div className="flex-1 min-w-0">
          
          <div className="mb-6">
            <h1 className="text-[20px] md:text-[24px] font-bold text-navy">Profile & Settings</h1>
          </div>

          <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 flex flex-col md:flex-row overflow-hidden min-h-[600px]">
            
            <div className="w-full md:w-[240px] py-6 border-b md:border-b-0 md:border-r border-gray-100 flex flex-col flex-shrink-0">
              {["General", "Security", "Notifications"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-left px-8 py-3.5 text-[14px] font-bold transition-all border-l-[3px] ${
                    activeTab === tab 
                      ? "text-[#007BFF] border-[#007BFF] bg-transparent" 
                      : "text-gray-500 hover:text-navy border-transparent hover:bg-gray-50/50"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex-1 p-8 md:p-12">
              
              {/* GENERAL TAB */}
              {activeTab === "General" && (
                <form onSubmit={handleGeneralSave} className="max-w-3xl animate-in fade-in duration-300">
                  
                  <div className="flex items-center gap-6 mb-10">
                    <div className="relative flex-shrink-0">
                      <div className="w-[100px] h-[100px] rounded-full bg-[#007BFF] text-white flex items-center justify-center text-4xl font-bold shadow-sm overflow-hidden">
                        {formData.profileImage ? (
                          <img src={formData.profileImage} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          getInitials(formData.fullName)
                        )}
                      </div>
                      <button 
                        type="button" 
                        onClick={() => fileInputRef.current.click()} 
                        className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-md border border-gray-100 flex items-center justify-center text-gray-500 hover:text-[#007BFF] transition-colors"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                    </div>
                    
                    <div className="flex flex-col justify-center">
                      <h2 className="text-[20px] font-bold text-navy">{formData.fullName || "Developer"}</h2>
                      <p className="text-[14px] text-gray-500 mt-1">{formData.email}</p>
                      {formData.profileImage && (
                        <button 
                          type="button" 
                          onClick={handleRemoveImage} 
                          className="text-[13px] font-bold text-gray-400 hover:text-red-500 mt-2.5 transition-colors text-left"
                        >
                          Remove Profile Photo
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-8">
                    <div>
                      <label className="block text-[13px] font-bold text-gray-700 mb-2">Full Name</label>
                      <input 
                        type="text" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                        className="w-full bg-white border border-gray-200 rounded-[12px] px-4 py-3 text-[14px] text-navy outline-none focus:border-[#007BFF] focus:ring-1 focus:ring-[#007BFF] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-bold text-gray-700 mb-2">Email</label>
                      <input 
                        type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} disabled
                        className="w-full bg-white border border-gray-200 rounded-[12px] px-4 py-3 text-[14px] text-gray-400 outline-none cursor-not-allowed opacity-70"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-bold text-gray-700 mb-2">Organization / Team</label>
                      <input 
                        type="text" value={formData.organization} onChange={(e) => setFormData({...formData, organization: e.target.value})}
                        className="w-full bg-white border border-gray-200 rounded-[12px] px-4 py-3 text-[14px] text-navy outline-none focus:border-[#007BFF] focus:ring-1 focus:ring-[#007BFF] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-bold text-gray-700 mb-2">Role</label>
                      <input 
                        type="text" value={formData.role} disabled
                        className="w-full bg-white border border-gray-200 rounded-[12px] px-4 py-3 text-[14px] text-gray-400 outline-none cursor-not-allowed opacity-70"
                      />
                    </div>
                  </div>

                  <div className="mb-10">
                    <label className="block text-[13px] font-bold text-gray-700 mb-3">Specialty Areas</label>
                    <div className="flex flex-wrap gap-2.5">
                      {availableSpecialties.map((spec) => {
                        const isSelected = formData.specialty.includes(spec.name);
                        return (
                          <button
                            key={spec.name}
                            type="button"
                            onClick={() => toggleSpecialty(spec.name)}
                            title={spec.desc}
                            className={`px-5 py-2.5 rounded-full text-[13px] font-bold transition-all flex items-center gap-2 ${
                              isSelected 
                                ? 'bg-[#007BFF] text-white border border-[#007BFF] shadow-sm' 
                                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                            {spec.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button 
                    type="submit" disabled={isSaving}
                    className="bg-[#007BFF] hover:bg-blue-600 text-white font-bold py-2.5 px-6 rounded-[10px] shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save Changes
                  </button>
                </form>
              )}

              {/* SECURITY TAB */}
              {activeTab === "Security" && (
                <form onSubmit={handleSecuritySave} className="max-w-2xl animate-in fade-in duration-300">
                  <div className="space-y-6 mb-8">
                    <div>
                      <label className="block text-[13px] font-bold text-navy mb-2">Current Password</label>
                      <input 
                        type="password" 
                        value={passwords.current} 
                        onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                        className="w-full bg-white border border-gray-200 rounded-[12px] px-4 py-3 text-[14px] text-navy outline-none focus:border-[#007BFF] focus:ring-1 focus:ring-[#007BFF] transition-all placeholder:text-gray-400"
                        placeholder="••••••••"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-bold text-navy mb-2">New Password</label>
                      <input 
                        type="password" 
                        value={passwords.new} 
                        onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                        className="w-full bg-white border border-gray-200 rounded-[12px] px-4 py-3 text-[14px] text-navy outline-none focus:border-[#007BFF] focus:ring-1 focus:ring-[#007BFF] transition-all placeholder:text-gray-400"
                        placeholder="••••••••"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-bold text-navy mb-2">Confirm New Password</label>
                      <input 
                        type="password" 
                        value={passwords.confirm} 
                        onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                        className="w-full bg-white border border-gray-200 rounded-[12px] px-4 py-3 text-[14px] text-navy outline-none focus:border-[#007BFF] focus:ring-1 focus:ring-[#007BFF] transition-all placeholder:text-gray-400"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    disabled={isSaving || !passwords.current || !passwords.new || !passwords.confirm}
                    className="bg-[#007BFF] hover:bg-blue-600 text-white font-bold py-2.5 px-6 rounded-[10px] shadow-sm transition-all active:scale-95 disabled:bg-[#b0d1fa] disabled:opacity-100 disabled:cursor-not-allowed flex items-center gap-2 w-max"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Update Password
                  </button>
                </form>
              )}

              {/* NOTIFICATIONS TAB */}
              {activeTab === "Notifications" && (
                <div className="max-w-3xl animate-in fade-in duration-300">
                  
                  <div className="flex items-center justify-between py-6">
                    <div>
                      <h3 className="text-[15px] font-bold text-navy">Email Notifications</h3>
                      <p className="text-[14px] text-gray-500 mt-1">Receive updates regarding your project via email.</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => handleNotificationToggle('email')}
                      className={`w-[46px] h-[24px] rounded-full transition-colors relative flex items-center flex-shrink-0 ${notifications.email ? 'bg-[#007BFF]' : 'bg-gray-200'}`}
                    >
                      <div className={`w-[20px] h-[20px] bg-white rounded-full shadow-sm transition-transform transform ${notifications.email ? 'translate-x-[24px]' : 'translate-x-[2px]'}`}></div>
                    </button>
                  </div>
                  
                  <div className="w-full h-px bg-gray-100/70"></div>
                  
                  <div className="flex items-center justify-between py-6">
                    <div>
                      <h3 className="text-[15px] font-bold text-navy">In-App Notifications</h3>
                      <p className="text-[14px] text-gray-500 mt-1">Show notification alerts within the dashboard.</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => handleNotificationToggle('inApp')}
                      className={`w-[46px] h-[24px] rounded-full transition-colors relative flex items-center flex-shrink-0 ${notifications.inApp ? 'bg-[#007BFF]' : 'bg-gray-200'}`}
                    >
                      <div className={`w-[20px] h-[20px] bg-white rounded-full shadow-sm transition-transform transform ${notifications.inApp ? 'translate-x-[24px]' : 'translate-x-[2px]'}`}></div>
                    </button>
                  </div>

                  <div className="w-full h-px bg-gray-100/70"></div>

                  <div className="flex items-center justify-between py-6">
                    <div>
                      <h3 className="text-[15px] font-bold text-navy">Weekly Digest</h3>
                      <p className="text-[14px] text-gray-500 mt-1">Receive a weekly summary of your project's progress.</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => handleNotificationToggle('weeklyDigest')}
                      className={`w-[46px] h-[24px] rounded-full transition-colors relative flex items-center flex-shrink-0 ${notifications.weeklyDigest ? 'bg-[#007BFF]' : 'bg-gray-200'}`}
                    >
                      <div className={`w-[20px] h-[20px] bg-white rounded-full shadow-sm transition-transform transform ${notifications.weeklyDigest ? 'translate-x-[24px]' : 'translate-x-[2px]'}`}></div>
                    </button>
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