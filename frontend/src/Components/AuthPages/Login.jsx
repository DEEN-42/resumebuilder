import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import './AuthPages.css';
import { BACKEND_URL } from '../../constants/apiConfig';

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
  
    try {
      if (!formData.email || !formData.password) {
        setError('Please fill in all fields');
        setLoading(false);
        return;
      }
      const response = await fetch(`${BACKEND_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password : formData.password }),
      });
  
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }
  
      if (!data.token) {
        throw new Error('No authentication token received');
      }
  
      // Save token and userData
      localStorage.setItem('token', data.token);
      localStorage.setItem('userData', JSON.stringify(data.resumes));
  
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to login. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const navigateToRegister = () => {
    navigate('/register');
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
            Login into your existing account in no time and start editing resumes before the deadline ends
            </p>
          </div>
        </div>
        
        {/* Form Section */}
        <div className="form-section">
          <div className="form-container">
            <h3 className="form-title">Sign in</h3>
            <p className="form-description">
              Enter into your existing account
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

              {/* Login Options */}
              <div className="login-options">
                <label className="remember-me">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleInputChange}
                    className="checkbox"
                  />
                  Remember me
                </label>
                <a href="#" className="forgot-password">
                  Forgot Password?
                </a>
              </div>

              {/* Submit Button */}
              <button 
                onClick={handleSubmit}
                className="submit-button"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>

              {/* Auth Switch */}
              <p className="auth-switch">
                Don't have an account? {' '}
                <button 
                  onClick={navigateToRegister}
                  className="auth-switch-button"
                >
                  Sign up
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;