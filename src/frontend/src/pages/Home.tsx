import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';


const Home: React.FC = () => {
    useEffect(() => {
      document.title = "DomainX";
    }, []);

    const navigate = useNavigate();
    const goToLogin = () => navigate('/login');
  return (
    <div className="home-bg">
      <div className="stars"></div>

      <div className="center-wrap">
        <div className="logo-wrap">
          <span className="logo-d">D</span>
          <span className="logo-dash">—</span>
          <span className="logo-x-circle">
            <span className="logo-x">X</span>
          </span>
        </div>

        <div className="domainx">DomainX</div>

        <p className="desc">
          Your toolset for managing and measuring software development practices
          across diverse domains, delivering efficient and traceable insights
        </p>

        <div className="signin" onClick={goToLogin} aria-label="Go to login page">Sign In</div>
      </div>
    </div>
  );
};

export default Home;
