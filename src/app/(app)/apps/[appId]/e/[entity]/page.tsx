"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertCircle, Database, Plus, Search, Upload } from "lucide-react";
import { toast } from "sonner";
import { useAppDetail } from "@/components/app-context";
import { DynamicForm } from "@/components/renderer/dynamic-form";
import { DynamicTable } from "@/components/renderer/dynamic-table";
import { ImportCsvModal } from "@/components/renderer/import-csv-modal";
import { ClientError } from "@/lib/client";
import { findEntity } from "@/lib/config/schema";
import {
  useCreateRecord,
  useDeleteRecord,
  useRecords,
  useUpdateRecord,
} from "@/lib/hooks";
import { RecordDTO } from "@/lib/types";
import { Button, Card, EmptyState, Input } from "@/components/ui";
import { Modal } from "@/components/ui/modal";

const PAGE_SIZE = 10;

export default function EntityRunnerPage() {
  const params = useParams<{ appId: string; entity: string }>();
  const { appId, entity: entityName } = params;
  const { normalized } = useAppDetail();
  const entity = findEntity(normalized, entityName);

  // table state
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  // modal state
  const [modal, setModal] = useState<{
    mode: "create" | "edit";
    record?: RecordDTO;
  } | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string[]>>({});
  const [csvOpen, setCsvOpen] = useState(false);

  const createRecord = useCreateRecord(appId, entityName);
  const updateRecord = useUpdateRecord(appId, entityName);
  const deleteRecord = useDeleteRecord(appId, entityName);

  // debounce search input -> q
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isError, error, isFetching } = useRecords(
    appId,
    entityName,
    { page, pageSize: PAGE_SIZE, q, sort, order },
  );

  if (!entity) {
    return (
      <Card className="flex flex-col items-center gap-2 p-10 text-center">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <p className="font-medium">Entity “{entityName}” not found</p>
        <p className="text-sm text-muted">
          It may have been removed or renamed in the config.
        </p>
      </Card>
    );
  }

  const tableView = normalized.views.find(
    (v) => v.type === "table" && v.entity === entity.name && !v.unknownType,
  );
  const columns = tableView?.columns ?? entity.fields.map((f) => f.name);

  function onSort(field: string) {
    if (sort === field) {
      setOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSort(field);
      setOrder("asc");
    }
    setPage(1);
  }

  function openCreate() {
    setServerErrors({});
    setModal({ mode: "create" });
  }

  function openEdit(record: RecordDTO) {
    setServerErrors({});
    setModal({ mode: "edit", record });
  }

  async function onSubmit(values: Record<string, unknown>) {
    setServerErrors({});
    try {
      if (modal?.mode === "edit" && modal.record) {
        await updateRecord.mutateAsync({ id: modal.record.id, data: values });
        toast.success(`${entity!.label} updated`);
      } else {
        await createRecord.mutateAsync(values);
        toast.success(`${entity!.label} created`);
      }
      setModal(null);
    } catch (err) {
      if (err instanceof ClientError) {
        setServerErrors(err.details?.fieldErrors ?? {});
        toast.error(err.message);
      } else {
        toast.error("Something went wrong.");
      }
    }
  }

  async function onDelete(record: RecordDTO) {
    if (!confirm("Delete this record? This cannot be undone.")) return;
    try {
      await deleteRecord.mutateAsync(record.id);
      toast.success("Record deleted");
    } catch (err) {
      toast.error(err instanceof ClientError ? err.message : "Delete failed");
    }
  }

  const records = data?.items ?? [];
  const pagination = data?.pagination;
  const submitting = createRecord.isPending || updateRecord.isPending;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={`Search ${entity.labelPlural.toLowerCase()}…`}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCsvOpen(true)}>
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New {entity.label.toLowerCase()}
          </Button>
        </div>
      </div>

      {isError && (
        <Card className="flex items-center gap-3 border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-5 w-5" />
          {error instanceof ClientError ? error.message : "Failed to load records."}
        </Card>
      )}

      {!isError && records.length === 0 && !isLoading ? (
        <EmptyState
          icon={<Database className="h-10 w-10" />}
          title={q ? "No matches" : `No ${entity.labelPlural.toLowerCase()} yet`}
          description={
            q
              ? "Try a different search."
              : `Create your first ${entity.label.toLowerCase()} to get started.`
          }
          action={
            !q ? (
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                New {entity.label.toLowerCase()}
              </Button>
            ) : undefined
          }
        />
      ) : (
        !isError && (
          <DynamicTable
            entity={entity}
            columns={columns}
            records={records}
            sort={sort}
            order={order}
            loading={isLoading || isFetching}
            onSort={onSort}
            onEdit={openEdit}
            onDelete={onDelete}
          />
        )
      )}

      {pagination && pagination.total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted">
          <span>
            {(pagination.page - 1) * pagination.pageSize + 1}–
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{" "}
            {pagination.total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={`${modal?.mode === "edit" ? "Edit" : "New"} ${entity.label}`}
      >
        <DynamicForm
          key={`${modal?.mode}-${modal?.record?.id ?? "new"}`}
          entity={entity}
          initialValues={modal?.record?.data}
          serverErrors={serverErrors}
          submitting={submitting}
          submitLabel={modal?.mode === "edit" ? "Save changes" : "Create"}
          onSubmit={onSubmit}
          onCancel={() => setModal(null)}
        />
      </Modal>

      <ImportCsvModal
        appId={appId}
        entity={entity}
        open={csvOpen}
        onClose={() => setCsvOpen(false)}
      />
    </div>
  );
}
