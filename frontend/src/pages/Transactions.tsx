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
export default function Transactions({
  rows,
  q,
  setQ,
  qs,
  source,
  notify,
}: {
  rows: Transaction[];
  q: string;
  setQ: (x: string) => void;
  qs: string;
  source: string;
  notify: (x: string) => void;
}) {
  const [page, setPage] = useState(0),
    [sort, setSort] = useState("date"),
    [asc, setAsc] = useState(false),
    [selected, setSelected] = useState<number[]>([]),
    [bulk, setBulk] = useState(categories[0]),
    [editing, setEditing] = useState<Transaction | null>(null),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    setPage(0);
    setSelected([]);
  }, [qs]);
  const sorted = [...rows].sort((a, b) => {
    const av = a[sort as keyof Transaction],
      bv = b[sort as keyof Transaction];
    return (
      (typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv))) * (asc ? 1 : -1)
    );
  });
  const pages = Math.max(1, Math.ceil(rows.length / 12));
  const save = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      await api("/transactions/" + editing.id + "?source=" + source, {
        method: "PATCH",
        body: JSON.stringify(editing),
      });
      setEditing(null);
      await client.invalidateQueries();
      notify("Transaction updated. Analytics have been recalculated.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="card table-card">
      <div className="table-tools">
        <label className="search">
          <Search size={17} />
          <input
            placeholder="Search merchants…"
            aria-label="Search transactions"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <div>
          <span className="muted">{rows.length} transactions</span>
          <Button variant="outline" asChild>
            <a href={"/api/export" + qs} download>
              <Download size={15} />
              Export CSV
            </a>
          </Button>
        </div>
      </div>
      {selected.length > 0 && (
        <div className="bulk-tools">
          <span>{selected.length} selected</span>
          <select
            aria-label="Bulk category"
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <Button
            onClick={async () => {
              try {
                await api("/transactions/bulk?source=" + source, {
                  method: "POST",
                  body: JSON.stringify({ ids: selected, category: bulk }),
                });
                setSelected([]);
                await client.invalidateQueries();
                notify("Selected transactions categorized.");
              } catch (e) {
                notify((e as Error).message);
              }
            }}
          >
            Apply category
          </Button>
        </div>
      )}
      {rows.length ? (
        <>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      aria-label="Select current page"
                      checked={sorted
                        .slice(page * 12, page * 12 + 12)
                        .every((r) => selected.includes(r.id))}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? sorted
                                .slice(page * 12, page * 12 + 12)
                                .map((r) => r.id)
                            : [],
                        )
                      }
                    />
                  </th>
                  {[
                    ["date", "Date"],
                    ["merchant", "Merchant"],
                    ["category", "Category"],
                    ["kind", "Type"],
                    ["confidence", "Confidence"],
                    ["cents", "Amount"],
                  ].map(([key, label]) => (
                    <th key={key}>
                      <button
                        onClick={() => {
                          setSort(key);
                          setAsc(sort === key ? !asc : false);
                        }}
                      >
                        {label} {sort === key ? (asc ? "↑" : "↓") : ""}
                      </button>
                    </th>
                  ))}
                  <th>Edit</th>
                </tr>
              </thead>
              <tbody>
                {sorted.slice(page * 12, page * 12 + 12).map((r) => (
                  <tr key={r.id}>
                    <td>
                      <input
                        aria-label={"Select " + r.merchant}
                        type="checkbox"
                        checked={selected.includes(r.id)}
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? [...selected, r.id]
                              : selected.filter((id) => id !== r.id),
                          )
                        }
                      />
                    </td>
                    <td className="muted">{r.date}</td>
                    <td>
                      <strong>{r.merchant}</strong>
                    </td>
                    <td>
                      <span className="category-badge">{r.category}</span>
                    </td>
                    <td>{r.kind}</td>
                    <td>
                      <span className={r.confidence < 60 ? "warning" : "muted"}>
                        {r.confidence}%{r.confidence < 60 ? " · Review" : ""}
                      </span>
                    </td>
                    <td
                      className={
                        r.kind === "income" || r.kind === "refund"
                          ? "positive"
                          : ""
                      }
                    >
                      {r.kind === "expense" ? "−" : ""}
                      {money(r.cents)}
                    </td>
                    <td>
                      <button
                        className="text-button"
                        onClick={() => setEditing({ ...r })}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <span>
              Page {page + 1} of {pages}
            </span>
            <Button
              variant="outline"
              disabled={!page}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={page + 1 >= pages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </>
      ) : (
        <Empty />
      )}
      {editing && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-title"
          >
            <h2 id="edit-title">Edit transaction</h2>
            <label>
              Date
              <input
                type="date"
                value={editing.date}
                onChange={(e) =>
                  setEditing({ ...editing, date: e.target.value })
                }
              />
            </label>
            <label>
              Merchant
              <input
                value={editing.merchant}
                onChange={(e) =>
                  setEditing({ ...editing, merchant: e.target.value })
                }
              />
            </label>
            <label>
              Amount (cents)
              <input
                type="number"
                min="1"
                value={editing.cents}
                onChange={(e) =>
                  setEditing({ ...editing, cents: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Category
              <select
                value={editing.category}
                onChange={(e) =>
                  setEditing({ ...editing, category: e.target.value })
                }
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Transaction type
              <select
                value={editing.kind}
                onChange={(e) =>
                  setEditing({ ...editing, kind: e.target.value })
                }
              >
                {["expense", "income", "refund", "payment", "transfer"].map(
                  (c) => (
                    <option key={c}>{c}</option>
                  ),
                )}
              </select>
            </label>
            <div className="modal-actions">
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button
                disabled={busy || !editing.merchant || editing.cents < 1}
                onClick={save}
              >
                Save changes
              </Button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
