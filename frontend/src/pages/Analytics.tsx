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
import { Breakdown, Trend, colors, chartTooltip, formatValue } from "../charts";
import Empty from "./Empty";
export default function Analytics({ summary: s }: { summary: Summary }) {
  return (
    <>
      <div className="chart-grid">
        <section className="card">
          <div className="card-title">
            <h2>Monthly cash flow</h2>
          </div>
          <Trend data={s.trend} bar />
        </section>
        <section className="card">
          <div className="card-title">
            <h2>Category breakdown</h2>
          </div>
          <Breakdown data={s.categories} />
        </section>
      </div>
      <div className="bottom-grid">
        <section className="card">
          <div className="card-title">
            <h2>Merchant comparison</h2>
            <span className="muted">Net spending</span>
          </div>
          <div className="merchant-bars">
            {s.merchants.map((r, i) => (
              <div key={r.name}>
                <div>
                  <span>{r.name}</span>
                  <b>{money(r.value)}</b>
                </div>
                <div className="track">
                  <span
                    style={{
                      width:
                        Math.max(
                          0,
                          (r.value / (s.merchants[0]?.value || 1)) * 100,
                        ) + "%",
                      background: colors[i % colors.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="card">
          <div className="card-title">
            <h2>Weekly spending</h2>
          </div>
          <ResponsiveContainer width="100%" height={330}>
            <BarChart data={s.weekly}>
              <XAxis
                dataKey="week"
                tickFormatter={(v) => v.slice(5)}
                tick={{ fontSize: 10 }}
              />
              <YAxis tickFormatter={(v) => "$" + v / 100000 + "k"} width={50} />
              <Tooltip contentStyle={chartTooltip} formatter={formatValue} />
              <Bar dataKey="value" fill="#8390fa" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>
      <p className="metric-note">
        Monthly change compares the last two calendar months present in the
        selected data. Partial months are not adjusted. Recurring detection
        requires three distinct months and amounts within $1; it is a heuristic.
      </p>
    </>
  );
}
