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
import RequirementInbox from "./pages/BA/RequirementInbox";
import AIAnalysis from "./pages/BA/AIAnalysis";
import TaskAssignment from "./pages/BA/TaskAssignment";
import ChangeManagement from "./pages/BA/ChangeManagement"; 
import VerificationQueue from "./pages/BA/VerificationQueue";
import CommunicationHub from "./pages/BA/CommunicationHub";
import ProgressReports from "./pages/BA/ProgressReports";
import BASettings from "./pages/BA/BASettings"; 

// Developer Pages
import DevDashboard from "./pages/Developer/DevDashboard";
import DevTasks from "./pages/Developer/DevTasks";
import DevCommunication from "./pages/Developer/DevCommunication";
import SubmitEvidence from "./pages/Developer/SubmitEvidence"; 
import Performance from "./pages/Developer/Performance"; 
import DevSettings from "./pages/Developer/DevSettings"; 

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
          <Route path="/client/overview" element={<ProtectedRoute allowedRole="Client"><ClientOverview /></ProtectedRoute>} />
          <Route path="/client/requests" element={<ProtectedRoute allowedRole="Client"><MyRequests /></ProtectedRoute>} />
          <Route path="/client/clarifications" element={<ProtectedRoute allowedRole="Client"><ClientClarifications /></ProtectedRoute>} />
          <Route path="/client/approvals" element={<ProtectedRoute allowedRole="Client"><ClientApprovals /></ProtectedRoute>} />
          <Route path="/client/messages" element={<ProtectedRoute allowedRole="Client"><ClientMessages /></ProtectedRoute>} />
          <Route path="/client/archive" element={<ProtectedRoute allowedRole="Client"><ClientArchive /></ProtectedRoute>} />
          <Route path="/client/settings" element={<ProtectedRoute allowedRole="Client"><ClientSettings /></ProtectedRoute>} />

          {/* --- BA PROTECTED ROUTES --- */}
          <Route path="/ba/dashboard" element={<ProtectedRoute allowedRole="BA"><BAOverview /></ProtectedRoute>} />
          <Route path="/ba/inbox" element={<ProtectedRoute allowedRole="BA"><RequirementInbox /></ProtectedRoute>} />
          <Route path="/ba/analysis" element={<ProtectedRoute allowedRole="BA"><AIAnalysis /></ProtectedRoute>} />
          <Route path="/ba/tasks" element={<ProtectedRoute allowedRole="BA"><TaskAssignment /></ProtectedRoute>} />
          <Route path="/ba/changes" element={<ProtectedRoute allowedRole="BA"><ChangeManagement /></ProtectedRoute>} />
          <Route path="/ba/verification" element={<ProtectedRoute allowedRole="BA"><VerificationQueue /></ProtectedRoute>} />
          <Route path="/ba/communication" element={<ProtectedRoute allowedRole="BA"><CommunicationHub /></ProtectedRoute>} />
          <Route path="/ba/reports" element={<ProtectedRoute allowedRole="BA"><ProgressReports /></ProtectedRoute>} />
          <Route path="/ba/settings" element={<ProtectedRoute allowedRole="BA"><BASettings /></ProtectedRoute>} />

          {/* --- DEVELOPER PROTECTED ROUTES --- */}
          <Route path="/dev/dashboard" element={<ProtectedRoute allowedRole="Developer"><DevDashboard /></ProtectedRoute>} />
          <Route path="/dev/tasks" element={<ProtectedRoute allowedRole="Developer"><DevTasks /></ProtectedRoute>} />
          <Route path="/dev/communication" element={<ProtectedRoute allowedRole="Developer"><DevCommunication /></ProtectedRoute>} /> 
          <Route path="/dev/evidence" element={<ProtectedRoute allowedRole="Developer"><SubmitEvidence /></ProtectedRoute>} /> 
          <Route path="/dev/performance" element={<ProtectedRoute allowedRole="Developer"><Performance /></ProtectedRoute>} />
          <Route path="/dev/settings" element={<ProtectedRoute allowedRole="Developer"><DevSettings /></ProtectedRoute>} /> 

        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;