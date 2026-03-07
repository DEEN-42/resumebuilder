import { BACKEND_URL } from '../constants/apiConfig';

// handlers/saveHandlers.js
export const createSaveHandlers = (
    id,
    selectedTemplate,
    globalStyles,
    resumeData,
    setSaveStatus,
    setLastSaved,
    setError,
    isSavingRef,
    isUpdatingFromSocketRef,
    lastSaveDataRef
  ) => {
    const saveResumeData = async (dataToSave = null) => {
      if (isSavingRef.current || !id || isUpdatingFromSocketRef.current) return;
      
      try {
        isSavingRef.current = true;
        setSaveStatus('saving');
  
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }
  
        // Use provided data or current state
        const currentData = dataToSave || {
          selectedTemplate,
          globalStyles,
          resumeData
        };
  
        // Check if data has actually changed
        const currentDataString = JSON.stringify(currentData);
        if (lastSaveDataRef.current === currentDataString) {
          setSaveStatus('saved');
          isSavingRef.current = false;
          return;
        }
        // Use socket endpoint for real-time updates
        const endpoint = `/resumes/update/${id}`;
        // console.log(currentData);
        const response = await fetch(`${BACKEND_URL}${endpoint}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(currentData)
        });
  
        if (!response.ok) {
          throw new Error(`Failed to save resume: ${response.status} ${response.statusText}`);
        }
  
        // Update last saved data reference
        lastSaveDataRef.current = currentDataString;
        setSaveStatus('saved');
        setLastSaved(new Date());
        
        // console.log('Resume auto-saved successfully');
        
      } catch (err) {
        console.error('Error saving resume:', err);
        setSaveStatus('error');
        setError(`Save failed: ${err.message}`);
      } finally {
        isSavingRef.current = false;
      }
    };
  
    const debouncedSave = (saveTimeoutRef) => (dataToSave = null) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        saveResumeData(dataToSave);
      }, 1000);
    };
  
    const handleManualSave = async () => {
      await saveResumeData();
    };
  
    return {
      saveResumeData,
      debouncedSave,
      handleManualSave
    };
  };