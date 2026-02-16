import { create } from "zustand";

// NO PERSIST - Auth is now handled via httpOnly cookies (backend-managed)

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start loading until we check auth
  setAuth: (user) => set({ user, isAuthenticated: true, isLoading: false }),
  logout: () => set({ user: null, isAuthenticated: false, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading }),
}));

interface ReaderState {
  selectedText: string;
  setSelectedText: (text: string) => void;
  currentDocument: any | null;
  setCurrentDocument: (doc: any) => void;
  readingProgress: number;
  setReadingProgress: (progress: number) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
}

export const useReaderStore = create<ReaderState>()((set) => ({
  selectedText: "",
  setSelectedText: (text) => set({ selectedText: text }),
  currentDocument: null,
  setCurrentDocument: (doc) => set({ currentDocument: doc }),
  readingProgress: 0,
  setReadingProgress: (progress) => set({ readingProgress: progress }),
  currentPage: 1,
  setCurrentPage: (page) => set({ currentPage: page }),
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
