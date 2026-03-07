import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import './SkillsForm.css';

const SkillsForm = ({ data, onChange }) => {
  return (
    <div className="skills-form">
      <h3 className="form-title">Skills</h3>
      
      {data.length === 0 ? (
        <div className="empty-state">
          <button
            onClick={() => onChange('add')}
            className="add-first-btn"
          >
            <Plus size={16} />
            Add Skill
          </button>
        </div>
      ) : (
        <div className="skills-list">
          {data.map((skill, index) => (
            <div key={index} className="skill-item">
              <div className="skill-header">
                <button
                  onClick={() => onChange(index, 'remove')}
                  className="remove-btn"
                  title="Remove skill"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              
              <div className="skill-fields">
                <input
                  type="text"
                  placeholder="Skill Title (e.g., Python Programming, Machine Learning)"
                  value={skill.title}
                  onChange={(e) => onChange(index, 'title', e.target.value)}
                  className="form-input"
                />
                
                <textarea
                  placeholder="Description of your proficiency and experience with this skill..."
                  value={skill.description}
                  onChange={(e) => onChange(index, 'description', e.target.value)}
                  className="form-textarea"
                  rows="3"
                />
              </div>
            </div>
          ))}
          
          <button
            onClick={() => onChange('add')}
            className="add-more-btn"
          >
            <Plus size={16} />
            Add Another Skill
          </button>
        </div>
      )}
    </div>
  );
};

export default SkillsForm;