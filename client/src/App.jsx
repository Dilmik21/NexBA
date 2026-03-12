import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";

// Components
import ProtectedRoute from "./components/ProtectedRoute"; 

// Pages (Matching your screenshot exactly!)
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard"; 
import ClientOverview from "./pages/Client/ClientOverview";
import MyRequests from "./pages/Client/MyRequests";
import ClientClarifications from "./pages/Client/ClientClarifications";
// ADDED: Import the new Approvals page
import ClientApprovals from "./pages/Client/ClientApprovals";

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* THE TRAFFIC COP: Sorts users upon login */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />

          {/* THE CLIENT ROUTES */}
          <Route 
            path="/client/overview" 
            element={
              <ProtectedRoute>
                <ClientOverview />
              </ProtectedRoute>
            } 
          />
          
          {/* The My Requests Page */}
          <Route 
            path="/client/requests" 
            element={
              <ProtectedRoute>
                <MyRequests />
              </ProtectedRoute>
            } 
          />

          {/* The Clarifications Page */}
          <Route 
            path="/client/clarifications" 
            element={
              <ProtectedRoute>
                <ClientClarifications />
              </ProtectedRoute>
            } 
          />

          {/* NEW: The Approvals Page */}
          <Route 
            path="/client/approvals" 
            element={
              <ProtectedRoute>
                <ClientApprovals />
              </ProtectedRoute>
            } 
          />

        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;