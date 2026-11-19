import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdScience } from 'react-icons/md';
import {
  FaStore,
  FaCalendarAlt,
  FaTrophy,
  FaBoxOpen,
  FaCubes,
  FaChartLine,
  FaMoneyBillWave,
  FaUniversity,
  FaArrowUp,
  FaArrowDown,
} from 'react-icons/fa';
// import NavigationBar from './NavigationBar';
import Footer from './Footer';
import '../Dashboard.css';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import MainLayout from '../Layout/MainLayout';
import api from '../../api';

const formatUnits = (n) =>
  Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });

const formatRs = (n) =>
  `Rs. ${Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;

const formatShort = (n) => {
  const v = Number(n || 0);
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString('en-PK', { maximumFractionDigits: 0 });
};

const formatAxisDate = (str) => {
  if (!str) return '';
  const date = new Date(str);
  if (Number.isNaN(date.getTime())) return String(str).slice(5);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const MIX_COLORS = { rm: '#0f766e', fp: '#1d4ed8' };

const TrendTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const sales = Number(payload.find((p) => p.dataKey === 'sales')?.value || 0);
  const purchases = Number(payload.find((p) => p.dataKey === 'purchases')?.value || 0);
  const net = sales - purchases;
  return (
    <div className="trend-tooltip">
      <div className="trend-tooltip-date">{formatAxisDate(label)}</div>
      <div className="trend-tooltip-row">
        <span className="trend-dot trend-dot--sales" />
        <span>Sales</span>
        <strong>{formatRs(sales)}</strong>
      </div>
      <div className="trend-tooltip-row">
        <span className="trend-dot trend-dot--purch" />
        <span>Purchases</span>
        <strong>{formatRs(purchases)}</strong>
      </div>
      <div className={`trend-tooltip-net ${net >= 0 ? 'is-pos' : 'is-neg'}`}>
        <span>Net</span>
        <strong>{formatRs(net)}</strong>
      </div>
    </div>
  );
};

/** Premium ranked progress list — sold units + live stock */
const RankedSalesList = ({ items, tone = 'teal', emptyText = 'No sales data yet' }) => {
  const list = Array.isArray(items) ? items : [];
  const max = Math.max(...list.map((i) => Number(i.sales) || 0), 1);

  if (!list.length) {
    return <div className="rank-empty">{emptyText}</div>;
  }

  return (
    <ul className={`rank-list rank-list--${tone}`}>
      {list.map((item, index) => {
        const qty = Number(item.sales) || 0;
        const stock = Number(item.stock);
        const hasStock = Number.isFinite(stock);
        const pct = Math.max(4, Math.round((qty / max) * 100));
        const stockLow = hasStock && stock <= 0;
        return (
          <li key={`${item.name}-${index}`} className="rank-row">
            <span className={`rank-badge${index === 0 ? ' is-top' : ''}`}>
              {index === 0 ? <FaTrophy /> : index + 1}
            </span>
            <div className="rank-main">
              <div className="rank-meta">
                <span className="rank-name" title={item.name}>{item.name || '—'}</span>
                <span className="rank-figures">
                  <span className="rank-qty">{formatUnits(qty)} <em>sold</em></span>
                  {hasStock ? (
                    <span className={`rank-stock${stockLow ? ' is-low' : ''}`}>
                      {formatUnits(stock)} <em>stock</em>
                    </span>
                  ) : null}
                </span>
              </div>
              <div className="rank-track" aria-hidden="true">
                <div className="rank-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();

  // 🗓️ Date Logic for Filter (local calendar day — avoids UTC midnight shift in PKT)
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;
  const firstDay = `${year}-${month}-01`;

  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(today);

  const [productCount, setProductCount] = useState(null);
  const [materialCount, setMaterialCount] = useState(null);
  const [customerCount, setCustomerCount] = useState(null);
  const [supplierCount, setSupplierCount] = useState(null);
  const [employeeCount, setEmployeeCount] = useState(null);
  const [salesMix, setSalesMix] = useState({
    rm_sales: 0,
    fp_sales: 0,
    total: 0,
    segments: [],
  });
  const [lineChartData, setLineChartData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [trendingMaterials, setTrendingMaterials] = useState([]);
  const [stats, setStats] = useState({
    revenue: 0,
    profit: 0,
    expenses: 0,
    equity: 0,
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const params = { fromDate, toDate };

        const [bar, line, statsRes, trend, trendingData] = await Promise.all([
          api.get('/dashboard/bar-chart', { params }),
          api.get('/dashboard/line-chart', { params }),
          api.get('/dashboard/stats-cards', { params }),
          api.get('/dashboard/revenue-expense-trend', { params }),
          api.get('/dashboard/trending-products', { params }),
        ]);

        const mix = bar.data || {};
        setSalesMix({
          rm_sales: Number(mix.rm_sales || 0),
          fp_sales: Number(mix.fp_sales || 0),
          total: Number(mix.total || 0),
          segments: Array.isArray(mix.segments) ? mix.segments : [],
        });
        setLineChartData(Array.isArray(line.data) ? line.data : []);
        setStats(statsRes.data || { revenue: 0, profit: 0, expenses: 0, equity: 0 });
        setTrendData(Array.isArray(trend.data) ? trend.data : []);
        setTrendingProducts(trendingData.data?.products || []);
        setTrendingMaterials(trendingData.data?.materials || []);
      } catch (err) {
        console.error("Dashboard data fetch error:", err);
      }
    };

    fetchDashboardData();
  }, [fromDate, toDate]);

  // Card data
  // const cards = [
  //   // { title: "Raw Material", value: "Stocks", icon: <FaBoxes size={30} color="#4caf50" /> },
  //   // ... (rest of your commented cards)
  //   { title: "Shops Detail", value: "Main Branch", icon: <FaStore size={30} color="#795548" /> },
  //   // ... (rest of your commented cards)
  // ];

  const allCardsRoute = {
    "Raw Material Reports": "/rm-invoice-detail",
    // ... (your existing routes mapping)
    "Shops Detail": "/shops",
  };

  const logOut = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("user");
    navigate('/');
  };

  const spTotals = useMemo(() => {
    const sales = lineChartData.reduce((s, d) => s + (Number(d.sales) || 0), 0);
    const purchases = lineChartData.reduce((s, d) => s + (Number(d.purchases) || 0), 0);
    return { sales, purchases, net: sales - purchases };
  }, [lineChartData]);

  const hasSpTrend = lineChartData.some((d) => Number(d.sales) || Number(d.purchases));

  return (
    <MainLayout>
      <div className="dashboard">
       {/* Header with Date Filters */}
        <div className="dashboard-header-flex">
          <div>
            <h1 className="dashboard-title">Dashboard</h1>
            <p className="dashboard-subtitle">Business overview for the selected period</p>
          </div>

          <div className="date-filter-container">
            <div className="filter-group">
              <FaCalendarAlt className="calendar-icon" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <span className="to-label">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="dashboard-content">
          <div className="stats-grid">
            <div className="kpi-card kpi-card--revenue">
              <div className="kpi-top">
                <span className="kpi-label">Total Revenue</span>
                <span className="kpi-icon kpi-icon--pkr" aria-hidden="true">Rs</span>
              </div>
              <div className="kpi-value">{formatRs(stats.revenue)}</div>
              <div className="kpi-foot">Income &amp; revenue accounts</div>
            </div>

            <div className={`kpi-card ${stats.profit >= 0 ? 'kpi-card--profit' : 'kpi-card--loss'}`}>
              <div className="kpi-top">
                <span className="kpi-label">Net Profit</span>
                <span className="kpi-icon"><FaChartLine /></span>
              </div>
              <div className={`kpi-value ${stats.profit >= 0 ? 'is-pos' : 'is-neg'}`}>
                {formatRs(stats.profit)}
              </div>
              <div className="kpi-foot">
                {stats.profit >= 0
                  ? <><FaArrowUp /> Revenue − expenses</>
                  : <><FaArrowDown /> Expenses exceed revenue</>}
              </div>
            </div>

            <div className="kpi-card kpi-card--expense">
              <div className="kpi-top">
                <span className="kpi-label">Total Expenses</span>
                <span className="kpi-icon"><FaMoneyBillWave /></span>
              </div>
              <div className="kpi-value">{formatRs(stats.expenses)}</div>
              <div className="kpi-foot">Expense accounts (net)</div>
            </div>

            <div className="kpi-card kpi-card--equity">
              <div className="kpi-top">
                <span className="kpi-label">Total Equity</span>
                <span className="kpi-icon"><FaUniversity /></span>
              </div>
              <div className="kpi-value">{formatRs(stats.equity)}</div>
              <div className="kpi-foot">Equity accounts (net)</div>
            </div>
          </div>


          {/* Charts Section — Sales Mix + Sales/Purchases */}
          <div className="chart-section">
            <div className="chart-box premium-chart-card sales-mix-card">
              <div className="premium-chart-head">
                <div>
                  <h3>Sales Mix</h3>
                  <p className="premium-chart-sub">Selected period · Net Sales Revenue (GL) · RM vs FP</p>
                </div>
              </div>
              {salesMix.total > 0 ? (
                <div className="sales-mix-body">
                  <div className="sales-mix-donut">
                    <ResponsiveContainer width="100%" height={210}>
                      <PieChart>
                        <Pie
                          data={salesMix.segments.filter((s) => Number(s.value) > 0)}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={82}
                          paddingAngle={2}
                          stroke="#fff"
                          strokeWidth={2}
                        >
                          {salesMix.segments.map((seg) => (
                            <Cell key={seg.key} fill={MIX_COLORS[seg.key] || '#94a3b8'} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v) => formatRs(v)}
                          contentStyle={{
                            borderRadius: 8,
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 12px rgba(15,23,42,0.1)',
                            fontSize: 12,
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="sales-mix-center">
                      <span>Total</span>
                      <strong>{formatShort(salesMix.total)}</strong>
                    </div>
                  </div>
                  <div className="sales-mix-legend">
                    <div className="sales-mix-row">
                      <span className="sales-mix-dot" style={{ background: MIX_COLORS.rm }} />
                      <div className="sales-mix-meta">
                        <span className="sales-mix-label">RM Sales</span>
                        <strong>{formatRs(salesMix.rm_sales)}</strong>
                      </div>
                      <span className="sales-mix-pct">
                        {salesMix.total ? Math.round((salesMix.rm_sales / salesMix.total) * 100) : 0}%
                      </span>
                    </div>
                    <div className="sales-mix-row">
                      <span className="sales-mix-dot" style={{ background: MIX_COLORS.fp }} />
                      <div className="sales-mix-meta">
                        <span className="sales-mix-label">FP Sales</span>
                        <strong>{formatRs(salesMix.fp_sales)}</strong>
                      </div>
                      <span className="sales-mix-pct">
                        {salesMix.total ? Math.round((salesMix.fp_sales / salesMix.total) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rank-empty sales-mix-empty">No Sales Revenue posted in this period</div>
              )}
            </div>

            <div className="chart-box premium-chart-card trend-card">
              <div className="premium-chart-head">
                <div>
                  <h3>Sales & Purchases</h3>
                  <p className="premium-chart-sub">Daily GL trend · full selected period</p>
                </div>
              </div>
              {hasSpTrend && (
                <div className="trend-summary">
                  <div className="trend-chip trend-chip--sales">
                    <span>Sales</span>
                    <strong>{formatShort(spTotals.sales)}</strong>
                  </div>
                  <div className="trend-chip trend-chip--purch">
                    <span>Purchases</span>
                    <strong>{formatShort(spTotals.purchases)}</strong>
                  </div>
                  <div className={`trend-chip ${spTotals.net >= 0 ? 'trend-chip--net-pos' : 'trend-chip--net-neg'}`}>
                    <span>Net</span>
                    <strong>{formatShort(spTotals.net)}</strong>
                  </div>
                </div>
              )}

              <div className="chart-plot trend-plot">
                {hasSpTrend ? (
                  <>
                    <ResponsiveContainer width="100%" height={236}>
                      <AreaChart data={lineChartData} margin={{ top: 12, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="dashSalesFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#16a34a" stopOpacity={0.28} />
                            <stop offset="70%" stopColor="#16a34a" stopOpacity={0.06} />
                            <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="dashPurchFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ea580c" stopOpacity={0.22} />
                            <stop offset="70%" stopColor="#ea580c" stopOpacity={0.05} />
                            <stop offset="100%" stopColor="#ea580c" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 6" vertical={false} stroke="#e8eef5" />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={formatAxisDate}
                          minTickGap={26}
                          dy={6}
                        />
                        <YAxis
                          tick={{ fill: '#94a3b8', fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          width={48}
                          tickFormatter={(v) => `Rs ${formatShort(v)}`}
                        />
                        <Tooltip
                          content={<TrendTooltip />}
                          cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="sales"
                          name="Sales"
                          stroke="#16a34a"
                          strokeWidth={2.5}
                          fill="url(#dashSalesFill)"
                          dot={(props) => {
                            const { cx, cy, payload, index } = props;
                            if (!payload || !Number(payload.sales)) return null;
                            return (
                              <circle
                                key={`s-${index}`}
                                cx={cx}
                                cy={cy}
                                r={3.5}
                                fill="#fff"
                                stroke="#16a34a"
                                strokeWidth={2}
                              />
                            );
                          }}
                          activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff', fill: '#16a34a' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="purchases"
                          name="Purchases"
                          stroke="#ea580c"
                          strokeWidth={2.5}
                          fill="url(#dashPurchFill)"
                          dot={(props) => {
                            const { cx, cy, payload, index } = props;
                            if (!payload || !Number(payload.purchases)) return null;
                            return (
                              <circle
                                key={`p-${index}`}
                                cx={cx}
                                cy={cy}
                                r={3.5}
                                fill="#fff"
                                stroke="#ea580c"
                                strokeWidth={2}
                              />
                            );
                          }}
                          activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff', fill: '#ea580c' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div className="trend-legend">
                      <span className="trend-legend-item">
                        <i className="trend-legend-line trend-legend-line--sales" /> Sales
                      </span>
                      <span className="trend-legend-item">
                        <i className="trend-legend-line trend-legend-line--purch" /> Purchases
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="rank-empty">No sales/purchase amounts in this period</div>
                )}
              </div>
            </div>
          </div>

          {/* Area Chart with Gradients */}
          <div className="bottom-chart-section">
            <div className="chart-box full-width">
              <h3>Revenue vs Expenses Trend</h3>
              <div className="chart-plot">
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={trendData} margin={{ top: 8, right: 12, left: 4, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4caf50" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4caf50" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f44336" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f44336" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="date" tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(str) => {
                    const date = new Date(str);
                    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                  }} />
                  <YAxis tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '2px' }} />
                  <Area type="monotone" dataKey="sales" stroke="#4caf50" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" name="Revenue/Sales" />
                  <Area type="monotone" dataKey="purchases" stroke="#f44336" strokeWidth={2} fillOpacity={1} fill="url(#colorPurchases)" name="Expenses/Purchases" />
                </AreaChart>
              </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Top performers — premium ranked lists */}
          <div className="trending-grid">
            <div className="chart-box rank-card">
              <div className="rank-card-head">
                <div className="rank-card-icon rank-card-icon--teal"><FaBoxOpen /></div>
                <div>
                  <h3 className="rank-card-title">Top Selling Products</h3>
                  <p className="rank-card-sub">Finished goods by units sold</p>
                </div>
              </div>
              <RankedSalesList
                items={trendingProducts}
                tone="teal"
                emptyText="No finished-product sales yet"
              />
            </div>

            <div className="chart-box rank-card">
              <div className="rank-card-head">
                <div className="rank-card-icon rank-card-icon--slate"><FaCubes /></div>
                <div>
                  <h3 className="rank-card-title">Top Selling Materials</h3>
                  <p className="rank-card-sub">Raw materials by sale quantity</p>
                </div>
              </div>
              <RankedSalesList
                items={trendingMaterials}
                tone="slate"
                emptyText="No material sales yet"
              />
            </div>
          </div>


        </div>
      </div>
      <Footer />
    </MainLayout>
  );
};

export default Dashboard;