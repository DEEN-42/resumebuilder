import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { Toaster } from 'react-hot-toast';
import './App.css';
import Project from './project.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import Register from './Components/AuthPages/Register.jsx';
import Login from './Components/AuthPages/Login.jsx';
import Dashboard from './Components/Dashboard/dashboard.jsx';
import { BACKEND_URL } from './constants/apiConfig.js';
import Profile from './Components/Profile/Profile.jsx';

// Logout function
const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('userData');
  window.location.href = '/';
};

// Protected route component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return <Navigate to="/auth" replace />;
  }
  
  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    
    if (decoded.exp < currentTime) {
      logout(); // Token expired
      return null;
    }
  } catch (err) {
    logout(); // Invalid token
    return null;
  }
  
  return children;
};

// Function to schedule token renewal
const scheduleTokenRenewal = (token) => {
  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    const expiryTime = decoded.exp;
    const timeUntilRenewal = (expiryTime - currentTime - 180) * 1000; // renew 3 mins before expiry
    
    if (timeUntilRenewal <= 0) {
      logout();
      return;
    }
    
    setTimeout(async () => {
      try {
        const currentToken = localStorage.getItem('token');
        const response = await fetch(`${BACKEND_URL}/users/renew-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentToken}`,
          },
        });
        
        if (!response.ok) {
          throw new Error('Token renewal failed');
        }
        
        const data = await response.json();
        if (data.token) {
          localStorage.setItem('token', data.token);
          scheduleTokenRenewal(data.token);
        } else {
          throw new Error('No token in renewal response');
        }
      } catch (error) {
        console.error('Error renewing token:', error);
        logout();
      }
    }, timeUntilRenewal);
  } catch (err) {
    console.error('Invalid token:', err);
    logout();
  }
};

function App() {
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      scheduleTokenRenewal(token);
    }
  }, []);

  return (
    <ThemeProvider>
    <BrowserRouter>
      <Routes>
        {/* Default route redirects to auth */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Auth page route */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register/>} />

        {/* Protected dashboard route */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard logout={logout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile/>
            </ProtectedRoute>
          }
        />
        {/* Protected project route */}
        <Route
          path="/project/:id"
          element={
            <ProtectedRoute>
              <Project logout={logout} />
            </ProtectedRoute>
          }
        />
        
        {/* Catch all route */}
        <Route path="*" element={
          localStorage.getItem('token') ? (
            <Navigate to="/project" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        } />
      </Routes>
      
      {/* Toast Container - positioned at top right */}
      <Toaster
        position="top-center"
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        containerStyle={{}}
        toastOptions={{
          // Define default options
          className: '',
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          // Default options for specific types
          success: {
            duration: 2500,
            theme: {
              primary: 'green',
              secondary: 'black',
            },
          },
          error: {
            duration: 4000,
            style: {
              background: '#ff4444',
              color: 'white',
            },
          },
          loading: {
            duration: Infinity,
          },
        }}
      />
    </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;