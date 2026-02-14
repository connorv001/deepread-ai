import axios from "axios";
import { useAuthStore } from "./store";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  register: (email: string, password: string, name?: string) =>
    api.post("/auth/register", { email, password, name }),
  me: () => api.get("/auth/me"),
};

// Documents API
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

// Library API
export const libraryApi = {
  list: (params?: { search?: string; sortBy?: string; order?: string }) =>
    api.get("/library", { params }),
  recent: (limit?: number) => api.get("/library/recent", { params: { limit } }),
};

// AI API
export const aiApi = {
  summarize: (data: {
    documentId: string;
    text?: string;
    type: "full" | "selection" | "chapter";
    format?: "paragraph" | "bullet";
  }) => api.post("/ai/summarize", data),
  deepDive: (data: { documentId: string; text: string; context?: string }) =>
    api.post("/ai/deep-dive", data),
  chat: (data: {
    documentId: string;
    message: string;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
  }) => api.post("/ai/chat", data),
};

// Audio API
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

// Settings API
export const settingsApi = {
  get: () => api.get("/settings"),
  update: (data: any) => api.patch("/settings", data),
};

export default api;
