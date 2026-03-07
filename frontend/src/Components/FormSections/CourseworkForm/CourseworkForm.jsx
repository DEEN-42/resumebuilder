import React from 'react';
import './CourseworkForm.css';

const CourseworkForm = ({ data, onChange }) => (
  <div className="coursework-form">
    <h3 className="form-title">Coursework Information</h3>
    {data.map((course, index) => (
      <div key={index} className="course-item">
        <div className="course-row">
          <input
            type="text"
            placeholder="Course Title"
            value={course.title}
            onChange={(e) => onChange(index, 'title', e.target.value)}
            className="course-input"
          />
        </div>
        <textarea
          placeholder="Description"
          value={course.description}
          onChange={(e) => onChange(index, 'description', e.target.value)}
          className="course-textarea"
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
      + Add Course
    </button>
  </div>
);

export default CourseworkForm;