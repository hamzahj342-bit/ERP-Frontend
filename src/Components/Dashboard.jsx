import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdScience } from 'react-icons/md';
import {
  FaStore,
  FaCalendarAlt // Date icon ke liye
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

  // 🗓️ Date Logic for Filter
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const year = now.getFullYear();

  const month = String(now.getMonth() + 1).padStart(2, '0');

  const firstDay = `${year}-${month}-01`;
  console.log(firstDay);

  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(today);

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
    const fetchDashboardData = async () => {
      try {
        const params = { fromDate, toDate }; // API ko dates bhej rahe hain

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

        const bar = await api.get('/dashboard/bar-chart', { params });
        setBarChartData(bar.data);

        const line = await api.get('/dashboard/line-chart', { params });
        setLineChartData(line.data);

        const statsRes = await api.get('/dashboard/stats-cards', { params });
        setStats(statsRes.data);

        const trend = await api.get('/dashboard/revenue-expense-trend', { params });
        setTrendData(trend.data);

        const trendingData = await api.get('/dashboard/trending-products', { params });
        setTrendingProducts(trendingData.data.products);
        setTrendingMaterials(trendingData.data.materials); 
      } catch (err) {
        console.error("Dashboard data fetch error:", err);
      }
    };

    fetchDashboardData();
  }, [fromDate, toDate]); // Dates change hone par refetch hoga

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

  return (
    <div>
      <MainLayout />
      <div className="dashboard">
       {/* 🗓️ Header with Date Filters */}
        <div className="dashboard-header-flex">
          <div className="dashboard-title">Dashboard</div>
          
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
            {/* <button className="refresh-btn" onClick={fetchDashboardData}>Refresh</button> */}
          </div>
        </div>

        <div className="dashboard-content">

            {/* 📋 Quick Stats Section */}
          <div className="stats-grid">
            <div className="stat-card blue">
              <div className="stat-icon">💰</div>
              <div className="stat-info">
                <p>Total Revenue</p>
                <h3>Rs. {stats.revenue.toLocaleString()}</h3>
              </div>
            </div>
            
            <div className="stat-card green">
              <div className="stat-icon">📈</div>
              <div className="stat-info">
                <p>Net Profit</p>
                <h3 style={{ color: stats.profit >= 0 ? '#4caf50' : '#f44336' }}>
                  Rs. {stats.profit.toLocaleString()}
                </h3>
              </div>
            </div>

            <div className="stat-card orange">
              <div className="stat-icon">💸</div>
              <div className="stat-info">
                <p>Total Expenses</p>
                <h3>Rs. {stats.expenses.toLocaleString()}</h3>
              </div>
            </div>

            <div className="stat-card purple">
              <div className="stat-icon">🏦</div>
              <div className="stat-info">
                <p>Total Equity</p>
                <h3>Rs. {stats.equity.toLocaleString()}</h3>
              </div>
            </div>
          </div>


          {/* 📊 Charts Section */}
          <div className="chart-section ">
            {/* 🟩 Professional Bar Chart */}
            <div className="chart-box">
              <h3>Raw Material vs Finished Product Sales</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barChartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }} barGap={10}>
                  <defs>
                    <linearGradient id="barGradientGreen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#66bb6a" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#43a047" stopOpacity={1}/>
                    </linearGradient>
                    <linearGradient id="barGradientRed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef5350" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#e53935" stopOpacity={1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#666', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#666', fontSize: 12}} />
                  <Tooltip cursor={{fill: '#f8f9fa'}} contentStyle={{borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                  <Legend iconType="circle" wrapperStyle={{paddingTop: '10px'}} />
                  <Bar dataKey="rawMaterial" fill="url(#barGradientGreen)" barSize={40} radius={[10, 10, 0, 0]} />
                  <Bar dataKey="finishedProductSales" fill="url(#barGradientRed)" barSize={40} radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 📈 Line Chart */}
            <div className="chart-box" >
              <h3>Sales & Purchases Trend</h3>
              <ResponsiveContainer width="100%" height={280} className='chart-color'> 
                <LineChart data={lineChartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
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

        

          {/* --- Area Chart with Gradients --- */}
          <div className="bottom-chart-section">
            <div className="chart-box full-width">
              <h3>Revenue vs Expenses Trend</h3>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={trendData}>
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
                  <XAxis dataKey="date" tickFormatter={(str) => {
                    const date = new Date(str);
                    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                  }} />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="sales" stroke="#4caf50" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" name="Revenue/Sales" />
                  <Area type="monotone" dataKey="purchases" stroke="#f44336" strokeWidth={3} fillOpacity={1} fill="url(#colorPurchases)" name="Expenses/Purchases" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* --- Top Performing Products --- */}
          <div className="trending-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
            <div className="chart-box">
              <h3 style={{color : '#2e7d32'}}>Top 5 Selling Products</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart layout="vertical" data={trendingProducts}>
                  <XAxis type="number" hide /> 
                  <YAxis dataKey="name" type="category" width={100} style={{fontSize: '12px'}} />
                  <Tooltip />
                  <Bar dataKey="sales" radius={[0, 5, 5, 0]}>
                    {trendingProducts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#1b5e20' : '#4caf50'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-box">
              <h3 style={{ color: '#1565c0' }}>Top 5 Selling Materials</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart layout="vertical" data={trendingMaterials}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} style={{fontSize: '12px'}} />
                  <Tooltip />
                  <Bar dataKey="sales" radius={[0, 5, 5, 0]}>
                    {trendingMaterials.map((entry, index) => (
                      <Cell key={`cell-m-${index}`} fill={index === 0 ? '#0d47a1' : '#2196f3'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>


        </div>  
      </div>
      <Footer/>
    </div>
  );
};

export default Dashboard;