import { Newsreader, Manrope, JetBrains_Mono } from 'next/font/google';
import localFont from 'next/font/local';

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

export const script = localFont({
  src: '../../public/fonts/FS Playlist Script.ttf',
  variable: '--font-script',
  display: 'swap',
});

export const slab = localFont({
  src: [
    { path: '../../public/fonts/JosefinSlab-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../../public/fonts/JosefinSlab-Italic.ttf', weight: '400', style: 'italic' },
    { path: '../../public/fonts/JosefinSlab-Light.ttf', weight: '300', style: 'normal' },
    { path: '../../public/fonts/JosefinSlab-LightItalic.ttf', weight: '300', style: 'italic' },
  ],
  variable: '--font-slab',
  display: 'swap',
});
