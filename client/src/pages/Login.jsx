import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { auth } from "../firebase"; 
import { signOut } from "firebase/auth";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react"; 
import logoDark from '../assets/logo-dark.png';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  
  const [error, setError] = useState("");
  const [message, setMessage] = useState(""); // For the success email message
  const [loading, setLoading] = useState(false);
  
  const [isResetting, setIsResetting] = useState(false); // Toggle between Login and Reset modes
  
  // Bring in both login and resetPassword from context
  const { login, resetPassword } = useAuth(); 
  const navigate = useNavigate();

  useEffect(() => {
    const savedEmail = localStorage.getItem("nexba_remembered_email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    if (isResetting) {
      // --- FORGOT PASSWORD FLOW ---
      try {
        await resetPassword(email);
        setMessage("Check your inbox! We've sent you a password reset link.");
      } catch (err) {
        console.error("Reset Password Error:", err.code);
        if (err.code === 'auth/user-not-found') {
          setError("No account found with this email address.");
        } else if (err.code === 'auth/invalid-email') {
          setError("Please enter a valid email address.");
        } else {
          setError("Failed to reset password. Please try again.");
        }
      }
    } else {
      // --- STANDARD LOGIN FLOW ---
      try {
        if (rememberMe) {
          localStorage.setItem("nexba_remembered_email", email);
        } else {
          localStorage.removeItem("nexba_remembered_email");
        }

        await login(email, password);

        if (auth.currentUser && !auth.currentUser.emailVerified) {
          await signOut(auth);
          setError("Please verify your email before logging in. Check your inbox.");
          setLoading(false);
          return; 
        }

        navigate("/dashboard"); 
      } catch (err) {
        console.error("Login Error:", err.code);
        if (err.code === 'auth/user-not-found') {
          setError("No account found with this email. Please register first.");
        } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
          setError("Incorrect password. Please check your password and try again.");
        } else if (err.code === 'auth/too-many-requests') {
          setError("Too many failed attempts. Please try again later or reset your password.");
        } else if (err.code === 'auth/invalid-email') {
          setError("Please enter a valid email address.");
        } else {
          setError("Failed to sign in. Please try again.");
        }
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

      <Link to="/" className="mt-8 md:mt-0 mb-6 md:mb-8 hover:scale-105 transition-transform duration-300">
        <img src={logoDark} alt="NexBA Logo" className="h-8 md:h-10 w-auto" />
      </Link>

      <div className="bg-white w-full max-w-md rounded-3xl md:rounded-[2rem] p-6 sm:p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        
        <h2 className="text-xl md:text-2xl font-bold text-navy mb-2 text-center sm:text-left">
          {isResetting ? "Reset Password" : "Welcome back"}
        </h2>
        
        {isResetting && (
          <p className="text-sm text-gray-500 mb-6 text-center sm:text-left">
            Enter your email and we'll send you a link to reset your password.
          </p>
        )}

        {/* Padding applied here so standard login doesn't jump weirdly */}
        {!isResetting && <div className="h-4 md:h-6"></div>}

        {error && <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl mb-6 text-sm text-center sm:text-left font-medium">{error}</div>}
        
        {message && (
          <div className="bg-green-50 border border-green-100 text-green-700 p-3 rounded-xl mb-6 text-sm text-center sm:text-left font-medium flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
          <div className="space-y-1.5 md:space-y-2">
            <label className="text-xs font-semibold text-gray-500 ml-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              placeholder="Enter your email address"
              className="w-full bg-[#F7F9FC] text-navy placeholder-gray-400 px-4 py-3 md:py-3.5 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all border border-transparent focus:bg-white focus:border-blue-100 text-sm md:text-base"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {!isResetting && (
            <div className="space-y-1.5 md:space-y-2 animate-in fade-in zoom-in-95 duration-200">
              <label className="text-xs font-semibold text-gray-500 ml-1">Password</label>
              <input
                type="password"
                required={!isResetting}
                value={password}
                placeholder="Enter your password"
                className="w-full bg-[#F7F9FC] text-navy placeholder-gray-400 px-4 py-3 md:py-3.5 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all border border-transparent focus:bg-white focus:border-blue-100 text-sm md:text-base"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-1 md:pt-2">
            {!isResetting ? (
              <>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" 
                  />
                  <span className="text-xs md:text-sm text-gray-600">Remember me</span>
                </label>
                <button 
                  type="button" 
                  onClick={() => { setIsResetting(true); setError(""); setMessage(""); }} 
                  className="text-xs md:text-sm font-medium text-primary hover:underline bg-transparent border-none p-0 cursor-pointer"
                >
                  Forgot Password?
                </button>
              </>
            ) : (
              <button 
                type="button" 
                onClick={() => { setIsResetting(false); setError(""); setMessage(""); }} 
                className="text-xs md:text-sm font-medium text-gray-500 hover:text-primary transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" /> Back to Login
              </button>
            )}
          </div>

          <button 
            disabled={loading || (isResetting && message !== "")} 
            type="submit" 
            className="w-full bg-primary hover:bg-blue-600 text-white font-semibold py-3.5 rounded-full transition-all shadow-md hover:shadow-lg mt-4 active:scale-95 flex items-center justify-center text-sm md:text-base disabled:opacity-50"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin mr-2" />}
            {loading 
              ? (isResetting ? "Sending..." : "Signing in...") 
              : (isResetting ? "Send Reset Link" : "Sign In")
            }
          </button>
        </form>

        {!isResetting && (
          <p className="text-center text-xs sm:text-sm text-gray-500 mt-6 md:mt-8">
            Don't have an account? <Link to="/register" className="text-primary font-semibold hover:underline">Register here</Link>
          </p>
        )}
      </div>

      <p className="text-[10px] sm:text-xs text-gray-400 mt-8 md:mt-12 text-center">© 2026 NexBA Inc. • Privacy & Terms</p>
    </div>
  );
}