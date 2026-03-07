import React from 'react';
import { FileText, Eye, Trash2 } from 'lucide-react';

const ResumeDetails = ({
  selectedResume,
  setSelectedResume,
  handleOpenResume,
  handleDeleteResume
}) => {
  return (
    <div className="resume-details">
      <div className="resume-details-card">
        <div className="resume-details-header">
          <div className="resume-details-icon">
            <FileText className="details-icon" />
          </div>
          <h3 className="resume-details-title">{selectedResume.title}</h3>
          <p className="resume-details-description">{selectedResume.description}</p>
        </div>

        <div className="resume-actions">
          <button className="action-button action-button-view"
            onClick={() => handleOpenResume(selectedResume.id)}
          >
            <Eye className="action-icon" />
            <span className="action-text">Open Resume</span>
          </button>
          
          {selectedResume.type === 'owned' && (
            <button 
              onClick={() => handleDeleteResume(selectedResume.id)}
              className="action-button action-button-delete"
            >
              <Trash2 className="action-icon" />
              <span className="action-text">Delete</span>
            </button>
          )}
        </div>

        <button
          onClick={() => setSelectedResume(null)}
          className="back-button"
        >
          Back to List
        </button>
      </div>
    </div>
  );
};

export default ResumeDetails;