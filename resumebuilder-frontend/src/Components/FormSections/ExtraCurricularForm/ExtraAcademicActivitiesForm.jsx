import React from 'react';
import './ExtraAcademicActivitiesForm.css';

const ExtraAcademicActivitiesForm = ({ data, onChange }) => (
  <div className="extra-academic-form">
    <h3 className="form-title">Extra Academic Activities</h3>
    {data.map((activity, index) => (
      <div key={index} className="activity-item">
        <div className="activity-row">
          <input
            type="text"
            placeholder="Activity Title"
            value={activity.title}
            onChange={(e) => onChange(index, 'title', e.target.value)}
            className="activity-input"
          />
        </div>
        <textarea
          placeholder="Description"
          value={activity.description}
          onChange={(e) => onChange(index, 'description', e.target.value)}
          className="activity-textarea"
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
      + Add Activity
    </button>
  </div>
);

export default ExtraAcademicActivitiesForm;