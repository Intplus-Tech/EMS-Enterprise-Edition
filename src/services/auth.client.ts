/**
 * Browser-side client for `/api/auth/*` and the session-scoped profile calls.
 * Pure I/O; the provider decides what to do with the results.
 */
import { http } from "./http";
import { SessionUserDto } from "../types/api";

export interface ProfileInput {
  name?: string;
  email?: string;
  officialContact?: string;
  personalContact?: string;
  avatar?: string;
}

export const AuthClient = {
  /** Current session. Throws `ApiRequestError` with status 401 when signed out. */
  me: () => http.get<{ user: SessionUserDto }>("/api/auth/me").then((r) => r.user),

  updateProfile: (input: ProfileInput) =>
    http.post<{ user: SessionUserDto }>("/api/auth/me", { ...input }).then((r) => r.user),

  changePassword: (currentPassword: string, newPassword: string) =>
    http.post<{ message?: string }>("/api/auth/change-password", { currentPassword, newPassword }),

  logout: () => http.post<Record<string, never>>("/api/auth/logout"),

  stats: () => http.get<{ stats: unknown }>("/api/admin/stats").then((r) => r.stats),

  /** Per-user notification read/dismissed state, shared across devices. */
  notificationState: () =>
    http.get<{ readIds: string[]; dismissedIds: string[] }>("/api/notifications"),

  saveNotificationState: (input: { readIds?: string[]; dismissedIds?: string[] }) =>
    http.post<{ readIds: string[]; dismissedIds: string[] }>("/api/notifications", { ...input }),
};
