import iitkgplogo from '../assets/iitkgp_logo.png';
import isikolkatalogo from '../assets/isikolkata_logo.png';
import IITKGPTemplate from '../templates/IIT_KGPTemplate/IITKGPTemplate.jsx';
import ISITemplate from '../templates/ISI_Template/ISI_Template.jsx';
import JohnDoeTemplate from '../templates/JohnDoeTemplate/JohnDoeTemplate.jsx';

export const getTemplatesConfig = () => ({
  iitkg: { 
    name: 'IIT KGP Template', 
    component: IITKGPTemplate, 
    logo: iitkgplogo 
  },
  isikolkata: { 
    name: 'ISI Template', 
    component: ISITemplate, 
    logo: isikolkatalogo 
  },
  JohnDoe: { 
    name: 'John Doe Template', 
    component: JohnDoeTemplate, 
    logo: null 
  }
});

// Optional: If you want to add more templates later, you can extend this
export const addTemplate = (key, templateConfig) => {
  const templates = getTemplatesConfig();
  templates[key] = templateConfig;
  return templates;
};

// Optional: Get template keys for easy iteration
export const getTemplateKeys = () => {
  return Object.keys(getTemplatesConfig());
};

// Optional: Get template by key with validation
export const getTemplateByKey = (key) => {
  const templates = getTemplatesConfig();
  if (!templates[key]) {
    console.warn(`Template with key "${key}" not found. Falling back to default.`);
    return templates.iitkg; // Default fallback
  }
  return templates[key];
};