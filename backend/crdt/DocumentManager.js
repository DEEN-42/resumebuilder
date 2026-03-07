import * as Y from 'yjs';
import Resume from '../models/resumeDatamodel.js';

/**
 * @typedef {import('ws').WebSocket} WebSocket
 */

/**
 * Manages in-memory Y.Doc instances for active resumes.
 * Handles loading from MongoDB, dirty-tracking for write-behind persistence,
 * and garbage collection of idle documents.
 */
class DocumentManager {
  constructor() {
    /** @type {Map<string, Y.Doc>} */
    this.docs = new Map();
    /** @type {Map<string, Promise<Y.Doc>>} - Prevents concurrent loads for the same resume */
    this.loading = new Map();
    /** @type {Map<string, Set<WebSocket>>} */
    this.connections = new Map();
    /** @type {Set<string>} - Resume IDs with un-persisted changes */
    this.dirtyDocs = new Set();
    /** @type {Map<string, NodeJS.Timeout>} */
    this.gcTimers = new Map();
    /** @type {((resumeId: string) => void) | null} - Called when a doc is evicted from memory */
    this.onDocEvicted = null;
    this.GC_DELAY_MS = 5 * 60 * 1000;
  }

  /**
   * Get or create a Y.Doc for the given resume ID.
   * Concurrent calls for the same ID share a single MongoDB load.
   * @param {string} resumeId
   * @param {object} [preloadedResume] - Optional pre-fetched resume doc to avoid a second MongoDB query
   * @returns {Promise<Y.Doc>}
   */
  async getDoc(resumeId, preloadedResume) {
    if (this.docs.has(resumeId)) {
      this._cancelGC(resumeId);
      return this.docs.get(resumeId);
    }
    if (this.loading.has(resumeId)) {
      return this.loading.get(resumeId);
    }

    const loadPromise = this._loadDoc(resumeId, preloadedResume);
    this.loading.set(resumeId, loadPromise);
    try {
      return await loadPromise;
    } finally {
      this.loading.delete(resumeId);
    }
  }

  /** @param {string} resumeId @param {object} [preloadedResume] */
  async _loadDoc(resumeId, preloadedResume) {
    const ydoc = new Y.Doc();
    this.docs.set(resumeId, ydoc);

    const resume = preloadedResume || await Resume.findOne({ id: resumeId }).lean();
    if (resume) {
      if (resume.yjsState && resume.yjsState.buffer) {
        Y.applyUpdate(ydoc, new Uint8Array(resume.yjsState.buffer));
      } else if (resume.resumeData || resume.globalStyles || resume.selectedTemplate) {
        // Legacy migration: hydrate from plain JSON fields
        this._hydrateFromPlain(ydoc, {
          resumeData: resume.resumeData || {},
          globalStyles: resume.globalStyles || {},
          selectedTemplate: resume.selectedTemplate || 'iitkg',
        });
      }
    }
    return ydoc;
  }

  /** @param {string} resumeId @param {WebSocket} ws */
  addConnection(resumeId, ws) {
    if (!this.connections.has(resumeId)) {
      this.connections.set(resumeId, new Set());
    }
    this.connections.get(resumeId).add(ws);
    this._cancelGC(resumeId);
  }

  /** @param {string} resumeId @param {WebSocket} ws */
  removeConnection(resumeId, ws) {
    const conns = this.connections.get(resumeId);
    if (conns) {
      conns.delete(ws);
      if (conns.size === 0) {
        this.connections.delete(resumeId);
        this._scheduleGC(resumeId);
      }
    }
  }

  /** @param {string} resumeId @returns {Set<WebSocket>} */
  getConnections(resumeId) {
    return this.connections.get(resumeId) || new Set();
  }

  /** @param {string} resumeId */
  markDirty(resumeId) {
    this.dirtyDocs.add(resumeId);
  }

  /** @returns {string[]} All dirty resume IDs (clears the set). */
  flushDirtyIds() {
    const ids = [...this.dirtyDocs];
    this.dirtyDocs.clear();
    return ids;
  }

  /** @param {string} resumeId @returns {Uint8Array|null} */
  encodeState(resumeId) {
    const ydoc = this.docs.get(resumeId);
    return ydoc ? Y.encodeStateAsUpdate(ydoc) : null;
  }

  /**
   * Extract plain JSON from Y.Doc for backward-compatible MongoDB storage.
   * @param {string} resumeId
   */
  toJSON(resumeId) {
    const ydoc = this.docs.get(resumeId);
    if (!ydoc) return null;

    return {
      resumeData: this._yTypeToPlain(ydoc.getMap('resumeData')),
      globalStyles: this._yTypeToPlain(ydoc.getMap('globalStyles')),
      selectedTemplate: ydoc.getMap('meta').get('selectedTemplate') || 'iitkg',
    };
  }

  /**
   * Populate a fresh Y.Doc from legacy plain JSON data.
   * Runs in a single transaction to avoid multiple update events.
   */
  _hydrateFromPlain(ydoc, { resumeData, globalStyles, selectedTemplate }) {
    ydoc.transact(() => {
      const rdMap = ydoc.getMap('resumeData');
      const gsMap = ydoc.getMap('globalStyles');
      const metaMap = ydoc.getMap('meta');

      if (resumeData) {
        for (const [key, value] of Object.entries(resumeData)) {
          if (Array.isArray(value)) {
            const yArr = new Y.Array();
            value.forEach(item => {
              const yItem = new Y.Map();
              if (typeof item === 'object' && item !== null) {
                for (const [k, v] of Object.entries(item)) {
                  yItem.set(k, v);
                }
              }
              yArr.push([yItem]);
            });
            rdMap.set(key, yArr);
          } else if (typeof value === 'object' && value !== null) {
            const ySubMap = new Y.Map();
            for (const [k, v] of Object.entries(value)) {
              ySubMap.set(k, v);
            }
            rdMap.set(key, ySubMap);
          } else {
            rdMap.set(key, value);
          }
        }
      }

      if (globalStyles) {
        for (const [key, value] of Object.entries(globalStyles)) {
          if (typeof value === 'object' && value !== null) {
            const ySubMap = new Y.Map();
            for (const [k, v] of Object.entries(value)) {
              ySubMap.set(k, v);
            }
            gsMap.set(key, ySubMap);
          } else {
            gsMap.set(key, value);
          }
        }
      }

      metaMap.set('selectedTemplate', selectedTemplate || 'iitkg');
    });
  }

  /** Recursively convert Yjs types to plain JavaScript objects/arrays. */
  _yTypeToPlain(yType) {
    if (yType instanceof Y.Map) {
      const result = {};
      yType.forEach((value, key) => {
        result[key] = this._yTypeToPlain(value);
      });
      return result;
    }
    if (yType instanceof Y.Array) {
      return yType.toArray().map(item => this._yTypeToPlain(item));
    }
    if (yType instanceof Y.Text) {
      return yType.toString();
    }
    return yType;
  }

  /** @param {string} resumeId */
  _scheduleGC(resumeId) {
    this._cancelGC(resumeId);
    this.gcTimers.set(
      resumeId,
      setTimeout(() => {
        if (this.dirtyDocs.has(resumeId)) return; // let persistence flush first
        const ydoc = this.docs.get(resumeId);
        if (ydoc) {
          ydoc.destroy();
          this.docs.delete(resumeId);
        }
        this.gcTimers.delete(resumeId);
        if (this.onDocEvicted) this.onDocEvicted(resumeId);
      }, this.GC_DELAY_MS)
    );
  }

  /** @param {string} resumeId */
  _cancelGC(resumeId) {
    const timer = this.gcTimers.get(resumeId);
    if (timer) {
      clearTimeout(timer);
      this.gcTimers.delete(resumeId);
    }
  }
}

export const documentManager = new DocumentManager();
