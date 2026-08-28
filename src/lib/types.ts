export interface TaskAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string; // Base64 data URL
}

export interface CanvasAssignment {
  id: string;
  title: string;
  course: string;
  dueDate: string; // ISO String
  description: string;
  canvasUrl: string;
  uid?: string;
  attachments?: TaskAttachment[];
  isCustom?: boolean;
}

export type PreferredAI = 'gemini' | 'chatgpt' | 'claude';

export type ThemeId = 'default' | 'cyberpunk' | 'emerald' | 'sunset' | 'dracula' | 'ocean' | 'rose';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  primary: string;
  bg: string;
  card: string;
  accent: string;
  uiAccent: string;
  surface2: string;
}

export const APP_THEMES: Record<ThemeId, ThemeOption> = {
  default: {
    id: 'default',
    name: 'Deadlnr Dark',
    primary: '#5e6ad2',
    bg: '#08090a',
    card: '#191a1b',
    accent: '#27a644',
    uiAccent: '#5e6ad2',
    surface2: '#1f2021',
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Neon Cyberpunk',
    primary: '#FF007A',
    bg: '#0B0813',
    card: '#161024',
    accent: '#00F0FF',
    uiAccent: '#FF007A',
    surface2: '#1c1530',
  },
  emerald: {
    id: 'emerald',
    name: 'Midnight Emerald',
    primary: '#10B981',
    bg: '#050B14',
    card: '#0F172A',
    accent: '#84CC16',
    uiAccent: '#10B981',
    surface2: '#162035',
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset Amber',
    primary: '#F59E0B',
    bg: '#0F0C08',
    card: '#1C1712',
    accent: '#FF6B6B',
    uiAccent: '#F59E0B',
    surface2: '#231e14',
  },
  dracula: {
    id: 'dracula',
    name: 'Dracula Obsidian',
    primary: '#A855F7',
    bg: '#0D0B14',
    card: '#181524',
    accent: '#EC4899',
    uiAccent: '#A855F7',
    surface2: '#1e1a30',
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean Depths',
    primary: '#38bdf8',
    bg: '#030c1a',
    card: '#0a1628',
    accent: '#06b6d4',
    uiAccent: '#0ea5e9',
    surface2: '#0d1f38',
  },
  rose: {
    id: 'rose',
    name: 'Rose Gold',
    primary: '#fb7185',
    bg: '#150a0a',
    card: '#221212',
    accent: '#fda4af',
    uiAccent: '#f43f5e',
    surface2: '#2a1616',
  },
};

export interface UserSettings {
  preferred_ai: PreferredAI;
  theme?: ThemeId;
  show_demo_data?: boolean;
  has_feed_url: boolean;
}

export interface SwipeEvent {
  assignment_id: string;
  assignment_title: string;
  course?: string;
  direction: 'left' | 'right';
  swiped_at?: string;
}

export interface AIProvider {
  id: PreferredAI;
  name: string;
  url: string;
  icon: string;
  badge: string;
}

export const AI_PROVIDERS: Record<PreferredAI, AIProvider> = {
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    url: 'https://gemini.google.com/app',
    icon: 'Sparkles',
    badge: 'Default',
  },
  chatgpt: {
    id: 'chatgpt',
    name: 'ChatGPT',
    url: 'https://chatgpt.com',
    icon: 'Bot',
    badge: 'Popular',
  },
  claude: {
    id: 'claude',
    name: 'Claude AI',
    url: 'https://claude.ai/chat',
    icon: 'Brain',
    badge: 'Smart Context',
  },
};
