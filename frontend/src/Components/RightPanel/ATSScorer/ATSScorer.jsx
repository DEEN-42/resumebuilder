// Components/ATSScorer/ATSScorer.jsx
import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, AlertCircle, CheckCircle, XCircle, Lightbulb, RefreshCw } from 'lucide-react';
import './ATSScorer.css';
import { BACKEND_URL } from '../../../constants/apiConfig';

const ATSScorer = ({ resumeData, resumeId }) => {
  const [score, setScore] = useState(0);
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalyzed, setLastAnalyzed] = useState(null);
  const [error, setError] = useState(null);

  // Make API call to analyze resume
  const analyzeResume = async () => {
    if (!resumeId) {
      setError('Resume ID is required');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${BACKEND_URL}/ai/atsScore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: resumeId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Update state with API response
      setScore(result.score || 0);
      setAnalysis({
        strengths: result.strengths || [],
        weaknesses: result.areasToImprove || [],
        suggestions: result.aiSuggestions || []
      });
      setLastAnalyzed(new Date());
      
    } catch (err) {
      console.error('Error analyzing resume:', err);
      setError(err.message || 'Failed to analyze resume');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981'; // Green
    if (score >= 60) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  const getScoreStatus = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Average';
    return 'Needs Improvement';
  };

  // Auto-analyze when component mounts or resumeId changes
  useEffect(() => {
    if (resumeId) {
      analyzeResume();
    }
  }, [resumeId]);

  return (
    <div className="ats-scorer">
      <div className="ats-header">
        <div className="ats-title">
          <BarChart3 size={20} />
          <h3>ATS Score</h3>
        </div>
        <button 
          className="refresh-btn"
          onClick={analyzeResume}
          disabled={isAnalyzing || !resumeId}
          title={!resumeId ? 'Resume ID required' : 'Refresh ATS Score'}
        >
          <RefreshCw size={14} className={isAnalyzing ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="ats-content">
        {/* Error Display */}
        {error && (
          <div className="error-message">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Score Display */}
        <div className="score-display">
          <div 
            className="score-circle"
            style={{ '--score-color': getScoreColor(score) }}
          >
            <div className="score-inner">
              <span className="score-number">{score}</span>
              <span className="score-max">/100</span>
            </div>
          </div>
          <div className="score-status">
            <span className="status-text" style={{ color: getScoreColor(score) }}>
              {getScoreStatus(score)}
            </span>
            {lastAnalyzed && (
              <span className="last-analyzed">
                Last analyzed: {lastAnalyzed.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Analysis Results */}
        {analysis && !isAnalyzing && (
          <div className="analysis-results">
            {/* Strengths */}
            {analysis.strengths.length > 0 && (
              <div className="analysis-section strengths">
                <h4>
                  <CheckCircle size={16} />
                  Strengths
                </h4>
                <ul>
                  {analysis.strengths.map((strength, index) => (
                    <li key={index}>{strength}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Areas to Improve */}
            {analysis.weaknesses.length > 0 && (
              <div className="analysis-section weaknesses">
                <h4>
                  <XCircle size={16} />
                  Areas to Improve
                </h4>
                <ul>
                  {analysis.weaknesses.map((weakness, index) => (
                    <li key={index}>{weakness}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* AI Suggestions */}
            {analysis.suggestions.length > 0 && (
              <div className="analysis-section suggestions">
                <h4>
                  <Lightbulb size={16} />
                  AI Suggestions
                </h4>
                <ul>
                  {analysis.suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {isAnalyzing && (
          <div className="analysis-loading">
            <div className="loading-spinner">
              <RefreshCw size={20} className="animate-spin" />
            </div>
            <p>Analyzing your resume...</p>
          </div>
        )}

        {/* Empty State */}
        {!isAnalyzing && !analysis && !error && (
          <div className="empty-state">
            <p>Click refresh to analyze your resume</p>
          </div>
        )}

        {/* ATS Tips */}
        <div className="ats-tips">
          <h4>
            <TrendingUp size={16} />
            ATS Tips
          </h4>
          <ul>
            <li>Use standard section headings (Education, Experience, Skills)</li>
            <li>Include relevant keywords from job descriptions</li>
            <li>Use simple, readable fonts</li>
            <li>Avoid images, tables, and complex formatting</li>
            <li>Save and submit as PDF when possible</li>
            <li>Quantify achievements with numbers and metrics</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ATSScorer;