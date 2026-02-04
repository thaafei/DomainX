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

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/metrics" element={<Metrics />} />
        {/* <Route path="/comparison-tool" element={<ComparisonTool />} /> */}
        <Route path="/comparison-tool/:domainId" element={<ComparisonTool />} />
        <Route path="/comparison-tool" element={<Navigate to="/" replace />} />
        <Route path="/edit/:domainId" element={<Edit />} />
        <Route path="/edit" element={<Navigate to="/" replace />} />
        <Route path="/edit-domain/:domain_id" element={<EditDomain />} />
        <Route path="/libraries/:domainId" element={<Libraries />} />
        <Route path="/libraries" element={<Navigate to="/" replace />} />
        <Route path="/visualize/:domainId" element={<Visualize />} />
        <Route path="/edit-weights/:domainId" element={<EditCategoryWeights />} />
        <Route path="/libraries" element={<Navigate to="/" replace />} />
        <Route path="/main" element={<Main />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Router>
  );
};

export default App;