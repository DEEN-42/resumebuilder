// handlers/uiHandlers.js
export const createUIHandlers = (
    setZoomLevel,
    setSelectedTemplate,
    setGlobalStyles,
    navigate,
    handleResumeDownload,
    setIsDownloading,
    resumeData,
    saveResumeData,
    setActiveSideTab,
    activeSideTab
  ) => {
    const handleZoomIn = () => {
      setZoomLevel(prev => Math.min(prev + 10, 150));
    };
  
    const handleZoomOut = () => {
      setZoomLevel(prev => Math.max(prev - 10, 30));
    };
  
    const handleZoomReset = () => {
      setZoomLevel(70);
    };
  
    const handleTemplateChange = (newTemplate) => {
      setSelectedTemplate(newTemplate);
    };
  
    const handleStyleChange = (category, property, value) => {
      setGlobalStyles(prev => ({
        ...prev,
        [category]: { ...prev[category], [property]: value }
      }));
    };
  
    const handleAISuggestions = () => {
      setActiveSideTab('ai suggestions');
      // console.log(activeSideTab);
    };
    const handleShare = () => {
      setActiveSideTab('share');
      // console.log(activeSideTab);
    }
    const handleATSscore= () => {
      setActiveSideTab('ats');
      // console.log(activeSideTab);
    }
  
    const handleDownload = async () => {
      try {
        // Save before downloading
        await saveResumeData();
        await handleResumeDownload(setIsDownloading, resumeData);
      } catch (error) {
        console.error('Download failed:', error);
      }
    };
  
    const returnHandler = () => {
      navigate('/dashboard');
    };
  
    return {
      handleZoomIn,
      handleZoomOut,
      handleZoomReset,
      handleTemplateChange,
      handleStyleChange,
      handleAISuggestions,
      handleDownload,
      handleATSscore,
      handleShare,
      returnHandler
    };
  };