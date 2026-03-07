import React from 'react';
import { usePageBreak, PageBreakWrapper } from '../../Components/FormSections/ResumeLayout/ResumeLayout';
import './IITKGPTemplate.css';

// Add the new 'sectionOrder' prop with a default empty array
const IITKGPTemplate = ({ data, styles = {}, sectionOrder = [] }) => {
  // Default global styles if not provided
  const defaultGlobalStyles = {
    heading: {
      fontSize: 16,
      fontFamily: 'Arial',
      color: '#000000',
      bold: true,
      italic: false,
      underline: false
    },
    description: {
      fontSize: 12,
      fontFamily: 'Arial',
      color: '#000000',
      bold: false,
      italic: false,
      underline: false
    }
  };

  // Use styles as globalStyles and merge with defaults
  const mergedGlobalStyles = {
    heading: { ...defaultGlobalStyles.heading, ...(styles.heading || {}) },
    description: { ...defaultGlobalStyles.description, ...(styles.description || {}) }
  };

  // Helper function to apply text styles
  const getTextStyle = (styleType) => {
    const style = mergedGlobalStyles[styleType] || defaultGlobalStyles[styleType] || {};
    return {
      fontSize: `${style.fontSize || 12}px`,
      fontFamily: style.fontFamily || 'Arial',
      color: style.color || '#000000',
      fontWeight: style.bold ? 'bold' : 'normal',
      fontStyle: style.italic ? 'italic' : 'normal',
      textDecoration: style.underline ? 'underline' : 'none'
    };
  };

  const renderContent = () => {
    // The header and contact info will always be at the top
    const topElements = [
      // Header with Logo and Profile
      <div key="header" className="iitkgp-header">
        <div className="iitkgp-logo">
          <img
            src={data.personalInfo.institutelogo}
            alt="Institute Logo"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '4px'
            }}
          />
        </div>
        
        <div className="iitkgp-center-info">
          <h1 className="iitkgp-name" style={getTextStyle('heading')}>
            {data.personalInfo.name || 'ANON ANON ANON'} | {data.personalInfo.rollNo || '21AB00000'}
          </h1>
          <p className="iitkgp-program" style={getTextStyle('description')}>
            {data.personalInfo.program || 'ANON ANON (M.Tech Dual 5Y)'}
          </p>
          <p className="iitkgp-program" style={getTextStyle('description')}>
            {data.personalInfo.specialization || ''}
          </p>
        </div>
        
        <div className="iitkgp-profile">
          {data.personalInfo.profilePicture ? (
            <img
              src={data.personalInfo.profilePicture}
              alt="Profile"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            'Profile Pic'
          )}
        </div>
      </div>,

      // Contact section
      <div key="contact" className="iitkgp-contact-full" style={getTextStyle('description')}>
        {data.personalInfo.contact && (
          <span className="contact-item">📞 {data.personalInfo.contact}</span>
        )}
        {data.personalInfo.email && (
          <span className="contact-item">✉️ {data.personalInfo.email}</span>
        )}
        {data.personalInfo.github && (
          <span className="contact-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <a href={data.personalInfo.github} style={getTextStyle('description')}>GitHub</a>
          </span>
        )}
        {data.personalInfo.linkedin && (
          <span className="contact-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            <a href={data.personalInfo.linkedin} style={getTextStyle('description')}>LinkedIn</a>
          </span>
        )}
      </div>
    ];
    
    // START: MODIFICATION FOR DYNAMIC ORDERING

    // 1. Define rendering logic for each section in a map.
    // This centralizes the JSX for each section.
    const sectionRenderers = {
      education: () => (data.education && data.education.length > 0) ? [
        <div key="education-section" className="iitkgp-section" style={getTextStyle('heading')}>EDUCATION</div>,
        <table key="education-table" className="iitkgp-education-table">
          <thead>
            <tr style={getTextStyle('heading')}>
              <td style={{ width: '12%', ...getTextStyle('heading') }}>Year</td>
              <td style={{ width: '30%', ...getTextStyle('heading') }}>Degree/Exam</td>
              <td style={{ width: '38%', ...getTextStyle('heading') }}>Institute</td>
              <td style={{ width: '20%', textAlign: 'right', ...getTextStyle('heading') }}>CGPA/Marks</td>
            </tr>
          </thead>
          <tbody>
            {data.education.map((edu, idx) => (
              <tr key={idx} style={getTextStyle('description')}>
                <td style={getTextStyle('description')}>{edu.year}</td>
                <td style={getTextStyle('description')}>{edu.degree}</td>
                <td style={getTextStyle('description')}>{edu.institute}</td>
                <td style={{ textAlign: 'right', ...getTextStyle('description') }}>{edu.cgpa}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ] : [],

      publications: () => (data.publications && data.publications.length > 0) ? [
        <div key="publications-section" className="iitkgp-section" style={getTextStyle('heading')}>PUBLICATIONS</div>,
        ...data.publications.map((pub, idx) => (
          <div key={`publication-${idx}`} className="iitkgp-item">
            <div className="iitkgp-item-header">
              <span style={getTextStyle('heading')}>{pub.title} | {pub.conference} | {pub.location}</span>
              <span style={getTextStyle('heading')}>{pub.date}</span>
            </div>
            <ul className="iitkgp-bullet-list">
              {pub.points.map((point, pIdx) => <li key={pIdx} style={getTextStyle('description')}>{point}</li>)}
            </ul>
          </div>
        ))
      ] : [],

      internships: () => (data.internships && data.internships.length > 0) ? [
        <div key="internships-section" className="iitkgp-section" style={getTextStyle('heading')}>INTERNSHIPS</div>,
        ...data.internships.map((internship, idx) => (
          <div key={`internship-${idx}`} className="iitkgp-item">
            <div className="iitkgp-item-header">
              <span style={getTextStyle('heading')}>{internship.title} | {internship.company} | {internship.location}</span>
              <span style={getTextStyle('heading')}>{internship.duration}</span>
            </div>
            <ul className="iitkgp-bullet-list">
              {internship.description.split('\n').map((point, pIdx) => <li key={pIdx} style={getTextStyle('description')}>{point}</li>)}
            </ul>
          </div>
        ))
      ] : [],

      projects: () => (data.projects && data.projects.length > 0) ? [
        <div key="projects-section" className="iitkgp-section" style={getTextStyle('heading')}>PROJECTS</div>,
        ...data.projects.map((project, idx) => (
          <div key={`project-${idx}`} className="iitkgp-item">
            <div className="iitkgp-item-header">
              <span style={getTextStyle('heading')}>
                {project.title}
                {project.url && (
                  <>
                    {" | "}
                    <a href={project.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                      GitHub Repository
                    </a>
                  </>
                )}
              </span>
              <span style={getTextStyle('heading')}>{project.duration}</span>
            </div>
            <ul className="iitkgp-bullet-list">
              {project.description.split('\n').map((point, pIdx) => <li key={pIdx} style={getTextStyle('description')}>{point}</li>)}
            </ul>
          </div>
        ))
      ] : [],

      competitions: () => (data.competitions && data.competitions.length > 0) ? [
        <div key="competitions-section" className="iitkgp-section" style={getTextStyle('heading')}>COMPETITION/CONFERENCE</div>,
        ...data.competitions.map((comp, idx) => (
          <div key={`competition-${idx}`} className="iitkgp-item">
            <div className="iitkgp-item-header">
              <span style={getTextStyle('heading')}>{comp.title}</span>
              <span style={getTextStyle('heading')}>{comp.date}</span>
            </div>
            <ul className="iitkgp-bullet-list">
              {comp.points.map((point, pIdx) => <li key={pIdx} style={getTextStyle('description')}>{point}</li>)}
            </ul>
          </div>
        ))
      ] : [],

      awards: () => (data.awards && data.awards.length > 0) ? [
        <div key="awards-section" className="iitkgp-section" style={getTextStyle('heading')}>AWARDS AND ACHIEVEMENTS</div>,
        <ul key="awards-list" className="iitkgp-bullet-list">
          {data.awards.map((award, idx) => (
            <li key={idx} style={getTextStyle('description')}>
              {award.title ? `${award.title} - ${award.description}` : award.description}
            </li>
          ))}
        </ul>
      ] : [],

      extraAcademicActivities: () => (data.extraAcademicActivities && data.extraAcademicActivities.length > 0) ? [
        <div key="extra-activities-section" className="iitkgp-section" style={getTextStyle('heading')}>EXTRA ACADEMIC ACTIVITIES</div>,
        <ul key="extra-activities-list" className="iitkgp-bullet-list">
          {data.extraAcademicActivities.map((activity, idx) => {
            const lines = activity.description ? activity.description.split('\n').filter(line => line.trim() !== '') : [];
            return (
              <li key={idx} style={getTextStyle('description')}>
                {activity.title && <strong style={getTextStyle('heading')}>{activity.title} :</strong>}
                {lines.length === 1 ? (
                  <span style={getTextStyle('description')}> {lines[0]}</span>
                ) : lines.length > 1 ? (
                  <ul style={{ listStyleType: 'decimal', paddingLeft: '1.5em' }}>
                    {lines.map((line, subIdx) => <li key={subIdx} style={getTextStyle('description')}>{line}</li>)}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      ] : [],

      coursework: () => (data.coursework && data.coursework.length > 0) ? [
         <div key="coursework-section" className="iitkgp-section" style={getTextStyle('heading')}>COURSEWORK INFORMATION</div>,
         <ul key="coursework-list" className="iitkgp-bullet-list">
          {data.coursework.map((course, idx) => {
            const formattedDescription = course.description ? course.description.split('\n').join(' | ') : '';
            return (
              <li key={idx} style={getTextStyle('description')}>
                {course.title ? (
                  <>
                    <span style={getTextStyle('heading')}>{course.title} : </span>
                    <span style={getTextStyle('description')}>{formattedDescription}</span>
                  </>
                ) : (
                  <span style={getTextStyle('description')}>{formattedDescription}</span>
                )}
              </li>
            );
          })}
        </ul>
      ] : [],

      skills: () => (data.skills && data.skills.length > 0) ? [
        <div key="skills-section" className="iitkgp-section" style={getTextStyle('heading')}>SKILLS AND EXPERTISE</div>,
        <ul key="skills-list" className="iitkgp-bullet-list">
          {data.skills.map((skill, idx) => {
            const skillList = skill.description ? skill.description.split('\n').filter(line => line.trim() !== '') : [];
            return (
              <li key={idx} style={getTextStyle('description')}>
                <strong style={getTextStyle('heading')}>{skill.title}:</strong>{' '}
                <span style={getTextStyle('description')}>{skillList.join(' | ')}</span>
              </li>
            );
          })}
        </ul>
      ] : [],

      position: () => (data.position && data.position.length > 0) ? [
        <div key="position-section" className="iitkgp-section" style={getTextStyle('heading')}>POSITIONS OF RESPONSIBILITY</div>,
        ...data.position.map((pos, idx) => (
          <div key={`position-${idx}`} className="iitkgp-item">
            <div className="iitkgp-item-header">
              <span style={getTextStyle('heading')}>{pos.title}</span>
              <span style={getTextStyle('heading')}>{pos.time}</span>
            </div>
            <ul className="iitkgp-bullet-list">
              {pos.description && pos.description.split('\n').filter(line => line.trim() !== '').map((point, pIdx) => (
                <li key={pIdx} style={getTextStyle('description')}>{point}</li>
              ))}
            </ul>
          </div>
        ))
      ] : [],
    };
    
    // 2. Define the order of sections. Use the user-provided order, or a default one.
    const defaultOrder = [
        'education', 'publications', 'internships', 'projects', 'competitions', 
        'awards', 'extraAcademicActivities', 'coursework', 'skills', 'position'
    ];

    const finalOrder = sectionOrder && sectionOrder.length > 0 ? sectionOrder : defaultOrder;

    // 3. Build the elements array by iterating through the specified order.
    const orderedElements = [];
    finalOrder.forEach(sectionKey => {
      if (sectionRenderers[sectionKey]) {
        const elements = sectionRenderers[sectionKey]();
        orderedElements.push(...elements);
      }
    });

    // Combine the static top elements with the dynamically ordered sections
    const allElements = [...topElements, ...orderedElements];
    
    // END: MODIFICATION
    
    return allElements;
  };

  const allElements = renderContent();
  const { containerRef, pages, A4_HEIGHT } = usePageBreak(data);

  return (
    <div className="iitkgp-resume">
      <PageBreakWrapper
        pages={pages}
        A4_HEIGHT={A4_HEIGHT}
        containerRef={containerRef}
        allElements={allElements}
      />
    </div>
  );
};

export default IITKGPTemplate;