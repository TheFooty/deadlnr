export interface CanvasAssignment {
  id: string;
  title: string;
  course: string;
  dueDate: string; // ISO String
  description: string;
  canvasUrl: string;
}

export type PreferredAI = 'gemini' | 'chatgpt' | 'claude';

export interface UserSettings {
  preferred_ai: PreferredAI;
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
