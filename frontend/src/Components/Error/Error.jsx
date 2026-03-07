// Components/Error/Error.jsx
import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import './Error.css';

const Error = ({ 
  error, 
  onRetry, 
  onGoHome,
  title = "Something went wrong",
  showHomeButton = true 
}) => {
  return (
    <div className="error-container">
      <div className="error-content">
        <div className="error-icon">
          <AlertTriangle size={64} />
        </div>
        
        <div className="error-details">
          <h2 className="error-title">{title}</h2>
          <p className="error-message">
            {error || "An unexpected error occurred. Please try again."}
          </p>
        </div>
        
        <div className="error-actions">
          {onRetry && (
            <button 
              onClick={onRetry}
              className="error-retry-btn"
            >
              <RefreshCw size={18} />
              Try Again
            </button>
          )}
          
          {showHomeButton && onGoHome && (
            <button 
              onClick={onGoHome}
              className="error-home-btn"
            >
              <Home size={18} />
              Go Home
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Error;