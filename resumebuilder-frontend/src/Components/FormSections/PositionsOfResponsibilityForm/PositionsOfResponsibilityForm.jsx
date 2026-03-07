import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import './PositionsOfResponsibilityForm.css';

const PositionsOfResponsibilityForm = ({ data, onChange }) => {
  return (
    <div className="positions-form">
      <h3 className="form-title">Positions of Responsibility</h3>
      
      {data.length === 0 ? (
        <div className="empty-state">
          <button
            onClick={() => onChange('add')}
            className="add-first-btn"
          >
            <Plus size={16} />
            Add Position
          </button>
        </div>
      ) : (
        <div className="positions-list">
          {data.map((position, index) => (
            <div key={index} className="position-item">
              <div className="position-header">
                <h4>Position {index + 1}</h4>
                <button
                  onClick={() => onChange(index, 'remove')}
                  className="remove-btn"
                  title="Remove position"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              
              <div className="position-fields">
                <input
                  type="text"
                  placeholder="Position Title (e.g., Student Council President)"
                  value={position.title || ''}
                  onChange={(e) => onChange(index, 'title', e.target.value)}
                  className="form-input"
                />
                
                <input
                  type="text"
                  placeholder="Duration (e.g., Jan 2023 - Dec 2023)"
                  value={position.time || ''} // Changed from 'duration' to 'time'
                  onChange={(e) => onChange(index, 'time', e.target.value)} // Changed from 'duration' to 'time'
                  className="form-input"
                />
                
                <textarea
                  placeholder="Description of responsibilities and achievements (separate each point with a new line)..."
                  value={position.description || ''}
                  onChange={(e) => onChange(index, 'description', e.target.value)}
                  className="form-textarea"
                  rows="4"
                />
              </div>
            </div>
          ))}
          
          <button
            onClick={() => onChange('add')}
            className="add-more-btn"
          >
            <Plus size={16} />
            Add Another Position
          </button>
        </div>
      )}
    </div>
  );
};

export default PositionsOfResponsibilityForm;