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
import DevSettings from "./pages/Developer/DevSettings"; // <-- IMPORTED NEW PAGE

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
          <Route path="/client/overview" element={<ProtectedRoute><ClientOverview /></ProtectedRoute>} />
          <Route path="/client/requests" element={<ProtectedRoute><MyRequests /></ProtectedRoute>} />
          <Route path="/client/clarifications" element={<ProtectedRoute><ClientClarifications /></ProtectedRoute>} />
          <Route path="/client/approvals" element={<ProtectedRoute><ClientApprovals /></ProtectedRoute>} />
          <Route path="/client/messages" element={<ProtectedRoute><ClientMessages /></ProtectedRoute>} />
          <Route path="/client/archive" element={<ProtectedRoute><ClientArchive /></ProtectedRoute>} />
          <Route path="/client/settings" element={<ProtectedRoute><ClientSettings /></ProtectedRoute>} />

          {/* --- BA PROTECTED ROUTES --- */}
          <Route path="/ba/dashboard" element={<ProtectedRoute><BAOverview /></ProtectedRoute>} />
          <Route path="/ba/inbox" element={<ProtectedRoute><RequirementInbox /></ProtectedRoute>} />
          <Route path="/ba/analysis" element={<ProtectedRoute><AIAnalysis /></ProtectedRoute>} />
          <Route path="/ba/tasks" element={<ProtectedRoute><TaskAssignment /></ProtectedRoute>} />
          <Route path="/ba/changes" element={<ProtectedRoute><ChangeManagement /></ProtectedRoute>} />
          <Route path="/ba/verification" element={<ProtectedRoute><VerificationQueue /></ProtectedRoute>} />
          <Route path="/ba/communication" element={<ProtectedRoute><CommunicationHub /></ProtectedRoute>} />
          <Route path="/ba/reports" element={<ProtectedRoute><ProgressReports /></ProtectedRoute>} />
          <Route path="/ba/settings" element={<ProtectedRoute><BASettings /></ProtectedRoute>} />

          {/* --- DEVELOPER PROTECTED ROUTES --- */}
          <Route path="/dev/dashboard" element={<ProtectedRoute><DevDashboard /></ProtectedRoute>} />
          <Route path="/dev/tasks" element={<ProtectedRoute><DevTasks /></ProtectedRoute>} />
          <Route path="/dev/communication" element={<ProtectedRoute><DevCommunication /></ProtectedRoute>} /> 
          <Route path="/dev/evidence" element={<ProtectedRoute><SubmitEvidence /></ProtectedRoute>} /> 
          <Route path="/dev/performance" element={<ProtectedRoute><Performance /></ProtectedRoute>} />
          <Route path="/dev/settings" element={<ProtectedRoute><DevSettings /></ProtectedRoute>} /> {/* <-- LINKED */}

        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;