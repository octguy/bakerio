import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock('gsap', () => ({
  gsap: { timeline: () => ({ from: vi.fn() }), from: vi.fn(), registerPlugin: vi.fn() },
}));

vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: { getAll: () => [] },
}));

vi.mock('@/components/ui/ScrollReveal', () => ({
  default: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
}));

vi.mock('@/components/ui/HeroAnimation', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/SectionHeader', () => ({
  default: ({ script, title }: { script?: string; title: string }) => (
    <div>
      {script && <p>{script}</p>}
      <h2>{title}</h2>
    </div>
  ),
}));

vi.mock('@/components/ui/CounterAnimation', () => ({
  default: ({ target, suffix }: { target: number; suffix?: string }) => <span>{target}{suffix}</span>,
}));

vi.mock('@/components/cards/ProductCard', () => ({
  default: ({ name }: { name: string }) => <div data-testid="product-card">{name}</div>,
}));

vi.mock('@/components/cards/LocationCard', () => ({
  default: ({ name }: { name: string }) => <div data-testid="location-card">{name}</div>,
}));

vi.mock('@/components/cards/TestimonialCard', () => ({
  default: ({ name }: { name: string }) => <div data-testid="testimonial-card">{name}</div>,
}));

vi.mock('@/data/products', () => ({
  products: [
    { name: 'Test Cake', price: 100, image: '/cake.jpg', category: 'Cakes', slug: 'test-cake' },
    { name: 'Test Bread', price: 50, image: '/bread.jpg', category: 'Bread', slug: 'test-bread' },
    { name: 'Test Pastry', price: 75, image: '/pastry.jpg', category: 'Pastries', slug: 'test-pastry' },
    { name: 'Test Cookie', price: 30, image: '/cookie.jpg', category: 'Cookies', slug: 'test-cookie' },
  ],
}));

vi.mock('@/data/locations', () => ({
  locations: [
    { name: 'Location 1', address: '123 St', region: 'A', hours: '8-5' },
    { name: 'Location 2', address: '456 St', region: 'B', hours: '9-6' },
    { name: 'Location 3', address: '789 St', region: 'C', hours: '7-4' },
  ],
}));

vi.mock('@/data/testimonials', () => ({
  testimonials: [
    { name: 'User 1', date: 'Jan 2026', rating: 5, text: 'Great!' },
  ],
}));

vi.mock('@/data/posts', () => ({
  posts: [
    { slug: 'post-1', title: 'Post One', excerpt: 'Excerpt 1', date: '2026-01-01', category: 'News', image: '/post1.jpg' },
    { slug: 'post-2', title: 'Post Two', excerpt: 'Excerpt 2', date: '2026-01-02', category: 'Tips', image: '/post2.jpg' },
    { slug: 'post-3', title: 'Post Three', excerpt: 'Excerpt 3', date: '2026-01-03', category: 'Events', image: '/post3.jpg' },
  ],
}));

vi.mock('lucide-react', () => ({
  ChevronDown: () => <svg data-testid="chevron-down" />,
}));

import Home from './page';

describe('Homepage', () => {
  it('renders without crashing', () => {
    const { container } = render(<Home />);
    expect(container.querySelector('main')).toBeInTheDocument();
  });

  it('contains the hero heading', () => {
    render(<Home />);
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings[0]).toHaveTextContent(/every bite tells a story/i);
  });

  it('has CTA links in the hero section', () => {
    render(<Home />);
    const menuLinks = screen.getAllByRole('link', { name: /view menu/i });
    expect(menuLinks[0]).toHaveAttribute('href', '/menu');
    const locationLinks = screen.getAllByRole('link', { name: /find locations/i });
    expect(locationLinks[0]).toHaveAttribute('href', '/locations');
  });

  it('has proper semantic structure with main and sections', () => {
    const { container } = render(<Home />);
    const main = container.querySelector('main');
    expect(main).toBeInTheDocument();
    const sections = main!.querySelectorAll('section');
    expect(sections.length).toBeGreaterThanOrEqual(5);
  });

  it('renders section headings for products, testimonials, and locations', () => {
    render(<Home />);
    expect(screen.getAllByText("From Our Kitchen").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("What Our Customers Say").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Our Locations").length).toBeGreaterThanOrEqual(1);
  });

  it('displays stats counters with values', () => {
    render(<Home />);
    expect(screen.getAllByText("Branches").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Products").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Happy Customers").length).toBeGreaterThanOrEqual(1);
  });

  it('has footer CTA links for navigation', () => {
    render(<Home />);
    const locationLinks = screen.getAllByRole('link', { name: /view all locations/i });
    expect(locationLinks[0]).toHaveAttribute('href', '/locations');
    const storyLinks = screen.getAllByRole('link', { name: /view all stories/i });
    expect(storyLinks[0]).toHaveAttribute('href', '/blog');
    const aboutLinks = screen.getAllByRole('link', { name: /our story/i });
    expect(aboutLinks[0]).toHaveAttribute('href', '/about');
  });
});
