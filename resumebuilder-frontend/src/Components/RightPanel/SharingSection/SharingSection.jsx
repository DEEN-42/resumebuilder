import React, { useState, useEffect } from 'react';
import { Share2, Mail, X, Users, Plus, Trash2, UserPlus, RefreshCw } from 'lucide-react';
import './SharingSection.css';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError, showWarning, showInfo } from '../../../utils/toast.jsx';
import { BACKEND_URL } from '../../../constants/apiConfig';
const SharingSection = ({id, connectedUsers}) => {
  const [emailInput, setEmailInput] = useState('');
  const [sharedUsers, setSharedUsers] = useState([]);
  const [isSharing, setIsSharing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();
  
  // API base URL
  const API_BASE_URL = BACKEND_URL;

  // Function to check if a user is online
  const isUserOnline = (email) => {
    return connectedUsers && connectedUsers.includes(email);
  };

  // Fetch shared users list
  const fetchSharedUsers = async () => {
    try {
      setIsLoading(true);

      // Retrieve the saved token
      const token = localStorage.getItem('token');
      if (!token) {
        showNotification('Please log in to continue.', 'error');
        navigate('/login', { replace: true });
        return; 
      }

      // Call the API with Authorization header
      const response = await fetch(`${API_BASE_URL}/resumes/share/${id}/sharelist`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          showNotification('Session expired, please log in again.', 'error');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Handle the response format from your API
      if (Array.isArray(data)) {
        setSharedUsers(data);
      } else if (Array.isArray(data.sharedUsers)) {
        setSharedUsers(data.sharedUsers);
      } else {
        console.warn('Unexpected API response format:', data);
        setSharedUsers([]);
      }
    } catch (error) {
      console.error('Failed to fetch shared users:', error);
      showNotification('Failed to load shared users. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh shared users list
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchSharedUsers();
    setIsRefreshing(false);
  };

  // Load shared users on component mount
  useEffect(() => {
    fetchSharedUsers();
  }, []);

  // Utility function to show notifications (replace with your preferred notification system)
  const showNotification = (message, type) => {
    if(type === 'error'){
      showError(message);
    } else if(type === 'success'){
      showSuccess(message);
    } else if(type === 'warning'){
      showWarning(message);
    } else if(type === 'info'){
      showInfo(message);
    } else {
      alert(message); // Fallback only
    }
  };

  const handleShare = async () => {
    if (!emailInput.trim()) return;
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput.trim())) {
      showNotification('Please enter a valid email address', 'error');
      return;
    }

    // Check if email already exists
    const emailToCheck = emailInput.trim();
    const emailExists = sharedUsers.some(user => user.email === emailToCheck);

    if (emailExists) {
      showNotification('This email is already shared', 'warning');
      return;
    }

    // Confirmation dialog
    const isConfirmed = window.confirm(
      `Are you sure you want to share your resume with ${emailToCheck}?`
    );
    if (!isConfirmed) return;

    setIsSharing(true);
    
    try {
      // Retrieve the saved token
      const token = localStorage.getItem('token');
      if (!token) {
        showNotification('Please log in to continue.', 'error');
        navigate('/login', { replace: true });
        return; 
      }

      // Make API call to share with user - using sharedemail as per your API
      const response = await fetch(`${API_BASE_URL}/resumes/share/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sharedemail: emailToCheck  // Changed from 'email' to 'sharedemail'
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          showNotification('Session expired, please log in again.', 'error');
          navigate('/login', { replace: true });
          return;
        }
        
        // Handle specific error for user not found
        if (response.status === 404) {
          const errorData = await response.json();
          showNotification(errorData.message || 'User not found. Cannot share resume with unregistered user.', 'error');
          return;
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Update shared users list with response data
      if (Array.isArray(data)) {
        setSharedUsers(data);
      } else if (data.sharedUsers && Array.isArray(data.sharedUsers)) {
        setSharedUsers(data.sharedUsers);
      } else {
        // Fallback: refresh the list
        await fetchSharedUsers();
      }
      
      setEmailInput('');
      showNotification('Resume shared successfully!', 'success');
      
    } catch (error) {
      console.error('Share failed:', error);
      showNotification('Failed to share resume. Please try again.', 'error');
    } finally {
      setIsSharing(false);
    }
  };

  const handleRemove = async (email) => {
    // Confirmation dialog
    const isConfirmed = window.confirm(
      `Are you sure you want to remove access for ${email}?`
    );
    if (!isConfirmed) return;

    try {
      // Retrieve the saved token
      const token = localStorage.getItem('token');
      if (!token) {
        showNotification('Please log in to continue.', 'error');
        navigate('/login', { replace: true });
        return; 
      }

      // Make API call to remove user access
      const response = await fetch(`${API_BASE_URL}/resumes/unshare/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: email  // Using 'email' as per your unshare API
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          showNotification('Session expired, please log in again.', 'error');
          navigate('/login', { replace: true });
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Update shared users list with response data
      if (Array.isArray(data)) {
        setSharedUsers(data);
      } else if (data.sharedUsers && Array.isArray(data.sharedUsers)) {
        setSharedUsers(data.sharedUsers);
      } else {
        // Fallback: refresh the list
        await fetchSharedUsers();
      }
      
      showNotification('Access removed successfully!', 'success');
      
    } catch (error) {
      console.error('Remove failed:', error);
      showNotification('Failed to remove access. Please try again.', 'error');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleShare();
    }
  };

  // Function to get user initials for avatar
  const getUserInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="sharing-section">
      {/* Header */}
      <div className="sharing-header">
        <div className="sharing-title">
          <Share2 className="sharing-icon" />
          <h3>Share Resume</h3>
        </div>
        <div className="sharing-subtitle">
          Collaborate with others by sharing your resume
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="refresh-button"
          title="Refresh shared users list"
        >
          <RefreshCw className={`refresh-icon ${isRefreshing ? 'spinning' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Share Input */}
      <div className="share-input-section">
        <div className="input-group">
          <div className="input-wrapper">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter email address"
              className="share-input"
              disabled={isSharing}
            />
          </div>
          <button
            onClick={handleShare}
            disabled={!emailInput.trim() || isSharing}
            className="share-button"
          >
            {isSharing ? (
              <>
                <div className="spinner" />
                Sharing...
              </>
            ) : (
              <>
                <UserPlus className="button-icon" />
                Share
              </>
            )}
          </button>
        </div>
      </div>

      {/* Shared Users List */}
      <div className="shared-emails-section">
        <div className="shared-emails-header">
          <Users className="section-icon" />
          <h4>Shared with ({sharedUsers.length})</h4>
        </div>
        
        {isLoading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <span>Loading shared users...</span>
          </div>
        ) : sharedUsers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Share2 />
            </div>
            <p>No one has access yet</p>
            <span>Share your resume to start collaborating</span>
          </div>
        ) : (
          <div className="shared-emails-list">
            {sharedUsers.map((user, index) => {
              const displayName = user.name || 'Unknown User';
              const displayEmail = user.email || 'Unknown email';
              const profilePicture = user.profilePicture;
              const userOnline = isUserOnline(user.email);
              
              return (
                <div key={index} className={`shared-email-item ${userOnline ? 'online' : 'offline'}`}>
                  <div className="email-info">
                    <div className={`email-avatar ${userOnline ? 'online' : 'offline'}`}>
                      {profilePicture ? (
                        <img 
                          src={profilePicture} 
                          alt={displayName}
                          className="profile-picture"
                        />
                      ) : (
                        <span className="initials">
                          {getUserInitials(displayName)}
                        </span>
                      )}
                      <div className="status-indicator"></div>
                    </div>
                    <div className="email-details">
                      <div className="user-name">{displayName}</div>
                      <div className="user-email">{displayEmail}</div>
                      <div className="user-status">
                        {userOnline ? 'Online' : 'Offline'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(user.email)}
                    className="remove-button"
                    title="Remove access"
                  >
                    <Trash2 className="remove-icon" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SharingSection;