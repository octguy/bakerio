import { request } from "./client";

export interface Permission {
  id: string;
  name: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
}

export interface UpdateRoleRequest {
  name: string;
  description?: string;
}

export async function getPermissions(): Promise<Permission[]> {
  return request<Permission[]>("/permissions");
}

export async function getPermission(id: string): Promise<Permission> {
  return request<Permission>(`/permissions/${id}`);
}

export async function getRoles(): Promise<Role[]> {
  return request<Role[]>("/roles");
}

export async function getRole(id: string): Promise<Role> {
  return request<Role>(`/roles/${id}`);
}

export async function createRole(req: CreateRoleRequest): Promise<Role> {
  return request<Role>("/roles", { method: "POST", body: JSON.stringify(req) });
}

export async function updateRole(id: string, req: UpdateRoleRequest): Promise<Role> {
  return request<Role>(`/roles/${id}`, { method: "PUT", body: JSON.stringify(req) });
}

export async function getRolePermissions(id: string): Promise<Permission[]> {
  return request<Permission[]>(`/roles/${id}/permissions`);
}

export async function updateRolePermissions(id: string, permissionIds: string[]): Promise<void> {
  await request<null>(`/roles/${id}/permissions`, {
    method: "PUT",
    body: JSON.stringify({ permission_ids: permissionIds }),
  });
}
