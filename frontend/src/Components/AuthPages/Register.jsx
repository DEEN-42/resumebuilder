import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, UserCheck } from 'lucide-react';
import { BACKEND_URL } from '../../constants/apiConfig';
import './AuthPages.css';

const Register = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
  
    try {
      if (!formData.name || !formData.email || !formData.password) {
        setError('Please fill in all fields');
        setLoading(false);
        return;
      }
      
      const response = await fetch(`${BACKEND_URL}/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name, 
          email: formData.email, 
          password: formData.password, 
          role: formData.role 
        }),
      });
  
      const data = await response.json();
      console.log('Response data:', data);
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }
  
      if (!data.token) {
        throw new Error('No authentication token received');
      }

      // Save token and userData
      localStorage.setItem('token', data.token);
      localStorage.setItem('userData', JSON.stringify(data.resumes));
  
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to register. Please try again.');
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  const navigateToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="auth-container">
      {/* Decorative elements */}
      <div className="decorative-elements">
        <div className="decoration decoration-1">
          <div className="decoration-gradient"></div>
        </div>
        <div className="decoration decoration-2">
          <div className="decoration-gradient"></div>
        </div>
        <div className="decoration decoration-3">
          <div className="decoration-gradient"></div>
        </div>
      </div>
      
      <div className="auth-card">
        {/* Welcome Section */}
        <div className="welcome-section">
          <div className="welcome-overlay"></div>
          
          <div className="welcome-content">
            <h1 className="welcome-title">
              WELCOME
            </h1>
            <h2 className="welcome-subtitle">
              RESUME BUILDER
            </h2>
            <p className="welcome-description">
              Register an account in no time and start editing resumes before the deadline ends
            </p>
          </div>
        </div>
        
        {/* Form Section */}
        <div className="form-section">
          <div className="form-container">
            <h3 className="form-title">Sign up</h3>
            <p className="form-description">
              Create your account to get started
            </p>

            {error && (
              <div className="error-message" style={{ 
                color: '#e74c3c', 
                backgroundColor: '#fdf2f2', 
                padding: '10px', 
                borderRadius: '4px', 
                marginBottom: '15px',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            <div className="form-fields">
              {/* Name Field */}
              <div className="input-group">
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                />
              </div>

              {/* Email Field */}
              <div className="input-group">
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                />
              </div>

              {/* Password Field */}
              <div className="input-group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="form-input password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Role Field */}
              <div className="input-group">
                <UserCheck className="input-icon" />
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Submit Button */}
              <button 
                onClick={handleSubmit}
                className="submit-button"
                disabled={loading}
              >
                {loading ? 'Signing up...' : 'Sign up'}
              </button>

              {/* Auth Switch */}
              <p className="auth-switch">
                Already have an account? {' '}
                <button 
                  onClick={navigateToLogin}
                  className="auth-switch-button"
                >
                  Sign in
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;