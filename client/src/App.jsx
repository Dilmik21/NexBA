import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";

// Components
import ProtectedRoute from "./components/ProtectedRoute"; 

// Pages 
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard"; 
import ClientOverview from "./pages/Client/ClientOverview";
import MyRequests from "./pages/Client/MyRequests";
import ClientClarifications from "./pages/Client/ClientClarifications";
import ClientApprovals from "./pages/Client/ClientApprovals";
// ADDED: Import the new Messages page
import ClientMessages from "./pages/Client/ClientMessages";

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/client/overview" 
            element={
              <ProtectedRoute>
                <ClientOverview />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/client/requests" 
            element={
              <ProtectedRoute>
                <MyRequests />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/client/clarifications" 
            element={
              <ProtectedRoute>
                <ClientClarifications />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/client/approvals" 
            element={
              <ProtectedRoute>
                <ClientApprovals />
              </ProtectedRoute>
            } 
          />

          {/* NEW: The Messages Page */}
          <Route 
            path="/client/messages" 
            element={
              <ProtectedRoute>
                <ClientMessages />
              </ProtectedRoute>
            } 
          />

        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;