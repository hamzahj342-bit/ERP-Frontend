import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdScience } from 'react-icons/md';
import {
  FaBoxes, FaBoxOpen, FaChartLine, FaShoppingCart, FaCashRegister, FaUsers,
  FaTruck, FaUndoAlt, FaCartPlus, FaExchangeAlt, FaCartArrowDown, FaFlask,
  FaStore, FaHistory,FaWallet, FaMoneyCheckAlt, FaMoneyBillWave,
  FaPiggyBank,
  FaLayerGroup,
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
  {/* 🟩 Bar Chart */}
  <div className="chart-box">
    <h3>Raw Material vs Finished Product Sales</h3>
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={barChartData}
        margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="rawMaterial" fill="#4caf50" barSize={100} />
        <Bar dataKey="finishedProductSales" fill="#f44336" barSize={100} />
      </BarChart>
    </ResponsiveContainer>
  </div>

  {/* 📈 Line Chart */}
  <div className="chart-box">
    <h3>Sales & Purchases Trend</h3>
    <ResponsiveContainer width="100%" height={280} className='chart-color'> 
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



        <div className="card-section">
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
        </div>
        </div>
          
      </div>
      <Footer className='footer-dashboard'/>
    </div>
  );
};

export default Dashboard;
