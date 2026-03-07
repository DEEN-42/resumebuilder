// handlers/resumeDataHandlers.js
export const createResumeDataHandlers = (setResumeData) => {
    const handlePersonalInfoChange = (field, value) => {
      setResumeData(prev => ({
        ...prev,
        personalInfo: { ...prev.personalInfo, [field]: value }
      }));
    };
  
    const handleEducationChange = (index, field, value) => {
      if (index === 'add') {
        setResumeData(prev => ({
          ...prev,
          education: [...prev.education, { year: '', degree: '', institute: '', cgpa: '' }]
        }));
      } else if (field === 'remove') {
        setResumeData(prev => ({
          ...prev,
          education: prev.education.filter((_, i) => i !== index)
        }));
      } else {
        setResumeData(prev => ({
          ...prev,
          education: prev.education.map((edu, i) => 
            i === index ? { ...edu, [field]: value } : edu
          )
        }));
      }
    };
  
    const handleInternshipsChange = (index, field, value) => {
      if (index === 'add') {
        setResumeData(prev => ({
          ...prev,
          internships: [...prev.internships, { title: '', company: '', duration: '', description: '' }]
        }));
      } else if (field === 'remove') {
        setResumeData(prev => ({
          ...prev,
          internships: prev.internships.filter((_, i) => i !== index)
        }));
      } else {
        setResumeData(prev => ({
          ...prev,
          internships: prev.internships.map((intern, i) => 
            i === index ? { ...intern, [field]: value } : intern
          )
        }));
      }
    };
  
    const handleProjectsChange = (index, field, value) => {
      if (index === 'add') {
        setResumeData(prev => ({
          ...prev,
          projects: [...prev.projects, { title: '', duration: '', description: '' }]
        }));
      } else if (field === 'remove') {
        setResumeData(prev => ({
          ...prev,
          projects: prev.projects.filter((_, i) => i !== index)
        }));
      } else {
        setResumeData(prev => ({
          ...prev,
          projects: prev.projects.map((project, i) => 
            i === index ? { ...project, [field]: value } : project
          )
        }));
      }
    };
  
    const handleSkillsChange = (index, field, value) => {
      if (index === 'add') {
        setResumeData(prev => ({
          ...prev,
          skills: [...prev.skills, { title: '', description: '' }]
        }));
      } else if (field === 'remove') {
        setResumeData(prev => ({
          ...prev,
          skills: prev.skills.filter((_, i) => i !== index)
        }));
      } else {
        setResumeData(prev => ({
          ...prev,
          skills: prev.skills.map((skill, i) => 
            i === index ? { ...skill, [field]: value } : skill
          )
        }));
      }
    };
  
    const handleAwardsChange = (index, field, value) => {
      if (index === 'add') {
        setResumeData(prev => ({
          ...prev,
          awards: [...prev.awards, { title: '', description: '' }]
        }));
      } else if (field === 'remove') {
        setResumeData(prev => ({
          ...prev,
          awards: prev.awards.filter((_, i) => i !== index)
        }));
      } else {
        setResumeData(prev => ({
          ...prev,
          awards: prev.awards.map((award, i) => 
            i === index ? { ...award, [field]: value } : award
          )
        }));
      }
    };
  
    const handleExtraAcademicActivitiesChange = (index, field, value) => {
      if (index === 'add') {
        setResumeData(prev => ({
          ...prev,
          extraAcademicActivities: [...prev.extraAcademicActivities, { title: '', description: '' }]
        }));
      } else if (field === 'remove') {
        setResumeData(prev => ({
          ...prev,
          extraAcademicActivities: prev.extraAcademicActivities.filter((_, i) => i !== index)
        }));
      } else {
        setResumeData(prev => ({
          ...prev,
          extraAcademicActivities: prev.extraAcademicActivities.map((activity, i) => 
            i === index ? { ...activity, [field]: value } : activity
          )
        }));
      }
    };
  
    const handleCourseworkChange = (index, field, value) => {
      if (index === 'add') {
        setResumeData(prev => ({
          ...prev,
          coursework: [...prev.coursework, { title: '', description: '' }]
        }));
      } else if (field === 'remove') {
        setResumeData(prev => ({
          ...prev,
          coursework: prev.coursework.filter((_, i) => i !== index)
        }));
      } else {
        setResumeData(prev => ({
          ...prev,
          coursework: prev.coursework.map((course, i) => 
            i === index ? { ...course, [field]: value } : course
          )
        }));
      }
    };

    const handleSectionOrderChange = (newSectionOrder) => {
    setResumeData(prev => ({
      ...prev,
      sectionorder: newSectionOrder
    }));
  };
  
    const handlePositionsOfResponsibilityChange = (index, field, value) => {
      if (index === 'add') {
        setResumeData(prev => ({
          ...prev,
          position: [...prev.position, { title: '', time: '', description: '' }]
        }));
      } else if (field === 'remove') {
        setResumeData(prev => ({
          ...prev,
          position: prev.position.filter((_, i) => i !== index)
        }));
      } else {
        setResumeData(prev => ({
          ...prev,
          position: prev.position.map((pos, i) => 
            i === index ? { ...pos, [field]: value } : pos
          )
        }));
      }
    };
  
    return {
      handlePersonalInfoChange,
      handleEducationChange,
      handleInternshipsChange,
      handleProjectsChange,
      handleSkillsChange,
      handleAwardsChange,
      handleExtraAcademicActivitiesChange,
      handleCourseworkChange,
      handlePositionsOfResponsibilityChange,
      handleSectionOrderChange
    };
  };