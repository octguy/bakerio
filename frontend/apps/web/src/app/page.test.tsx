import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { getProducts } from '@repo/api-client';

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

vi.mock('next/link', () => ({
  default: ({ children, href, 'aria-label': ariaLabel }: { children: React.ReactNode; href: string; 'aria-label'?: string }) => (
    <a href={href} aria-label={ariaLabel}>{children}</a>
  ),
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

vi.mock('@repo/api-client', () => ({
  getProducts: vi.fn().mockResolvedValue([
    {
      id: 'p-1',
      name: 'Bánh Mì Sài Gòn',
      base_price: 35000,
      is_active: true,
      category: { id: 'c-1', name: 'Bread' },
      images: [{ url: '/img/banhmi.jpg' }],
    },
  ]),
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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Homepage', () => {
  it('contains the hero heading', () => {
    render(<Home />);
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings[0]).toHaveTextContent(/every bite tells a story/i);
  });

  it('renders featured products from the api-client response', async () => {
    render(<Home />);

    expect(screen.getByText(/opening the larder doors/i)).toBeInTheDocument();
    expect(await screen.findByText('Bánh Mì Sài Gòn')).toBeInTheDocument();
    expect(screen.getByText('35.000₫')).toBeInTheDocument();
    expect(getProducts).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/opening the larder doors/i)).toBeNull();
  });

  it('has CTA links in the hero section', () => {
    render(<Home />);
    const menuLinks = screen.getAllByRole('link', { name: /view menu/i });
    expect(menuLinks[0]).toHaveAttribute('href', '/menu');
    const locationLinks = screen.getAllByRole('link', { name: /find locations/i });
    expect(locationLinks[0]).toHaveAttribute('href', '/locations');
  });

  it('renders section headings for products, testimonials, and locations', () => {
    render(<Home />);
    expect(screen.getByText(/what we baked/i)).toBeInTheDocument();
    expect(screen.getByText(/the trick isn't the crust/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /eleven shops, one city/i })).toBeInTheDocument();
  });

  it('displays stats counters with values', () => {
    render(<Home />);
    expect(screen.getByText("Cửa hàng")).toBeInTheDocument();
    expect(screen.getByText("Mở cửa")).toBeInTheDocument();
    expect(screen.getByText("Lên men")).toBeInTheDocument();
  });

  it('has CTA links for navigation', () => {
    render(<Home />);
    const locationLinks = screen.getAllByRole('link', { name: /view all locations/i });
    expect(locationLinks[0]).toHaveAttribute('href', '/locations');
    const storyLinks = screen.getAllByRole('link', { name: /view all stories/i });
    expect(storyLinks[0]).toHaveAttribute('href', '/blog');
    const aboutLinks = screen.getAllByRole('link', { name: /our story/i });
    expect(aboutLinks[0]).toHaveAttribute('href', '/about');
  });
});
