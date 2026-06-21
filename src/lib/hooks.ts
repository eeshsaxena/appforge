"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiFetch } from "./client";
import {
  AppDetail,
  AppSummary,
  ImportResult,
  RecordDTO,
  RecordsResponse,
  SessionUser,
  WorkflowRunDTO,
} from "./types";

export const qk = {
  me: ["me"] as const,
  apps: ["apps"] as const,
  app: (id: string) => ["app", id] as const,
  records: (appId: string, entity: string, params?: unknown) =>
    ["records", appId, entity, params] as const,
  runs: (appId: string) => ["runs", appId] as const,
};

/* ----------------------------- Queries ----------------------------- */

export function useMe() {
  return useQuery({
    queryKey: qk.me,
    queryFn: () =>
      apiFetch<{ user: SessionUser | null }>("/api/auth/me").then((d) => d.user),
  });
}

export function useApps() {
  return useQuery({
    queryKey: qk.apps,
    queryFn: () => apiFetch<{ apps: AppSummary[] }>("/api/apps").then((d) => d.apps),
  });
}

export function useApp(id: string) {
  return useQuery({
    queryKey: qk.app(id),
    queryFn: () => apiFetch<AppDetail>(`/api/apps/${id}`),
    enabled: Boolean(id),
  });
}

export interface RecordQueryParams {
  page?: number;
  pageSize?: number;
  q?: string;
  sort?: string;
  order?: "asc" | "desc";
}

export function useRecords(
  appId: string,
  entity: string,
  params: RecordQueryParams = {},
) {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  if (params.q) search.set("q", params.q);
  if (params.sort) search.set("sort", params.sort);
  if (params.order) search.set("order", params.order);

  return useQuery({
    queryKey: qk.records(appId, entity, params),
    queryFn: () =>
      apiFetch<RecordsResponse>(
        `/api/apps/${appId}/entities/${encodeURIComponent(entity)}/records?${search.toString()}`,
      ),
    enabled: Boolean(appId && entity),
    placeholderData: keepPreviousData,
  });
}

export function useRuns(appId: string) {
  return useQuery({
    queryKey: qk.runs(appId),
    queryFn: () =>
      apiFetch<{ runs: WorkflowRunDTO[] }>(`/api/apps/${appId}/runs`).then(
        (d) => d.runs,
      ),
    enabled: Boolean(appId),
  });
}

/* ----------------------------- Auth mutations ----------------------------- */

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      apiFetch<{ user: SessionUser }>("/api/auth/login", { json: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.me }),
  });
}

export function useSignup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; password: string; name?: string }) =>
      apiFetch<{ user: SessionUser }>("/api/auth/signup", { json: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.me }),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<{ ok: true }>("/api/auth/logout", { json: {} }),
    onSuccess: () => qc.clear(),
  });
}

/* ----------------------------- App mutations ----------------------------- */

export function useCreateApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description?: string; config?: unknown }) =>
      apiFetch<{ app: { id: string } }>("/api/apps", { json: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.apps }),
  });
}

export function useUpdateApp(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name?: string;
      description?: string | null;
      config?: unknown;
    }) => apiFetch<AppDetail>(`/api/apps/${appId}`, { method: "PUT", json: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.app(appId) });
      qc.invalidateQueries({ queryKey: qk.apps });
    },
  });
}

export function useDeleteApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (appId: string) =>
      apiFetch<{ ok: true }>(`/api/apps/${appId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.apps }),
  });
}

/* ----------------------------- Record mutations ----------------------------- */

function invalidateRecords(
  qc: ReturnType<typeof useQueryClient>,
  appId: string,
) {
  qc.invalidateQueries({ queryKey: ["records", appId] });
  qc.invalidateQueries({ queryKey: qk.app(appId) });
  qc.invalidateQueries({ queryKey: qk.apps });
  qc.invalidateQueries({ queryKey: qk.runs(appId) });
}

export function useCreateRecord(appId: string, entity: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<{ record: RecordDTO }>(
        `/api/apps/${appId}/entities/${encodeURIComponent(entity)}/records`,
        { json: data },
      ),
    onSuccess: () => invalidateRecords(qc, appId),
  });
}

export function useUpdateRecord(appId: string, entity: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiFetch<{ record: RecordDTO }>(
        `/api/apps/${appId}/entities/${encodeURIComponent(entity)}/records/${id}`,
        { method: "PUT", json: data },
      ),
    onSuccess: () => invalidateRecords(qc, appId),
  });
}

export function useDeleteRecord(appId: string, entity: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: true }>(
        `/api/apps/${appId}/entities/${encodeURIComponent(entity)}/records/${id}`,
        { method: "DELETE" },
      ),
    onSuccess: () => invalidateRecords(qc, appId),
  });
}

/* ----------------------------- Bonus features ----------------------------- */

export function useImportCsv(appId: string, entity: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: Record<string, unknown>[]) =>
      apiFetch<{ result: ImportResult }>(
        `/api/apps/${appId}/entities/${encodeURIComponent(entity)}/import`,
        { json: { rows } },
      ).then((d) => d.result),
    onSuccess: () => invalidateRecords(qc, appId),
  });
}

export function useExportGithub(appId: string) {
  return useMutation({
    mutationFn: (input: {
      token?: string;
      repoName: string;
      private?: boolean;
    }) => apiFetch<{ url: string }>(`/api/apps/${appId}/export`, { json: input }),
  });
}
