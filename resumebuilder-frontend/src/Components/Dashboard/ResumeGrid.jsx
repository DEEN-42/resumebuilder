import React from 'react';
import { FileText } from 'lucide-react';
import ResumeCard from './ResumeCard';

const ResumeGrid = ({
  activeSection,
  resumes,
  expandedResume,
  showShareInput,
  shareEmail,
  setShareEmail,
  handleResumeClick,
  handleOpenResume,
  handleShareClick,
  handleDeleteResume,
  handleShareResume
}) => {
  if (resumes.length === 0) {
    return (
      <div className="resume-grid">
        <div className="empty-state">
          <FileText className="empty-icon" />
          <h3 className="empty-title">
            {activeSection === 'owned' ? 'No resumes created yet' : 'No resumes shared with you'}
          </h3>
          <p className="empty-description">
            {activeSection === 'owned' 
              ? 'Create your first resume to get started'
              : 'Resumes shared with you will appear here'
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="resume-grid">
      {resumes.map((resume) => (
        <ResumeCard
          key={resume.id}
          resume={resume}
          isExpanded={expandedResume?.id === resume.id}
          isShareInputVisible={showShareInput === resume.id}
          shareEmail={shareEmail}
          setShareEmail={setShareEmail}
          handleResumeClick={handleResumeClick}
          handleOpenResume={handleOpenResume}
          handleShareClick={handleShareClick}
          handleDeleteResume={handleDeleteResume}
          handleShareResume={handleShareResume}
        />
      ))}
    </div>
  );
};

export default ResumeGrid;