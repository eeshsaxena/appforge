/**
 * Example app configs used by the "New app" flow and the seed script.
 * These are RAW configs (pre-normalization) — exactly what a user might author.
 * `brokenDemo` intentionally contains mistakes to showcase graceful degradation.
 */

export interface AppTemplate {
  id: string;
  name: string;
  description: string;
  config: Record<string, unknown>;
}

const crm: Record<string, unknown> = {
  name: "Mini CRM",
  description: "Track contacts and deals through your pipeline.",
  theme: { primaryColor: "#4f46e5" },
  entities: [
    {
      name: "Contact",
      label: "Contact",
      fields: [
        { name: "fullName", label: "Full Name", type: "text", required: true },
        { name: "email", type: "email", required: true },
        { name: "company", type: "text" },
        {
          name: "status",
          type: "select",
          options: ["Lead", "Active", "Churned"],
          required: true,
        },
        { name: "tags", type: "multiselect", options: ["VIP", "Newsletter", "Trial"] },
        { name: "notes", type: "textarea" },
      ],
    },
    {
      name: "Deal",
      label: "Deal",
      fields: [
        { name: "title", type: "text", required: true },
        { name: "amount", type: "number", required: true, min: 0 },
        {
          name: "stage",
          type: "select",
          options: ["Prospect", "Negotiation", "Won", "Lost"],
          required: true,
        },
        { name: "closeDate", type: "date" },
      ],
    },
  ],
  views: [
    {
      type: "dashboard",
      title: "Overview",
      widgets: [
        { type: "stat", title: "Total contacts", entity: "Contact", metric: "count" },
        { type: "stat", title: "Pipeline value", entity: "Deal", metric: "sum:amount" },
        { type: "breakdown", title: "Contacts by status", entity: "Contact", field: "status" },
        { type: "breakdown", title: "Deals by stage", entity: "Deal", field: "stage" },
        { type: "list", title: "Recent contacts", entity: "Contact", limit: 5 },
      ],
    },
    {
      type: "table",
      entity: "Contact",
      columns: ["fullName", "email", "company", "status", "tags"],
    },
    { type: "table", entity: "Deal", columns: ["title", "amount", "stage", "closeDate"] },
  ],
  workflows: [
    {
      name: "Tag new contacts as leads",
      trigger: { type: "record.created", entity: "Contact" },
      actions: [
        { type: "setField", field: "status", value: "Lead" },
        { type: "notify", message: "New contact added: {{fullName}}" },
      ],
    },
  ],
};

const bugTracker: Record<string, unknown> = {
  name: "Bug Tracker",
  description: "A lightweight issue tracker for a small team.",
  theme: { primaryColor: "#0ea5e9" },
  entities: [
    {
      name: "Issue",
      label: "Issue",
      fields: [
        { name: "title", type: "text", required: true },
        { name: "description", type: "textarea" },
        {
          name: "priority",
          type: "select",
          options: ["Low", "Medium", "High", "Critical"],
          required: true,
        },
        {
          name: "status",
          type: "select",
          options: ["Open", "In Progress", "Blocked", "Done"],
          required: true,
        },
        { name: "assignee", type: "text" },
        { name: "labels", type: "multiselect", options: ["bug", "feature", "chore", "urgent"] },
        { name: "dueDate", type: "date" },
        { name: "resolved", type: "boolean" },
      ],
    },
  ],
  views: [
    {
      type: "dashboard",
      title: "Board overview",
      widgets: [
        { type: "stat", title: "Open issues", entity: "Issue", metric: "count" },
        { type: "breakdown", title: "By status", entity: "Issue", field: "status" },
        { type: "breakdown", title: "By priority", entity: "Issue", field: "priority" },
        { type: "list", title: "Latest issues", entity: "Issue", limit: 6 },
      ],
    },
    {
      type: "table",
      entity: "Issue",
      columns: ["title", "priority", "status", "assignee", "labels", "dueDate"],
    },
  ],
  workflows: [
    {
      name: "Log new issues",
      trigger: { type: "record.created", entity: "Issue" },
      actions: [{ type: "log", message: "New {{priority}} issue: {{title}}" }],
    },
  ],
};

const contentCalendar: Record<string, unknown> = {
  name: "Content Calendar",
  description: "Plan and schedule content across channels.",
  theme: { primaryColor: "#db2777" },
  entities: [
    {
      name: "Post",
      label: "Post",
      fields: [
        { name: "title", type: "text", required: true },
        { name: "channel", type: "select", options: ["Blog", "Twitter", "LinkedIn", "Newsletter"], required: true },
        { name: "status", type: "select", options: ["Idea", "Draft", "Scheduled", "Published"], required: true },
        { name: "publishAt", type: "datetime" },
        { name: "url", type: "url" },
        { name: "body", type: "textarea" },
      ],
    },
  ],
  views: [
    {
      type: "dashboard",
      title: "Pipeline",
      widgets: [
        { type: "stat", title: "Total posts", entity: "Post", metric: "count" },
        { type: "breakdown", title: "By channel", entity: "Post", field: "channel" },
        { type: "breakdown", title: "By status", entity: "Post", field: "status" },
      ],
    },
    { type: "table", entity: "Post", columns: ["title", "channel", "status", "publishAt"] },
  ],
  workflows: [],
};

/**
 * Deliberately malformed config. Every renderer/normalizer should degrade
 * gracefully and surface issues rather than crash.
 */
const brokenDemo: Record<string, unknown> = {
  // name missing on purpose -> defaults to "Untitled App"
  description: "Intentionally broken to demonstrate graceful degradation.",
  entities: [
    {
      name: "Task",
      fields: [
        { name: "title", type: "text", required: true },
        { name: "priority", type: "magic" }, // unknown field type -> renders as text
        { name: "status", type: "select" }, // select with no options -> warning
        { name: "title", type: "text" }, // duplicate field name -> skipped
      ],
    },
    { fields: [] }, // entity with no name -> skipped with error
  ],
  views: [
    { type: "table", entity: "Task", columns: ["title", "ghostColumn"] }, // unknown column
    { type: "kanban", title: "Board" }, // unknown view type -> fallback card
    { type: "table", entity: "Ghost" }, // missing entity -> skipped
  ],
  workflows: [
    {
      name: "Bad workflow",
      trigger: { type: "record.exploded", entity: "Task" }, // unknown trigger -> skipped
      actions: [],
    },
  ],
};

export const BLANK_CONFIG: Record<string, unknown> = {
  name: "My App",
  description: "",
  entities: [],
  views: [],
  workflows: [],
};

export const TEMPLATES: AppTemplate[] = [
  {
    id: "crm",
    name: "Mini CRM",
    description: "Contacts + deals, dashboard, and a lead-tagging workflow.",
    config: crm,
  },
  {
    id: "bug-tracker",
    name: "Bug Tracker",
    description: "Issues with priority/status, board dashboard, and logging.",
    config: bugTracker,
  },
  {
    id: "content-calendar",
    name: "Content Calendar",
    description: "Plan posts across channels with a pipeline dashboard.",
    config: contentCalendar,
  },
  {
    id: "broken-demo",
    name: "Broken-config demo",
    description: "Intentionally malformed — shows graceful degradation.",
    config: brokenDemo,
  },
];
