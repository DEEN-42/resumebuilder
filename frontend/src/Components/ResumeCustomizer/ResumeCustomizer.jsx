import React, { useRef } from 'react';
import './ResumeCustomizer.css';

// The component now accepts `onSectionOrderChange` to update the parent's state.
const ResumeCustomizer = ({ sections, onSectionOrderChange }) => {
  const draggedItem = useRef(null);
  const draggedOverItem = useRef(null);

  // This handler now calls the prop function to update the state.
  const handleSectionDragSort = () => {
    // Create a mutable clone of the sections array to reorder.
    const sectionsClone = [...sections];
    
    // Standard drag-and-drop logic to swap items.
    const temp = sectionsClone[draggedItem.current];
    sectionsClone.splice(draggedItem.current, 1);
    sectionsClone.splice(draggedOverItem.current, 0, temp);
    
    // Call the handler passed from the parent component with the new order.
    onSectionOrderChange(sectionsClone);
  };
  
  return (
    <div className="customizer-wrapper">
      <h2>Customize Your Resume</h2>

      {/* Section Order Customizer */}
      <div className="customizer-section">
        <h3>Section Order</h3>
        <p>Drag and drop to reorder the sections.</p>
        <ul className="draggable-list">
          {sections.map((section, index) => (
            <li
              key={section.id}
              draggable
              onDragStart={() => (draggedItem.current = index)}
              onDragEnter={() => (draggedOverItem.current = index)}
              onDragEnd={handleSectionDragSort}
              onDragOver={(e) => e.preventDefault()}
            >
              {section.title}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ResumeCustomizer;
