import React from 'react';
import './InternshipsForm.css';

const InternshipsForm = ({ data, onChange }) => (
  <div className="internships-form">
    <h3 className="form-title">Internships</h3>
    {data.map((internship, index) => (
      <div key={index} className="internship-item">
        <input
          type="text"
          placeholder="Position Title"
          value={internship.title}
          onChange={(e) => onChange(index, 'title', e.target.value)}
          className="internship-input"
        />
        <div className="internship-row">
          <input
            type="text"
            placeholder="Company"
            value={internship.company}
            onChange={(e) => onChange(index, 'company', e.target.value)}
            className="internship-input"
          />
          <input
            type="text"
            placeholder="Duration"
            value={internship.duration}
            onChange={(e) => onChange(index, 'duration', e.target.value)}
            className="internship-input"
          />
        </div>
        <textarea
          placeholder="Description"
          value={internship.description}
          onChange={(e) => onChange(index, 'description', e.target.value)}
          className="internship-textarea"
          rows="3"
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
      + Add Internship
    </button>
  </div>
);

export default InternshipsForm;