import { useCallback, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  Upload,
  XCircle,
} from "lucide-react";

import { useToast } from "../shared/toast.js";
import { useAuthStatus, useLogin } from "../../hooks/useAuth.js";
import { Button } from "../ui/button.js";
import { Card } from "../ui/card.js";
import { apiRequest } from "../../lib/api.js";
import { cn } from "../../lib/utils.js";

interface ParsedEntry {
  serialNumber: string;
  hardwareHash: string;
  groupTag?: string;
}

interface ImportResultEntry {
  serialNumber: string;
  success: boolean;
  status: number;
  message: string;
}

interface ImportResponse {
  total: number;
  successCount: number;
  failureCount: number;
  results: ImportResultEntry[];
}

export function HardwareHashImport() {
  const toast = useToast();
  const auth = useAuthStatus();
  const login = useLogin();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [entries, setEntries] = useState<ParsedEntry[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);

  const isAuthed = auth.data?.authenticated === true;

  const parseCsv = useMutation({
    mutationFn: (csvText: string) =>
      apiRequest<{ entries: ParsedEntry[]; errors: string[] }>(
        "/api/autopilot-import/parse-csv",
        {
          method: "POST",
          body: JSON.stringify({ csvText }),
        },
      ),
    onSuccess: (data) => {
      if (data) {
        setEntries(data.entries);
        setParseErrors(data.errors);
        setImportResult(null);
        if (data.entries.length === 0 && data.errors.length === 0) {
          toast.push({
            variant: "error",
            title: "Empty CSV",
            description: "No data rows found in the file.",
          });
        }
      }
    },
    onError: (error) => {
      toast.push({
        variant: "error",
        title: "Parse failed",
        description:
          error instanceof Error ? error.message : "Could not parse CSV.",
      });
    },
  });

  const importEntries = useMutation({
    mutationFn: (payload: ParsedEntry[]) =>
      apiRequest<ImportResponse>("/api/autopilot-import", {
        method: "POST",
        body: JSON.stringify({ entries: payload }),
      }),
    onSuccess: (data) => {
      if (data) {
        setImportResult(data);
        if (data.failureCount === 0) {
          toast.push({
            variant: "success",
            title: "Import complete",
            description: `${data.successCount} device${data.successCount !== 1 ? "s" : ""} imported successfully.`,
          });
        } else {
          toast.push({
            variant: "error",
            title: "Import finished with errors",
            description: `${data.successCount} succeeded, ${data.failureCount} failed.`,
          });
        }
      }
    },
    onError: (error) => {
      toast.push({
        variant: "error",
        title: "Import failed",
        description:
          error instanceof Error ? error.message : "Could not complete import.",
      });
    },
  });

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.toLowerCase().endsWith(".csv")) {
        toast.push({
          variant: "error",
          title: "Invalid file",
          description: "Please select a .csv file.",
        });
        return;
      }
      setFileName(file.name);
      setImportResult(null);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          parseCsv.mutate(reader.result);
        }
      };
      reader.readAsText(file);
    },
    [parseCsv, toast],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setDragOver(false);
      const file = event.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleReset = () => {
    setEntries([]);
    setParseErrors([]);
    setFileName(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Auth gate
  if (!isAuthed) {
    return (
      <Card className="overflow-hidden">
        <div className="border-b border-[var(--pc-border)] px-5 py-4">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-[var(--pc-accent)]" />
            <div className="text-[13px] font-semibold text-[var(--pc-text)]">
              Import Hardware Hashes
            </div>
          </div>
          <div className="mt-1 text-[12px] text-[var(--pc-text-secondary)]">
            Upload an Autopilot hardware hash CSV to register new devices.
          </div>
        </div>
        <div className="px-5 py-5">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--pc-border)] bg-[var(--pc-surface-raised)] px-4 py-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--pc-warning)]" />
              <div>
                <div className="text-[12.5px] font-medium text-[var(--pc-text)]">
                  Admin sign-in required
                </div>
                <div className="mt-0.5 text-[11.5px] text-[var(--pc-text-muted)]">
                  Importing hardware hashes requires a delegated Microsoft
                  account with Autopilot device management permissions.
                </div>
              </div>
            </div>
            <Button
              onClick={() => login.mutate()}
              disabled={login.isPending || !login.canStart}
              title={login.blockedReason ?? undefined}
              className="shrink-0"
            >
              {!login.canStart
                ? "Unavailable"
                : login.isPending
                  ? "Opening…"
                  : "Sign in"}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-[var(--pc-border)] px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-[var(--pc-accent)]" />
              <div className="text-[13px] font-semibold text-[var(--pc-text)]">
                Import Hardware Hashes
              </div>
            </div>
            <div className="mt-1 text-[12px] text-[var(--pc-text-secondary)]">
              Upload an Autopilot hardware hash CSV to register new devices with
              Windows Autopilot. Standard format: Device Serial Number, Windows
              Product ID, Hardware Hash, Group Tag (optional).
            </div>
          </div>
          {fileName && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--pc-border)] bg-[var(--pc-surface-raised)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--pc-text-secondary)] transition-colors hover:border-[var(--pc-border-hover)] hover:text-[var(--pc-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-accent)]"
            >
              <XCircle className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4 px-5 py-5">
        {/* Drop zone / file picker */}
        {!fileName && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
              dragOver
                ? "border-[var(--pc-accent)] bg-[var(--pc-accent-muted)]/35"
                : "border-[var(--pc-border)] bg-[var(--pc-surface-raised)]/35 hover:border-[var(--pc-border-hover)] hover:bg-[var(--pc-surface-raised)]/55",
            )}
          >
            <div className="rounded-full border border-[var(--pc-border)] bg-[var(--pc-surface-raised)] p-3">
              <Upload className="h-5 w-5 text-[var(--pc-accent)]" />
            </div>
            <div>
              <div className="text-[13px] font-medium text-[var(--pc-text)]">
                Drop a CSV file here or click to browse
              </div>
              <div className="mt-1 text-[11.5px] text-[var(--pc-text-muted)]">
                Accepts the standard Windows Autopilot hardware hash export
                format (.csv)
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>
        )}

        {/* File info */}
        {fileName && (
          <div className="flex items-center gap-3 rounded-lg border border-[var(--pc-border)] bg-[var(--pc-surface-raised)]/55 px-4 py-3">
            <FileText className="h-4 w-4 shrink-0 text-[var(--pc-accent)]" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px] font-medium text-[var(--pc-text)]">
                {fileName}
              </div>
              <div className="mt-0.5 text-[11px] text-[var(--pc-text-muted)]">
                {parseCsv.isPending
                  ? "Parsing…"
                  : `${entries.length} device${entries.length !== 1 ? "s" : ""} found${parseErrors.length > 0 ? `, ${parseErrors.length} error${parseErrors.length !== 1 ? "s" : ""}` : ""}`}
              </div>
            </div>
          </div>
        )}

        {/* Parse errors */}
        {parseErrors.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--pc-text-muted)]">
              Parse Errors
            </div>
            <div className="max-h-[160px] space-y-1.5 overflow-auto">
              {parseErrors.map((error, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 rounded-lg border border-[var(--pc-warning)]/20 bg-[var(--pc-warning-muted)]/55 px-3 py-2"
                >
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--pc-warning)]" />
                  <div className="text-[11.5px] text-[var(--pc-text)]">
                    {error}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preview table */}
        {entries.length > 0 && (
          <div className="space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--pc-text-muted)]">
              Preview ({entries.length} device{entries.length !== 1 ? "s" : ""})
              {entries.length > 50 && (
                <span className="ml-2 font-normal normal-case text-[var(--pc-warning)]">
                  Maximum 50 per request — only the first 50 will be imported
                </span>
              )}
            </div>
            <div className="max-h-[320px] overflow-auto rounded-xl border border-[var(--pc-border)]">
              <table className="w-full text-left text-[12px]">
                <thead className="sticky top-0 z-10 border-b border-[var(--pc-border)] bg-[var(--pc-surface-raised)]">
                  <tr>
                    <th className="px-3 py-2.5 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--pc-text-muted)]">
                      #
                    </th>
                    <th className="px-3 py-2.5 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--pc-text-muted)]">
                      Serial Number
                    </th>
                    <th className="px-3 py-2.5 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--pc-text-muted)]">
                      Group Tag
                    </th>
                    <th className="px-3 py-2.5 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--pc-text-muted)]">
                      Hash
                    </th>
                    {importResult && (
                      <th className="px-3 py-2.5 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--pc-text-muted)]">
                        Status
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--pc-border)]/50">
                  {entries.slice(0, 50).map((entry, index) => {
                    const result = importResult?.results[index];
                    return (
                      <tr
                        key={`${entry.serialNumber}-${index}`}
                        className="bg-[var(--pc-surface)] transition-colors hover:bg-[var(--pc-surface-raised)]/55"
                      >
                        <td className="px-3 py-2 text-[var(--pc-text-muted)]">
                          {index + 1}
                        </td>
                        <td className="px-3 py-2 font-medium text-[var(--pc-text)]">
                          {entry.serialNumber}
                        </td>
                        <td className="px-3 py-2 text-[var(--pc-text-secondary)]">
                          {entry.groupTag || "\u2014"}
                        </td>
                        <td className="max-w-[200px] truncate px-3 py-2 font-mono text-[11px] text-[var(--pc-text-muted)]">
                          {entry.hardwareHash.slice(0, 32)}…
                        </td>
                        {importResult && (
                          <td className="px-3 py-2">
                            {result ? (
                              <div className="flex items-center gap-1.5">
                                {result.success ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-[var(--pc-healthy)]" />
                                ) : (
                                  <XCircle className="h-3.5 w-3.5 text-[var(--pc-critical)]" />
                                )}
                                <span
                                  className={cn(
                                    "text-[11px]",
                                    result.success
                                      ? "text-[var(--pc-healthy)]"
                                      : "text-[var(--pc-critical)]",
                                  )}
                                >
                                  {result.success ? "Imported" : result.message}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-[var(--pc-text-muted)]">
                                Pending
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Import button / progress */}
            {!importResult && (
              <Button
                onClick={() => importEntries.mutate(entries.slice(0, 50))}
                disabled={importEntries.isPending}
                className="h-10 w-full"
              >
                {importEntries.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Importing to Autopilot…
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" />
                    Upload {Math.min(entries.length, 50)} Device
                    {Math.min(entries.length, 50) !== 1 ? "s" : ""} to Autopilot
                  </>
                )}
              </Button>
            )}

            {/* Results summary */}
            {importResult && (
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-[var(--pc-border)] bg-[var(--pc-surface-raised)]/55 p-3 text-center">
                  <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--pc-text-muted)]">
                    Total
                  </div>
                  <div className="mt-1 text-[22px] font-semibold text-[var(--pc-text)]">
                    {importResult.total}
                  </div>
                </div>
                <div
                  className={cn(
                    "rounded-xl border p-3 text-center",
                    importResult.successCount > 0
                      ? "border-[var(--pc-healthy)]/25 bg-[var(--pc-healthy-muted)]/55"
                      : "border-[var(--pc-border)] bg-[var(--pc-surface-raised)]/55",
                  )}
                >
                  <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--pc-text-muted)]">
                    Succeeded
                  </div>
                  <div className="mt-1 text-[22px] font-semibold text-[var(--pc-healthy)]">
                    {importResult.successCount}
                  </div>
                </div>
                <div
                  className={cn(
                    "rounded-xl border p-3 text-center",
                    importResult.failureCount > 0
                      ? "border-[var(--pc-critical)]/25 bg-[var(--pc-critical-muted)]/55"
                      : "border-[var(--pc-border)] bg-[var(--pc-surface-raised)]/55",
                  )}
                >
                  <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--pc-text-muted)]">
                    Failed
                  </div>
                  <div className="mt-1 text-[22px] font-semibold text-[var(--pc-critical)]">
                    {importResult.failureCount}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
