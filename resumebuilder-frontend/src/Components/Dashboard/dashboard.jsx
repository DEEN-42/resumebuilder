import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import MainContent from './MainContent';
import CreateResumeModal from './CreateResumeModal';
import { useResumeDataforDashboard } from '../../hooks/useResumeData';
import { useResumeActions } from '../../hooks/useResumeActions';
import { BACKEND_URL } from '../../constants/apiConfig';
import './dashboard.css';

const Dashboard = ({ logout }) => {
  const [activeSection, setActiveSection] = useState('owned');
  const [selectedResume, setSelectedResume] = useState(null);
  const [expandedResume, setExpandedResume] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [showShareInput, setShowShareInput] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const navigate = useNavigate();
  
  const { resumeData, setResumeData } = useResumeDataforDashboard();
  const { handleCreateResume, handleDeleteResume, handleShareResume } = useResumeActions(
    setResumeData,
    setShowCreateForm,
    setShareEmail,
    setShowShareInput,
    setExpandedResume
  );

  const handleRefresh = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }

      const response = await fetch(`${BACKEND_URL}/users/getResumeList`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Update the resume data using the hook's update function
      setResumeData(data);
      
      // Clear any expanded states after refresh
      setExpandedResume(null);
      setShowShareInput(null);
      setShareEmail('');
      setSelectedResume(null);
      
    } catch (error) {
      console.error('Error refreshing resume list:', error);
      // Optionally show user-friendly error message
    }
  };

  // Handle page refresh/reload
  useEffect(() => {
    const handlePageRefresh = () => {
      // Call handleRefresh when component mounts (page refresh)
      if (isInitialLoad) {
        handleRefresh();
        setIsInitialLoad(false);
      }
    };

    handlePageRefresh();
  }, [isInitialLoad]);

  // Optional: Handle browser refresh event
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      // You can add any cleanup logic here if needed
      // This runs just before the page is refreshed/closed
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const handleResumeClick = (resume) => {
    if (expandedResume?.id === resume.id) {
      setExpandedResume(null);
      setShowShareInput(null);
      setShareEmail('');
    } else {
      setExpandedResume(resume);
      setShowShareInput(null);
      setShareEmail('');
    }
  };

  const handleOpenResume = (id) => {
    navigate(`/project/${id}`);
  };

  const handleShareClick = (e, resumeId) => {
    e.stopPropagation();
    setShowShareInput(showShareInput === resumeId ? null : resumeId);
    setShareEmail('');
  };

  const getResumeCount = (section) => {
    return resumeData && resumeData[section] ? resumeData[section].length : 0;
  };

  const getResumes = (section) => {
    return resumeData && resumeData[section] ? resumeData[section] : [];
  };

  return (
    <div className="dashboard-container">
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        getResumeCount={getResumeCount}
        logout={logout}
      />
      
      <MainContent
        activeSection={activeSection}
        selectedResume={selectedResume}
        setSelectedResume={setSelectedResume}
        expandedResume={expandedResume}
        showShareInput={showShareInput}
        shareEmail={shareEmail}
        setShareEmail={setShareEmail}
        setShowCreateForm={setShowCreateForm}
        getResumes={getResumes}
        handleResumeClick={handleResumeClick}
        handleOpenResume={handleOpenResume}
        handleShareClick={handleShareClick}
        handleDeleteResume={handleDeleteResume}
        handleShareResume={handleShareResume}
        setResumeData={setResumeData}
        onRefresh={handleRefresh}
      />
      
      {showCreateForm && (
        <CreateResumeModal
          showCreateForm={showCreateForm}
          setShowCreateForm={setShowCreateForm}
          handleCreateResume={handleCreateResume}
        />
      )}
    </div>
  );
};

export default Dashboard;