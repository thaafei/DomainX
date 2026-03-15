import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Routes, Route, Navigate } from "react-router-dom";
import Home from './pages/Home';
import Login from './pages/Login';
import Visualize from './pages/Visualize';
import Main from "./pages/Main";
import Signup from "./pages/Signup";
import Metrics from "./pages/Metrics";
import ComparisonTool from "./pages/ComparisonTool";
import Edit from "./pages/Edit";
import EditDomain from "./pages/EditDomain";
import Libraries from "./pages/Libraries";
import Admin from "./pages/Admin";
import EditCategoryWeights from "./pages/EditCategoryWeights"
import "./styles/base.css";
import "./styles/theme.css";
import "./styles/auth.css";
import "./styles/components.css";
import "./styles/visualize.css";
import UserProfilePage from './pages/UserProfile';
import ProtectedRoute from './components/ProtectedRoute'; // Add this import

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Public routes - accessible to everyone */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* Protected routes - require authentication */}
        <Route 
          path="/metrics" 
          element={
            <ProtectedRoute>
              <Metrics />
            </ProtectedRoute>
          } 
        />
        <Route path="/comparison-tool/:domainId" element={<ComparisonTool />} />
        <Route 
          path="/edit/:domainId" 
          element={
            <ProtectedRoute>
              <Edit />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/libraries/:domainId" 
          element={
            <ProtectedRoute>
              <Libraries />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/edit-domain/:domain_id" 
          element={
            <ProtectedRoute>
              <EditDomain />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/edit-weights/:domainId" 
          element={
            <ProtectedRoute>
              <EditCategoryWeights />
            </ProtectedRoute>
          } 
        />
        <Route path="/main" element={<Main />} />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/user" 
          element={
            <ProtectedRoute>
              <UserProfilePage />
            </ProtectedRoute>
          } 
        />
        <Route path="/visualize/:domainId" element={<Visualize />} />
        <Route path="/comparison-tool" element={<Navigate to="/" replace />} />
        <Route path="/edit" element={<Navigate to="/" replace />} />
        <Route path="/libraries" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;