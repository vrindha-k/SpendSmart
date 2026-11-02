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
import "./style.css";
import { client } from "./query";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import Transactions from "./pages/Transactions";
import Statements from "./pages/Statements";
import Insights from "./pages/Insights";
import Settings from "./pages/Settings";
function App() {
  const [source, setSource] = useState("demo"),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [q, setQ] = useState(""),
    [category, setCategory] = useState(""),
    [merchant, setMerchant] = useState(""),
    [theme, setTheme] = useState(localStorage.getItem("theme") || "dark"),
    [menu, setMenu] = useState(false);
  const location = useLocation();
  const [notice, setNotice] = useState("");
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);
  const params = new URLSearchParams({
    source,
    start,
    end,
    q,
    category,
    merchant,
  });
  if (!start) params.delete("start");
  if (!end) params.delete("end");
  const qs = "?" + params;
  const {
    data: summary,
    error,
    isPending,
  } = useQuery({
    queryKey: ["summary", qs],
    queryFn: () => api<Summary>("/analytics" + qs),
  });
  const { data: rows = [] } = useQuery({
    queryKey: ["rows", qs],
    queryFn: () => api<Transaction[]>("/transactions" + qs),
  });
  const invalidate = () => client.invalidateQueries();
  const nav = [
    ["/", "Overview", LayoutDashboard],
    ["/transactions", "Transactions", ArrowLeftRight],
    ["/analytics", "Analytics", ChartNoAxesCombined],
    ["/insights", "AI Insights", Sparkles],
    ["/statements", "Statements", Files],
    ["/settings", "Settings", SettingsIcon],
  ] as const;
  useEffect(() => {
    if (!["/", "/transactions", "/analytics"].includes(location.pathname)) {
      setStart("");
      setEnd("");
      setQ("");
      setCategory("");
      setMerchant("");
    }
  }, [location.pathname]);
  const title = nav.find((x) => x[0] === location.pathname)?.[1] || "Overview";
  return (
    <div className="app">
      <aside className={menu ? "sidebar open" : "sidebar"}>
        <NavLink to="/" className="brand">
          <span className="brand-mark">
            <ChartNoAxesCombined size={23} />
          </span>
          SpendSmart<span className="brand-dot">.</span>
        </NavLink>
        <div className="workspace">
          <span className="avatar">S</span>
          <div>
            Personal workspace<small>Local finance intelligence</small>
          </div>
          <ShieldCheck size={16} />
        </div>
        <small className="nav-label">WORKSPACE</small>
        <nav>
          {nav.map(([path, label, Icon]) => (
            <NavLink key={path} to={path} end onClick={() => setMenu(false)}>
              <Icon size={19} />
              {label}
              {label === "AI Insights" && <span className="new">AI</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-mini">
            <ShieldCheck size={20} />
            <strong>Your money. Your data.</strong>
            <p>
              Stored on your device.
              <br />
              Always under your control.
            </p>
            <NavLink to="/settings">
              Explore privacy <ArrowRight size={13} />
            </NavLink>
          </div>
          <div className="profile">
            <span className="avatar small">JD</span>
            <div>
              Demo explorer<small>Personal account</small>
            </div>
            <span className="online" />
          </div>
        </div>
      </aside>
      <div className="main">
        <header>
          <button
            className="mobile-menu"
            aria-label="Open navigation"
            onClick={() => setMenu(!menu)}
          >
            <Menu />
          </button>
          <span className="breadcrumb">
            Workspace <ChevronRight size={13} />
            <b>{title}</b>
          </span>
          <div className="header-right">
            <span className="local">
              <span className="online" />
              Local-first & private
            </span>
            <button
              className="icon-button"
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <span className="avatar small">JD</span>
          </div>
        </header>
        <main>
          <div className="demo-banner">
            <span>
              <span className="demo-tag">
                {source === "demo" ? "DEMO MODE" : "LOCAL DATA"}
              </span>
              {source === "demo"
                ? "A little sample data. A lot of possibilities. Explore with synthetic transactions."
                : "Your imported transactions stay in your local database."}
            </span>
            <button
              onClick={() => {
                setSource(source === "demo" ? "local" : "demo");
                setStart("");
                setEnd("");
                setQ("");
                setCategory("");
                setMerchant("");
              }}
            >
              {source === "demo" ? "Use my own data" : "Explore demo"}{" "}
              <ArrowRight size={14} />
            </button>
          </div>
          <div className="page-heading">
            <div>
              <div className="eyebrow">YOUR MONEY, IN FOCUS</div>
              <h1>
                {title === "Overview"
                  ? "A clearer picture of your money."
                  : title}
              </h1>
              <p>
                {title === "Overview"
                  ? "Know where it goes. Make room for what matters."
                  : {
                      Transactions:
                        "Every transaction, organized and under your control.",
                      Analytics:
                        "Go beyond the balance. Find the patterns that matter.",
                      "AI Insights":
                        "Thoughtful insights. Transparent data. Your choice.",
                      Statements:
                        "Turn your statements into a clearer financial picture.",
                      Settings:
                        "Make SpendSmart yours. Keep your data in your hands.",
                    }[title]}
              </p>
            </div>
            <Button asChild>
              <NavLink to="/statements">
                <Plus size={16} />
                Import statement
              </NavLink>
            </Button>
          </div>
          {notice && (
            <div role="status" className="notice">
              {notice}
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {["/", "/transactions", "/analytics"].includes(location.pathname) && (
            <div className="filters">
              <div className="filter-left">
                <SlidersHorizontal size={15} />
                <span>View period</span>
                <input
                  aria-label="Start date"
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
                <span>—</span>
                <input
                  aria-label="End date"
                  type="date"
                  value={end}
                  min={start}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </div>
              <div className="filter-right">
                <select
                  aria-label="Category filter"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <select
                  aria-label="Merchant filter"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                >
                  <option value="">All merchants</option>
                  {(summary?.merchants || []).map((c) => (
                    <option key={c.name}>{c.name}</option>
                  ))}
                  {merchant &&
                    !summary?.merchants.some((x) => x.name === merchant) && (
                      <option>{merchant}</option>
                    )}
                </select>
                <button
                  className="text-button"
                  onClick={() => {
                    setStart("");
                    setEnd("");
                    setCategory("");
                    setMerchant("");
                    setQ("");
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          )}
          {error ? (
            <div className="empty" role="alert">
              <h2>Let’s reconnect your data.</h2>
              <p>
                {error.message}. Start the FastAPI backend on port 8000, then
                retry.
              </p>
              <Button onClick={() => invalidate()}>Retry connection</Button>
            </div>
          ) : isPending ? (
            <div className="skeleton" aria-label="Loading analytics" />
          ) : (
            <Routes>
              <Route
                path="/"
                element={<Dashboard summary={summary!} rows={rows} />}
              />
              <Route
                path="/analytics"
                element={<Analytics summary={summary!} />}
              />
              <Route
                path="/transactions"
                element={
                  <Transactions
                    rows={rows}
                    q={q}
                    setQ={setQ}
                    qs={qs}
                    source={source}
                    notify={setNotice}
                  />
                }
              />
              <Route
                path="/statements"
                element={
                  <Statements
                    notify={setNotice}
                    useLocal={() => setSource("local")}
                  />
                }
              />
              <Route
                path="/insights"
                element={<Insights source={source} summary={summary!} />}
              />
              <Route
                path="/settings"
                element={
                  <Settings
                    source={source}
                    theme={theme}
                    setTheme={setTheme}
                    notify={setNotice}
                  />
                }
              />
              <Route
                path="*"
                element={
                  <div className="empty">
                    Page not found. <NavLink to="/">Return to overview</NavLink>
                  </div>
                }
              />
            </Routes>
          )}
          <footer>
            <span>
              <ShieldCheck size={13} />
              Built for clarity. Designed for privacy.
            </span>
            <span>SpendSmart · Local financial intelligence</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
