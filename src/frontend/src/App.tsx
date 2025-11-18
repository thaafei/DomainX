import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Visualize from './pages/Visualize';
import Main from "./pages/Main";
import Signup from "./pages/Signup";
import Metrics from "./pages/Metrics";
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
        <Route path="/visualize" element={<Visualize />} />
        <Route path="/main" element={<Main />} />
      </Routes>
    </Router>
  );
};

export default App;