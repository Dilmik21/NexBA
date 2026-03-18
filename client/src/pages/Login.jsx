import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { auth } from "../firebase"; // <--- FIXED PATH!
import { signOut } from "firebase/auth";
import logoDark from '../assets/logo-dark.png';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth(); 
  const navigate = useNavigate();

  // Logic: On page load, check if an email was saved in localStorage
  useEffect(() => {
    const savedEmail = localStorage.getItem("nexba_remembered_email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError("");
      setLoading(true);
      
      // Handle "Remember Me" logic
      if (rememberMe) {
        localStorage.setItem("nexba_remembered_email", email);
      } else {
        localStorage.removeItem("nexba_remembered_email");
      }

      await login(email, password);

      // --- THE VERIFICATION CHECK ---
      if (auth.currentUser && !auth.currentUser.emailVerified) {
        // If they haven't verified, log them back out instantly to protect the app
        await signOut(auth);
        setError("Please verify your email before logging in. Check your inbox.");
        setLoading(false);
        return; // Stops them from going to the dashboard
      }

      navigate("/dashboard"); 
    } catch (err) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError("Account not found. Please check your details or register below.");
      } else {
        setError("Failed to sign in. Please check your password.");
      }
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EBF3FA] to-[#F5F7FA] flex flex-col items-center justify-center p-4">
      
      <Link to="/" className="mb-8 hover:scale-105 transition-transform duration-300">
        <img src={logoDark} alt="NexBA Logo" className="h-10 w-auto" />
      </Link>

      <div className="bg-white w-full max-w-md rounded-[2rem] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <h2 className="text-2xl font-bold text-navy mb-8">Welcome back</h2>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-6 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 ml-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              placeholder="you@company.com"
              className="w-full bg-[#F7F9FC] text-navy placeholder-gray-400 px-4 py-3.5 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all border border-transparent focus:bg-white focus:border-blue-100"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 ml-1">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="w-full bg-[#F7F9FC] text-navy placeholder-gray-400 px-4 py-3.5 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all border border-transparent focus:bg-white focus:border-blue-100"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" 
              />
              <span className="text-sm text-gray-600">Remember me</span>
            </label>
            <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
              Forgot Password?
            </Link>
          </div>

          <button disabled={loading} type="submit" className="w-full bg-primary hover:bg-blue-600 text-white font-semibold py-3.5 rounded-full transition-all shadow-md hover:shadow-lg mt-4 active:scale-95">
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-8">
          Don't have an account? <Link to="/register" className="text-primary font-semibold hover:underline">Register here</Link>
        </p>
      </div>

      <p className="text-xs text-gray-400 mt-12">© 2026 NexBA Inc. • Privacy & Terms</p>
    </div>
  );
}