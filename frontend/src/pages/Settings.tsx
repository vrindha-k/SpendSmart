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
export default function Settings({
  source,
  theme,
  setTheme,
  notify,
}: {
  source: string;
  theme: string;
  setTheme: (x: string) => void;
  notify: (x: string) => void;
}) {
  const [merchant, setMerchant] = useState(""),
    [category, setCategory] = useState(categories[0]),
    [confirmation, setConfirmation] = useState("");
  const { data: rules = [] } = useQuery({
    queryKey: ["rules"],
    queryFn: () => api<{ merchant: string; category: string }[]>("/rules"),
  });
  return (
    <div className="settings-grid">
      <section className="card settings-card">
        <h2>Appearance</h2>
        <p>Choose the space you think best in.</p>
        <div className="theme-options">
          {["dark", "light"].map((t) => (
            <button
              className={theme === t ? "theme-option chosen" : "theme-option"}
              onClick={() => setTheme(t)}
              key={t}
            >
              {t === "dark" ? <Moon /> : <Sun />}
              {t === "dark" ? "Midnight" : "Daylight"}
              {theme === t && <Check size={15} />}
            </button>
          ))}
        </div>
        <h2>Privacy & API settings</h2>
        <p>
          External AI is disabled by default. Enable it only through backend
          environment variables. Each request still needs explicit consent.
        </p>
        <ul className="privacy-list">
          <li>
            <ShieldCheck size={16} />
            No third-party analytics or remote fonts
          </li>
          <li>
            <ShieldCheck size={16} />
            SQLite data stays on your device
          </li>
          <li>
            <ShieldCheck size={16} />
            No raw statements sent to Claude
          </li>
        </ul>
        <p className="metric-note">
          SQLite and PDF previews are not encrypted. This single-user
          development application has no authentication and must stay bound to
          loopback. Deletion removes rows; it does not securely erase disk
          blocks, backups or downloads.
        </p>
      </section>
      <section className="card settings-card">
        <h2>Custom merchant rules</h2>
        <p>
          Your saved rules take priority for future imports. Existing manual
          corrections are preserved.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api("/rules", {
                method: "POST",
                body: JSON.stringify({ merchant, category }),
              });
              setMerchant("");
              await client.invalidateQueries({ queryKey: ["rules"] });
              notify(
                "Merchant rule saved. It will apply during future previews.",
              );
            } catch (e) {
              notify((e as Error).message);
            }
          }}
        >
          <label>
            Merchant contains
            <input
              required
              minLength={2}
              maxLength={200}
              placeholder="e.g. NEIGHBORHOOD MARKET"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
            />
          </label>
          <label>
            Assign category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <Button type="submit">
            <Plus size={15} />
            Save rule
          </Button>
        </form>
        <div className="rule-list">
          {rules.map((r) => (
            <div key={r.merchant}>
              <span>
                <b>{r.merchant}</b>
                <small>{r.category}</small>
              </span>
              <button
                className="icon-button"
                aria-label={"Delete rule " + r.merchant}
                onClick={async () => {
                  try {
                    await api("/rules/" + encodeURIComponent(r.merchant), {
                      method: "DELETE",
                    });
                    await client.invalidateQueries({ queryKey: ["rules"] });
                  } catch (e) {
                    notify((e as Error).message);
                  }
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>
      <section className="card settings-card danger-zone">
        <h2>Delete {source === "demo" ? "demo" : "imported"} transactions</h2>
        <p>
          This removes all transactions in the selected dataset. Other data and
          rules are retained. Demo data regenerates on backend restart.
        </p>
        <label>
          Type DELETE to confirm
          <input
            placeholder="DELETE"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </label>
        <Button
          variant="outline"
          disabled={confirmation !== "DELETE"}
          onClick={async () => {
            try {
              await api("/data?source=" + source, { method: "DELETE" });
              setConfirmation("");
              await client.invalidateQueries();
              notify("Selected dataset deleted.");
            } catch (e) {
              notify((e as Error).message);
            }
          }}
        >
          <Trash2 size={16} />
          Delete dataset
        </Button>
      </section>
    </div>
  );
}
