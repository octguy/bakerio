"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  type GetNotificationsOptions,
} from "@repo/api-client";

export function useUnreadCount(enabled = true) {
  return useQuery({
    queryKey: ["notif", "unread-count"],
    queryFn: getUnreadCount,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
    staleTime: 5_000,
    enabled,
  });
}

export function useNotifications(opts?: GetNotificationsOptions) {
  return useQuery({
    queryKey: ["notif", "list", opts],
    queryFn: () => getNotifications(opts),
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markRead,
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["notif"] });
      qc.setQueryData<number>(["notif", "unread-count"], (n) => Math.max(0, (n ?? 1) - 1));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["notif"] });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markAllRead,
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["notif"] });
      qc.setQueryData<number>(["notif", "unread-count"], 0);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["notif"] });
    },
  });
}
