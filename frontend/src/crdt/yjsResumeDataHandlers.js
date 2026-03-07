import * as Y from 'yjs';

/**
 * Factory that returns resume-data mutation handlers backed by a Y.Doc.
 * The returned interface is identical to the old `createResumeDataHandlers`,
 * so form components need zero changes.
 *
 * @param {Y.Doc} ydoc
 */
export function createYjsResumeDataHandlers(ydoc) {
  /** @returns {Y.Map} */
  const rdMap = () => ydoc.getMap('resumeData');

  // ── helpers ──────────────────────────────────────────────────────────
  /**
   * Get or create a Y.Map for a top-level resumeData key
   * (e.g. personalInfo).
   */
  function getOrCreateMap(parentKey) {
    const parent = rdMap();
    let child = parent.get(parentKey);
    if (!(child instanceof Y.Map)) {
      child = new Y.Map();
      parent.set(parentKey, child);
    }
    return child;
  }

  /**
   * Get or create a Y.Array for a top-level resumeData key
   * (e.g. education, internships).
   */
  function getOrCreateArray(parentKey) {
    const parent = rdMap();
    let child = parent.get(parentKey);
    if (!(child instanceof Y.Array)) {
      child = new Y.Array();
      parent.set(parentKey, child);
    }
    return child;
  }

  /**
   * Generic handler for array-based sections (education, internships, …).
   * Supports add / remove / field-edit — same signature as the old setResumeData handlers.
   *
   * @param {string} sectionKey   - e.g. 'education'
   * @param {object} emptyItem    - default fields for a new item
   */
  function makeArrayHandler(sectionKey, emptyItem) {
    return (index, field, value) => {
      const arr = getOrCreateArray(sectionKey);
      if (index === 'add') {
        const yItem = new Y.Map();
        for (const [k, v] of Object.entries(emptyItem)) yItem.set(k, v);
        arr.push([yItem]);
      } else if (field === 'remove') {
        if (typeof index === 'number' && index >= 0 && index < arr.length) {
          arr.delete(index, 1);
        }
      } else {
        const yItem = arr.get(index);
        if (yItem instanceof Y.Map) {
          yItem.set(field, value);
        }
      }
    };
  }

  // ── personalInfo (Y.Map) ─────────────────────────────────────────────
  const handlePersonalInfoChange = (field, value) => {
    getOrCreateMap('personalInfo').set(field, value);
  };

  // ── array-based sections ─────────────────────────────────────────────
  const handleEducationChange = makeArrayHandler('education', {
    year: '', degree: '', institute: '', cgpa: '',
  });

  const handleInternshipsChange = makeArrayHandler('internships', {
    title: '', company: '', duration: '', description: '',
  });

  const handleProjectsChange = makeArrayHandler('projects', {
    title: '', duration: '', description: '', url: '',
  });

  const handleSkillsChange = makeArrayHandler('skills', {
    title: '', description: '',
  });

  const handleAwardsChange = makeArrayHandler('awards', {
    title: '', description: '',
  });

  const handleExtraAcademicActivitiesChange = makeArrayHandler('extraAcademicActivities', {
    title: '', description: '',
  });

  const handleCourseworkChange = makeArrayHandler('coursework', {
    title: '', description: '',
  });

  const handlePositionsOfResponsibilityChange = makeArrayHandler('position', {
    title: '', time: '', description: '',
  });

  // ── sectionorder ─────────────────────────────────────────────────────
  const handleSectionOrderChange = (newSectionOrder) => {
    const arr = getOrCreateArray('sectionorder');
    ydoc.transact(() => {
      arr.delete(0, arr.length);
      newSectionOrder.forEach(item => {
        const yItem = new Y.Map();
        Object.entries(item).forEach(([k, v]) => yItem.set(k, v));
        arr.push([yItem]);
      });
    });
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
    handleSectionOrderChange,
  };
}

/**
 * Create handlers for globalStyles and selectedTemplate backed by Y.Doc.
 * @param {Y.Doc} ydoc
 */
export function createYjsUIHandlers(ydoc) {
  const handleStyleChange = (category, property, value) => {
    const gsMap = ydoc.getMap('globalStyles');
    let catMap = gsMap.get(category);
    if (!(catMap instanceof Y.Map)) {
      catMap = new Y.Map();
      gsMap.set(category, catMap);
    }
    catMap.set(property, value);
  };

  const handleTemplateChange = (newTemplate) => {
    ydoc.getMap('meta').set('selectedTemplate', newTemplate);
  };

  return { handleStyleChange, handleTemplateChange };
}
