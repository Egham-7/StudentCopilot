import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import IndexPage from "../src/routes/index"


// Mock the Clerk provider
vi.mock('@clerk/clerk-react', () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SignInButton: () => <button>Sign In</button>,
  SignUpButton: () => <button>Sign Up</button>,
}));

// Mock the custom components
vi.mock('@/components/magicui/blur-in', () => ({
  default: ({ word }: { word: string }) => <div>{word}</div>,
}));

vi.mock('@/components/magicui/animated-gradient-text', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/magicui/hero-video-dialog', () => ({
  default: () => <div data-testid="hero-video-dialog"></div>,
}));

vi.mock('@/components/custom/feature-section', () => ({
  FeaturesSection: () => <div data-testid="features-section"></div>,
}));

vi.mock('@/components/custom/pricing-card', () => ({
  default: ({ title }: { title: string }) => <div data-testid={`pricing-card-${title}`}>{title}</div>,
}));

vi.mock('@/components/custom/student-event-list', () => ({
  StudentEventsList: () => <div data-testid="student-events-list"></div>,
}));

vi.mock('@/components/custom/orbiting-circles', () => ({
  OrbitingCirclesLandingPage: () => <div data-testid="orbiting-circles"></div>,
}));

describe('IndexPage', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<IndexPage />);
    expect(screen.getByText('StudentCopilot')).toBeTruthy();
  });

  it('displays the main heading', () => {
    render(<IndexPage />);
    expect(screen.getByText('StudentCopilot is the #1 way to supercharge your learning.')).toBeTruthy();
  });

  it('renders the "Get started for free" button', () => {
    render(<IndexPage />);
    expect(screen.getByText('Get started for free')).toBeTruthy();
  });

  it('renders the HeroVideoDialog component', () => {
    render(<IndexPage />);
    expect(screen.getByTestId('hero-video-dialog')).toBeTruthy();
  });

  it('renders the FeaturesSection component', () => {
    render(<IndexPage />);
    expect(screen.getByTestId('features-section')).toBeTruthy();
  });

  it('renders the pricing cards', () => {
    render(<IndexPage />);
    expect(screen.getByTestId('pricing-card-Basic')).toBeTruthy();
    expect(screen.getByTestId('pricing-card-Pro')).toBeTruthy();
    expect(screen.getByTestId('pricing-card-Enterprise')).toBeTruthy();
  });

  it('renders the StudentEventsList component', () => {
    render(<IndexPage />);
    expect(screen.getByTestId('student-events-list')).toBeTruthy();
  });

  it('renders the OrbitingCirclesLandingPage component', () => {
    render(<IndexPage />);
    expect(screen.getByTestId('orbiting-circles')).toBeTruthy();
  });


  it('renders SignInButton and SignUpButton', () => {
    render(<IndexPage />);
    expect(screen.getByText('Sign In')).toBeTruthy();
    expect(screen.getByText('Sign Up')).toBeTruthy();
  });

  it('renders trusted teams logos', () => {
    render(<IndexPage />);
    const logos = screen.getAllByRole('img');
    expect(logos).toHaveLength(5);
    expect(logos[0]).toHaveAttribute('alt', 'Cambridge University Logo');
    expect(logos[1]).toHaveAttribute('alt', 'Harvard University Logo');
    expect(logos[2]).toHaveAttribute('alt', 'MIT University Logo');
    expect(logos[3]).toHaveAttribute('alt', 'Oxford University Logo');
    expect(logos[4]).toHaveAttribute('alt', 'Google Logo');
  });
});

