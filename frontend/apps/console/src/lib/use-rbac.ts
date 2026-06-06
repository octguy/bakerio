"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPermissions,
  getRoles,
  getRole,
  createRole,
  updateRole,
  getRolePermissions,
  updateRolePermissions,
  type CreateRoleRequest,
  type UpdateRoleRequest,
} from "@repo/api-client";

export function usePermissions() {
  return useQuery({
    queryKey: ["rbac", "permissions"],
    queryFn: getPermissions,
    staleTime: 5 * 60_000,
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ["rbac", "roles"],
    queryFn: getRoles,
  });
}

export function useRole(id: string) {
  return useQuery({
    queryKey: ["rbac", "role", id],
    queryFn: () => getRole(id),
    enabled: !!id,
  });
}

export function useRolePermissions(id: string) {
  return useQuery({
    queryKey: ["rbac", "role", id, "permissions"],
    queryFn: () => getRolePermissions(id),
    enabled: !!id,
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateRoleRequest) => createRole(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rbac", "roles"] }),
  });
}

export function useUpdateRole(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: UpdateRoleRequest) => updateRole(id, req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rbac", "roles"] });
      qc.invalidateQueries({ queryKey: ["rbac", "role", id] });
    },
  });
}

export function useUpdateRolePermissions(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (permissionIds: string[]) => updateRolePermissions(id, permissionIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rbac", "role", id, "permissions"] });
    },
  });
}
