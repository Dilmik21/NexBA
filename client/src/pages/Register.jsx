import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { auth } from "../firebase"; 
import { sendEmailVerification, signOut } from "firebase/auth";
import { ArrowLeft, Loader2 } from "lucide-react"; 
import logoDark from '../assets/logo-dark.png';

export default function Register() {
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '', organization: '' });
  const [role, setRole] = useState("Client");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError("");
      setLoading(true);
      await signup(formData.email, formData.password, {
        fullName: formData.fullName,
        organization: formData.organization,
        role: role
      });

      // Navigate to login with a success message instructing them to check their email
      navigate("/login", { state: { message: "Account created! Please check your email inbox to verify your account before logging in." } });
    } catch (err) {
      setError("Failed to create account: " + err.message);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EBF3FA] to-[#F5F7FA] flex flex-col items-center justify-center p-4 py-10 md:py-12 relative overflow-x-hidden">
      
      {/* 1. BACK TO HOME BUTTON (Adjusted positioning for mobile) */}
      <Link 
        to="/" 
        className="absolute top-6 left-4 md:top-8 md:left-8 flex items-center space-x-2 text-gray-500 hover:text-primary transition-colors font-medium text-xs md:text-sm group"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        <span className="hidden sm:inline">Back to Home</span>
        <span className="sm:hidden">Back</span>
      </Link>

      {/* 2. LOGO (Added top margin on mobile so it doesn't clash with back button) */}
      <Link to="/" className="mt-8 md:mt-0 mb-6 md:mb-8">
        <img src={logoDark} alt="NexBA Logo" className="h-8 md:h-10 w-auto" />
      </Link>

      {/* 3. REGISTER CARD (Adjusted padding and border radius for mobile) */}
      <div className="bg-white w-full max-w-lg rounded-3xl md:rounded-[2rem] p-6 sm:p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <h2 className="text-xl md:text-2xl font-bold text-navy mb-6 md:mb-8 text-center sm:text-left">Create your account</h2>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-6 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 ml-1">Full Name</label>
            <input type="text" name="fullName" required placeholder="John Doe" onChange={handleChange}
              className="w-full bg-[#F7F9FC] px-4 py-3 md:py-3.5 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all border border-transparent focus:bg-white focus:border-blue-100 text-sm md:text-base" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 ml-1">Email Address</label>
            <input type="email" name="email" required placeholder="john@company.com" onChange={handleChange}
              className="w-full bg-[#F7F9FC] px-4 py-3 md:py-3.5 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all border border-transparent focus:bg-white focus:border-blue-100 text-sm md:text-base" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 ml-1">Password</label>
            <input type="password" name="password" required placeholder="••••••••" onChange={handleChange}
              className="w-full bg-[#F7F9FC] px-4 py-3 md:py-3.5 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all border border-transparent focus:bg-white focus:border-blue-100 text-sm md:text-base" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 ml-1">Organization</label>
            <input type="text" name="organization" required placeholder="Company Name" onChange={handleChange}
              className="w-full bg-[#F7F9FC] px-4 py-3 md:py-3.5 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all border border-transparent focus:bg-white focus:border-blue-100 text-sm md:text-base" />
          </div>

          {/* Role Selector (Adjusted text sizing for smaller screens) */}
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