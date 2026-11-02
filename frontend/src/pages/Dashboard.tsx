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
export default function Dashboard({
  summary: s,
  rows,
}: {
  summary: Summary;
  rows: Transaction[];
}) {
  const cards = [
    ["Total spending", s.spending, Wallet, "Expenses less refunds"],
    ["Total income", s.income, ArrowDownRight, "Excludes transfers & payments"],
    ["Net cash flow", s.net, ChartNoAxesCombined, "Income minus net spending"],
    ["Daily average", s.daily, Leaf, "Across the selected date span"],
  ] as const;
  return (
    <>
      <div className="stats">
        {cards.map(([name, value, Icon, sub], i) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="stat card"
            key={name}
          >
            <div className="stat-title">
              {name}
              <span>
                <Icon size={17} />
              </span>
            </div>
            <strong>{money(value)}</strong>
            <small>
              {i === 0 && s.change !== null ? (
                <>
                  <span className={s.change <= 0 ? "positive" : "negative"}>
                    {s.change <= 0 ? "↘" : "↗"} {Math.abs(s.change)}%
                  </span>{" "}
                  latest vs previous month
                </>
              ) : (
                sub
              )}
            </small>
          </motion.div>
        ))}
      </div>
      <div className="chart-grid">
        <section className="card trend">
          <div className="card-title">
            <div>
              <h2>Spending over time</h2>
              <p>A little perspective on your spending habits.</p>
            </div>
            <span className="legend-inline">
              <i />
              Net expenses
            </span>
          </div>
          <Trend data={s.trend} />
          <div className="chart-note">
            <span className="online" />
            {s.count} transactions · refunds offset expenses · transfers
            excluded
          </div>
        </section>
        <section className="card">
          <div className="card-title">
            <div>
              <h2>Where it all goes</h2>
              <p>Spending, by category.</p>
            </div>
            <ChartNoAxesCombined size={18} className="muted" />
          </div>
          <Breakdown data={s.categories} />
        </section>
      </div>
      <div className="insight-strip">
        <div className="sparkle-box">
          <Sparkles size={24} />
        </div>
        <div>
          <small>A SMARTER PERSPECTIVE</small>
          <h3>
            {s.recurring.length
              ? `${s.recurring.length} recurring merchants. One place to keep an eye on them.`
              : "Your financial story starts with a little clarity."}
          </h3>
          <p>
            {s.recurring.length
              ? `${money(s.recurring.reduce((a, b) => a + b.cents, 0))} per observed month across consistent, recurring merchants.`
              : "Import a statement to see patterns drawn from your own data."}
          </p>
        </div>
        <Button variant="outline" asChild>
          <NavLink to="/insights">
            Explore insights <ArrowUpRight size={16} />
          </NavLink>
        </Button>
      </div>
      <div className="bottom-grid">
        <section className="card">
          <div className="card-title">
            <div>
              <h2>Recent activity</h2>
              <p>The latest movements in your money.</p>
            </div>
            <NavLink className="text-link" to="/transactions">
              View all <ArrowRight size={14} />
            </NavLink>
          </div>
          {!rows.length ? (
            <Empty />
          ) : (
            <div className="recent-list">
              {rows.slice(0, 5).map((r, i) => (
                <div className="recent" key={r.id}>
                  <div
                    className="merchant-icon"
                    style={{
                      color: colors[i % colors.length],
                      background: colors[i % colors.length] + "15",
                    }}
                  >
                    {r.merchant.slice(0, 1)}
                  </div>
                  <div className="recent-name">
                    <strong>{r.merchant}</strong>
                    <small>
                      {r.category} <span>·</span> {r.date}
                    </small>
                  </div>
                  <span
                    className={
                      r.kind === "income" || r.kind === "refund"
                        ? "positive"
                        : ""
                    }
                  >
                    {r.kind === "expense"
                      ? "−"
                      : r.kind === "income" || r.kind === "refund"
                        ? "+"
                        : ""}
                    {money(r.cents)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="card">
          <div className="card-title">
            <div>
              <h2>Income vs. expenses</h2>
              <p>Keep your cash flow in balance.</p>
            </div>
          </div>
          <div className="legend-inline bar-legend">
            <i />
            Income <i style={{ background: colors[1] }} />
            Expenses
          </div>
          <Trend data={s.trend} bar />
        </section>
      </div>
    </>
  );
}
