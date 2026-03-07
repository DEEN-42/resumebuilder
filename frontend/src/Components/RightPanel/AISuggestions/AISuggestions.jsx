import React, { useState, useEffect } from 'react';
import './AISuggestions.css';
import { BACKEND_URL } from '../../../constants/apiConfig';
const AISuggestions = ({ resumeId, resumeData, dataHandlers }) => {
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const [error, setError] = useState('');

  const sections = [
    { key: 'internships', label: 'Internships', handler: dataHandlers.handleInternshipsChange },
    { key: 'projects', label: 'Projects', handler: dataHandlers.handleProjectsChange },
    { key: 'skills', label: 'Skills', handler: dataHandlers.handleSkillsChange },
    { key: 'awards', label: 'Awards', handler: dataHandlers.handleAwardsChange },
    { key: 'extraAcademicActivities', label: 'Extra Academic Activities', handler: dataHandlers.handleExtraAcademicActivitiesChange },
    { key: 'coursework', label: 'Coursework', handler: dataHandlers.handleCourseworkChange },
    { key: 'position', label: 'Positions of Responsibility', handler: dataHandlers.handlePositionsOfResponsibilityChange },
    // { key: 'competitions', label: 'Competitions', handler: dataHandlers.handleCompetitionsChange },
  ];

  // Reset selected item when section changes
  useEffect(() => {
    setSelectedItemId('');
    setPrompt('');
    setResponse('');
    setShowResponse(false);
    setError('');
  }, [selectedSection]);

  const handleSectionSelect = (e) => {
    setSelectedSection(e.target.value);
  };

  const handleItemSelect = (e) => {
    setSelectedItemId(e.target.value);
  };

  const getSectionItems = (sectionKey) => {
    const sectionData = resumeData[sectionKey] || [];
    return sectionData.map((item, index) => ({
      id: index,
      title: item.title || item.degree || item.name || item.company || `Item ${index + 1}`,
      subtitle: item.company || item.duration || item.date || ''
    }));
  };

  const getSelectedItemData = () => {
    if (!selectedSection || selectedItemId === '') return null;
    const sectionData = resumeData[selectedSection] || [];
    return sectionData[parseInt(selectedItemId)];
  };

  const handleSendPrompt = async () => {
    if (!selectedSection || selectedItemId === '' || !prompt.trim()) {
      setError('Please select a section, an item, and enter a prompt');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const selectedItemData = getSelectedItemData();
      
      if (!selectedItemData) {
        throw new Error('Selected item data not found');
      }

      const requestBody = {
        prompt: prompt.trim(),
        sectionData: selectedItemData,
        id: resumeId,
        itemId: parseInt(selectedItemId)
      };
      // console.log(requestBody);

      const response = await fetch(`${BACKEND_URL}/ai/${selectedSection}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setResponse(data.data);
        setShowResponse(true);
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (err) {
      setError(`Failed to get AI suggestions: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateData = () => {
    if (!response || !selectedSection || selectedItemId === '') return;

    const sectionHandler = sections.find(s => s.key === selectedSection)?.handler;
    if (!sectionHandler) {
      setError('Handler not available for this section');
      return;
    }

    const itemIndex = parseInt(selectedItemId);

    try {
      if (typeof response === 'object' && response !== null) {
        Object.keys(response).forEach(field => {
          if (response[field] !== undefined && response[field] !== null) {
            sectionHandler(itemIndex, field, response[field]);
          }
        });
        
        setError('');
        
        setTimeout(() => {
          setShowResponse(false);
          setResponse('');
          setPrompt('');
          setSelectedSection('');
          setSelectedItemId('');
        }, 1000);
      } else {
        throw new Error('Invalid response format for updating');
      }
    } catch (err) {
      setError(`Failed to update data: ${err.message}`);
    }
  };

  const handleBackToSelection = () => {
    setShowResponse(false);
    setResponse('');
    setError('');
  };

  const formatResponseForDisplay = (data) => {
    if (!data || typeof data !== 'object') return null;
    
    return Object.entries(data).map(([key, value]) => {
      const formattedKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
      
      if (Array.isArray(value)) {
        return {
          key: formattedKey,
          value: value,
          isArray: true
        };
      }
      
      // Check if value contains newlines and convert to array
      if (typeof value === 'string' && value.includes('\n')) {
        return {
          key: formattedKey,
          value: value.split('\n').filter(line => line.trim()),
          isArray: true
        };
      }
      
      return {
        key: formattedKey,
        value: value,
        isArray: false
      };
    });
  };

  const renderFormattedResponse = (data) => {
    const formattedData = formatResponseForDisplay(data);
    
    if (!formattedData) return <div>No data received</div>;

    return (
      <div className="formatted-preview">
        {formattedData.map((field, index) => (
          <div key={index} className="field-container">
            <div className="field-label">{field.key}:</div>
            <div className="field-value">
              {field.isArray ? (
                <ul>
                  {field.value.map((item, itemIndex) => (
                    <li key={itemIndex}>{item}</li>
                  ))}
                </ul>
              ) : (
                <div>{field.value}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (showResponse) {
    const selectedSectionLabel = sections.find(s => s.key === selectedSection)?.label;
    const selectedItemTitle = getSectionItems(selectedSection)[parseInt(selectedItemId)]?.title;

    return (
      <div className="ai-suggestions-container">
        <div className="ai-suggestions-header">
          <h2>✨ AI Enhancement Results</h2>
          <p>Enhanced {selectedSectionLabel}: {selectedItemTitle}</p>
        </div>
        
        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        <div className="response-container">
          <div className="response-content">
            <h3>🚀 Generated Suggestions</h3>
            <div className="response-text-container">
              <h4>AI Enhanced Data</h4>
              {renderFormattedResponse(response)}
            </div>
            
          </div>
          
          <div className="response-actions">
            <button 
              className="update-btn"
              onClick={handleUpdateData}
              disabled={!response}
            >
              ✅ Apply Updates
            </button>
            <button 
              className="back-btn"
              onClick={handleBackToSelection}
            >
              ⬅️ Back to Selection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-suggestions-container">
      <div className="ai-suggestions-header">
        <h2>🤖 AI Resume Enhancement</h2>
        <p>Select a section and an item to get AI-generated suggestions for improving your resume content.</p>
      </div>

      {error && (
        <div className="error-message">
          <strong>⚠️ Error:</strong> {error}
        </div>
      )}

      <div className="selection-section">
        <div className="dropdown-group">
          <label htmlFor="section-select">📋 Select a Section:</label>
          <select
            id="section-select"
            className="dropdown-select"
            value={selectedSection}
            onChange={handleSectionSelect}
          >
            <option value="">-- Choose Section --</option>
            {sections.map((section) => (
              <option key={section.key} value={section.key}>
                {section.label}
              </option>
            ))}
          </select>
        </div>

        {selectedSection && (
          <div className="dropdown-group">
            <label htmlFor="item-select">🎯 Select Item to Update:</label>
            <select
              id="item-select"
              className="dropdown-select"
              value={selectedItemId}
              onChange={handleItemSelect}
            >
              <option value="">-- Choose Item --</option>
              {getSectionItems(selectedSection).map((item) => (
                <option key={item.id} value={item.id}>
                  #{item.id + 1} - {item.title} {item.subtitle && `(${item.subtitle})`}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {selectedSection && selectedItemId !== '' && (
        <div className="prompt-section">
          <h3>✍️ Enhancement Instructions</h3>
          <p className="instruction-text">
            Describe how you want to improve this {sections.find(s => s.key === selectedSection)?.label.toLowerCase()} item. 
            Be specific about what you want to change, add, or enhance.
          </p>
          
          <textarea
            className="prompt-textarea"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`✨ Describe how you want to enhance this ${sections.find(s => s.key === selectedSection)?.label.toLowerCase()} item...\n\nFor example:\n• Make it more technical and detailed\n• Add quantifiable achievements\n• Improve professional language\n• Add relevant keywords for ATS`}
            rows={6}
          />
          
          <button 
            className="send-btn"
            onClick={handleSendPrompt}
            disabled={loading || !prompt.trim()}
          >
            {loading ? '🔄 Generating Enhancement...' : '🚀 Generate AI Enhancement'}
          </button>
        </div>
      )}
    </div>
  );
};

export default AISuggestions;