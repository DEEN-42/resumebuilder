import { BACKEND_URL } from '../constants/apiConfig';

// handlers/dataLoader.js
export const createDataLoader = (
    id,
    setIsLoading,
    setError,
    setResumeData,
    setGlobalStyles,
    setSelectedTemplate,
    setDeployedUrl,
    setSaveStatus,
    setLastSaved,
    lastSaveDataRef,
    templates,
    globalStyles,
    resumeData,
    initializeSocket
  ) => {
    const loadResumeData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const token = localStorage.getItem('token');
        
        if (!token) {
          throw new Error('No authentication token found');
        }
  
        // Use socket endpoint if available
        const endpoint = `/resumes/load/${id}`;
        
        const response = await fetch(`${BACKEND_URL}${endpoint}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
  
        if (!response.ok) {
          throw new Error(`Failed to load resume: ${response.status} ${response.statusText}`);
        }
  
        const data = await response.json();
        const { resume } = data;
        // console.log('Loaded resume:', resume);
        if (resume) {
          // Set resumeData
          if (resume.resumeData && Object.keys(resume.resumeData).length > 0) {
            setResumeData(prevData => {
              const newResumeData = { ...prevData };
              
              Object.keys(resume.resumeData).forEach(key => {
                if (resume.resumeData[key] !== null && resume.resumeData[key] !== undefined) {
                  if (key === 'personalInfo') {
                    newResumeData.personalInfo = {
                      ...prevData.personalInfo,
                      ...resume.resumeData.personalInfo,

                      institutelogo: resume.resumeData.personalInfo.institutelogo|| prevData.personalInfo.institutelogo || templates[resume.selectedTemplate || 'iitkg']?.logo 
                    };
                  } else if (Array.isArray(resume.resumeData[key])) {
                    newResumeData[key] = resume.resumeData[key];
                  } else {
                    newResumeData[key] = { ...prevData[key], ...resume.resumeData[key] };
                  }
                }
              });
              
              return newResumeData;
            });
          }
  
          // Set globalStyles
          if (resume.globalStyles && Object.keys(resume.globalStyles).length > 0) {
            setGlobalStyles(prevStyles => ({
              ...prevStyles,
              ...resume.globalStyles
            }));
          }
  
          // Set selectedTemplate
          if (resume.selectedTemplate && resume.selectedTemplate.trim() !== '') {
            setSelectedTemplate(resume.selectedTemplate);
          }

          //Set deployed url
          if(resume.deployment && resume.deployment.vercelUrl.trim() !== ''){
            setDeployedUrl(resume.deployment.vercelUrl);
          }
          // Set initial save data reference
          lastSaveDataRef.current = JSON.stringify({
            selectedTemplate: resume.selectedTemplate || 'iitkg',
            globalStyles: resume.globalStyles || globalStyles,
            resumeData: resume.resumeData || resumeData
          });
  
          setSaveStatus('saved');
          setLastSaved(new Date(resume.updatedAt || resume.createdAt));
  
          // console.log('Resume loaded successfully');
          
          // Initialize socket connection after loading
          if (data.socketEnabled) {
            initializeSocket();
          }
        }
  
      } catch (err) {
        console.error('Error loading resume:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
  
    return {
      loadResumeData
    };
  };