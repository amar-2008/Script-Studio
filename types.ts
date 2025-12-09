export interface Attachment {
  name: string;
  type: string;
  data: string;
  dataUrl: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  attachment?: Attachment; 
  isError?: boolean;
  suggestedPrompt?: string;
}

export interface ChatSession {
  id: string;
  mode: AppMode;
  title: string;
  preview: string;
  date: string;
  messages: Message[];
}

export interface UserState {
  isLoggedIn: boolean;
  email?: string;
  name?: string;
  phone?: string;
  trials: {
    [key in AppMode]: number; 
  };
}

export enum ViewState {
  AUTH = 'AUTH',
  DASHBOARD = 'DASHBOARD',
  APP = 'APP',
}

export enum AppMode {
  CHAT = 'CHAT',
  IMAGE_GEN = 'IMAGE_GEN', 
  PROMPT_ENG = 'PROMPT_ENG',
}