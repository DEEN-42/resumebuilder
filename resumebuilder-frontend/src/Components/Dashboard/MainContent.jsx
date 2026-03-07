import React, { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import ResumeDetails from './ResumeDetails';
import ResumeGrid from './ResumeGrid';

const MainContent = ({
  activeSection,
  selectedResume,
  setSelectedResume,
  expandedResume,
  showShareInput,
  shareEmail,
  setShareEmail,
  setShowCreateForm,
  getResumes,
  handleResumeClick,
  handleOpenResume,
  handleShareClick,
  handleDeleteResume,
  handleShareResume,
  setResumeData,
  onRefresh
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="main-content">
      {/* Header */}
      <div className="header">
        <div className="header-content">
          <div>
            <h2 className="header-title">
              {activeSection} Resumes
            </h2>
            <p className="header-subtitle">
              {activeSection === 'owned' ? 'Create and manage your resumes' : 'Resumes shared with you'}
            </p>
          </div>
          <div className="header-buttons">
            
            {activeSection === 'owned' && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="create-button"
              >
                <Plus className="create-icon" />
                <span className="create-text">Create Resume</span>
              </button>
            )}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="create-button"
            >
              <RefreshCw className={`refresh-icon ${isRefreshing ? 'spinning' : ''}`} />
              <span className="refresh-text">
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="content-area">
        {selectedResume ? (
          <ResumeDetails
            selectedResume={selectedResume}
            setSelectedResume={setSelectedResume}
            handleOpenResume={handleOpenResume}
            handleDeleteResume={handleDeleteResume}
          />
        ) : (
          <ResumeGrid
            activeSection={activeSection}
            resumes={getResumes(activeSection)}
            expandedResume={expandedResume}
            showShareInput={showShareInput}
            shareEmail={shareEmail}
            setShareEmail={setShareEmail}
            handleResumeClick={handleResumeClick}
            handleOpenResume={handleOpenResume}
            handleShareClick={handleShareClick}
            handleDeleteResume={handleDeleteResume}
            handleShareResume={handleShareResume}
          />
        )}
      </div>
    </div>
  );
};

export default MainContent;