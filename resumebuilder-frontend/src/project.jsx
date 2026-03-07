// project.jsx — Yjs CRDT-powered collaborative resume builder
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  PanelLeftClose, PanelLeftOpen, 
  PanelRightClose, PanelRightOpen,
  ZoomIn, ZoomOut, RotateCcw
} from 'lucide-react';
import { handleResumeDownload } from './handlers/handleResumeDownload.jsx';
import './project.css';
import './LeftPanel.css';

// Configuration
import { initialSections } from './config/resumeData.jsx';
import { getTemplatesConfig } from './config/templates.jsx';

// Yjs CRDT layer
import { createYjsSetup } from './crdt/yjsSetup.js';
import { useYjsDocument } from './crdt/useYjsDocument.jsx';
import { createYjsResumeDataHandlers, createYjsUIHandlers } from './crdt/yjsResumeDataHandlers.js';

// Components
import Header from './Components/Header/Header.jsx';
import Loading from './Components/Loading/Loading.jsx';
import Error from './Components/Error/Error.jsx';
import RightPanel from './Components/RightPanel/RightPanel.jsx';

// Form Components
import PersonalInfoForm from './Components/FormSections/PersonalInfoForm/PersonalInfoForm.jsx';
import EducationForm from './Components/FormSections/EducationForm/EducationForm.jsx';
import InternshipsForm from './Components/FormSections/InternshipsForm/InternshipsForm.jsx';
import ProjectsForm from './Components/FormSections/ProjectsForm/ProjectsForm.jsx';
import SkillsForm from './Components/FormSections/SkillsForm/SkillsForm.jsx';
import AwardsForm from './Components/FormSections/AwardsForm/AwardsForm.jsx';
import ExtraAcademicActivitiesForm from './Components/FormSections/ExtraCurricularForm/ExtraAcademicActivitiesForm.jsx';
import CourseworkForm from './Components/FormSections/CourseworkForm/CourseworkForm.jsx';
import PositionsOfResponsibilityForm from './Components/FormSections/PositionsOfResponsibilityForm/PositionsOfResponsibilityForm.jsx';
import ResumeCustomizer from './Components/ResumeCustomizer/ResumeCustomizer.jsx';
import DeployPortfolio from './Components/DeployPortfolio/DeployPortfolio.jsx';

import { BACKEND_URL } from './constants/apiConfig.js';
import { showInfo } from './utils/toast.jsx';

// Main Application
const ResumeBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // ── Layout State ───────────────────────────────────────────────────
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [leftPanelWidth, setLeftPanelWidth] = useState(520);
  const [rightPanelWidth, setRightPanelWidth] = useState(300);
  const isResizingLeft = useRef(false);
  const isResizingRight = useRef(false);

  // ── Pure-UI state ──────────────────────────────────────────────────
  const [zoomLevel, setZoomLevel] = useState(80);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deployedUrl, setDeployedUrl] = useState('');
  
  // Navigation State
  const [activeSideTab, setActiveSideTab] = useState('share');
  const [activeMainTab, setActiveMainTab] = useState('details');
  const [activeDetailSection, setActiveDetailSection] = useState('personalInfo');

  // ── Yjs / collaboration state ──────────────────────────────────────
  const [synced, setSynced] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [ydoc, setYdoc] = useState(null);
  const yjsRef = useRef(null);

  const templates = getTemplatesConfig();

  // ── Initialize Yjs providers on mount; tear down on unmount ────────
  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem('token');
    if (!token) { setError('No authentication token'); setIsLoading(false); return; }

    let cancelled = false;
    let setup = null;
    let loadingTimeout = null;
    let poll = null;

    const initTimer = setTimeout(() => {
      if (cancelled) return;

      // Bootstrap Yjs
      setup = createYjsSetup(id, token);
      yjsRef.current = setup;
      setYdoc(setup.ydoc);

      loadingTimeout = setTimeout(() => {
        if (!cancelled) { setSynced(true); setIsLoading(false); }
      }, 10000);

      fetch(`${BACKEND_URL}/resumes/load/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.ok ? res.json() : null)
        .then(json => {
          if (!cancelled && json?.resume?.deployment?.vercelUrl) {
            setDeployedUrl(json.resume.deployment.vercelUrl);
          }
        })
        .catch(() => {});

      const awareness = setup.wsProvider.awareness;

      // Decode the JWT payload to get the authenticated user's email.
      // localStorage.getItem('userData') stores the resumes array (not user info),
      // so we read directly from the token instead.
      let ownEmail = 'unknown';
      let ownName = 'Anonymous';
      try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        ownEmail = payload.email || 'unknown';
        ownName = payload.name || ownEmail;
      } catch {}

      awareness.setLocalStateField('user', {
        email: ownEmail,
        name: ownName,
      });

      // ── Shared helper: rebuild connectedUsers from current awareness map ──
      // Tracks previous email set so joins/leaves can be detected for toasts.
      let prevEmailSet = new Set([ownEmail]);

      const getCurrentEmails = () => {
        const emails = new Set([ownEmail]);
        awareness.getStates().forEach((state, cid) => {
          if (state?.user?.email && cid !== setup.ydoc.clientID) {
            emails.add(state.user.email);
          }
        });
        return emails;
      };

      // pendingLeave: email → timeoutId for debounced leave toasts.
      // If a user leaves and rejoins within LEAVE_DEBOUNCE_MS (refresh case),
      // the timeout is cancelled and no toast is shown for either event.
      const pendingLeave = new Map();
      const LEAVE_DEBOUNCE_MS = 3000;

      // Silent refresh — used for initial scan, reconnect, and polling where
      // we don't want spurious toasts (peer list may not be stable yet).
      const syncOnlineUsers = () => {
        if (cancelled) return;
        const current = getCurrentEmails();
        prevEmailSet = current;
        setConnectedUsers([...current]);
      };

      // Awareness change handler — fired when peers join, update, or leave.
      // Leave toasts are debounced: only shown if the user is still absent
      // after LEAVE_DEBOUNCE_MS (suppresses refresh-triggered false positives).
      const handleAwarenessChange = () => {
        if (cancelled) return;
        const current = getCurrentEmails();

        // Joiners
        current.forEach(email => {
          if (email !== ownEmail && !prevEmailSet.has(email)) {
            if (pendingLeave.has(email)) {
              // They left and rejoined within the debounce window (refresh) —
              // cancel the leave toast and don't show a join toast either.
              clearTimeout(pendingLeave.get(email));
              pendingLeave.delete(email);
            } else {
              showInfo(`${email} joined the document`);
            }
          }
        });

        // Leavers — schedule toast instead of firing immediately
        prevEmailSet.forEach(email => {
          if (email !== ownEmail && !current.has(email) && !pendingLeave.has(email)) {
            const tid = setTimeout(() => {
              pendingLeave.delete(email);
              if (!cancelled) showInfo(`${email} left the document`);
            }, LEAVE_DEBOUNCE_MS);
            pendingLeave.set(email, tid);
          }
        });

        prevEmailSet = current;
        setConnectedUsers([...current]);
      };

      // Initial scan (pick up any states already in awareness before we subscribed)
      syncOnlineUsers();

      // Listen for live awareness changes — with join/leave toast detection
      awareness.on('change', handleAwarenessChange);

      // Re-scan on reconnect — y-websocket clears peer states on reconnect then
      // re-populates them; the 'connected' status fires first, then awareness
      // updates arrive. A short delay lets awareness settle before we read it.
      setup.wsProvider.on('status', ({ status }) => {
        if (!cancelled) {
          setIsConnected(status === 'connected');
          if (status === 'connected') {
            setTimeout(syncOnlineUsers, 800);
          }
        }
      });

      // Re-scan once the document is fully synced (all peer awareness is fresh)
      setup.wsProvider.on('synced', (isSynced) => {
        if (!cancelled) {
          setSynced(isSynced);
          if (isSynced) {
            setIsLoading(false);
            syncOnlineUsers();
          }
        }
      });

      // Polling fallback: catches any awareness states that arrived between
      // events (race conditions during rapid reconnects, etc.)
      poll = setInterval(syncOnlineUsers, 2000);

      setup.idbPersistence.whenSynced.then(() => {
        if (!cancelled) { setSynced(true); setIsLoading(false); syncOnlineUsers(); }
      });

    }, 0);

    return () => {
      cancelled = true;
      clearInterval(poll);
      clearTimeout(initTimer);
      clearTimeout(loadingTimeout);
      // Clear any pending leave-toast timers to avoid stale toasts after unmount
      if (typeof pendingLeave !== 'undefined') {
        pendingLeave.forEach(tid => clearTimeout(tid));
      }
      if (yjsRef.current) { yjsRef.current.destroy(); yjsRef.current = null; }
      setYdoc(null);
      setSynced(false);
      setIsConnected(false);
      setConnectedUsers([]);
    };
  }, [id]);

  // ── Panel resize drag logic ──────────────────────────────────────────
  const handleLeftResizeStart = useCallback((e) => {
    isResizingLeft.current = true;
    e.preventDefault();
  }, []);

  const handleRightResizeStart = useCallback((e) => {
    isResizingRight.current = true;
    e.preventDefault();
  }, []);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (isResizingLeft.current) {
        const newW = Math.max(220, Math.min(520, e.clientX));
        setLeftPanelWidth(newW);
      }
      if (isResizingRight.current) {
        const newW = Math.max(220, Math.min(520, window.innerWidth - e.clientX));
        setRightPanelWidth(newW);
      }
    };
    const onMouseUp = () => {
      isResizingLeft.current = false;
      isResizingRight.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    const onMouseDown = () => {
      if (isResizingLeft.current || isResizingRight.current) {
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
      }
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousedown', onMouseDown);
    };
  }, []);

  const { resumeData, globalStyles, selectedTemplate } = useYjsDocument(ydoc, synced);

  const dataHandlers = useMemo(
    () => ydoc ? createYjsResumeDataHandlers(ydoc) : null, [ydoc]
  );
  const yjsUIHandlers = useMemo(
    () => ydoc ? createYjsUIHandlers(ydoc) : null, [ydoc]
  );

  const sections = resumeData.sectionorder || initialSections;
  const sectionOrder = sections.map(s => s.id);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 10, 150));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 10, 30));
  const handleZoomReset = () => setZoomLevel(80);
  const handleDownload = async () => {
    try { await handleResumeDownload(setIsDownloading, resumeData); }
    catch (err) { console.error('Download failed:', err); }
  };
  const returnHandler = useCallback(() => navigate('/dashboard'), [navigate]);
  const handleGoHome = useCallback(() => navigate('/'), [navigate]);

  useEffect(() => {
    if (!ydoc || !synced) return;
    const tplData = templates[selectedTemplate];
    if (!tplData) return;
    const rdMap = ydoc.getMap('resumeData');
    const pi = rdMap.get('personalInfo');
    if (pi && typeof pi.set === 'function') {
      pi.set('institutelogo', tplData.logo);
    }
  }, [selectedTemplate, ydoc, synced]);
  
  const detailFormOptions = [
    { value: 'personalInfo', label: 'Personal Info' },
    { value: 'education', label: 'Education' },
    { value: 'internships', label: 'Internships' },
    { value: 'projects', label: 'Projects' },
    { value: 'skills', label: 'Skills' },
    { value: 'awards', label: 'Awards & Achievements' },
    { value: 'extraAcademicActivities', label: 'Extra-Curricular' },
    { value: 'coursework', label: 'Coursework' },
    { value: 'position', label: 'Positions of Responsibility' },
  ];

  const TemplateComponent = templates[selectedTemplate]?.component;

  if (isLoading) return <Loading message="Loading workspace..." />;

  if (error && !resumeData.personalInfo?.name) {
    return (
      <Error
        error={`Error loading resume: ${error}`}
        onRetry={() => window.location.reload()}
        onGoHome={handleGoHome}
        title="Failed to load resume"
      />
    );
  }

  if (!dataHandlers || !yjsUIHandlers) return <Loading message="Initializing..." />;

  return (
    <div className="resume-builder-layout">
      {/* ── HEADER ─────────────────────────────────────────────── */}
      <Header
        returnHandler={returnHandler}
        handleTemplateChange={yjsUIHandlers.handleTemplateChange}
        handleAISuggestions={() => { setActiveSideTab('ai suggestions'); if(!rightPanelOpen) setRightPanelOpen(true); }}
        handleZoomIn={handleZoomIn}
        handleZoomOut={handleZoomOut}
        handleZoomReset={handleZoomReset}
        handleDownload={handleDownload}
        handleShare={() => { setActiveSideTab('share'); if(!rightPanelOpen) setRightPanelOpen(true); }}
        handleATSscore={() => { setActiveSideTab('ats'); if(!rightPanelOpen) setRightPanelOpen(true); }}
        saveResumeData={() => {}}
        selectedTemplate={selectedTemplate}
        templates={templates}
        zoomLevel={zoomLevel}
        isDownloading={isDownloading}
        saveStatus={isConnected ? 'saved' : 'saving'}
        lastSaved={null}
        lastUpdatedBy={null}
        isConnected={isConnected}
        connectedUsers={connectedUsers}
      />

      {/* ── WORKSPACE ──────────────────────────────────────────── */}
      <div className="workspace-container">
        
        {/* LEFT PANEL (Editor) */}
        <aside
          className={`workspace-panel left-panel ${leftPanelOpen ? 'open' : 'closed'}`}
          style={leftPanelOpen ? { width: leftPanelWidth } : {}}
        >
          <div className="panel-header">
            <h2 className="panel-title">Editor</h2>
            <button 
              className="panel-toggle-btn"
              onClick={() => setLeftPanelOpen(false)}
              title="Close Panel"
            >
              <PanelLeftClose size={18} />
            </button>
          </div>
          
          <div className="panel-content-scroll">
            {/* Editor Navigation Tabs */}
            <div className="editor-nav-tabs">
              <button 
                className={`editor-tab ${activeMainTab === 'details' ? 'active' : ''}`} 
                onClick={() => setActiveMainTab('details')}
              >
                Details
              </button>
              <button 
                 className={`editor-tab ${activeMainTab === 'order' ? 'active' : ''}`} 
                 onClick={() => setActiveMainTab('order')}
              >
                Structure
              </button>
              <button 
                 className={`editor-tab ${activeMainTab === 'deploy' ? 'active' : ''}`} 
                 onClick={() => setActiveMainTab('deploy')}
              >
                Deploy
              </button>
            </div>

            {/* Editor Content Area */}
            <div className="editor-content-area">
              {activeMainTab === 'details' && (
                <div className="details-editor">
                  <div className="section-selector-wrapper">
                    <select 
                      className="section-dropdown"
                      value={activeDetailSection} 
                      onChange={(e) => setActiveDetailSection(e.target.value)}
                    >
                      {detailFormOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-renderer">
                    {activeDetailSection === 'personalInfo' && <PersonalInfoForm id={id} data={resumeData.personalInfo} onChange={dataHandlers.handlePersonalInfoChange} styles={globalStyles} onStyleChange={yjsUIHandlers.handleStyleChange} />}
                    {activeDetailSection === 'education' && <EducationForm data={resumeData.education} onChange={dataHandlers.handleEducationChange} />}
                    {activeDetailSection === 'internships' && <InternshipsForm data={resumeData.internships} onChange={dataHandlers.handleInternshipsChange} />}
                    {activeDetailSection === 'projects' && <ProjectsForm data={resumeData.projects} onChange={dataHandlers.handleProjectsChange} />}
                    {activeDetailSection === 'skills' && <SkillsForm data={resumeData.skills} onChange={dataHandlers.handleSkillsChange} />}
                    {activeDetailSection === 'awards' && <AwardsForm data={resumeData.awards} onChange={dataHandlers.handleAwardsChange} />}
                    {activeDetailSection === 'extraAcademicActivities' && <ExtraAcademicActivitiesForm data={resumeData.extraAcademicActivities} onChange={dataHandlers.handleExtraAcademicActivitiesChange} />}
                    {activeDetailSection === 'coursework' && <CourseworkForm data={resumeData.coursework} onChange={dataHandlers.handleCourseworkChange} />}
                    {activeDetailSection === 'position' && <PositionsOfResponsibilityForm data={resumeData.position} onChange={dataHandlers.handlePositionsOfResponsibilityChange} />}
                  </div>
                </div>
              )}
              {activeMainTab === 'deploy' && (
                <DeployPortfolio resumeId={id} resumeData={resumeData} deployedUrl={deployedUrl} setDeployedUrl={setDeployedUrl} />
              )}
              {activeMainTab === 'order' && (
                <ResumeCustomizer sections={sections} onSectionOrderChange={dataHandlers.handleSectionOrderChange} />
              )}
            </div>
          </div>

          {/* ── Drag-resize handle (right edge of left panel) */}
          {leftPanelOpen && (
            <div className="resize-handle resize-handle-right" onMouseDown={handleLeftResizeStart} />
          )}
        </aside>

        {/* COLLAPSED LEFT INDICATOR */}
        {!leftPanelOpen && (
          <div className="panel-collapsed-indicator left" onClick={() => setLeftPanelOpen(true)}>
            <PanelLeftOpen size={20} />
          </div>
        )}

        {/* CENTER CANVAS */}
        <main className="workspace-canvas">
          <div className="canvas-toolbar">
            <div className="zoom-controls">
              <button onClick={handleZoomOut} title="Zoom Out"><ZoomOut size={16} /></button>
              <span className="zoom-label">{Math.round(zoomLevel)}%</span>
              <button onClick={handleZoomIn} title="Zoom In"><ZoomIn size={16} /></button>
              <button onClick={handleZoomReset} title="Reset"><RotateCcw size={14} /></button>
            </div>
          </div>

          <div className="canvas-scroll-area">
            <div 
              className="resume-preview-wrapper"
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
            >
               {TemplateComponent && (
                  <TemplateComponent 
                    data={resumeData} 
                    styles={globalStyles} 
                    sectionOrder={sectionOrder} 
                  />
               )}
            </div>
          </div>
        </main>

        {/* COLLAPSED RIGHT INDICATOR */}
        {!rightPanelOpen && (
          <div className="panel-collapsed-indicator right" onClick={() => setRightPanelOpen(true)}>
            <PanelRightOpen size={20} />
          </div>
        )}

        {/* RIGHT PANEL (Tools) */}
        <aside
          className={`workspace-panel right-panel ${rightPanelOpen ? 'open' : 'closed'}`}
          style={rightPanelOpen ? { width: rightPanelWidth } : {}}
        >
          {/* ── Drag-resize handle (left edge of right panel) */}
          {rightPanelOpen && (
            <div className="resize-handle resize-handle-left" onMouseDown={handleRightResizeStart} />
          )}
           <div className="panel-header">
            <h2 className="panel-title">Tools</h2>
            <button 
              className="panel-toggle-btn"
              onClick={() => setRightPanelOpen(false)}
              title="Close Panel"
            >
              <PanelRightClose size={18} />
            </button>
          </div>
          <div className="panel-content-scroll">
            <RightPanel
              id={id}
              resumeData={resumeData}
              activeTab={activeSideTab}
              dataHandlers={dataHandlers}
              connectedUsers={connectedUsers}
            />
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ResumeBuilder;