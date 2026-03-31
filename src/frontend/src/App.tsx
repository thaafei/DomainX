import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Routes, Route, Navigate } from "react-router-dom";
import Login from './pages/Login';
import Visualize from './pages/Visualize';
import Main from "./pages/Main";
import AcceptInvite from "./pages/AcceptInvite";
import Metrics from "./pages/Metrics";
import ComparisonTool from "./pages/ComparisonTool";
import OverallImpression from "./pages/OverallImpression";
import Edit from "./pages/Edit";
import EditDomain from "./pages/EditDomain";
import Libraries from "./pages/Libraries";
import Admin from "./pages/Admin";
import EditCategoryWeights from "./pages/EditCategoryWeights";
import UserProfilePage from './pages/UserProfile';
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import { AuthLoader } from './components/AuthLoader';

import "./styles/base.css";
import "./styles/theme.css";
import "./styles/auth.css";
import "./styles/components.css";
import "./styles/visualize.css";

const App: React.FC = () => {
  return (
    <Router>
      <AuthLoader>
        <Routes>
          <Route
            path="/"
            element={
                <Main />
            }
          />

          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          <Route path="/accept-invite" element={<AcceptInvite />} />

          <Route
            path="/metrics"
            element={
              <ProtectedRoute>
                <Metrics />
              </ProtectedRoute>
            }
          />

          <Route
            path="/comparison-tool/:domainId"
            element={
                <ComparisonTool />
            }
          />
          <Route path="/comparison-tool" element={<Navigate to="/" replace />} />

          <Route
            path="/overall-impression/:domainId"
            element={
                <OverallImpression />
            }
          />
          <Route path="/overall-impression" element={<Navigate to="/" replace />} />

          <Route
            path="/edit/:domainId"
            element={
              <ProtectedRoute>
                <Edit />
              </ProtectedRoute>
            }
          />
          <Route path="/edit" element={<Navigate to="/" replace />} />

          <Route
            path="/edit-domain/:domain_id"
            element={
              <ProtectedRoute>
                <EditDomain />
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
          <Route path="/libraries" element={<Navigate to="/" replace />} />

          <Route
            path="/visualize/:domainId"
            element={
                <Visualize />
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

          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <ForgotPassword />
              </PublicRoute>
            }
          />

          <Route
            path="/reset-password"
            element={
              <PublicRoute>
                <ResetPassword />
              </PublicRoute>
            }
          />
        </Routes>
      </AuthLoader>
    </Router>
  );
};

export default App;
