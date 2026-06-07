import axios from "axios";
import type {
  Template, Resume, ResumeListItem, ResumeSection, SectionType,
  AnalyzeJDResponse, OptimizeResponse, ExportFormat, ExportResult, User,
} from "./types";

const http = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080",
  timeout: 60_000,
});

// Attach JWT from localStorage on every request
http.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("resume_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Auth ──────────────────────────────────────────────────────────────────────
export const auth = {
  register: (data: { email: string; password: string; name: string }) =>
    http.post<{ message: string }>("/api/auth/register", data),

  login: (data: { email: string; password: string }) =>
    http.post<{ token: string; user: User }>("/api/auth/login", data),

  me: () =>
    http.get<User>("/api/auth/me"),
};

// ── Templates ─────────────────────────────────────────────────────────────────
export const templates = {
  list: () =>
    http.get<Template[]>("/api/templates"),

  get: (id: number) =>
    http.get<Template & { texSource: string }>(`/api/templates/${id}`),
};

// ── Resumes ───────────────────────────────────────────────────────────────────
export const resumes = {
  list: () =>
    http.get<ResumeListItem[]>("/api/resumes"),

  get: (id: number) =>
    http.get<Resume>(`/api/resumes/${id}`),

  create: (data: { templateId: number; title?: string }) =>
    http.post<{ id: number; message: string }>("/api/resumes", data),

  update: (id: number, data: { title: string }) =>
    http.put<{ message: string }>(`/api/resumes/${id}`, data),

  delete: (id: number) =>
    http.delete<{ message: string }>(`/api/resumes/${id}`),

  updateSection: (resumeId: number, type: SectionType, data: { content: unknown; isVisible?: boolean }) =>
    http.put<{ message: string }>(`/api/resumes/${resumeId}/sections/${type}`, data),

  reorderSections: (resumeId: number, order: number[]) =>
    http.put<{ message: string }>(`/api/resumes/${resumeId}/sections/reorder`, { order }),
};

// ── JD & Optimization ─────────────────────────────────────────────────────────
export const jd = {
  analyze: (data: {
    rawText:     string;
    resumeId:    number;
    companyName?: string;
    jobTitle?:   string;
  }) =>
    http.post<AnalyzeJDResponse>("/api/jd/analyze", data),

  optimize: (resumeId: number, data: {
    jdId:     number;
    sections: { section_type: SectionType }[];
  }) =>
    http.post<OptimizeResponse>(`/api/optimize/${resumeId}`, data),

  acceptSession: (sessionId: number) =>
    http.post<{ message: string }>(`/api/optimize/${sessionId}/accept`),

  rejectSession: (sessionId: number) =>
    http.post<{ message: string }>(`/api/optimize/${sessionId}/reject`),
};

// ── Exports ───────────────────────────────────────────────────────────────────
export const exports = {
  generate: (resumeId: number, format: ExportFormat) =>
    http.post<ExportResult>(`/api/export/${resumeId}/${format}`),

  download: (exportId: number) =>
    `${http.defaults.baseURL}/api/export/${exportId}/download`,
};
