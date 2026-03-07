import React from 'react';
import './ProjectsForm.css';

const ProjectsForm = ({ data, onChange }) => (
  <div className="projects-form">
    <h3 className="form-title">Projects</h3>
    {data.map((project, index) => (
      <div key={index} className="project-item">
        <div className="project-row">
          <input
            type="text"
            placeholder="Project Title"
            value={project.title}
            onChange={(e) => onChange(index, 'title', e.target.value)}
            className="project-input"
          />
          <input
            type="text"
            placeholder="Duration"
            value={project.duration}
            onChange={(e) => onChange(index, 'duration', e.target.value)}
            className="project-input"
          />
        </div>
        <input
          type="url"
          placeholder="GitHub Repository or Live Project URL"
          value={project.url || ''}
          onChange={(e) => onChange(index, 'url', e.target.value)}
          className="project-input project-url"
        />
        <textarea
          placeholder="Description"
          value={project.description}
          onChange={(e) => onChange(index, 'description', e.target.value)}
          className="project-textarea"
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
      + Add Project
    </button>
  </div>
);

export default ProjectsForm;