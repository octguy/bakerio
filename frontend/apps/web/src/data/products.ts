export interface Product {
  name: string;
  price: number;
  image: string;
  category: string;
  slug: string;
}

export const products: Product[] = [
  { name: "Vanilla Sponge", price: 185000, image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80", category: "Cakes", slug: "vanilla-sponge" },
  { name: "Chocolate Fondant", price: 148000, image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&q=80", category: "Cakes", slug: "chocolate-fondant" },
  { name: "Red Velvet", price: 175000, image: "https://images.unsplash.com/photo-1616541823729-00fe0aacd32c?w=600&q=80", category: "Cakes", slug: "red-velvet" },
  { name: "Matcha Cheesecake", price: 155000, image: "https://images.unsplash.com/photo-1556040220-4096d522378d?w=600&q=80", category: "Cakes", slug: "matcha-cheesecake" },
  { name: "Butter Croissant", price: 45000, image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&q=80", category: "Pastries", slug: "butter-croissant" },
  { name: "Strawberry Tart", price: 128000, image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&q=80", category: "Pastries", slug: "strawberry-tart" },
  { name: "Almond Danish", price: 65000, image: "https://images.unsplash.com/photo-1509365390695-33aee754301f?w=600&q=80", category: "Pastries", slug: "almond-danish" },
  { name: "Sourdough Loaf", price: 75000, image: "https://images.unsplash.com/photo-1585478259715-876acc5be8eb?w=600&q=80", category: "Bread", slug: "sourdough-loaf" },
  { name: "Baguette", price: 35000, image: "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=600&q=80", category: "Bread", slug: "baguette" },
  { name: "Ciabatta", price: 55000, image: "https://images.unsplash.com/photo-1586444248879-bc604bc77dac?w=600&q=80", category: "Bread", slug: "ciabatta" },
  { name: "Iced Latte", price: 55000, image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&q=80", category: "Drinks", slug: "iced-latte" },
  { name: "Matcha Latte", price: 65000, image: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&q=80", category: "Drinks", slug: "matcha-latte" },
];

export const categories = ["All", "Cakes", "Pastries", "Bread", "Drinks"] as const;
