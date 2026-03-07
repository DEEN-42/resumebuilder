// handlers/socketHandlers.js
import io from 'socket.io-client';
import { showSuccess, showError, showWarning, showInfo } from '../utils/toast.jsx';
import { BACKEND_URL } from '../constants/apiConfig.js';
export const createSocketHandlers = (
  id,
  setSocket,
  setIsConnected,
  setConnectedUsers,
  setLastUpdatedBy,
  setResumeData,
  setGlobalStyles,
  setSelectedTemplate,
  isUpdatingFromSocketRef
) => {
  // Keep track of the current socket instance
  let currentSocket = null;

  const initializeSocket = () => {
    if (!id) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    // **CRITICAL FIX**: Disconnect existing socket before creating new one
    if (currentSocket) {
      // console.log('Disconnecting existing socket before creating new one');
      currentSocket.disconnect();
      currentSocket = null;
    }

    // console.log('Creating new socket connection');
    const newSocket = io(BACKEND_URL, {
      auth: { token },
      query: { resumeId: id }
    });

    // Store reference to current socket
    currentSocket = newSocket;

    newSocket.on('connect', () => {
      // console.log('Connected to Socket.IO server');
      setIsConnected(true);
      newSocket.emit('join-resume-room', id);
    });

    newSocket.on('disconnect', () => {
      // console.log('Disconnected from Socket.IO server');
      setIsConnected(false);
    });

    newSocket.on('resume-updated', (data) => {
      // console.log('Received resume update from:', data.updatedBy);
      setLastUpdatedBy(data.updatedBy);
      
      // Set flag to prevent triggering save when updating from socket
      isUpdatingFromSocketRef.current = true;
      
      // Apply the updates
      const { updates } = data;
      
      if (updates.resumeData) {
        setResumeData(prev => ({
          ...prev,
          ...updates.resumeData
        }));
      }
      
      if (updates.globalStyles) {
        setGlobalStyles(prev => ({
          ...prev,
          ...updates.globalStyles
        }));
      }
      
      if (updates.selectedTemplate) {
        setSelectedTemplate(updates.selectedTemplate);
      }

      // Reset flag after a short delay
      setTimeout(() => {
        isUpdatingFromSocketRef.current = false;
      }, 1000); // 1 second delay to ensure state updates are applied
    });

    newSocket.on('user-joined', (data) => {
      // console.log('User joined:', data.userEmail);
      showNotification(`${data.userEmail} joined the resume`, 'info');
      // Don't add to connected users here - wait for 'users-in-room' event
    });

    newSocket.on('user-left', (data) => {
      // console.log('User left:', data.userEmail);
      showNotification(`${data.userEmail} left the resume`, 'info');
      // Don't remove from connected users here - wait for 'users-in-room' event
    });

    newSocket.on('users-in-room', (users) => {
      // console.log('Users in room:', users);
      setConnectedUsers(users);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      showNotification(error.message || 'Socket error occurred', 'error');
    });

    setSocket(newSocket);

    // Return cleanup function
    return () => {
      if (currentSocket) {
        // console.log('Cleaning up socket connection');
        currentSocket.disconnect();
        currentSocket = null;
      }
    };
  };

  // Function to manually disconnect socket
  const disconnectSocket = () => {
    if (currentSocket) {
      // console.log('Manually disconnecting socket');
      currentSocket.emit('leave-resume', id);
      currentSocket.disconnect();
      currentSocket = null;
      setSocket(null);
      setIsConnected(false);
      setConnectedUsers([]);
    }
  };

  // Utility function to show notifications
  const showNotification = (message, type) => {
    if (type === 'error') {
      showError(message);
    } else if (type === 'success') {
      showSuccess(message);
    } else if (type === 'warning') {
      showWarning(message);
    } else if (type === 'info') {
      showInfo(message);
    } else {
      alert(message); // Fallback only
    }
  };

  return {
    initializeSocket,
    disconnectSocket
  };
};