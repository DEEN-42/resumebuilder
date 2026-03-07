import iitkgplogo from '../assets/iitkgp_logo.png';

export const getInitialResumeData = () => ({
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
  
  education: [],
  internships: [],
  projects: [],
  skills: [],
  awards: [],
  extraAcademicActivities: [],
  coursework: [],
  competitions: [],
  position: [],
  sectionorder: initialSections,
});

export const initialSections = [
  { id: 'education', title: 'Education' },
  { id: 'internships', title: 'Internships' },
  { id: 'projects', title: 'Projects' },
  { id: 'skills', title: 'Skills & Expertise' },
  { id: 'position', title: 'Positions of Responsibility' },
  { id: 'awards', title: 'Awards & Achievements' },
  { id: 'extraAcademicActivities', title: 'Extra Academic Activities' },
  { id: 'coursework', title: 'Coursework' },
];