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
export default function Insights({
  source,
  summary: s,
}: {
  source: string;
  summary: Summary;
}) {
  const [preview, setPreview] = useState<{
      token: string;
      payload: unknown;
    } | null>(null),
    [consent, setConsent] = useState(false),
    [result, setResult] = useState<{
      recommendations: {
        merchant: string;
        baseline_cents: number;
        saving_cents: number;
        percent: number;
      }[];
      label: string;
    } | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const { data: status } = useQuery({
    queryKey: ["status"],
    queryFn: () =>
      api<{ ai_enabled: boolean; ai_configured: boolean }>("/status"),
  });
  useEffect(() => {
    setPreview(null);
    setResult(null);
    setConsent(false);
  }, [source]);
  async function prepare() {
    setBusy(true);
    setError("");
    setConsent(false);
    try {
      setPreview(
        await api("/ai/preview", {
          method: "POST",
          body: JSON.stringify({ source }),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="insight-hero card">
        <span className="sparkle-box">
          <Sparkles size={28} />
        </span>
        <div>
          <span className="eyebrow">INTELLIGENCE, WITH INTENTION</span>
          <h2>Make your next money move a smarter one.</h2>
          <p>
            Start with local observations. Choose whether Claude sees a
            minimized version of your data.
          </p>
        </div>
        <span className="category-badge">
          {status?.ai_enabled && status?.ai_configured
            ? "Claude configured"
            : "Local insights active"}
        </span>
      </section>
      <div className="info-grid">
        <section className="card info">
          <ChartNoAxesCombined />
          <small>TOP SPENDING CATEGORY</small>
          <h3>{s.categories[0]?.name || "No expenses yet"}</h3>
          <strong className="large-value">
            {money(s.categories[0]?.value || 0)}
          </strong>
          <p>Calculated from expenses less refunds in the selected dataset.</p>
        </section>
        <section className="card info">
          <ArrowUpRight />
          <small>MONTHLY MOVEMENT</small>
          <h3>
            {s.change === null
              ? "More history needed"
              : `${s.change > 0 ? "+" : ""}${s.change}% spending change`}
          </h3>
          <p>
            Last observed month compared with the previous month. Partial months
            may mislead.
          </p>
        </section>
        <section className="card info">
          <Leaf />
          <small>RECURRING SPENDING</small>
          <h3>
            {money(s.recurring.reduce((a, b) => a + b.cents, 0))} per month
          </h3>
          <p>
            Consistent amounts across at least three months. Review
            subscriptions before deciding what to keep.
          </p>
        </section>
      </div>
      <section className="card">
        <div className="card-title">
          <div>
            <h2>Recurring merchants</h2>
            <p>Detected locally. A pattern, not a confirmed subscription.</p>
          </div>
          <span className="category-badge">Calculated</span>
        </div>
        {s.recurring.length ? (
          <div className="recurring-grid">
            {s.recurring.map((r) => (
              <div className="recurring-item" key={r.merchant}>
                <span className="merchant-icon">{r.merchant[0]}</span>
                <div>
                  <strong>{r.merchant}</strong>
                  <small>{r.months} observed months</small>
                </div>
                <b>{money(r.cents)}</b>
              </div>
            ))}
          </div>
        ) : (
          <Empty />
        )}
      </section>
      <section className="card ai-card">
        <div className="card-title">
          <div>
            <h2>
              <Sparkles size={18} /> Claude savings opportunities
            </h2>
            <p>Optional external analysis, with an exact payload preview.</p>
          </div>
          <Button disabled={busy} onClick={prepare}>
            {busy ? "Preparing…" : "Review data to send"}
            <ArrowRight size={15} />
          </Button>
        </div>
        <p className="metric-note">
          Only randomized merchant aliases, calendar month, cents, category, and
          transaction type are sent. Merchant names are restored locally.
          Amounts and patterns can still be identifying; this is minimized data,
          not fully anonymous data. No PDF, name, address, account number, or
          raw description is included.
        </p>
        {error && (
          <p role="alert" className="warning">
            {error}
          </p>
        )}
        {preview && (
          <div className="payload">
            <h3>Exactly what Claude will receive</h3>
            <p className="muted">
              Single-use approval · expires after five minutes. Provider terms
              and retention policies apply.
            </p>
            <pre>{JSON.stringify(preview.payload, null, 2)}</pre>
            <label className="consent">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              I consent to sending this financial data to Anthropic for this
              request.
            </label>
            <Button
              disabled={!consent || busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  setResult(
                    await api("/ai/analyze", {
                      method: "POST",
                      body: JSON.stringify({
                        token: preview.token,
                        consent: true,
                      }),
                    }),
                  );
                  setPreview(null);
                  setConsent(false);
                } catch (e) {
                  setError((e as Error).message);
                  setPreview(null);
                  setConsent(false);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Send approved data
            </Button>
          </div>
        )}
        {result && (
          <div>
            {result.recommendations.map((r, i) => (
              <div className="recommendation" key={r.merchant}>
                <span className="rank">0{i + 1}</span>
                <div>
                  <h3>Review {r.merchant.toLowerCase()}</h3>
                  <p>
                    Reducing a monthly average of {money(r.baseline_cents)} by{" "}
                    {r.percent}% could save {money(r.saving_cents)} per month.
                  </p>
                  <small>
                    AI-selected reduction; locally calculated estimate.
                  </small>
                </div>
                <b>
                  {money(r.saving_cents)}
                  <small>/ month</small>
                </b>
              </div>
            ))}
            <p className="metric-note">{result.label}</p>
          </div>
        )}
        {!status?.ai_configured && (
          <p className="metric-note">
            To enable Claude, configure ANTHROPIC_API_KEY and AI_ENABLED in
            backend/.env and restart FastAPI. Demo mode works without a key.
          </p>
        )}
      </section>
    </>
  );
}
