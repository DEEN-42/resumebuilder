import React, { useState, useEffect } from 'react';
import { User, Lock, Edit3, Save, X, Camera, Loader, Home } from 'lucide-react';
import './Profile.css';
import { BACKEND_URL } from '../../constants/apiConfig';
import {showSuccess, showError, showWarning, showInfo} from '../../utils/toast.jsx';


const Profile = () => {
    const [userData, setUserData] = useState({ name: '', profilePic: '' });
    const [editedData, setEditedData] = useState({ name: '', profilePic: '' });
    const [isEditing, setIsEditing] = useState(false);
    
    // State for password change
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');

    // State for API calls
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);

    // Fetch user profile on component mount
    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                // Replace with your actual API endpoint and token management
                const token = localStorage.getItem('token');
                const response = await fetch(`${BACKEND_URL}/users/profile`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }); 
                if (!response.ok) {
                    throw new Error('Failed to fetch user profile.');
                }
                const data = await response.json();
                setUserData(data);
                // Initialize editedData with fetched data
                setEditedData(data);
            } catch (err) {
                setError(err.message);
                // Set dummy data on error for demonstration
                const dummyData = { name: 'John Doe (Error)', profilePic: 'https://placehold.co/150x150/dc2626/ffffff?text=Error' };
                setUserData(dummyData);
                setEditedData(dummyData);
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, []);

    const handleEditToggle = () => {
        if (isEditing) {
            // Cancel editing - reset to original data
            setEditedData({ ...userData });
        }
        setIsEditing(!isEditing);
    };
    
    // Function to handle navigation to the dashboard
    const handleGoHome = () => {
        // This is a simple navigation method. If you are using React Router,
        // you would likely use the `useNavigate` hook for client-side routing.
        // Example: 
        // import { useNavigate } from 'react-router-dom';
        // const navigate = useNavigate();
        // navigate('/dashboard');
        window.location.href = '/dashboard';
    };

    const handleInputChange = (field, value) => {
        setEditedData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = async () => {
        setIsUpdating(true);
        setError(null);
        try {
            // Replace with your actual API endpoint and token management
            const token = localStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/users/profile`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: editedData.name, profilePic: editedData.profilePic }),
            });

            if (!response.ok) {
                throw new Error('Failed to update profile.');
            }

            const updatedUser = await response.json();
            setUserData(updatedUser.user);
            setEditedData(updatedUser);
            setIsEditing(false);
            showSuccess('Profile updated successfully!');

        } catch (err) {
            setError(err.message);
            showError(err.message);
            // Optionally, revert changes on failure
            setEditedData({ ...userData });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleProfilePicChange = async (event) => {
        const file = event.target.files[0];
        const token = localStorage.getItem('token');
        if (!file) return;

        // Show a temporary loading state on the image
        const reader = new FileReader();
        reader.onload = (e) => {
            setEditedData(prev => ({ ...prev, profilePic: e.target.result }));
        };
        reader.readAsDataURL(file);

        try {
            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch(`${BACKEND_URL}/users/profile/picture`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to upload profile picture.');
            }

            const data = await response.json();
            // API returns { url: "uploaded_image_url" }
            handleInputChange('profilePic', data.url);
            showSuccess('Profile picture updated!');
        } catch (error) {
            console.error('Error uploading profile picture:', error);
            showError(error.message);
            // Revert to original picture on error
            setEditedData(prev => ({ ...prev, profilePic: userData.profilePic }));
        }
    };

    const handleUpdatePassword = async () => {
        if (!oldPassword || !newPassword) {
            setPasswordError("Both fields are required.");
            return;
        }
        if (newPassword.length < 8) {
            setPasswordError("New password must be at least 8 characters long.");
            return;
        }
        if( oldPassword === newPassword) {
            showError("New password cannot be the same as old password.");
            return;
        }
        
        setIsUpdating(true);
        setPasswordError('');
        try {
             // Replace with your actual API endpoint for password updates and token management
            const token = localStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/users/profile/password`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ oldPassword, newPassword }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update password.');
            }
            
            showSuccess("Password updated successfully.");
            // Reset state
            setOldPassword('');
            setNewPassword('');
            setIsChangingPassword(false);

        } catch(err) {
            setPasswordError(err.message);
        } finally {
            setIsUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="profile-container">
                <Loader className="animate-spin" size={48} />
            </div>
        );
    }
    
    if (error && !userData.name) {
        return <div className="profile-container"><div className="profile-card">{error}</div></div>;
    }

    return (
        <div className="profile-container">
            <div className="profile-card">
                {error && <p className="password-error" style={{marginBottom: '1rem'}}>{error}</p>}
                <div className="profile-header">
                    <div className="avatar-section">
                        <div className="avatar">
                            <img
                                src={isEditing ? editedData.profilePic : userData.profilePic}
                                alt="Profile"
                                className="avatar-image"
                                onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/150x150/cccccc/ffffff?text=Error'; }}
                            />
                            {isEditing && (
                                <div className="avatar-overlay" onClick={() => !isUpdating && document.getElementById('profile-pic-input').click()}>
                                    <Camera size={20} />
                                </div>
                            )}
                            <input
                                id="profile-pic-input"
                                type="file"
                                accept="image/*"
                                onChange={handleProfilePicChange}
                                style={{ display: 'none' }}
                                disabled={!isEditing || isUpdating}
                            />
                        </div>
                    </div>

                    <div className="profile-actions">
                         <button className="home-btn" onClick={handleGoHome} disabled={isUpdating}>
                            <Home size={18} />
                            Home
                        </button>
                        {!isEditing ? (
                            <button className="edit-btn" onClick={handleEditToggle}>
                                <Edit3 size={18} />
                                Edit Profile
                            </button>
                        ) : (
                            <div className="edit-actions">
                                <button className="save-btn" onClick={handleSave} disabled={isUpdating}>
                                    {isUpdating ? <Loader className="animate-spin" size={18} /> : <Save size={18} />}
                                    {isUpdating ? 'Saving...' : 'Save'}
                                </button>
                                <button className="cancel-btn" onClick={handleEditToggle} disabled={isUpdating}>
                                    <X size={18} />
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="profile-content">
                    <div className="profile-title">
                        <h1>User Profile</h1>
                        <p>Manage your account information</p>
                    </div>

                    <div className="profile-form">
                        <div className="form-group">
                            <label className="form-label">
                                <User size={20} className="label-icon" />
                                Full Name
                            </label>
                            {!isEditing ? (
                                <div className="form-display">{userData.name}</div>
                            ) : (
                                <input
                                    type="text"
                                    value={editedData.name}
                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                    className="form-input"
                                    placeholder="Enter your full name"
                                    disabled={isUpdating}
                                />
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                <Lock size={20} className="label-icon" />
                                Password
                            </label>
                            {!isChangingPassword ? (
                                <button className="change-password-btn" onClick={() => setIsChangingPassword(true)}>
                                    Change Password
                                </button>
                            ) : (
                                <div>
                                    <input
                                        type="password"
                                        value={oldPassword}
                                        onChange={(e) => setOldPassword(e.target.value)}
                                        className="form-input"
                                        placeholder="Old Password"
                                        disabled={isUpdating}
                                    />
                                    <div style={{height: '1rem'}}></div>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="form-input"
                                        placeholder="New Password"
                                        disabled={isUpdating}
                                    />
                                    {passwordError && <p className="password-error">{passwordError}</p>}
                                    <div style={{height: '1rem'}}></div>
                                    <div className="edit-actions">
                                        <button className="save-btn" onClick={handleUpdatePassword} disabled={isUpdating}>
                                            {isUpdating ? <Loader className="animate-spin" size={18}/> : 'Update Password'}
                                        </button>
                                        <button className="cancel-btn" onClick={() => {
                                            setIsChangingPassword(false);
                                            setPasswordError('');
                                            setOldPassword('');
                                            setNewPassword('');
                                        }} disabled={isUpdating}>Cancel</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
