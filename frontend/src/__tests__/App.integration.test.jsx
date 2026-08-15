/**
 * frontend/src/__tests__/App.integration.test.jsx
 *
 * Integration (smoke) test for the root App component.
 * Verifies that App renders without crashing and basic routing works.
 *
 * Heavy dependencies (socket.io-client, jwt-decode, child components)
 * are mocked at the module level so no network or real auth is needed.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';

// ─── Mock child components that need network / complex deps ───────────────────
vi.mock('../Components/AuthPages/Login.jsx', () => ({
  default: () => <div data-testid="mock-login">Login Page</div>,
}));

vi.mock('../Components/AuthPages/Register.jsx', () => ({
  default: () => <div data-testid="mock-register">Register Page</div>,
}));

vi.mock('../Components/Dashboard/dashboard.jsx', () => ({
  default: () => <div data-testid="mock-dashboard">Dashboard</div>,
}));

vi.mock('../Components/Profile/Profile.jsx', () => ({
  default: () => <div data-testid="mock-profile">Profile</div>,
}));

vi.mock('../project.jsx', () => ({
  default: () => <div data-testid="mock-project">Project</div>,
}));

vi.mock('../context/ThemeContext.jsx', () => ({
  ThemeProvider: ({ children }) => <div data-testid="theme-provider">{children}</div>,
}));

// ─── Mock external libraries ──────────────────────────────────────────────────
vi.mock('react-hot-toast', () => ({
  Toaster: () => <div data-testid="mock-toaster" />,
  default: {
    success: vi.fn(),
    error: vi.fn(),
    dismiss: vi.fn(),
  },
}));

vi.mock('jwt-decode', () => ({
  jwtDecode: vi.fn(() => ({
    email: 'test@example.com',
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now (valid)
  })),
}));

vi.mock('../constants/apiConfig.js', () => ({
  BACKEND_URL: 'http://localhost:3030',
}));

// ─────────────────────────────────────────────────────────────────────────────
import App from '../App.jsx';

describe('App — Integration / Smoke Tests', () => {
  beforeAll(() => {
    // Suppress React Router warnings in test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  // ── Render tests ──────────────────────────────────────────────────────────
  it('renders without throwing', () => {
    expect(() => render(<App />)).not.toThrow();
  });

  it('renders the ThemeProvider wrapper', () => {
    render(<App />);
    expect(screen.getByTestId('theme-provider')).toBeInTheDocument();
  });

  it('renders the Toaster component', () => {
    render(<App />);
    expect(screen.getByTestId('mock-toaster')).toBeInTheDocument();
  });

  // ── Unauthenticated routing ───────────────────────────────────────────────
  it('redirects to /login when no token is present in localStorage', () => {
    // Ensure localStorage is clear (no token)
    localStorage.clear();

    render(<App />);

    // The "/" route redirects to "/login", so the Login mock should render
    expect(screen.getByTestId('mock-login')).toBeInTheDocument();
  });

  // ── ProtectedRoute guard ──────────────────────────────────────────────────
  it('renders login page at /login path', () => {
    // React Router defaults to "/" in jsdom; App redirects / → /login
    localStorage.clear();
    render(<App />);
    expect(screen.queryByTestId('mock-login')).toBeInTheDocument();
  });
});
