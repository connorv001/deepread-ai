import axios from "axios";
import { streamPOST, StreamOptions } from "./streaming";

// BFF Pattern: All API calls go through Next.js API routes
// Authentication is handled via httpOnly cookies (server-side only)
// Frontend NEVER touches tokens

const api = axios.create({
  baseURL: "/api",  // Routes to Next.js API routes
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,  // IMPORTANT: Send cookies with requests
});

// Response interceptor for global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 - redirect to login
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        // Only redirect if not already on login page
        if (!window.location.pathname.includes('/login')) {
          const currentPath = encodeURIComponent(window.location.pathname);
          window.location.href = `/login?redirect=${currentPath}`;
        }
      }
    }
    
    // Handle 403 - forbidden
    if (error.response?.status === 403) {
      console.error('Access forbidden');
    }
    
    // Handle 500 - server error
    if (error.response?.status >= 500) {
      console.error('Server error:', error.response?.data?.message || 'Unknown error');
    }
    
    return Promise.reject(error);
  }
);

// Auth API - handled by Next.js BFF layer
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  register: (email: string, password: string, name?: string) =>
    api.post("/auth/register", { email, password, name }),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me"),
};

// Documents API - proxied to backend via BFF
export const documentsApi = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/documents/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  get: (id: string) => api.get(`/documents/${id}`),
  delete: (id: string) => api.delete(`/documents/${id}`),
  updateProgress: (id: string, progress: any) =>
    api.patch(`/documents/${id}/progress`, progress),
};

// Library API - proxied to backend via BFF
export const libraryApi = {
  list: (params?: { search?: string; sortBy?: string; order?: string }) =>
    api.get("/library", { params }),
  recent: (limit?: number) => api.get("/library/recent", { params: { limit } }),
};

// AI API - proxied to backend via BFF
export const aiApi = {
  summarize: (data: {
    documentId: string;
    text?: string;
    type: "full" | "selection" | "chapter";
    format?: "paragraph" | "bullet";
    pageStart?: number;
    pageEnd?: number;
  }) => api.post("/ai/summarize", data),

  // Streaming version
  summarizeStream: (
    data: {
      documentId: string;
      text?: string;
      type: "full" | "selection" | "chapter";
      format?: "paragraph" | "bullet";
      pageStart?: number;
      pageEnd?: number;
    },
    options: StreamOptions
  ) => streamPOST("/api/ai/summarize/stream", data, options),

  deepDive: (data: { documentId: string; text: string; context?: string }) =>
    api.post("/ai/deep-dive", data),

  chat: (data: {
    documentId: string;
    message: string;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
  }) => api.post("/ai/chat", data),

  // Streaming version
  chatStream: (
    data: {
      documentId: string;
      message: string;
      history?: Array<{ role: "user" | "assistant"; content: string }>;
    },
    options: StreamOptions
  ) => streamPOST("/api/ai/chat/stream", data, options),
};

// Audio API - proxied to backend via BFF
export const audioApi = {
  generate: (data: {
    documentId: string;
    text: string;
    pageStart?: number;
    pageEnd?: number;
  }) => api.post("/audio/generate", data),
  status: (jobId: string) => api.get(`/audio/status/${jobId}`),
  list: (documentId: string) => api.get(`/audio/document/${documentId}`),
  delete: (jobId: string) => api.delete(`/audio/${jobId}`),
};

// Settings API - proxied to backend via BFF
export const settingsApi = {
  get: () => api.get("/settings"),
  update: (data: any) => api.patch("/settings", data),
};

export default api;
