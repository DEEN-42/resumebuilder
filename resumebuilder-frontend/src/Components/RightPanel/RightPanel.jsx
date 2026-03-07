// Components/RightPanel/RightPanel.jsx
import React, { useState } from 'react';
import { Share2, Target, Users, BarChart3, Wand2 } from 'lucide-react';
import SharingSection from './SharingSection/SharingSection.jsx';
import AISuggestions from './AISuggestions/AISuggestions.jsx';
import ATSScorer from './ATSScorer/ATSScorer.jsx';
import './RightPanel.css';

const RightPanel = ({ id, resumeData, activeTab, dataHandlers, connectedUsers}) => {


  const tabs = [
    {
      id: 'share',
      label: 'Share',
      icon: Share2,
      component: <SharingSection id={id} connectedUsers={connectedUsers}/>
    },
    {
      id: 'ats',
      label: 'ATS Score',
      icon: BarChart3,
      component: <ATSScorer resumeId= {id} resumeData={resumeData} />
    },
    {
      id: 'ai suggestions',
      label: 'AI Suggestions',
      icon: Wand2,
      component: <AISuggestions resumeId= {id} resumeData={resumeData} dataHandlers={dataHandlers} />
    }
  ];

  return (
    <div className="right-panel">
      {/* Tab Navigation
      <div className="panel-tabs">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <IconComponent size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div> */}

      {/* Tab Content */}
      <div className="panel-content">
        {tabs.find(tab => tab.id === activeTab)?.component}
      </div>
    </div>
  );
};

export default RightPanel;