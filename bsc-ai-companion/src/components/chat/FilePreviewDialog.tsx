import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X, ExternalLink, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { useDocuments } from "@/hooks/useDocuments";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

interface FilePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: {
    url: string;
    type: "image" | "pdf" | "text" | string;
    name: string;
    documentId?: number;
  } | null;
}

export const FilePreviewDialog = ({
  open,
  onOpenChange,
  file,
}: FilePreviewProps) => {
  if (!file) return null;

  const { getDocumentTablePreview } = useDocuments();
  const [tablePreview, setTablePreview] = useState<{
    columns: string[];
    rows: Record<string, unknown>[];
    row_count: number;
    column_count: number;
  } | null>(null);
  const [loadingTable, setLoadingTable] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "chart">("table");
  const [xKey, setXKey] = useState<string | null>(null);
  const [yKey, setYKey] = useState<string | null>(null);
  const [chartType, setChartType] = useState<"line" | "bar">("line");

  const isImage =
    file.type === "image" ||
    ["jpg", "jpeg", "png", "gif", "webp"].some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );
  const isPdf = file.type === "pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isTabular = [".csv", ".xlsx", ".xls"].some((ext) =>
    file.name.toLowerCase().endsWith(ext)
  );

  const numericColumns = useMemo(() => {
    if (!tablePreview) return [] as string[];
    const cols: string[] = [];
    const sampleRows = tablePreview.rows.slice(0, 20);
    for (const col of tablePreview.columns) {
      let hasNumeric = false;
      for (const row of sampleRows) {
        const val = row[col];
        if (typeof val === "number") {
          hasNumeric = true;
          break;
        }
        if (
          typeof val === "string" &&
          val.trim() !== "" &&
          !Number.isNaN(Number(val))
        ) {
          hasNumeric = true;
          break;
        }
      }
      if (hasNumeric) {
        cols.push(col);
      }
    }
    return cols;
  }, [tablePreview]);

  useEffect(() => {
    // Reset table state when file changes or dialog closes
    setTablePreview(null);
    setTableError(null);
    setLoadingTable(false);
    setViewMode("table");
    setXKey(null);
    setYKey(null);

    if (open && isTabular && file.documentId) {
      setLoadingTable(true);
      getDocumentTablePreview(file.documentId)
        .then((preview) => {
          if (preview) {
            setTablePreview({
              columns: preview.columns || [],
              rows: preview.rows || [],
              row_count: preview.row_count || 0,
              column_count: preview.column_count || 0,
            });
          }
        })
        .catch((err) => {
          console.error("Failed to load table preview:", err);
          setTableError("Failed to load table preview.");
        })
        .finally(() => setLoadingTable(false));
    }
  }, [open, file, isTabular, getDocumentTablePreview]);

  useEffect(() => {
    // Initialize xKey and yKey when preview loads
    if (!tablePreview) return;
    if (!xKey && tablePreview.columns.length > 0) {
      setXKey(tablePreview.columns[0]);
    }
    if (!yKey && numericColumns.length > 0) {
      setYKey(numericColumns[0]);
    }
  }, [tablePreview, numericColumns, xKey, yKey]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full h-[80vh] flex flex-col p-0 gap-0 bg-background/95 backdrop-blur-xl border-white/10">
        <DialogHeader className="p-4 border-b border-white/10 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="truncate pr-8 text-foreground">
            {file.name}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="hover:bg-white/10"
              title="Download"
            >
              <a
                href={file.url}
                download={file.name}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="w-4 h-4" />
              </a>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-black/20 p-4 flex items-center justify-center relative">
          {isImage ? (
            <img
              src={file.url}
              alt={file.name}
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
            />
          ) : isPdf ? (
            <iframe
              src={file.url}
              className="w-full h-full rounded-lg bg-white"
              title={file.name}
            />
          ) : isTabular ? (
            <div className="w-full h-full flex flex-col gap-3">
              <div className="flex items-center justify-between mb-2">
                <div className="inline-flex rounded-md border border-white/10 bg-black/40 p-0.5">
                  <button
                    type="button"
                    className={`px-3 py-1.5 text-xs rounded-md ${
                      viewMode === "table"
                        ? "bg-white/10 text-white"
                        : "text-white/60 hover:bg-white/5"
                    }`}
                    onClick={() => setViewMode("table")}
                  >
                    Table
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-1.5 text-xs rounded-md ${
                      viewMode === "chart"
                        ? "bg-white/10 text-white"
                        : "text-white/60 hover:bg-white/5"
                    }`}
                    onClick={() => setViewMode("chart")}
                  >
                    Chart
                  </button>
                </div>

                {viewMode === "chart" &&
                  tablePreview &&
                  tablePreview.columns.length > 0 && (
                    <div className="flex items-center gap-3 text-xs text-white/80">
                      <div className="flex items-center gap-1">
                        <span className="text-white/60">X</span>
                        <select
                          className="bg-black/40 border border-white/15 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-white/40"
                          value={xKey || ""}
                          onChange={(e) => setXKey(e.target.value || null)}
                        >
                          {tablePreview.columns.map((col) => (
                            <option key={col} value={col}>
                              {col}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-white/60">Y</span>
                        <select
                          className="bg-black/40 border border-white/15 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-white/40"
                          value={yKey || ""}
                          onChange={(e) => setYKey(e.target.value || null)}
                        >
                          {numericColumns.map((col) => (
                            <option key={col} value={col}>
                              {col}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-white/60">Type</span>
                        <select
                          className="bg-black/40 border border-white/15 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-white/40"
                          value={chartType}
                          onChange={(e) =>
                            setChartType(
                              e.target.value === "bar" ? "bar" : "line"
                            )
                          }
                        >
                          <option value="line">Line</option>
                          <option value="bar">Bar</option>
                        </select>
                      </div>
                    </div>
                  )}
              </div>

              {loadingTable && (
                <p className="text-sm text-muted-foreground">
                  Loading table preview...
                </p>
              )}
              {tableError && (
                <p className="text-sm text-red-400">{tableError}</p>
              )}

              {viewMode === "table" &&
                tablePreview &&
                tablePreview.columns.length > 0 && (
                  <div className="w-full overflow-auto rounded-md border border-white/10 bg-black/20">
                    <table className="min-w-full text-xs text-left">
                      <thead className="bg-white/5">
                        <tr>
                          {tablePreview.columns.map((col) => (
                            <th
                              key={col}
                              className="px-3 py-2 font-semibold text-white/80 border-b border-white/10"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tablePreview.rows.map((row, idx) => (
                          <tr
                            key={idx}
                            className="border-b border-white/5 last:border-b-0"
                          >
                            {tablePreview.columns.map((col) => (
                              <td
                                key={col}
                                className="px-3 py-1.5 text-white/80"
                              >
                                {row[col] as any}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="px-3 py-2 text-[11px] text-white/50 border-t border-white/10">
                      Showing first {tablePreview.rows.length} of{" "}
                      {tablePreview.row_count} rows.
                    </div>
                  </div>
                )}

              {viewMode === "chart" &&
                tablePreview &&
                tablePreview.columns.length > 0 && (
                  <>
                    {(!xKey || !yKey || numericColumns.length === 0) && (
                      <p className="text-sm text-muted-foreground">
                        Select X and Y columns. At least one numeric column is
                        required for Y.
                      </p>
                    )}
                    {xKey && yKey && numericColumns.length > 0 && (
                      <div className="w-full h-72">
                        <ChartContainer
                          config={{
                            [yKey]: {
                              label: yKey,
                              color: "hsl(221,83%,53%)",
                            },
                          }}
                          className="w-full h-full"
                        >
                          {chartType === "line" ? (
                            <LineChart data={tablePreview.rows as any[]}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey={xKey} />
                              <YAxis />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <ChartLegend content={<ChartLegendContent />} />
                              <Line
                                type="monotone"
                                dataKey={yKey}
                                stroke="hsl(221,83%,53%)"
                                strokeWidth={2}
                                dot={false}
                              />
                            </LineChart>
                          ) : (
                            <BarChart data={tablePreview.rows as any[]}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey={xKey} />
                              <YAxis />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <ChartLegend content={<ChartLegendContent />} />
                              <Bar
                                dataKey={yKey}
                                fill="hsl(221,83%,53%)"
                                radius={[4, 4, 0, 0]}
                              />
                            </BarChart>
                          )}
                        </ChartContainer>
                      </div>
                    )}
                  </>
                )}

              {!loadingTable && !tablePreview && !tableError && (
                <p className="text-sm text-muted-foreground">
                  No preview data available for this table.
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <p>Preview not available for this file type.</p>
              <Button asChild variant="secondary">
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in New Tab
                </a>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
