import React from 'react';
import { FileText, Eye, Share2, Trash2 } from 'lucide-react';

const ResumeCard = ({
  resume,
  isExpanded,
  isShareInputVisible,
  shareEmail,
  setShareEmail,
  handleResumeClick,
  handleOpenResume,
  handleShareClick,
  handleDeleteResume,
  handleShareResume
}) => {
  return (
    <div className={`resume-card ${isExpanded ? 'resume-card-expanded' : ''}`}>
      <div 
        onClick={() => handleResumeClick(resume)}
        className="resume-card-content"
      >
        <div className="resume-card-header">
          <div className={`resume-card-icon ${isExpanded ? 'resume-card-icon-expanded' : ''}`}>
            <FileText className={`resume-icon ${isExpanded ? 'resume-icon-expanded' : ''}`} />
          </div>
          <div className="resume-card-info">
            <h3 className={`resume-card-title ${isExpanded ? 'resume-card-title-expanded' : ''}`}>
              {resume.title}
            </h3>
            <p className={`resume-card-description ${isExpanded ? 'resume-card-description-expanded' : ''}`}>
              {resume.description}
            </p>
          </div>
        </div>
        <div className="resume-card-footer">
          <span className={`resume-badge ${resume.type === 'owned' ? 'resume-badge-owned' : 'resume-badge-shared'}`}>
            {resume.type === 'owned' ? 'Owned' : 'Shared'}
          </span>
        </div>
      </div>

      {/* Expanded Actions */}
      {isExpanded && (
        <div className="resume-expanded-actions">
          <div className="expanded-actions-border">
            <div className="expanded-actions-buttons">
              <button className="expanded-action-button expanded-action-view"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenResume(resume.id);
                }}
              >
                <Eye className="expanded-action-icon" />
                <span className="expanded-action-text">Open</span>
              </button>
              
              {resume.type === 'owned' && (
                <>
                  <button 
                    onClick={(e) => handleShareClick(e, resume.id)}
                    className="expanded-action-button expanded-action-share"
                  >
                    <Share2 className="expanded-action-icon" />
                    <span className="expanded-action-text">Share</span>
                  </button>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteResume(resume.id);
                    }}
                    className="expanded-action-button expanded-action-delete"
                  >
                    <Trash2 className="expanded-action-icon" />
                    <span className="expanded-action-text">Delete</span>
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* Share Input Section */}
          {isShareInputVisible && resume.type === 'owned' && (
            <div className="share-input-section">
              <div className="share-input-container">
                <input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="Enter email address to share with"
                  className="share-input"
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShareResume(resume.id);
                  }}
                  className="share-submit-button"
                  disabled={!shareEmail.trim()}
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResumeCard;