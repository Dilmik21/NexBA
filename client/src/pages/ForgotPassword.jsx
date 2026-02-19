import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
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
    <div className="min-h-screen bg-gradient-to-br from-[#EBF3FA] to-[#F5F7FA] flex flex-col items-center justify-center p-4">
      <Link to="/" className="mb-8">
        <img src={logoDark} alt="NexBA Logo" className="h-10 w-auto" />
      </Link>

      <div className="bg-white w-full max-w-md rounded-[2rem] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <h2 className="text-2xl font-bold text-navy mb-4">Reset Password</h2>
        <p className="text-sm text-gray-500 mb-8">Enter your email and we'll send you a link to reset your password.</p>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-6 text-sm">{error}</div>}
        {message && <div className="bg-green-50 text-green-600 p-3 rounded-xl mb-6 text-sm">{message}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 ml-1">Email Address</label>
            <input
              type="email" required placeholder="you@company.com"
              className="w-full bg-[#F7F9FC] px-4 py-3.5 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <button disabled={loading} type="submit" className="w-full bg-[#007AFF] hover:bg-blue-600 text-white font-semibold py-3.5 rounded-full transition-colors mt-4">
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-8">
          Remember your password? <Link to="/login" className="text-primary font-semibold hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}