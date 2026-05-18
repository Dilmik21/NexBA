import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ArrowLeft, Loader2, ChevronDown, Check, X } from "lucide-react"; 
import logoDark from '../assets/logo-dark.png';

export default function Register() {
  const [formData, setFormData] = useState({ 
    fullName: '', 
    email: '', 
    password: '', 
    organization: ''
  });
  
  // --- NEW: Multi-Select State ---
  const [role, setRole] = useState("Client");
  const [specialties, setSpecialties] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { signup } = useAuth();
  const navigate = useNavigate();

  const specialtiesList = [
    "Web Development", 
    "Mobile Development", 
    "Desktop Development", 
    "Game Development", 
    "Embedded Systems Development", 
    "Cloud Development", 
    "DevOps Development", 
    "AI / Machine Learning Development", 
    "Data Science Development", 
    "Cybersecurity Development"
  ];

  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const toggleSpecialty = (specialty) => {
    setSpecialties(prev => 
      prev.includes(specialty) 
        ? prev.filter(s => s !== specialty) 
        : [...prev, specialty]
    );
  };

  const removeSpecialty = (e, specialty) => {
    e.stopPropagation(); // Prevents the dropdown from toggling when clicking the 'x'
    setSpecialties(prev => prev.filter(s => s !== specialty));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError("");
      setLoading(true);

      const additionalData = {
        fullName: formData.fullName,
        organization: formData.organization,
        role: role,
      };

      if (role === "Developer") {
        if (specialties.length === 0) {
          setError("Please select at least one Team Specialty Area.");
          setLoading(false);
          return;
        }
       
        additionalData.specialty = specialties.join(', ');
        
        additionalData.specialtiesArray = specialties;
        additionalData.teamName = `${formData.fullName.split(" ")[0]}'s Team`;
      }

      await signup(formData.email, formData.password, additionalData);

      navigate("/login", { state: { message: "Account created! Please check your email inbox to verify your account before logging in." } });
    } catch (err) {
      console.error("Registration Error:", err.code);
      if (err.code === 'auth/email-already-in-use') {
        setError("An account already exists with this email address. Please log in.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password is too weak. Please use at least 6 characters.");
      } else if (err.code === 'auth/invalid-email') {
        setError("Please enter a valid email address.");
      } else {
        setError("Failed to create account. Please try again.");
      }
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EBF3FA] to-[#F5F7FA] flex flex-col items-center justify-center p-4 py-10 md:py-12 relative overflow-x-hidden">
      
      <Link 
        to="/" 
        className="absolute top-6 left-4 md:top-8 md:left-8 flex items-center space-x-2 text-gray-500 hover:text-primary transition-colors font-medium text-xs md:text-sm group"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        <span className="hidden sm:inline">Back to Home</span>
        <span className="sm:hidden">Back</span>
      </Link>

      <Link to="/" className="mt-8 md:mt-0 mb-6 md:mb-8">
        <img src={logoDark} alt="NexBA Logo" className="h-8 md:h-10 w-auto" />
      </Link>

      <div className="bg-white w-full max-w-lg rounded-3xl md:rounded-[2rem] p-6 sm:p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <h2 className="text-xl md:text-2xl font-bold text-navy mb-6 md:mb-8 text-center sm:text-left">Create your account</h2>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-6 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 ml-1">Full Name</label>
            <input type="text" name="fullName" required placeholder="Enter your full name" onChange={handleChange}
              className="w-full bg-[#F7F9FC] text-navy placeholder-gray-400 px-4 py-3 md:py-3.5 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all border border-transparent focus:bg-white focus:border-blue-100 text-sm md:text-base" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 ml-1">Email Address</label>
            <input type="email" name="email" required placeholder="Enter your email address" onChange={handleChange}
              className="w-full bg-[#F7F9FC] text-navy placeholder-gray-400 px-4 py-3 md:py-3.5 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all border border-transparent focus:bg-white focus:border-blue-100 text-sm md:text-base" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 ml-1">Password</label>
            <input type="password" name="password" required placeholder="Create a password (min 6 characters)" onChange={handleChange}
              className="w-full bg-[#F7F9FC] text-navy placeholder-gray-400 px-4 py-3 md:py-3.5 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all border border-transparent focus:bg-white focus:border-blue-100 text-sm md:text-base" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 ml-1">Organization</label>
            <input type="text" name="organization" required placeholder="Enter your organization name" onChange={handleChange}
              className="w-full bg-[#F7F9FC] text-navy placeholder-gray-400 px-4 py-3 md:py-3.5 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all border border-transparent focus:bg-white focus:border-blue-100 text-sm md:text-base" />
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-xs font-semibold text-gray-500 ml-1">Role</label>
            <div className="grid grid-cols-3 gap-2">
              {['Client', 'BA', 'Developer'].map((r) => (
                <button
                  key={r} type="button" onClick={() => setRole(r)}
                  className={`py-2 md:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
                    role === r ? 'bg-primary text-white shadow-md' : 'bg-[#F7F9FC] text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* --- NEW: CUSTOM MULTI-SELECT DROPDOWN --- */}
          {role === 'Developer' && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300 pt-2">
              <label className="text-xs font-semibold text-gray-500 ml-1">Team Specialty Area</label>
              
              <div className="relative" ref={dropdownRef}>
                <div 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`w-full bg-[#F7F9FC] min-h-[48px] md:min-h-[52px] px-4 py-2 rounded-xl outline-none transition-all cursor-pointer flex items-center justify-between border border-transparent ${isDropdownOpen ? 'bg-white border-blue-100 ring-2 ring-primary/20' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex flex-wrap gap-1.5 flex-1 pr-4">
                    {specialties.length === 0 ? (
                      <span className="text-gray-400 text-sm md:text-base py-1">Select your specialties</span>
                    ) : (
                      specialties.map(s => (
                        <span key={s} className="bg-blue-100 text-primary text-[11px] md:text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-sm">
                          {s}
                          <X className="w-3 h-3 cursor-pointer hover:text-blue-800 transition-colors" onClick={(e) => removeSpecialty(e, s)} />
                        </span>
                      ))
                    )}
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </div>

                {isDropdownOpen && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl py-2 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                    {specialtiesList.map(specialty => {
                      const isSelected = specialties.includes(specialty);
                      return (
                        <div
                          key={specialty}
                          onClick={() => toggleSpecialty(specialty)}
                          className={`px-5 py-3 text-[13px] md:text-[14px] cursor-pointer transition-colors flex items-center justify-between ${
                            isSelected ? 'bg-blue-50/50 text-primary font-bold' : 'text-gray-600 hover:bg-gray-50 hover:text-navy font-semibold'
                          }`}
                        >
                          {specialty}
                          {isSelected && <Check className="w-4 h-4 text-primary" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <button disabled={loading} type="submit" className="w-full bg-primary hover:bg-blue-600 text-white font-semibold py-3.5 rounded-full transition-all shadow-md hover:shadow-lg mt-6 active:scale-95 flex items-center justify-center text-sm md:text-base">
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-xs sm:text-sm text-gray-500 mt-6 md:mt-8">
          Already have an account? <Link to="/login" className="text-primary font-semibold hover:underline">Log in</Link>
        </p>
      </div>
      
      <p className="text-[10px] sm:text-xs text-gray-400 mt-8 md:mt-12 text-center">© 2026 NexBA Inc. • Quality Requirements Management</p>
    </div>
  );
}