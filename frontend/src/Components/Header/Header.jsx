// Components/Header/Header.jsx
import React from 'react';
import { Home, Wand2, Download, Plus, Minus, Share2, BarChart3, Sun, Moon } from 'lucide-react';
import { SaveStatusIndicator, ConnectionStatusIndicator, ConnectedUsersIndicator } from '../StatusComponents/StatusComponents.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import './Header.css';

const Header = ({
  returnHandler,
  handleTemplateChange,
  handleAISuggestions,
  handleZoomIn,
  handleZoomOut,
  handleZoomReset,
  handleDownload,
  handleShare,
  handleATSscore,
  saveResumeData,
  selectedTemplate,
  templates,
  zoomLevel,
  isDownloading,
  saveStatus,
  lastSaved,
  lastUpdatedBy,
  isConnected,
  connectedUsers
}) => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="resume-header">
      <div className="header-left">
        <button onClick={returnHandler} className="hdr-btn hdr-btn--ghost" title="Dashboard">
          <Home size={17} />
        </button>
        <span className="header-brand">ResumeBuilder</span>
        <div className="header-status">
          <SaveStatusIndicator
            saveStatus={saveStatus}
            lastSaved={lastSaved}
            lastUpdatedBy={lastUpdatedBy}
            onRetry={saveResumeData}
          />
          <ConnectionStatusIndicator isConnected={isConnected} />
          <ConnectedUsersIndicator isConnected={isConnected} connectedUsers={connectedUsers} />
        </div>
      </div>

      <div className="header-actions">
        {/* Template selector */}
        <select
          value={selectedTemplate}
          onChange={(e) => handleTemplateChange(e.target.value)}
          className="template-selector"
          title="Switch template"
        >
          {Object.entries(templates).map(([key, template]) => (
            <option key={key} value={key}>{template.name}</option>
          ))}
        </select>

        <div className="hdr-divider" />

        {/* Zoom */}
        <div className="zoom-pill">
          <button onClick={handleZoomOut} className="zoom-btn" title="Zoom out"><Minus size={13} /></button>
          <span className="zoom-level" onClick={handleZoomReset} title="Reset zoom">{zoomLevel}%</span>
          <button onClick={handleZoomIn} className="zoom-btn" title="Zoom in"><Plus size={13} /></button>
        </div>

        <div className="hdr-divider" />

        {/* Action icon buttons */}
        <button onClick={handleAISuggestions} className="hdr-btn hdr-btn--purple" title="AI suggestions">
          <Wand2 size={16} />
        </button>
        <button onClick={handleShare} className="hdr-btn hdr-btn--teal" title="Share resume">
          <Share2 size={16} />
        </button>
        <button onClick={handleATSscore} className="hdr-btn hdr-btn--amber" title="ATS score">
          <BarChart3 size={16} />
        </button>
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className={`hdr-btn hdr-btn--blue${isDownloading ? ' hdr-btn--loading' : ''}`}
          title={isDownloading ? 'Generating PDF…' : 'Download PDF'}
        >
          <Download size={16} />
        </button>

        <div className="hdr-divider" />

        {/* Theme toggle */}
        <button onClick={toggleTheme} className="hdr-btn hdr-btn--toggle" title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </div>
  );
};

export default Header;