import { DM_Serif_Display, Instrument_Serif, Newsreader, Manrope, JetBrains_Mono, Sacramento } from 'next/font/google';

export const display = DM_Serif_Display({
  variable: '--font-display',
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
});

export const editorial = Instrument_Serif({
  variable: '--font-editorial',
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
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
  subsets: ['latin'],
});

export const script = Sacramento({
  variable: '--font-script',
  weight: '400',
  subsets: ['latin'],
});
