import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";

import ProtectedRoute from "./components/ProtectedRoute"; 

import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard"; 

// Client Pages
import ClientOverview from "./pages/Client/ClientOverview";
import MyRequests from "./pages/Client/MyRequests";
import ClientClarifications from "./pages/Client/ClientClarifications";
import ClientApprovals from "./pages/Client/ClientApprovals";
import ClientMessages from "./pages/Client/ClientMessages";
import ClientArchive from "./pages/Client/ClientArchive";
import ClientSettings from "./pages/Client/ClientSettings";

// BA Pages
import BAOverview from "./pages/BA/BAOverview";
import RequirementInbox from "./pages/BA/RequirementInbox"; // <-- NEW IMPORT

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* --- PUBLIC ROUTES --- */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* --- SHARED PROTECTED ROUTES --- */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />

          {/* --- CLIENT PROTECTED ROUTES --- */}
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

          <Route 
            path="/client/messages" 
            element={
              <ProtectedRoute>
                <ClientMessages />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/client/archive" 
            element={
              <ProtectedRoute>
                <ClientArchive />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/client/settings" 
            element={
              <ProtectedRoute>
                <ClientSettings />
              </ProtectedRoute>
            } 
          />

          {/* --- BA PROTECTED ROUTES --- */}
          <Route 
            path="/ba/dashboard" 
            element={
              <ProtectedRoute>
                <BAOverview />
              </ProtectedRoute>
            } 
          />

          {/* NEW: Requirement Inbox Route */}
          <Route 
            path="/ba/inbox" 
            element={
              <ProtectedRoute>
                <RequirementInbox />
              </ProtectedRoute>
            } 
          />

        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;