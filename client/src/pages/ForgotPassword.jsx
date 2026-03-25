import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ArrowLeft, Loader2 } from "lucide-react"; // <-- Added Icons
import logoDark from '../assets/logo-dark.png';

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setMessage("");
      setError("");
      setLoading(true);
      await resetPassword(email);
      setMessage("Check your inbox for further instructions.");
    } catch (err) {
      setError("Failed to reset password: " + err.message);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EBF3FA] to-[#F5F7FA] flex flex-col items-center justify-center p-4 py-10 md:py-12 relative overflow-x-hidden">
      
      {/* 1. BACK TO LOGIN BUTTON (Matches Login & Register Pages) */}
      <Link 
        to="/login" 
        className="absolute top-6 left-4 md:top-8 md:left-8 flex items-center space-x-2 text-gray-500 hover:text-primary transition-colors font-medium text-xs md:text-sm group"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        <span className="hidden sm:inline">Back to Login</span>
        <span className="sm:hidden">Back</span>
      </Link>

      {/* 2. LOGO */}
      <Link to="/" className="mt-8 md:mt-0 mb-6 md:mb-8 hover:scale-105 transition-transform duration-300">
        <img src={logoDark} alt="NexBA Logo" className="h-8 md:h-10 w-auto" />
      </Link>

      {/* 3. RECOVERY CARD (Adjusted padding and border radius for mobile) */}
      <div className="bg-white w-full max-w-md rounded-3xl md:rounded-[2rem] p-6 sm:p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <h2 className="text-xl md:text-2xl font-bold text-navy mb-2 md:mb-4 text-center sm:text-left">Reset Password</h2>
        <p className="text-xs md:text-sm text-gray-500 mb-6 md:mb-8 text-center sm:text-left">Enter your email and we'll send you a link to reset your password.</p>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-6 text-sm text-center sm:text-left">{error}</div>}
        {message && <div className="bg-green-50 text-green-600 p-3 rounded-xl mb-6 text-sm text-center sm:text-left">{message}</div>}

        <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
          <div className="space-y-1.5 md:space-y-2">
            <label className="text-xs font-semibold text-gray-500 ml-1">Email Address</label>
            <input
              type="email" 
              required 
              placeholder="you@company.com"
              className="w-full bg-[#F7F9FC] text-navy placeholder-gray-400 px-4 py-3 md:py-3.5 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all border border-transparent focus:bg-white focus:border-blue-100 text-sm md:text-base"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <button disabled={loading} type="submit" className="w-full bg-primary hover:bg-blue-600 text-white font-semibold py-3.5 rounded-full transition-all shadow-md hover:shadow-lg mt-4 active:scale-95 flex items-center justify-center text-sm md:text-base">
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <p className="text-center text-xs sm:text-sm text-gray-500 mt-6 md:mt-8">
          Remember your password? <Link to="/login" className="text-primary font-semibold hover:underline">Log in</Link>
        </p>
      </div>

      <p className="text-[10px] sm:text-xs text-gray-400 mt-8 md:mt-12 text-center">© 2026 NexBA Inc. • Privacy & Terms</p>
    </div>
  );
}