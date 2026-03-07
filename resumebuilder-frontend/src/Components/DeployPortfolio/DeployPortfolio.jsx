import React, { useState, useEffect } from 'react';
import './DeployPortfolio.css';
import { BACKEND_URL } from '../../constants/apiConfig.js';
import { showSuccess, showError } from '../../utils/toast.jsx';

const LinkIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="link-icon"
  >
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"></path>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"></path>
  </svg>
);

const DeployPortfolio = ({ resumeId, resumeData, deployedUrl, setDeployedUrl }) => {
  const initialUrl = deployedUrl || '';
  const [status, setStatus] = useState(initialUrl ? 'idle' : 'uninitialized');
  const [errorMessage, setErrorMessage] = useState('');
  
  const isAlreadyDeployed = !!initialUrl;

  useEffect(() => {
    if (status === 'success') {
      showSuccess('Deployment Successful!');
    } else if (status === 'error' && errorMessage) {
      showError(`Deployment Failed: ${errorMessage}`);
    }
  }, [status, errorMessage]);

  const handleDeploy = async () => {
    if (status === 'loading') {
      return;
    }

    setStatus('loading');
    setErrorMessage('');
    
    const token = localStorage.getItem('token');

    try {
      // 1. Enqueue the deploy job
      const response = await fetch(`${BACKEND_URL}/deploy/${resumeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ resumeData }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'An unknown error occurred during deployment.');
      }

      const { jobId } = result;

      // 2. Poll for job completion
      const pollInterval = 3000;
      const maxAttempts = 60; // 3 minutes max
      let attempts = 0;

      const poll = async () => {
        attempts++;
        const statusRes = await fetch(`${BACKEND_URL}/deploy/status/${jobId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const statusData = await statusRes.json();

        if (statusData.status === 'completed') {
          setDeployedUrl(statusData.result.url);
          setStatus('success');
          return;
        }

        if (statusData.status === 'failed') {
          throw new Error(statusData.error || 'Deployment failed on the server.');
        }

        if (attempts >= maxAttempts) {
          throw new Error('Deployment timed out. Please check back later.');
        }

        // Still in progress — wait and retry
        await new Promise((r) => setTimeout(r, pollInterval));
        return poll();
      };

      await poll();

    } catch (error) {
      console.error('Deployment failed:', error);
      setErrorMessage(error.message);
      setStatus('error');
    }
  };
  
  return (
    <div className="deploy-container">
      <div className="header-section">
        <h2 className="title">
          {isAlreadyDeployed ? 'Update Your Portfolio' : 'Deploy Your Portfolio'}
        </h2>
        <p className="subtitle">
          {isAlreadyDeployed 
            ? 'Your portfolio is live. Click the button below to publish your latest changes.' 
            : 'Click the button below to publish your portfolio on Vercel.'
          }
        </p>
      </div>

      <button
        onClick={handleDeploy}
        disabled={status === 'loading'}
        className="deploy-button"
      >
        {status === 'loading' 
          ? 'Deploying...' 
          : (isAlreadyDeployed ? 'Update Portfolio' : 'Deploy Portfolio')
        }
      </button>

      {deployedUrl && (
        <div className="deployed-link-container">
          <p className="deployed-link-label">Live URL:</p>
          <a
            href={deployedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="deployed-link"
          >
            <LinkIcon />
            <span>{deployedUrl}</span>
          </a>
        </div>
      )}
    </div>
  );
};

export default DeployPortfolio;
