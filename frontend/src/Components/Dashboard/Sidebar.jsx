import React, { useState, useEffect } from 'react';
import { LogOut, User, Building } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
const Sidebar = ({ activeSection, setActiveSection, getResumeCount, logout }) => {
  const [userInfo, setUserInfo] = useState(null);
  const navigate = useNavigate();
  useEffect(() => {
    // Get user info from localStorage
    const storedUserInfo = localStorage.getItem('userInfo');
    if (storedUserInfo) {
      try {
        const parsedUserInfo = JSON.parse(storedUserInfo);
        setUserInfo(parsedUserInfo);
      } catch (error) {
        console.error('Error parsing user info from localStorage:', error);
      }
    }
  }, []);

  const handleProfileClick = () => {
    navigate('/profile');
  };

  return (
    <div className="sidebar">
      {/* Logo */}
      <div className="logo-section">
        
          {userInfo && userInfo.profilePicture ? (
            <img 
              src={userInfo.profilePicture} 
              alt="Profile" 
              className="profile-picture"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                objectFit: 'cover'
              }}
            />
          ) : (
            <div className="logo-icon">
            <span className="logo-text">RL</span>
            </div>
          )}
        
      </div>

      <div className="brand-section">
        <div className="brand-content">
          <h1 className="brand-title">
            {userInfo && userInfo.name ? userInfo.name : 'Resume Hub'}
          </h1>
          <p className="brand-subtitle">
            {userInfo && userInfo.email ? userInfo.email : 'Manage your resumes'}
          </p>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="nav-sections">
        {/* Owned Section */}
        <div>
          <button
            onClick={() => setActiveSection('owned')}
            className={`nav-button ${activeSection === 'owned' ? 'nav-button-active' : ''}`}
          >
            <div className="nav-button-content">
              <div className="nav-button-left">
                <User className="nav-icon" />
                <span className="nav-text">Owned</span>
              </div>
              <span className={`nav-badge ${activeSection === 'owned' ? 'nav-badge-active' : ''}`}>
                {getResumeCount('owned')}
              </span>
            </div>
          </button>
        </div>

        {/* Shared Section */}
        <div>
          <button
            onClick={() => setActiveSection('shared')}
            className={`nav-button ${activeSection === 'shared' ? 'nav-button-active' : ''}`}
          >
            <div className="nav-button-content">
              <div className="nav-button-left">
                <Building className="nav-icon" />
                <span className="nav-text">Shared</span>
              </div>
              <span className={`nav-badge ${activeSection === 'shared' ? 'nav-badge-active' : ''}`}>
                {getResumeCount('shared')}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Logout Button */}
      <div className="logout-section">
        <button onClick={handleProfileClick} className="profile-button">
          <User className="profile-icon" />
          <span className="profile-text">Profile</span>
        </button>
        <button onClick={logout} className="logout-button">
          <LogOut className="logout-icon" />
          <span className="logout-text">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;