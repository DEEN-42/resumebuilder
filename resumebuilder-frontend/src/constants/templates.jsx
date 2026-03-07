// Template map, logos & default styles
import iitkgplogo     from '../assets/iitkgp_logo.png';
import isikolkatalogo from '../assets/isikolkata_logo.png';

export const templates = {
  iitkg: {
    name: 'IIT KGP Template',
    component: 'IITKGPTemplate',
    logo: iitkgplogo,
  },
  isikolkata: {
    name: 'ISI Template',
    component: 'ISITemplate',
    logo: isikolkatalogo,
  },
  JohnDoe: {
    name: 'John Doe Template',
    component: 'JohnDoeTemplate',
    logo: null,
  },
};

export const defaultGlobalStyles = {
  heading:     { fontSize: 16, fontFamily: 'Arial', color: '#000000', bold: true,  italic: false, underline: false },
  description: { fontSize: 12, fontFamily: 'Arial', color: '#000000', bold: false, italic: false, underline: false },
};

export const defaultResumeData = {
  personalInfo: {
    name: '',
    rollNo: '',
    program: '',
    specialization: '',
    email: '',
    contact: '',
    linkedin: '',
    github: '',
    profilePicture: null,
    institutelogo: iitkgplogo,
  },
  education:               [],
  internships:             [],
  projects:                [],
  skills:                  [],
  awards:                  [],
  extraAcademicActivities: [],
  coursework:              [],
  competitions:            [],
  position:                [],
  publications:            [],
  extracurricular:         [],
};
export const TEMPLATES = {
    iitkg: { name: 'IIT KGP Template', component: 'IITKGPTemplate', logo: '🎓' },
    isikolkata: { name: 'ISI Template', component: 'ISITemplate', logo: '📊' },
    JohnDoe: { name: 'John Doe Template', component: 'JohnDoeTemplate', logo: '👤' }
  };