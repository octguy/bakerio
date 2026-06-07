import { Newsreader, Manrope, JetBrains_Mono, Sacramento } from 'next/font/google';

export const display = Newsreader({
  variable: '--font-display',
  style: ['normal', 'italic'],
  subsets: ['latin', 'vietnamese'],
});

export const editorial = Newsreader({
  variable: '--font-editorial',
  style: ['normal', 'italic'],
  subsets: ['latin', 'vietnamese'],
});

export const news = Newsreader({
  variable: '--font-news',
  style: ['normal', 'italic'],
  subsets: ['latin', 'vietnamese'],
});

export const sans = Manrope({
  variable: '--font-sans',
  subsets: ['latin', 'vietnamese'],
});

export const mono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin', 'vietnamese'],
});

export const script = Sacramento({
  variable: '--font-script',
  weight: '400',
  subsets: ['latin'],
});
