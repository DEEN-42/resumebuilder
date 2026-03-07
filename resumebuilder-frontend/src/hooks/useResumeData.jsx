import { useState } from 'react';

export const useResumeDataforDashboard = () => {
  const [resumeData, setResumeData] = useState(() => {
    const storedData = localStorage.getItem('userData');
    return storedData ? JSON.parse(storedData) : null;
  });

  const updateResumeData = (newData) => {
    localStorage.setItem('userData', JSON.stringify(newData));
    setResumeData(newData);
  };

  return {
    resumeData,
    setResumeData: updateResumeData
  };
};