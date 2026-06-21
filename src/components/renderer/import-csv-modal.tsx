"use client";

import { useState } from "react";
import Papa from "papaparse";
import { CheckCircle2, FileUp, XCircle } from "lucide-react";
import { toast } from "sonner";
import { NormalizedEntity } from "@/lib/config/schema";
import { ClientError } from "@/lib/client";
import { useImportCsv } from "@/lib/hooks";
import { ImportResult } from "@/lib/types";
import { humanize } from "@/lib/utils";
import { Button, Label, Select } from "@/components/ui";
import { Modal } from "@/components/ui/modal";

type Row = Record<string, string>;

const truthy = new Set(["true", "1", "yes", "y"]);
const falsy = new Set(["false", "0", "no", "n", ""]);

/** Coerce a raw CSV cell into a value appropriate for the field type. */
function coerceCell(type: string, raw: string): unknown {
  if (type === "multiselect") {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (type === "boolean") {
    const v = raw.trim().toLowerCase();
    if (truthy.has(v)) return true;
    if (falsy.has(v)) return false;
    return raw;
  }
  return raw;
}

export function ImportCsvModal({
  appId,
  entity,
  open,
  onClose,
}: {
  appId: string;
  entity: NormalizedEntity;
  open: boolean;
  onClose: () => void;
}) {
  const importCsv = useImportCsv(appId, entity.name);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ImportResult | null>(null);

  function reset() {
    setHeaders([]);
    setRows([]);
    setMapping({});
    setResult(null);
  }

  function close() {
    reset();
    onClose();
  }

  function onFile(file: File) {
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const fields = res.meta.fields ?? [];
        if (fields.length === 0 || res.data.length === 0) {
          toast.error("That CSV looks empty.");
          return;
        }
        setHeaders(fields);
        setRows(res.data);
        // Auto-map by normalized name/label.
        const auto: Record<string, string> = {};
        for (const f of entity.fields) {
          const match = fields.find(
            (h) =>
              humanize(h).toLowerCase() === f.label.toLowerCase() ||
              h.toLowerCase() === f.name.toLowerCase(),
          );
          auto[f.name] = match ?? "";
        }
        setMapping(auto);
        setResult(null);
      },
      error: () => toast.error("Could not parse the CSV file."),
    });
  }

  async function onImport() {
    const mapped = rows.map((row) => {
      const obj: Record<string, unknown> = {};
      for (const f of entity.fields) {
        const header = mapping[f.name];
        if (header && header in row) {
          obj[f.name] = coerceCell(f.type, row[header] ?? "");
        }
      }
      return obj;
    });

    try {
      const res = await importCsv.mutateAsync(mapped);
      setResult(res);
      if (res.failed === 0) {
        toast.success(`Imported ${res.inserted} rows`);
      } else {
        toast.warning(`Imported ${res.inserted}, ${res.failed} failed`);
      }
    } catch (err) {
      toast.error(err instanceof ClientError ? err.message : "Import failed");
    }
  }

  return (
    <Modal open={open} onClose={close} title={`Import ${entity.labelPlural} from CSV`}>
      {headers.length === 0 ? (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-slate-50 px-6 py-10 text-center hover:bg-slate-100">
          <FileUp className="h-8 w-8 text-slate-400" />
          <span className="text-sm font-medium">Choose a CSV file</span>
          <span className="text-xs text-muted">
            First row must contain column headers.
          </span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFile(file);
            }}
          />
        </label>
      ) : result ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="font-medium">{result.inserted}</span> imported
            {result.failed > 0 && (
              <>
                <XCircle className="ml-2 h-5 w-5 text-red-600" />
                <span className="font-medium">{result.failed}</span> failed
              </>
            )}
          </div>
          {result.errors.length > 0 && (
            <ul className="max-h-48 space-y-1 overflow-auto rounded-lg border border-border p-2 text-xs">
              {result.errors.slice(0, 50).map((e) => (
                <li key={e.row}>
                  <span className="font-medium text-red-600">Row {e.row}:</span>{" "}
                  {e.messages.join("; ")}
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={reset}>
              Import another
            </Button>
            <Button onClick={close}>Done</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Map your CSV columns to fields. {rows.length} rows detected.
          </p>
          <div className="max-h-72 space-y-3 overflow-auto pr-1">
            {entity.fields.map((f) => (
              <div key={f.name} className="grid grid-cols-2 items-center gap-2">
                <Label className="mb-0" required={f.required}>
                  {f.label}
                  <span className="ml-1 text-xs font-normal text-muted">
                    ({f.type})
                  </span>
                </Label>
                <Select
                  value={mapping[f.name] ?? ""}
                  onChange={(e) =>
                    setMapping((m) => ({ ...m, [f.name]: e.target.value }))
                  }
                >
                  <option value="">— skip —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={reset}>
              Back
            </Button>
            <Button onClick={onImport} loading={importCsv.isPending}>
              Import {rows.length} rows
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
