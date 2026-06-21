import { ConfigIssue, NormalizedConfig } from "./config/schema";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
}

export interface AppSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  updatedAt: string;
  entityCount: number;
  recordCount: number;
  issueCount: number;
}

export interface AppDetail {
  app: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    config: unknown; // raw config, for the editor
    updatedAt: string;
    createdAt: string;
  };
  normalized: NormalizedConfig;
  issues: ConfigIssue[];
}

export interface RecordDTO {
  id: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface RecordsResponse {
  items: RecordDTO[];
  pagination: Pagination;
  entity: { name: string; label: string };
}

export interface WorkflowRunDTO {
  id: string;
  workflowId: string;
  workflowName: string;
  trigger: string;
  entity: string;
  recordId: string | null;
  status: string;
  logs: { action: string; status: string; message: string }[];
  createdAt: string;
}

export interface ImportResult {
  inserted: number;
  failed: number;
  total: number;
  errors: { row: number; messages: string[] }[];
}
