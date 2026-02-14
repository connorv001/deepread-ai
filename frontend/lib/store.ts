import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: "deepread-auth",
    }
  )
);

interface ReaderState {
  selectedText: string;
  setSelectedText: (text: string) => void;
  currentDocument: any | null;
  setCurrentDocument: (doc: any) => void;
  readingProgress: number;
  setReadingProgress: (progress: number) => void;
}

export const useReaderStore = create<ReaderState>()((set) => ({
  selectedText: "",
  setSelectedText: (text) => set({ selectedText: text }),
  currentDocument: null,
  setCurrentDocument: (doc) => set({ currentDocument: doc }),
  readingProgress: 0,
  setReadingProgress: (progress) => set({ readingProgress: progress }),
}));

interface AIState {
  summary: string | null;
  setSummary: (summary: string | null) => void;
  deepDive: any | null;
  setDeepDive: (data: any) => void;
  isAILoading: boolean;
  setIsAILoading: (loading: boolean) => void;
}

export const useAIStore = create<AIState>()((set) => ({
  summary: null,
  setSummary: (summary) => set({ summary }),
  deepDive: null,
  setDeepDive: (deepDive) => set({ deepDive }),
  isAILoading: false,
  setIsAILoading: (isAILoading) => set({ isAILoading }),
}));
