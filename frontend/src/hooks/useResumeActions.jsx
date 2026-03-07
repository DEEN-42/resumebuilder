import { useCallback } from 'react';
import { BACKEND_URL } from '../constants/apiConfig';

export const useResumeActions = (
  setResumeData,
  setShowCreateForm,
  setShareEmail,
  setShowShareInput,
  setExpandedResume
) => {
  const handleCreateResume = useCallback(async (formData) => {
    if (formData.title && formData.description && formData.template) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BACKEND_URL}/resumes/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            selectedTemplate: formData.template
          })
        });

        if (!response.ok) {
          throw new Error('Failed to create resume');
        }

        const data = await response.json();
        setResumeData(data.userData);
        setShowCreateForm(false);
      } catch (error) {
        console.error('Error creating resume:', error);
      }
    }
  }, [setResumeData, setShowCreateForm]);

  const handleDeleteResume = useCallback(async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/resumes/delete/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete resume');
      }

      const data = await response.json();
      setResumeData(data.userData);
      setExpandedResume(null);
    } catch (error) {
      console.error('Error deleting resume:', error);
    }
  }, [setResumeData, setExpandedResume]);

  const handleShareResume = useCallback(async (id, shareEmail) => {
    if (!shareEmail.trim()) {
      alert('Please enter an email address');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/resumes/share/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sharedemail: shareEmail
        })
      });

      if (!response.ok) {
        throw new Error('Failed to share resume');
      }

      const data = await response.json();
      
      if (data.userData) {
        setResumeData(data.userData);
      }

      setShareEmail('');
      setShowShareInput(null);
      alert('Resume shared successfully!');
    } catch (error) {
      console.error('Error sharing resume:', error);
      alert('Failed to share resume. Please try again.');
    }
  }, [setResumeData, setShareEmail, setShowShareInput]);

  return {
    handleCreateResume,
    handleDeleteResume,
    handleShareResume
  };
};