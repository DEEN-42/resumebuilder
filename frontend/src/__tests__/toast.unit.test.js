/**
 * frontend/src/__tests__/toast.unit.test.js
 *
 * Unit tests for the toast utility (src/utils/toast.jsx).
 * All react-hot-toast calls are mocked so no DOM or browser APIs are needed.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock react-hot-toast BEFORE importing the module under test ──────────────
// vi.mock() is hoisted to the top of the file by Vitest, before any variable
// declarations. We must use vi.hoisted() to declare toastFn at the same hoist
// time so it is available inside the mock factory.
const toastFn = vi.hoisted(() => {
  const fn = vi.fn(() => 'mock-toast-id');
  fn.success = vi.fn(() => 'mock-toast-id');
  fn.error = vi.fn(() => 'mock-toast-id');
  fn.loading = vi.fn(() => 'mock-toast-id');
  fn.promise = vi.fn(() => Promise.resolve('resolved'));
  fn.custom = vi.fn(() => 'mock-toast-id');
  fn.dismiss = vi.fn();
  return fn;
});

vi.mock('react-hot-toast', () => ({
  default: toastFn,
}));

import toast from 'react-hot-toast';
import {
  showSuccess,
  showError,
  showWarning,
  showInfo,
  showLoading,
  showPromise,
  dismissAll,
  dismissToast,
  configureToasts,
} from '../utils/toast.jsx';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getLastCallOptions = (mockFn) => mockFn.mock.calls[0]?.[1];

// ─────────────────────────────────────────────────────────────────────────────

describe('Toast Utility — Unit Tests', () => {
  beforeEach(() => {
    // Clear call counts on all spies, including the base toastFn itself
    toastFn.mockClear();
    toastFn.success.mockClear();
    toastFn.error.mockClear();
    toastFn.loading.mockClear();
    toastFn.promise.mockClear();
    toastFn.custom.mockClear();
    toastFn.dismiss.mockClear();
  });

  // ── showSuccess ─────────────────────────────────────────────────────────────
  describe('showSuccess()', () => {
    it('calls toast.success with the provided message', () => {
      showSuccess('Saved successfully!');
      expect(toast.success).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalledWith(
        'Saved successfully!',
        expect.any(Object)
      );
    });

    it('passes duration: 3000 by default', () => {
      showSuccess('OK');
      const opts = getLastCallOptions(toast.success);
      expect(opts.duration).toBe(3000);
    });

    it('merges caller-provided options (e.g. custom duration)', () => {
      showSuccess('Done', { duration: 1000 });
      const opts = getLastCallOptions(toast.success);
      expect(opts.duration).toBe(1000);
    });

    it('returns the toast ID returned by react-hot-toast', () => {
      const id = showSuccess('Hi');
      expect(id).toBe('mock-toast-id');
    });

    it('applies a green gradient background style', () => {
      showSuccess('Style check');
      const opts = getLastCallOptions(toast.success);
      expect(opts.style.background).toMatch(/10b981|059669/);
    });
  });

  // ── showError ───────────────────────────────────────────────────────────────
  describe('showError()', () => {
    it('calls toast.error with the provided message', () => {
      showError('Something went wrong');
      expect(toast.error).toHaveBeenCalledTimes(1);
      expect(toast.error).toHaveBeenCalledWith(
        'Something went wrong',
        expect.any(Object)
      );
    });

    it('passes duration: 4000 by default', () => {
      showError('Oops');
      const opts = getLastCallOptions(toast.error);
      expect(opts.duration).toBe(4000);
    });

    it('applies a red gradient background style', () => {
      showError('Red alert');
      const opts = getLastCallOptions(toast.error);
      expect(opts.style.background).toMatch(/ef4444|dc2626/);
    });
  });

  // ── showWarning ─────────────────────────────────────────────────────────────
  describe('showWarning()', () => {
    it('calls the base toast() function (not .success or .error)', () => {
      // showWarning uses toast(msg, opts) directly — the default export as a function
      showWarning('Heads up!');
      // Base toastFn should be called once
      expect(toastFn).toHaveBeenCalledTimes(1);
      expect(toastFn).toHaveBeenCalledWith('Heads up!', expect.any(Object));
      // Named methods should NOT be called
      expect(toastFn.success).not.toHaveBeenCalled();
      expect(toastFn.error).not.toHaveBeenCalled();
    });

    it('passes duration: 3500 by default', () => {
      showWarning('Watch out');
      const opts = toastFn.mock.calls[0][1];
      expect(opts.duration).toBe(3500);
    });
  });

  // ── showInfo ────────────────────────────────────────────────────────────────
  describe('showInfo()', () => {
    it('passes duration: 3000 by default', () => {
      showInfo('FYI: something happened');
      const opts = toastFn.mock.calls[0][1];
      expect(opts.duration).toBe(3000);
    });

    it('applies a blue gradient background style', () => {
      showInfo('Info here');
      const opts = toastFn.mock.calls[0][1];
      expect(opts.style.background).toMatch(/3b82f6|2563eb/);
    });
  });

  // ── showLoading ─────────────────────────────────────────────────────────────
  describe('showLoading()', () => {
    it('calls toast.loading with the provided message', () => {
      showLoading('Uploading...');
      expect(toast.loading).toHaveBeenCalledWith(
        'Uploading...',
        expect.any(Object)
      );
    });
  });

  // ── showPromise ─────────────────────────────────────────────────────────────
  describe('showPromise()', () => {
    it('calls toast.promise with the promise and message map', async () => {
      const p = Promise.resolve('data');
      const messages = {
        loading: 'Saving…',
        success: 'Saved!',
        error: 'Failed',
      };
      await showPromise(p, messages);
      expect(toast.promise).toHaveBeenCalledTimes(1);
      // First arg should be the promise
      expect(toast.promise.mock.calls[0][0]).toBe(p);
      // Second arg contains the message strings
      expect(toast.promise.mock.calls[0][1]).toMatchObject(messages);
    });
  });

  // ── dismiss helpers ─────────────────────────────────────────────────────────
  describe('dismissAll()', () => {
    it('calls toast.dismiss with no arguments', () => {
      dismissAll();
      expect(toast.dismiss).toHaveBeenCalledWith();
    });
  });

  describe('dismissToast()', () => {
    it('calls toast.dismiss with the provided ID', () => {
      dismissToast('abc-123');
      expect(toast.dismiss).toHaveBeenCalledWith('abc-123');
    });
  });

  // ── configureToasts ──────────────────────────────────────────────────────────
  describe('configureToasts()', () => {
    it('returns an object with position set to top-right', () => {
      const config = configureToasts();
      expect(config).toHaveProperty('position', 'top-right');
    });

    it('returns an object with toastOptions containing base style', () => {
      const config = configureToasts();
      expect(config).toHaveProperty('toastOptions');
      expect(config.toastOptions).toHaveProperty('style');
    });
  });
});
