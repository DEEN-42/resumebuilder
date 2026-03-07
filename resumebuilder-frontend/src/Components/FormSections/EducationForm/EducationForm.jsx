import React from 'react';
import './EducationForm.css';

const EducationForm = ({ data, onChange }) => (
  <div className="education-form">
    <h3 className="form-title">Education</h3>
    {data.map((edu, index) => (
      <div key={index} className="education-item">
        <div className="education-row">
          <input
            type="text"
            placeholder="Year"
            value={edu.year}
            onChange={(e) => onChange(index, 'year', e.target.value)}
            className="education-input"
          />
          <input
            type="text"
            placeholder="CGPA/Marks"
            value={edu.cgpa}
            onChange={(e) => onChange(index, 'cgpa', e.target.value)}
            className="education-input"
          />
        </div>
        <input
          type="text"
          placeholder="Degree/Exam"
          value={edu.degree}
          onChange={(e) => onChange(index, 'degree', e.target.value)}
          className="education-input full-width"
        />
        <input
          type="text"
          placeholder="Institute"
          value={edu.institute}
          onChange={(e) => onChange(index, 'institute', e.target.value)}
          className="education-input full-width"
        />
        <button
          onClick={() => onChange(index, 'remove')}
          className="remove-button"
        >
          Remove
        </button>
      </div>
    ))}
    <button
      onClick={() => onChange('add')}
      className="add-button"
    >
      + Add Education
    </button>
  </div>
);

export default EducationForm;