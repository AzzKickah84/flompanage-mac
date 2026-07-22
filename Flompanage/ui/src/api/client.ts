import type { AdminComment, AdminUser, AdminUserProfile, AdminUserRow, AdminVideo, ModerationLogEntry, NotificationPollSnapshot, SiteStats, SiteSettings, StaffActionLogPage, UserKudoAdminInfo, VisitorIpEntry, VisitorIpsResponse, FullStatistics } from "./types";

const STORAGE_KEY = "flompanage-session";
const BASE_URL_KEY = "flompanage-base-url";
const DEFAULT_SERVER_URL = "https://www.flompert.nl";

function normalizeServerUrl(url?: string | null): string {
  const value = (url || "").trim();
  if (!value || /localhost|127\.0\.0\.1/i.test(value)) return DEFAULT_SERVER_URL;
  return value.replace(/\/$/, "");
}

type Session = { baseUrl: string; token: string; user: AdminUser };

export function getSession(): Session | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as Session; } catch { return null; }
}
export function saveSession(s: Session) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }
export function clearSession() { localStorage.removeItem(STORAGE_KEY); }

// All API requests go through the Kestrel proxy (relative URLs), which forwards to the target server.
function base(): string { return ""; }

export function getServerUrl() {
  return normalizeServerUrl(localStorage.getItem(BASE_URL_KEY));
}

/** Public site URL with a flag so page views from Flompanage are not counted as visits. */
export function sitePageUrl(path: string) {
  const base = getServerUrl();
  const url = new URL(path.startsWith("/") ? path : `/${path}`, base);
  url.searchParams.set("flompanage", "1");
  return url.toString();
}
export function setServerUrl(url: string) {
  localStorage.setItem(BASE_URL_KEY, normalizeServerUrl(url));
}

class ApiClient {
  private getHeaders(): HeadersInit {
    const s = getSession();
    const h: HeadersInit = { "Content-Type": "application/json" };
    if (s?.token) h.Authorization = `Bearer ${s.token}`;
    return h;
  }
  private async request<T>(path: string, opts?: RequestInit): Promise<T> {
    const res = await fetch(`${base()}${path}`, { ...opts, headers: { ...this.getHeaders(), ...opts?.headers } });
    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const data = isJson ? await res.json() : {};
    if (!res.ok) {
      const errMsg = (isJson && data && typeof data === "object" && "error" in data) ? (data as { error: string }).error : null;
      const hint = (isJson && data && typeof data === "object" && "hint" in data) ? (data as { hint?: string }).hint : undefined;
      if (res.status === 502 || res.status === 503 || res.status === 504) {
        throw new Error(errMsg || "De server is offline. Probeer het later opnieuw.");
      }
      throw new Error([errMsg, hint].filter(Boolean).join(" — ") || `Request failed (${res.status})`);
    }
    return data as T;
  }

  async login(directUrl: string, login: string, password: string) {
    const clean = directUrl.replace(/\/$/, "");
    const res = await fetch(`/api/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password })
    });
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      if (res.status === 502 || res.status === 503 || res.status === 504) {
        throw new Error("De server is offline of overbelast. Probeer het later opnieuw of neem contact op met de beheerder.");
      }
      throw new Error(`Onverwachte server response (${res.status}). Is de server-URL correct?`);
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Inloggen mislukt");
    saveSession({ baseUrl: clean, token: data.token, user: data.user });
    setServerUrl(clean);
    return data.user as AdminUser;
  }
  logout() { clearSession(); }

  async me() { const d = await this.request<{ user: AdminUser }>("/api/admin/auth/me"); return d.user; }
  async changePassword(currentPassword: string, newPassword: string) {
    return this.request<{ success: boolean }>("/api/admin/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }
  async getStats() { return this.request<SiteStats>("/api/admin/stats"); }
  async getNotificationPoll() {
    return this.request<NotificationPollSnapshot>("/api/admin/notifications/poll");
  }
  async getVideos(status: string) {
    const d = await this.request<{ videos: AdminVideo[] }>(`/api/admin/videos?status=${status}`);
    return d.videos;
  }
  async approveVideo(id: string) { return this.request(`/api/admin/videos/${id}/approve`, { method: "POST" }); }
  async approveAllVideos() {
    const d = await this.request<{ result: { approved: number; failed: number; skipped: number; errors: string[] } }>(
      "/api/admin/videos/approve-all",
      { method: "POST" },
    );
    return d.result;
  }
  async rejectVideo(id: string, reason?: string) {
    return this.request(`/api/admin/videos/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) });
  }
  async deleteVideo(id: string) { return this.request(`/api/admin/videos/${id}`, { method: "DELETE" }); }
  async editVideo(id: string, data: { title?: string; description?: string; tags?: string[] }) {
    return this.request(`/api/admin/videos/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  }
  async setVideoTags(id: string, tags: string[]) {
    return this.request(`/api/admin/videos/${id}`, { method: "PATCH", body: JSON.stringify({ tags }) });
  }
  async toggleNsfw(id: string) { return this.request(`/api/admin/videos/${id}/toggle-nsfw`, { method: "POST" }); }

  async getComments(status?: string, videoId?: string, limit?: number) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (videoId) params.set("videoId", videoId);
    if (limit) params.set("limit", String(limit));
    const qs = params.toString() ? `?${params}` : "";
    const d = await this.request<{ comments: AdminComment[] }>(`/api/admin/comments${qs}`);
    return d.comments;
  }
  async getRecentComments(limit = 25) {
    const d = await this.request<{ comments: AdminComment[] }>(
      `/api/admin/comments?recent=${limit}`,
    );
    return d.comments;
  }
  async editComment(id: string, content: string) {
    return this.request(`/api/admin/comments/${id}`, { method: "PATCH", body: JSON.stringify({ content }) });
  }
  async deleteComment(id: string) { return this.request(`/api/admin/comments/${id}`, { method: "DELETE" }); }
  async declineComment(id: string, reason: string) {
    return this.request(`/api/admin/comments/${id}/decline`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }
  async approveComment(id: string) { return this.request(`/api/admin/comments/${id}/approve`, { method: "POST" }); }
  async approveAllComments() {
    const d = await this.request<{ result: { approved: number; failed: number; skipped: number; errors: string[] } }>(
      "/api/admin/comments/approve-all",
      { method: "POST" },
    );
    return d.result;
  }
  async banUserFromComment(id: string, reason: string, days: number | null) {
    return this.request(`/api/admin/comments/${id}/ban`, {
      method: "POST",
      body: JSON.stringify({ reason, days }),
    });
  }

  async getUsers() {
    const d = await this.request<{ users: AdminUserRow[] }>("/api/admin/users");
    return d.users;
  }
  async getUserProfile(target: { userId: string } | { username: string }) {
    if ("userId" in target) {
      const d = await this.request<{ user: AdminUserProfile }>(`/api/admin/users/${target.userId}`);
      return d.user;
    }
    const d = await this.request<{ user: AdminUserProfile }>(
      `/api/admin/users/lookup?username=${encodeURIComponent(target.username)}`,
    );
    return d.user;
  }
  async createUser(data: { email: string; username: string; password: string; role: string }) {
    return this.request<{ user: AdminUserRow }>("/api/admin/users", { method: "POST", body: JSON.stringify(data) });
  }
  async updateUserRole(id: string, role: string) {
    return this.request(`/api/admin/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) });
  }
  async banUser(id: string, reason: string, days: number | null) {
    return this.request(`/api/admin/users/${id}/ban`, { method: "POST", body: JSON.stringify({ reason, days }) });
  }
  async unbanUser(id: string) { return this.request(`/api/admin/users/${id}/unban`, { method: "POST" }); }
  async verifyUserEmail(id: string) {
    return this.request<{ user: AdminUserRow }>(`/api/admin/users/${id}/verify-email`, { method: "POST" });
  }
  async deleteUser(id: string) {
    return this.request<{ success: boolean; deleted: { id: string; username: string; email: string } }>(
      `/api/admin/users/${id}/delete`,
      { method: "DELETE" },
    );
  }
  async toggleShowInStats(id: string) {
    return this.request<{ showInStats: boolean }>(`/api/admin/users/${id}/show-in-stats`, { method: "PATCH" });
  }
  async getUserKudos(id: string) {
    return this.request<UserKudoAdminInfo>(`/api/admin/users/${id}/kudos`);
  }
  async setUserKudoScore(id: string, kudoScore: number) {
    return this.request<UserKudoAdminInfo>(`/api/admin/users/${id}/kudos`, {
      method: "PATCH",
      body: JSON.stringify({ kudoScore }),
    });
  }
  async resetUserKudosToZero(id: string) {
    return this.request<UserKudoAdminInfo>(`/api/admin/users/${id}/kudos`, {
      method: "PATCH",
      body: JSON.stringify({ resetToZero: true }),
    });
  }
  async restoreUserKudos(id: string) {
    return this.request<UserKudoAdminInfo>(`/api/admin/users/${id}/kudos`, {
      method: "PATCH",
      body: JSON.stringify({ reset: true }),
    });
  }
  async resetUserPassword(id: string) {
    return this.request<{ success: boolean; newPassword: string }>(
      `/api/admin/users/${id}/reset-password`,
      { method: "POST" },
    );
  }
  async setUserPassword(id: string, password: string, notifyUser = true) {
    return this.request<{ success: boolean }>(`/api/admin/users/${id}/set-password`, {
      method: "POST",
      body: JSON.stringify({ password, notifyUser }),
    });
  }
  async sendUserEmail(
    id: string,
    subject: string,
    message: string,
    type: "warning" | "info" | "notification",
  ) {
    return this.request<{ success: boolean }>(`/api/admin/users/${id}/email`, {
      method: "POST",
      body: JSON.stringify({ subject, message, type }),
    });
  }
  async resendBanEmail(id: string) {
    return this.request<{ success: boolean }>(`/api/admin/users/${id}/send-ban-email`, {
      method: "POST",
    });
  }

  async getSettings() {
    const d = await this.request<{ settings: SiteSettings }>("/api/admin/settings");
    return d.settings;
  }
  async updateSettings(s: Partial<SiteSettings>) {
    const d = await this.request<{ settings: SiteSettings }>("/api/admin/settings", { method: "PATCH", body: JSON.stringify(s) });
    return d.settings;
  }
  async clearBrevoEmail() {
    const d = await this.request<{ settings: SiteSettings }>("/api/admin/settings", {
      method: "PATCH",
      body: JSON.stringify({ resetBrevoEmail: true }),
    });
    return d.settings;
  }
  async getModerationLog(targetType: "VIDEO" | "COMMENT", targetId: string) {
    const d = await this.request<{ entries: ModerationLogEntry[] }>(
      `/api/admin/moderation-log?targetType=${targetType}&targetId=${encodeURIComponent(targetId)}`,
    );
    return d.entries;
  }
  async getStaffActionLog(options?: {
    targetType?: "VIDEO" | "COMMENT" | "USER" | "SITE";
    offset?: number;
    limit?: number;
  }) {
    const params = new URLSearchParams();
    if (options?.targetType) params.set("targetType", options.targetType);
    params.set("offset", String(options?.offset ?? 0));
    params.set("limit", String(options?.limit ?? 50));
    return this.request<StaffActionLogPage>(`/api/admin/moderation-log?${params.toString()}`);
  }
  async validateBrevo(apiKey: string) {
    return this.request<{ account: { email?: string; companyName?: string; planType?: string } }>(
      "/api/admin/settings/validate-brevo",
      { method: "POST", body: JSON.stringify({ apiKey }) },
    );
  }
  async getEmailStatus() {
    return this.request<{
      configured: boolean;
      smtpEnabled: boolean;
      smtpUseApi: boolean;
      smtpApiKeySet: boolean;
      smtpFrom: string;
      mode: string;
    }>("/api/admin/settings/email-status");
  }
  async validateSender(fromEmail: string, apiKey?: string) {
    return this.request<{ valid: boolean; warning?: string }>("/api/admin/settings/validate-sender", {
      method: "POST",
      body: JSON.stringify({ fromEmail, apiKey: apiKey || undefined }),
    });
  }
  async testEmail(to: string, apiKey?: string, from?: string) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    try {
      return await this.request<{ sent: boolean; messageId?: string; hint?: string; warning?: string }>("/api/admin/settings/test-email", {
        method: "POST",
        body: JSON.stringify({ to, apiKey: apiKey || undefined, from: from || undefined }),
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("Time-out: de server reageerde niet binnen 45 seconden. Is de site bijgewerkt en draait SMTP?");
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async getVisitorIps() {
    return this.request<VisitorIpsResponse>("/api/admin/visitor-ips");
  }

  async resolveHostnames() {
    return this.request<{ resolved: number; hosts: { ip: string; hostname: string | null }[] }>(
      "/api/admin/visitor-ips",
      { method: "POST" }
    );
  }

  async getFullStatistics() {
    return this.request<FullStatistics>("/api/admin/statistics");
  }

  // Route media through the local proxy so requests carry the Flompanage client headers.
  mediaUrl(path: string) {
    if (!path) return path;
    if (path.startsWith("/uploads/")) {
      return `/api/media/${path.slice("/uploads/".length)}`;
    }
    if (path.startsWith("/api/media/")) {
      return path;
    }
    return path.startsWith("http") ? path : path;
  }
}

export const api = new ApiClient();