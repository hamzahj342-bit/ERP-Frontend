import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaBars, FaUserCircle, FaSignOutAlt, FaHome, FaBoxOpen, FaUsers,
  FaTruck, FaShoppingCart, FaCashRegister, FaUserPlus,
  FaHistory, FaCog, FaChartBar, FaBoxes,
  FaSeedling, // Example icon for Raw Material
  FaCubes,    // Example icon for Finished Product
  FaMoneyBillAlt, // Example icon for Accounts
  FaExchangeAlt,
  FaChartPie,
  FaIndustry,
  FaTools,
  FaReceipt,
  FaClipboardCheck,
  FaClipboardList,
  FaExclamationCircle,
  FaStackExchange,
  FaUserTie,
  FaUserFriends,
  FaHandshake,
  FaShoppingBag
} from "react-icons/fa";
import "../Bar.css";
import { MdScience } from "react-icons/md";

const NavigationBar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const sidebarRef = useRef(null);

  const isDashboard = location.pathname === "/dashboard";

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) setUser(storedUser);
  }, []);

  const logOut = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("user");
    navigate("/");
  };

  // ✅ Click outside to close sidebar (only for toggle)
  useEffect(() => {
    if (!sidebarOpen) return;

    const handler = (e) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [sidebarOpen]);

const menuSections = [
    // --- TOP LEVEL LINKS (Neutral: White/Light Yellow) ---
    { 
      type: "link", 
      icon: <FaHome  />, // Off-white/Ghost White
      label: "Dashboard", 
      path: "/dashboard" 
    },
    { 
      type: "link", 
      icon: <FaHandshake  />, // Gold Yellow for Customer/Relationship
      label: "Customers", 
      path: "/customers" 
    },
    { 
      type: "link", 
      icon: <FaTruck  />, // Light Blue for Logistics
      label: "Suppliers", 
      path: "/suppliers" 
    },
    { 
      type: "link", 
      icon: <FaUserTie  />, // Khaki Yellow for Employees
      label: "Employees", 
      path: "/employees" 
    },

    // --- RAW MATERIAL (Theme: Green/Cyan for Nature/Stock) ---
    {
      type: "heading",
      label: "RAW MATERIAL",
      icon: <FaSeedling  />, // White for Heading
      children: [
        { icon: <MdScience /> , label: "Add Materials", path: "/add-materials" }, // Light Green for New Entry
        { icon: <FaBoxes />, label: "RM Stocks", path: "/rm-stock" }, // Cyan for Inventory/Stock
        { icon: <FaExchangeAlt /> , label: "RM Transactions", path: "/rm-transactions" }, // Orange-Red for flow/transactions
      ],
    },

    // --- FINISHED PRODUCT (Theme: Blue/Purple for Manufacturing/Output) ---
    {
      type: "heading",
      label: "FINISHED PRODUCT",
      icon: <FaCubes  />, // White for Heading
      children: [
        { icon: <FaTools />, label: "FP Production", path: "/fp-production" }, // Light Steel Blue for process
        { icon: <FaExchangeAlt  />, label: "FP Transactions", path: "/fp-transactions" }, // Orange-Red for flow/transactions
      ],
    },
    
    // --- ACCOUNTS (Theme: Gold/Orange for Money/Finance) ---
    {
      type: "heading",
      label: "ACCOUNTS",
      icon: <FaMoneyBillAlt color="#F8F8FF" />, // White for Heading
      children: [
        { icon: <FaUserPlus  /> ,label: "Create Account", path: "/accounts-setting" }, // Orange for New Finance Entry
        { icon: <FaExchangeAlt  />, label: "Transactions", path: "/transactions" }, // Orange-Red for flow/transactions
        { icon: <FaChartBar  /> , label: "Reports", path: "/cash_register" }, // Goldenrod for Analysis
      ],
    },
  // { 
    //   type: "link", 
    //   icon: <FaCog />, 
    //   label: "Settings", 
    //   path: "/settings" 
    // },
    // { 
    //   type: "link", 
    //   icon: <FaChartBar />, 
    //   label: "Overall Reports", 
    //   path: "/overall_reports" 
    // },
  ];
  // --- END MODIFIED MENU ITEMS ---

  // Function to render menu items or headings
  const renderMenuItem = (item) => {
    if (item.type === "link") {
      return (
        <li
          key={item.label}
          onClick={() => navigate(item.path)}
          className={location.pathname === item.path ? "active" : ""}
        >
          <span className="icon">{item.icon}</span>
          <span className="label">{item.label}</span>
        </li>
      );
    } 
    
    if (item.type === "heading") {
      return (
        <React.Fragment key={item.label}>
          <li className="sidebar-heading">
            {/* <span className="icon">{item.icon}</span> */}
            <span className=""><b>{item.label}</b></span>
          </li>
          {item.children.map((child) => (
            <li
              key={child.label}
              onClick={() => navigate(child.path)}
              className={`nested-link ${location.pathname === child.path ? "active" : ""}`}
            >
              <span className="icon">{child.icon}</span>
              <span className="label">{child.label}</span>
            </li>
          ))}
        </React.Fragment>
      );
    }
    return null;
  };


  return (
    <>
      {/* ✅ TOP NAVBAR (No change needed here) */}
      <div className="topbar">
        <div className="left-section">
          <div className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <FaBars size={22} />
          </div>
        </div>

        <div className="user-info">
          {user?.profilePic ? (
            <img src={user.profilePic} alt="User" className="user-avatar" />
          ) : (
            <FaUserCircle size={26} className="user-icon" />
          )}

          <select
            className="select-arrow"
            onChange={(e) => {
              if (e.target.value === "logout") logOut();
              if (e.target.value === "profile") navigate("/profile");
            }}
          >
            <option>{user?.username || "Guest"}</option>
            <option value="profile">Profile</option>
            <option value="logout">Logout</option>
          </select>
        </div>
      </div>

      {/* ✅ SIDEBAR (The render logic is changed) */}
      <div
        ref={sidebarRef}
        className={`sidebar ${isDashboard ? "sidebar-static" : ""} ${sidebarOpen ? "open" : ""}`}
      >
        <div className="sidebar-header">
          <h2>Menu</h2>
        </div>

        <ul className="sidebar-menu">
          {/* Use the new menuSections array and render function */}
          {menuSections.map(renderMenuItem)}

          <li onClick={logOut}>
            <span className="icon"><FaSignOutAlt /></span>
            <span className="label">Logout</span>
          </li>
        </ul>
      </div>

      {sidebarOpen && !isDashboard && <div className="overlay"></div>}
    </>
  );
};

export default NavigationBar;