import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { TEMPLATES } from '../../constants/templates';

const CreateResumeModal = ({ showCreateForm, setShowCreateForm, handleCreateResume }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    template: ''
  });

  const handleSubmit = () => {
    handleCreateResume(formData);
    setFormData({ title: '', description: '', template: '' });
  };

  if (!showCreateForm) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">Create New Resume</h3>
          <button
            onClick={() => setShowCreateForm(false)}
            className="modal-close"
          >
            <X className="modal-close-icon" />
          </button>
        </div>

        <div className="modal-form">
          <div className="form-group">
            <label className="form-label">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="form-input"
              placeholder="Enter resume title"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="form-textarea"
              rows="3"
              placeholder="Brief description of this resume"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Template</label>
            <div className="template-options">
              {Object.entries(TEMPLATES).map(([key, template]) => (
                <label key={key} className="template-option">
                  <input
                    type="radio"
                    name="template"
                    value={key}
                    checked={formData.template === key}
                    onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                    className="template-radio"
                  />
                  <span className="template-logo">{template.logo}</span>
                  <span className="template-name">{template.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button
            onClick={() => setShowCreateForm(false)}
            className="modal-button modal-button-cancel"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!formData.title || !formData.description || !formData.template}
            className="modal-button modal-button-create"
          >
            <Save className="modal-button-icon" />
            <span>Create Resume</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateResumeModal;