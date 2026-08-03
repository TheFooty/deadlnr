export interface CanvasAssignment {
  id: string;
  title: string;
  course: string;
  dueDate: string; // ISO String
  description: string;
  canvasUrl: string;
}

export type PreferredAI = 'gemini' | 'chatgpt' | 'claude';

export type ThemeId = 'default' | 'cyberpunk' | 'emerald' | 'sunset' | 'dracula';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  primary: string;
  bg: string;
  card: string;
  accent: string;
}

export const APP_THEMES: Record<ThemeId, ThemeOption> = {
  default: {
    id: 'default',
    name: 'Deadlnr Dark',
    primary: '#FF3B00',
    bg: '#080A0F',
    card: '#111622',
    accent: '#00E599',
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Neon Cyberpunk',
    primary: '#FF007A',
    bg: '#0B0813',
    card: '#161024',
    accent: '#00F0FF',
  },
  emerald: {
    id: 'emerald',
    name: 'Midnight Emerald',
    primary: '#10B981',
    bg: '#050B14',
    card: '#0F172A',
    accent: '#84CC16',
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset Amber',
    primary: '#F59E0B',
    bg: '#0F0C08',
    card: '#1C1712',
    accent: '#FF6B6B',
  },
  dracula: {
    id: 'dracula',
    name: 'Dracula Obsidian',
    primary: '#A855F7',
    bg: '#0D0B14',
    card: '#181524',
    accent: '#EC4899',
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
