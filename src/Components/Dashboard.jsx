import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdScience } from 'react-icons/md';
import {
  FaStore,
} from 'react-icons/fa';
// import NavigationBar from './NavigationBar';
import Footer from './Footer';
import '../Dashboard.css';
import {
  ResponsiveContainer,
  BarChart,
  LineChart,
  XAxis,
  YAxis, 
  Tooltip,
  Legend,
  Bar,
  Line,
  CartesianGrid
  ,AreaChart, Area
  ,Cell
} from 'recharts';
import MainLayout from '../Layout/MainLayout';
import api from '../../api';

const Dashboard = () => {
  const navigate = useNavigate();

  const [productCount, setProductCount] = useState(null);
  const [materialCount, setMaterialCount] = useState(null);
  const [customerCount, setCustomerCount] = useState(null);
  const [supplierCount, setSupplierCount] = useState(null);
  const [employeeCount, setEmployeeCount] = useState(null);
  const [barChartData, setBarChartData] = useState([]);
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

  // Fetch counts using Axios (api.js)
  useEffect(() => {
    // Counts fetch karne ke liye common function
    const fetchDashboardData = async () => {
      try {
        // Axios automatic JSON parse kar deta hai, isliye .json() ki zaroorat nahi
        // const prod = await api.get('/products/count');
        // setProductCount(prod.data.count);

        // const mat = await api.get('/add-materials/count');
        // setMaterialCount(mat.data.count);

        // const cust = await api.get('/entities/count/customers');
        // setCustomerCount(cust.data.count);

        // const supp = await api.get('/entities/count/suppliers');
        // setSupplierCount(supp.data.count);

        // const emp = await api.get('/entities/count/employees');
        // setEmployeeCount(emp.data.count);

        const bar = await api.get('/dashboard/bar-chart');
        setBarChartData(bar.data);

        const line = await api.get('/dashboard/line-chart');
        setLineChartData(line.data);

        const stats = await api.get('/dashboard/stats-cards');
        setStats(stats.data);

        const trend = await api.get('/dashboard/revenue-expense-trend');
        setTrendData(trend.data);

        const trendingData = await api.get('/dashboard/trending-products');
        setTrendingProducts(trendingData.data.products);
        setTrendingMaterials(trendingData.data.materials); // Materials array
      } catch (err) {
        console.error("Dashboard data fetch error:", err);
      }
    };

    fetchDashboardData();
  }, []);

  // Card data
  const cards = [
    // { title: "Raw Material", value: "Stocks", icon: <FaBoxes size={30} color="#4caf50" /> },
    // { title: "Raw Material Reports", value: "7 Reports", icon: <FaChartLine size={30} color="#2196f3" /> },
    // { title: "Purchase Invoice", value: "Transactions", icon: <FaShoppingCart size={30} color="#ff9800" /> },
    // { title: "Finished Product Sales", value: "Transactions", icon: <FaCashRegister size={30} color="#f44336" /> },
    // { title: "Finished Product Sale Returns", value: "Transactions", icon: <FaUndoAlt size={30} color="#9c27b0" /> },
    // { title: "Customers Detail", value: customerCount !== null ? `${customerCount} Customers` : "Loading...", icon: <FaUsers size={30} color="#00bcd4" /> },
    // { title: "Suppliers Detail", value: supplierCount !== null ? `${supplierCount} Suppliers` : "Loading...", icon: <FaTruck size={30} color="#ff5722" /> },
    // { title: "Employees Detail", value: employeeCount !== null ? `${employeeCount} Employees` : "Loading...", icon: <FaUsers size={30} color="#00bcd4" /> },
    { title: "Shops Detail", value: "Main Branch", icon: <FaStore size={30} color="#795548" /> },
    // { title: "Transactions History", value: "Buy / Sell", icon: <FaHistory size={30} color="#607d8b" /> },
    // { title: "Add Raw Materials", value: materialCount !== null ? `${materialCount} Items` : "Loading...", icon: <MdScience size={30} color="#3f51b5" /> },
    // { title: "Purchase", value: "Raw Materials", icon: <FaCartPlus size={30} color="#009688" /> },
    // { title: "Purchase Return", value: "Raw Materials", icon: <FaExchangeAlt size={30} color="#ff9800" /> },
    // { title: "Sale", value: "Raw Materials", icon: <FaCartArrowDown size={30} color="#e91e63" /> },
    // { title: "Sale Return", value: "Returned Materials", icon: <FaUndoAlt size={30} color="#9e9e9e" /> },
    // { title: "Create Recipe", value: "And detail", icon: <FaFlask size={30} color="#673ab7" /> },
    // { title: "Create Product", value: "with recipe", icon: <FaBoxOpen size={30} color="#4caf50" /> },
    // { title: "Accounts", value: "user-created", icon: <FaWallet size={30} color="#2196f3" /> },
    // {title: "Account Categories", value: "account-categories", icon: <FaLayerGroup size={30} color="#4c9bafff" />},
    // { title: "Payments", value: "Transaction", icon: <FaMoneyCheckAlt size={30} color="#4caf50" />},
    // { title: "Investment", value: "Transaction", icon: <FaPiggyBank size={30} color="#4caf50" />},
    
  ];

  const allCardsRoute = {
    "Raw Material Reports": "/rm-invoice-detail",
    "Raw Material": "/rm-stock",
    "Purchase Invoice": "/purchase",
    "Finished Product Sales": "/fp-sale-list",
    "Finished Product Sale Returns": "/fp-salereturn-list",
    "Customers Detail": "/customers",
    "Suppliers Detail": "/suppliers",
    "Employees Detail": "/employees",
    "Transactions History": "/transactions",
    "Add Raw Materials": "/add-materials",
    "Purchase": "/rm-purchase",
    "Purchase Return": "/rm-return",
    "Sale": "/rm-sale",
    "Shops Detail": "/shops",
    "Sale Return": "/rm-sale-return",
    "Create Recipe": "/recipe",
    "Create Product": "/production",
    "Accounts": "/accounts",
    "Payments": "/payments-list",
    "Investment": "/investment-list",
    "Account Categories": "/account-categories",
  };

  const logOut = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("user");
    navigate('/');
  };

  return (
    <div>
      <MainLayout />
      <div className="dashboard ">
        <div className="dashboard-title">Dashboard</div>

        <div className="dashboard-content">
        {/* 📊 Charts Section */}
<div className="chart-section ">
  {/* 🟩 Professional Bar Chart */}
<div className="chart-box">
  <h3>Raw Material vs Finished Product Sales</h3>
  <ResponsiveContainer width="100%" height={280}>
    <BarChart
      data={barChartData}
      margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
      barGap={10} // Bars ke darmiyan thora gap
    >
      <defs>
        {/* Green Gradient for Raw Material */}
        <linearGradient id="barGradientGreen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#66bb6a" stopOpacity={1}/>
          <stop offset="100%" stopColor="#43a047" stopOpacity={1}/>
        </linearGradient>
        
        {/* Red Gradient for Finished Product */}
        <linearGradient id="barGradientRed" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef5350" stopOpacity={1}/>
          <stop offset="100%" stopColor="#e53935" stopOpacity={1}/>
        </linearGradient>
      </defs>

      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
      <XAxis 
        dataKey="name" 
        axisLine={false} 
        tickLine={false} 
        tick={{fill: '#666', fontSize: 12}} 
      />
      <YAxis 
        axisLine={false} 
        tickLine={false} 
        tick={{fill: '#666', fontSize: 12}} 
      />
      <Tooltip 
        cursor={{fill: '#f8f9fa'}} 
        contentStyle={{borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
      />
      <Legend iconType="circle" wrapperStyle={{paddingTop: '10px'}} />

      {/* Rounded Bars with Gradients */}
      <Bar 
        dataKey="rawMaterial" 
        fill="url(#barGradientGreen)" 
        barSize={40} 
        radius={[10, 10, 0, 0]} // Sirf top corners round
      />
      <Bar 
        dataKey="finishedProductSales" 
        fill="url(#barGradientRed)" 
        barSize={40} 
        radius={[10, 10, 0, 0]} 
      />
    </BarChart>
  </ResponsiveContainer>
</div>

  {/* 📈 Line Chart */}
  <div className="chart-box" >
    <h3>Sales & Purchases Trend</h3>
    <ResponsiveContainer width="800" height={280} className='chart-color'> 
      <LineChart
        data={lineChartData}
        margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="sales" stroke="#f44336" strokeWidth={2} />
        <Line type="monotone" dataKey="purchases" stroke="#4caf50" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  </div>
</div>

{/* 📋 Quick Stats Section */}
<div className="stats-grid">
  {/* 1. Revenue Card */}
  <div className="stat-card blue">
    <div className="stat-icon">💰</div>
    <div className="stat-info">
      <p>Total Revenue</p>
      <h3>Rs. {stats.revenue.toLocaleString()}</h3>
    </div>
  </div>
  
  {/* 2. Net Profit (Revenue - Expense) */}
  <div className="stat-card green">
    <div className="stat-icon">📈</div>
    <div className="stat-info">
      <p>Net Profit</p>
      <h3 style={{ color: stats.profit >= 0 ? '#4caf50' : '#f44336' }}>
        Rs. {stats.profit.toLocaleString()}
      </h3>
    </div>
  </div>

  {/* 3. Total Expenses Card */}
  <div className="stat-card orange">
    <div className="stat-icon">💸</div>
    <div className="stat-info">
      <p>Total Expenses</p>
      <h3>Rs. {stats.expenses.toLocaleString()}</h3>
    </div>
  </div>

  {/* 4. Total Equity Card */}
  <div className="stat-card purple">
    <div className="stat-icon">🏦</div>
    <div className="stat-info">
      <p>Total Equity</p>
      <h3>Rs. {stats.equity.toLocaleString()}</h3>
    </div>
  </div>
</div>

{/* --- Area Chart with Gradients --- */}
{/* --- Area Chart with Gradients --- */}
<div className="bottom-chart-section">
  <div className="chart-box full-width">
    <h3>Revenue vs Expenses Trend</h3>
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={trendData}>
        <defs>
          {/* Green Gradient for Sales */}
          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4caf50" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#4caf50" stopOpacity={0}/>
          </linearGradient>
          
          {/* Red Gradient for Purchases */}
          <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f44336" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#f44336" stopOpacity={0}/>
          </linearGradient>
        </defs>
        
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
        <XAxis 
          dataKey="date" 
          tickFormatter={(str) => {
            // Agar date "2026-01-15" hai to usey "Jan 15" dikhane ke liye
            const date = new Date(str);
            return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
          }}
        />
        <YAxis />
        <Tooltip />
        
        {/* Sales - Green Area */}
        <Area 
          type="monotone" 
          dataKey="sales" 
          stroke="#4caf50" 
          strokeWidth={3} 
          fillOpacity={1} 
          fill="url(#colorSales)" 
          name="Revenue/Sales"
        />
        
        {/* Purchases - Red Area */}
        <Area 
          type="monotone" 
          dataKey="purchases" 
          stroke="#f44336" 
          strokeWidth={3} 
          fillOpacity={1} 
          fill="url(#colorPurchases)" 
          name="Expenses/Purchases"
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
</div>

{/* --- Top Performing Products (Horizontal Bar Chart) --- */}
<div className="top-products-section">
  <div className="chart-box full-width">
    <h3>Top Performing Products</h3>
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        layout="vertical" // Isse chart horizontal ho jayega
        data={trendingProducts}
        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" hide /> 
        <YAxis dataKey="name" type="category" stroke="#666" />
        <Tooltip cursor={{fill: '#f5f5f5'}} />
        {/* Gradient Bars for Products */}
        <Bar dataKey="sales" radius={[0, 10, 10, 0]} barSize={30}>
          {trendingProducts.map((entry, index) => (
          <Cell 
            key={`cell-${index}`} 
            fill={index === 0 ? '#4caf50' : '#81c784'} 
           />
         ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
</div>

{/* --- Top Raw Materials Usage --- */}
<div className="top-materials-section" style={{ marginTop: '20px' }}>
  <div className="chart-box full-width">
    <h3 style={{ color: '#1976d2' }}>High Usage Raw Materials</h3>
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        layout="vertical"
        data={trendingMaterials}
        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" hide />
        <YAxis dataKey="name" type="category" stroke="#666" width={100} />
        <Tooltip cursor={{ fill: '#f5f5f5' }} />
        <Bar dataKey="usage" radius={[0, 10, 10, 0]} barSize={30}>
          {trendingMaterials.map((entry, index) => (
            <Cell key={`cell-m-${index}`} fill={index === 0 ? '#1976d2' : '#64b5f6'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
</div>



        {/* <div className="card-section">
        <div className="card-grid">
          {cards.map((card, index) => (
            <div
              className="dashboard-card"
              key={index}
              onClick={() => {
                const route = allCardsRoute[card.title];
                if (route) navigate(route);
              }}
              style={{ cursor: 'pointer' }}
            >
              <div className="icon-block">{card.icon}</div>
              <div className="content-block">
                <h3>{card.title}</h3>
                <p>{card.value}</p>
              </div>
            </div>
          ))}
        </div>
        </div> */}

        </div>  
      </div>
      <Footer className='footer-dashboard'/>
    </div>
  );
};

export default Dashboard;
