import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  NavLink,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  LayoutDashboard,
  ArrowLeftRight,
  ChartNoAxesCombined,
  Sparkles,
  Files,
  Settings as SettingsIcon,
  ShieldCheck,
  Upload,
  Sun,
  Moon,
  Wallet,
  Search,
  Download,
  ChevronRight,
  Leaf,
  Check,
  Trash2,
  Plus,
  SlidersHorizontal,
  X,
  Menu,
} from "lucide-react";
import {
  api,
  money,
  categories,
  type Transaction,
  type Summary,
  type Slice,
} from "../api";
import { Button } from "../components/ui/button";

import { client } from "../query";
import { Breakdown, Trend, colors } from "../charts";
import Empty from "./Empty";
export default function Statements({
  notify,
  useLocal,
}: {
  notify: (s: string) => void;
  useLocal: () => void;
}) {
  const [preview, setPreview] = useState<Omit<Transaction, "id" | "source">[]>(
      [],
    ),
    [warnings, setWarnings] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [year, setYear] = useState(2026),
    [files, setFiles] = useState<string[]>([]);
  const load = async (list: FileList | File[]) => {
    setBusy(true);
    const collected: typeof preview = [];
    const notes: string[] = [];
    const names: string[] = [];
    try {
      for (const file of Array.from(list)) {
        const data = new FormData();
        data.append("file", file);
        const result = await api<{ rows: typeof preview; warnings: string[] }>(
          "/statements/preview?year=" + year,
          { method: "POST", body: data },
        );
        collected.push(...result.rows);
        notes.push(...result.warnings);
        names.push(file.name);
      }
      setPreview(collected);
      setWarnings([...new Set(notes)]);
      setFiles(names);
      notify(
        `${collected.length} rows extracted. Review and correct the preview before importing.`,
      );
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <section className="card upload-card">
        <div className="card-title">
          <div>
            <h2>Your statements, made useful.</h2>
            <p>
              Chase checking and credit card PDFs · text-based statements only
            </p>
          </div>
          <ShieldCheck size={22} />
        </div>
        <label className="year-label">
          Statement ending year{" "}
          <input
            aria-label="Statement ending year"
            type="number"
            min="2000"
            max="2100"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </label>
        <div
          className="dropzone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (!busy) void load(e.dataTransfer.files);
          }}
        >
          <span className="upload-icon">
            <Upload size={28} />
          </span>
          <h3>
            {busy ? "Reading your statements…" : "Drop your statements here"}
          </h3>
          <p>
            Up to 10 MB and 50 pages per PDF. Upload several statements with the
            same ending year.
          </p>
          <label className="button primary">
            Browse PDFs
            <input
              type="file"
              accept="application/pdf"
              multiple
              disabled={busy}
              onChange={(e) => {
                if (e.target.files) void load(e.target.files);
              }}
            />
          </label>
        </div>
        <p className="metric-note">
          <ShieldCheck size={14} />
          PDFs are processed in memory and discarded. Nothing is sent to an AI
          provider during import.
        </p>
      </section>
      {preview.length > 0 && (
        <section className="card table-card preview">
          <div className="card-title">
            <div>
              <h2>Review before you import</h2>
              <p>
                {files.join(" · ")} · {preview.length} rows
              </p>
            </div>
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const result = await api<{
                    imported: number;
                    duplicates: number;
                  }>("/statements/import", {
                    method: "POST",
                    body: JSON.stringify({ rows: preview }),
                  });
                  notify(
                    `Imported ${result.imported} transactions; skipped ${result.duplicates} duplicates.`,
                  );
                  setPreview([]);
                  useLocal();
                  await client.invalidateQueries();
                } catch (e) {
                  notify((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Check size={16} />
              Approve & import
            </Button>
          </div>
          {warnings.map((w, i) => (
            <p className="warning preview-warning" key={i}>
              {w}
            </p>
          ))}
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Merchant</th>
                  <th>Cents</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Remove</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i}>
                    <td>
                      <input
                        aria-label={"Preview date " + i}
                        type="date"
                        value={r.date}
                        onChange={(e) =>
                          setPreview(
                            preview.map((x, j) =>
                              j === i ? { ...x, date: e.target.value } : x,
                            ),
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        aria-label={"Preview merchant " + i}
                        value={r.merchant}
                        onChange={(e) =>
                          setPreview(
                            preview.map((x, j) =>
                              j === i ? { ...x, merchant: e.target.value } : x,
                            ),
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        aria-label={"Preview cents " + i}
                        type="number"
                        min="1"
                        value={r.cents}
                        onChange={(e) =>
                          setPreview(
                            preview.map((x, j) =>
                              j === i
                                ? { ...x, cents: Number(e.target.value) }
                                : x,
                            ),
                          )
                        }
                      />
                    </td>
                    <td>
                      <select
                        aria-label={"Preview category " + i}
                        value={r.category}
                        onChange={(e) =>
                          setPreview(
                            preview.map((x, j) =>
                              j === i ? { ...x, category: e.target.value } : x,
                            ),
                          )
                        }
                      >
                        {categories.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        aria-label={"Preview type " + i}
                        value={r.kind}
                        onChange={(e) =>
                          setPreview(
                            preview.map((x, j) =>
                              j === i ? { ...x, kind: e.target.value } : x,
                            ),
                          )
                        }
                      >
                        {[
                          "expense",
                          "income",
                          "refund",
                          "payment",
                          "transfer",
                        ].map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        aria-label={"Remove preview row " + i}
                        className="icon-button"
                        onClick={() =>
                          setPreview(preview.filter((_, j) => j !== i))
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <div className="info-grid">
        <section className="card info">
          <Files />
          <h3>A thoughtful import process</h3>
          <p>
            Extract → review → correct → approve. You control what enters your
            database.
          </p>
        </section>
        <section className="card info">
          <ArrowLeftRight />
          <h3>Less noise. More accuracy.</h3>
          <p>
            Repeated imports are detected using transaction fingerprints.
            Payments and transfers stay separate from spending.
          </p>
        </section>
        <section className="card info">
          <ShieldCheck />
          <h3>Private by design</h3>
          <p>
            Local storage is not encrypted. Keep your device secure, and never
            commit real statements to GitHub.
          </p>
        </section>
      </div>
    </>
  );
}
