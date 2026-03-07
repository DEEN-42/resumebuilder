import React from 'react';
import { Type, Palette, Bold, Italic, Underline, Upload, Image, Building } from 'lucide-react';
import './PersonalInfoForm.css';
import { BACKEND_URL } from '../../../constants/apiConfig.js';

const PersonalInfoForm = ({ id, data, onChange, styles, onStyleChange }) => {
  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files[0];
    const resumeId = id; 
    const token = localStorage.getItem('token');
  
    if (!file || !resumeId) return;
  
    try {
      const formData = new FormData();
      formData.append('image', file);
  
      const res = await fetch(`${BACKEND_URL}/resumes/update/${resumeId}/upload`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}` // remove if not using auth
        },
        body: formData
      });
  
      if (!res.ok) throw new Error('Image upload failed');
  
      const result = await res.json();
      const imageUrl = result.url;
  
      onChange('profilePicture', imageUrl);
    } catch (err) {
      console.error('Profile picture upload error:', err);
      alert('Failed to upload image.');
    }
  };
  

  const handleInstituteLogoUpload = async (e) => {
    const file = e.target.files[0];
    const resumeId = id;
    const token = localStorage.getItem('token'); 
  
    if (!file || !resumeId) return;
  
    try {
      const formData = new FormData();
      formData.append('image', file); // Field name must be "image" (matches multer config)
  
      const res = await fetch(`${BACKEND_URL}/resumes/update/${resumeId}/upload`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}` // Remove this line if no auth
        },
        body: formData
      });
  
      if (!res.ok) throw new Error('Institute logo upload failed');
  
      const result = await res.json();
      const imageUrl = result.url;
  
      onChange('institutelogo', imageUrl); // Save cloud URL in form state
    } catch (err) {
      console.error('Institute logo upload error:', err);
      alert('Failed to upload institute logo.');
    }
  };
  

  const StyleButton = ({ active, onClick, icon: Icon, label }) => (
    <button
        type="button"
        className={`style-button ${active ? 'active' : ''}`}
        onClick={onClick}
        title={label}
    >
        <Icon size={18} />
    </button>
);

const StyleGroup = ({ title, category, styles, onStyleChange }) => (
  <div className="style-group">
      <h5 className="style-group-title">{title}</h5>
      <div className="style-controls">
          <div className="style-row">
              <div className="font-size-control">
                  <Type size={18} />
                  <span className="font-size-label">Size:</span>
                  <input
                      type="number"
                      min="8"
                      max="24"
                      value={styles[category].fontSize}
                      onChange={(e) => onStyleChange(category, 'fontSize', parseInt(e.target.value))}
                      className="font-size-input"
                  />
                  <span>px</span>
              </div>
              <div className="font-family-control">
                  <select
                      value={styles[category].fontFamily}
                      onChange={(e) => onStyleChange(category, 'fontFamily', e.target.value)}
                      className="font-family-select"
                  >
                      <option value="Arial">Arial</option>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Helvetica">Helvetica</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Verdana">Verdana</option>
                  </select>
              </div>
          </div>
          <div className="style-row">
              <div className="color-control">
                  <Palette size={18} />
                  <span className="color-label">Color:</span>
                  <input
                      type="color"
                      value={styles[category].color}
                      onChange={(e) => onStyleChange(category, 'color', e.target.value)}
                      className="color-input"
                  />
              </div>
              <div className="text-style-controls">
                  <StyleButton
                      active={styles[category].bold}
                      onClick={() => onStyleChange(category, 'bold', !styles[category].bold)}
                      icon={Bold}
                      label="Bold"
                  />
                  <StyleButton
                      active={styles[category].italic}
                      onClick={() => onStyleChange(category, 'italic', !styles[category].italic)}
                      icon={Italic}
                      label="Italic"
                  />
                  <StyleButton
                      active={styles[category].underline}
                      onClick={() => onStyleChange(category, 'underline', !styles[category].underline)}
                      icon={Underline}
                      label="Underline"
                  />
              </div>
          </div>
      </div>
  </div>
);

  return (
    <div className="personal-info-form">
      <h3 className="form-title">Personal Information</h3>
      
      {/* Profile Picture Upload */}
      <div className="profile-picture-section">
        <div className="picture-upload-area">
          {data.profilePicture ? (
            <div className="picture-preview">
              <img src={data.profilePicture} alt="Profile" className="profile-image" />
              <button
                type="button"
                className="change-picture-btn"
                onClick={() => document.getElementById('profile-upload').click()}
              >
                <Image size={16} />
                Change Photo
              </button>
            </div>
          ) : (
            <div 
              className="upload-placeholder"
              onClick={() => document.getElementById('profile-upload').click()}
            >
              <Upload size={24} />
              <span>Upload Profile Picture</span>
            </div>
          )}
          <input
            id="profile-upload"
            type="file"
            accept="image/*"
            onChange={handleProfilePictureUpload}
            className="hidden-file-input"
          />
        </div>
      </div>

      {/* Institute Logo Upload */}
      <div className="institute-logo-section">
        <div className="logo-upload-area">
          {data.institutelogo ? (
            <div className="logo-preview">
              <img src={data.institutelogo} alt="Institute Logo" className="institute-logo-image" />
              <button
                type="button"
                className="change-logo-btn"
                onClick={() => document.getElementById('logo-upload').click()}
              >
                <Building size={16} />
                Change Logo
              </button>
            </div>
          ) : (
            <div 
              className="upload-placeholder"
              onClick={() => document.getElementById('logo-upload').click()}
            >
              <Building size={24} />
              <span>Upload Institute Logo</span>
            </div>
          )}
          <input
            id="logo-upload"
            type="file"
            accept="image/*"
            onChange={handleInstituteLogoUpload}
            className="hidden-file-input"
          />
        </div>
      </div>

      <div className="form-fields">
        <input
          type="text"
          placeholder="Full Name"
          value={data.name}
          onChange={(e) => onChange('name', e.target.value)}
          className="form-input"
        />
        <input
          type="text"
          placeholder="Roll Number"
          value={data.rollNo}
          onChange={(e) => onChange('rollNo', e.target.value)}
          className="form-input"
        />
        <input
          type="text"
          placeholder="Program"
          value={data.program}
          onChange={(e) => onChange('program', e.target.value)}
          className="form-input"
        />
        <input
          type="text"
          placeholder="Specialization"
          value={data.specialization}
          onChange={(e) => onChange('specialization', e.target.value)}
          className="form-input"
        />
        <input
          type="email"
          placeholder="Email Address"
          value={data.email}
          onChange={(e) => onChange('email', e.target.value)}
          className="form-input"
        />
        <input
          type="tel"
          placeholder="Contact Number"
          value={data.contact}
          onChange={(e) => onChange('contact', e.target.value)}
          className="form-input"
        />
        <input
          type="url"
          placeholder="LinkedIn Profile"
          value={data.linkedin}
          onChange={(e) => onChange('linkedin', e.target.value)}
          className="form-input"
        />
        <input
          type="url"
          placeholder="GitHub Profile"
          value={data.github}
          onChange={(e) => onChange('github', e.target.value)}
          className="form-input"
        />
      </div>
      
      <div className="style-settings">
        <h4 className="settings-title">Style Settings</h4>
        <StyleGroup
          title="Headings"
          category="heading"
          styles={styles}
          onStyleChange={onStyleChange}
        />
        <StyleGroup
          title="Descriptions"
          category="description"
          styles={styles}
          onStyleChange={onStyleChange}
        />
      </div>
    </div>
  );
};

export default PersonalInfoForm;