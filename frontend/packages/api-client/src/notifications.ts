import { request } from "./client";

export type NotificationType =
  | "order.placed"
  | "order.placed.branch"
  | "auth.password_changed"
  | "auth.password_reset_by_admin"
  | "membership.tier_upgraded";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, string>;
  read_at: string | null;
  created_at: string;
}

export interface NotificationListResponse {
  items: Notification[];
  page: number;
  size: number;
  total: number;
  total_pages: number;
}

export interface GetNotificationsOptions {
  page?: number;
  size?: number;
  unread?: boolean;
}

export async function getNotifications(opts?: GetNotificationsOptions): Promise<NotificationListResponse> {
  const params = new URLSearchParams();
  if (opts?.page) params.set("page", String(opts.page));
  if (opts?.size) params.set("size", String(opts.size));
  if (opts?.unread !== undefined) params.set("unread", String(opts.unread));
  const qs = params.toString();
  return request<NotificationListResponse>(`/notifications${qs ? `?${qs}` : ""}`);
}

export async function getUnreadCount(): Promise<number> {
  const res = await request<{ count: number }>("/notifications/unread-count");
  return res.count;
}

export async function markRead(id: string): Promise<Notification> {
  return request<Notification>(`/notifications/${id}/read`, { method: "PATCH" });
}

export async function markAllRead(): Promise<{ updated: number }> {
  return request<{ updated: number }>("/notifications/read-all", { method: "PATCH" });
}
