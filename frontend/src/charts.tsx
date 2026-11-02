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
} from "./api";
import { Button } from "./components/ui/button";

export const colors = [
  "#51d4ad",
  "#8390fa",
  "#ddb77b",
  "#6da9d7",
  "#bb91d9",
  "#e38f9b",
  "#89ba91",
  "#b4bfcd",
];
export const chartTooltip = {
  background: "var(--panel)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--text)",
  fontSize: 12,
};
export const formatValue = (v: unknown) => money(Number(v));
export function Breakdown({ data }: { data: Slice[] }) {
  return (
    <div className="breakdown">
      <div className="donut">
        <ResponsiveContainer width="100%" height={210}>
          <PieChart>
            <Pie
              data={data.filter((x) => x.value > 0)}
              dataKey="value"
              nameKey="name"
              innerRadius={65}
              outerRadius={90}
              paddingAngle={3}
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={chartTooltip} formatter={formatValue} />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-label">
          <small>NET SPENDING</small>
          <strong>{money(data.reduce((a, b) => a + b.value, 0))}</strong>
        </div>
      </div>
      <div className="legend">
        {data.slice(0, 6).map((x, i) => (
          <div key={x.name}>
            <span>
              <i style={{ background: colors[i % colors.length] }} />
              {x.name}
            </span>
            <b>{money(x.value)}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
export function Trend({
  data,
  bar = false,
}: {
  data: Summary["trend"];
  bar?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      {bar ? (
        <BarChart data={data}>
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="4 5"
          />
          <XAxis
            dataKey="month"
            tickFormatter={(x) =>
              new Date(x + "-15").toLocaleString("en-US", { month: "short" })
            }
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => "$" + v / 100000 + "k"}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip contentStyle={chartTooltip} formatter={formatValue} />
          <Bar dataKey="income" fill="#51d4ad" radius={[4, 4, 0, 0]} />
          <Bar dataKey="spending" fill="#8390fa" radius={[4, 4, 0, 0]} />
        </BarChart>
      ) : (
        <AreaChart
          data={data}
          margin={{ top: 15, right: 15, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="spend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#51d4ad" stopOpacity={0.24} />
              <stop offset="100%" stopColor="#51d4ad" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="4 5"
          />
          <XAxis
            dataKey="month"
            tickFormatter={(x) =>
              new Date(x + "-15").toLocaleString("en-US", { month: "short" })
            }
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => "$" + (v / 100000).toFixed(1) + "k"}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip contentStyle={chartTooltip} formatter={formatValue} />
          <Area
            dataKey="spending"
            type="monotone"
            stroke="#51d4ad"
            strokeWidth={3}
            fill="url(#spend)"
            activeDot={{ r: 6 }}
          />
        </AreaChart>
      )}
    </ResponsiveContainer>
  );
}
