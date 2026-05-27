export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  image: string;
  category: string;
}

export const posts: BlogPost[] = [
  {
    slug: "the-art-of-sourdough",
    title: "The Art of Sourdough: 72 Hours of Patience",
    excerpt: "Our sourdough journey begins 3 days before it reaches your table. Here's why slow fermentation makes all the difference.",
    date: "2024-12-15",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80",
    category: "Behind the Scenes",
  },
  {
    slug: "sourcing-vanilla-from-madagascar",
    title: "From Madagascar to Saigon: Our Vanilla Story",
    excerpt: "We travel 8,000km for the perfect vanilla bean. Discover why we refuse to compromise on this essential ingredient.",
    date: "2024-11-28",
    image: "https://images.unsplash.com/photo-1568827999250-3f6afff96e66?w=800&q=80",
    category: "Ingredients",
  },
  {
    slug: "holiday-collection-2024",
    title: "Introducing Our Holiday Collection 2024",
    excerpt: "Festive cakes, seasonal pastries, and limited-edition flavors — our holiday menu is here.",
    date: "2024-11-10",
    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80",
    category: "News",
  },
  {
    slug: "zero-waste-bakery",
    title: "Our Journey Toward Zero Waste",
    excerpt: "From composting to creative reuse — how we're reducing our environmental footprint one loaf at a time.",
    date: "2024-10-22",
    image: "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=800&q=80",
    category: "Sustainability",
  },
];
