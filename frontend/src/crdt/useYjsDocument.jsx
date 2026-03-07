import { useState, useEffect, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import { getInitialResumeData } from '../config/resumeData.jsx';
import { getInitialGlobalStyles } from '../config/globalStyles.jsx';

/**
 * Recursively convert Yjs shared types to plain JavaScript.
 */
function yTypeToPlain(yType) {
  if (yType instanceof Y.Map) {
    const obj = {};
    yType.forEach((value, key) => { obj[key] = yTypeToPlain(value); });
    return obj;
  }
  if (yType instanceof Y.Array) {
    return yType.toArray().map(item => yTypeToPlain(item));
  }
  if (yType instanceof Y.Text) {
    return yType.toString();
  }
  return yType; // primitive
}

/**
 * Deep-merge defaults into obj (only fills in missing keys).
 */
function mergeDefaults(obj, defaults) {
  if (!obj || typeof obj !== 'object' || typeof defaults !== 'object') return obj ?? defaults;
  const result = { ...defaults };
  for (const key of Object.keys(obj)) {
    if (
      typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key]) &&
      typeof defaults[key] === 'object' && defaults[key] !== null && !Array.isArray(defaults[key])
    ) {
      result[key] = mergeDefaults(obj[key], defaults[key]);
    } else {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * React hook that observes a Y.Doc and produces plain-JS state for resume rendering.
 *
 * @param {Y.Doc | null} ydoc
 * @param {boolean} synced - true once the WS provider has completed initial sync
 * @returns {{ resumeData: object, globalStyles: object, selectedTemplate: string }}
 */
export function useYjsDocument(ydoc, synced) {
  const [resumeData, setResumeData] = useState(getInitialResumeData);
  const [globalStyles, setGlobalStyles] = useState(getInitialGlobalStyles);
  const [selectedTemplate, setSelectedTemplate] = useState('iitkg');
  const initialReadDone = useRef(false);

  const readState = useCallback(() => {
    if (!ydoc) return;
    const rdMap = ydoc.getMap('resumeData');
    const gsMap = ydoc.getMap('globalStyles');
    const metaMap = ydoc.getMap('meta');

    const rawResumeData = yTypeToPlain(rdMap);
    const rawGlobalStyles = yTypeToPlain(gsMap);

    setResumeData(mergeDefaults(rawResumeData, getInitialResumeData()));
    setGlobalStyles(mergeDefaults(rawGlobalStyles, getInitialGlobalStyles()));
    setSelectedTemplate(metaMap.get('selectedTemplate') || 'iitkg');
  }, [ydoc]);

  useEffect(() => {
    if (!ydoc) return;

    // Listen for any Y.Doc mutation (local or remote)
    const handler = () => readState();
    ydoc.on('update', handler);

    // Perform initial read once synced (or immediately if already synced)
    if (synced && !initialReadDone.current) {
      initialReadDone.current = true;
      readState();
    }

    return () => { ydoc.off('update', handler); };
  }, [ydoc, synced, readState]);

  // React to the synced flag changing from false → true
  useEffect(() => {
    if (synced && ydoc && !initialReadDone.current) {
      initialReadDone.current = true;
      readState();
    }
  }, [synced, ydoc, readState]);

  return { resumeData, globalStyles, selectedTemplate };
}
