import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import { BACKEND_URL } from '../constants/apiConfig.js';

/**
 * Initialize a Yjs document with WebSocket sync and IndexedDB offline cache.
 *
 * @param {string} resumeId - The resume UUID
 * @param {string} token    - JWT auth token
 * @returns {{ ydoc: Y.Doc, wsProvider: WebsocketProvider, idbPersistence: IndexeddbPersistence, destroy: () => void }}
 */
export function createYjsSetup(resumeId, token) {
  const ydoc = new Y.Doc();

  // Offline cache: survives page reloads, enables offline editing
  const idbPersistence = new IndexeddbPersistence(`resume-${resumeId}`, ydoc);

  // Derive ws(s):// URL from the HTTP backend URL
  const wsUrl = BACKEND_URL.replace(/^http/, 'ws') + '/yjs';

  const wsProvider = new WebsocketProvider(wsUrl, resumeId, ydoc, {
    params: { token },
    // y-websocket handles reconnection with exponential backoff by default
  });

  const destroy = () => {
    wsProvider.destroy();
    idbPersistence.destroy();
    ydoc.destroy();
  };

  return { ydoc, wsProvider, idbPersistence, destroy };
}
