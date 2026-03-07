import React from 'react';
import './AwardsForm.css';

const AwardsForm = ({ data, onChange }) => (
  <div className="awards-form">
    <h3 className="form-title">Awards and Achievements</h3>
    {data.map((award, index) => (
      <div key={index} className="award-item">
        <div className="award-row">
          <input
            type="text"
            placeholder="Award Title"
            value={award.title}
            onChange={(e) => onChange(index, 'title', e.target.value)}
            className="award-input"
          />
        </div>
        <textarea
          placeholder="Description"
          value={award.description}
          onChange={(e) => onChange(index, 'description', e.target.value)}
          className="award-textarea"
          rows="2"
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
      + Add Award
    </button>
  </div>
);

export default AwardsForm;