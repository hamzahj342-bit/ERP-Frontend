import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaBars, FaUserCircle, FaSignOutAlt, FaHome, FaTruck, FaUserTie,
  FaFileAlt, FaSeedling, FaCubes, FaMoneyBillAlt, FaTools, FaHistory,
  FaExchangeAlt, FaBoxes, FaLayerGroup, FaSlidersH, FaHandshake, FaChartBar, FaUserPlus
} from "react-icons/fa";
import { MdScience } from "react-icons/md";
import "../Bar.css";

const NavigationBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const sidebarRef = useRef(null);

  const isDashboard = location.pathname === "/dashboard";

  useEffect(() => {
    const updateUserData = () => {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (storedUser) setUser(storedUser);
    };

    updateUserData();
    // Jab bhi localStorage update ho (Profile pic change ho), navbar refresh ho jaye
    window.addEventListener("storage", updateUserData);
    return () => window.removeEventListener("storage", updateUserData);
  }, []);

  const logOut = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/");
  };

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
    { type: "link", icon: <FaHome />, label: "Dashboard", path: "/dashboard" },
    { type: "link", icon: <FaHandshake />, label: "Customers", path: "/customers" },
    { type: "link", icon: <FaTruck />, label: "Suppliers", path: "/suppliers" },
    { type: "link", icon: <FaUserTie />, label: "Employees", path: "/employees" },
    { type: "link", icon: <FaSlidersH />, label: "Adjustments", path: "/inventory-adjustment" },
    { type: "link", icon: <FaFileAlt />, label: "Invoice Details", path: "/rm-invoice-detail" },
    {
      type: "heading", label: "RAW MATERIAL", icon: <FaSeedling />,
      children: [
        { icon: <MdScience />, label: "Materials List", path: "/materials-list" },
        { icon: <FaBoxes />, label: "RM Stocks", path: "/rm-stock" },
        { icon: <FaExchangeAlt />, label: "RM Transactions", path: "/rm-transactions" },
      ],
    },
    {
      type: "heading", label: "FINISHED PRODUCT", icon: <FaCubes />,
      children: [
        { icon: <FaTools />, label: "FP Production", path: "/fp-production" },
        { icon: <FaExchangeAlt />, label: "FP Transactions", path: "/fp-transactions" },
        { icon: <FaLayerGroup />, label: "Product Batches", path: "/product-batches" },
        { icon: <FaHistory />, label: "FP History", path: "/finished-products" },
      ],
    },
    {
      type: "heading", label: "CHART OF ACCOUNT", icon: <FaMoneyBillAlt />,
      children: [
        { icon: <FaUserPlus />, label: "Create Account", path: "/accounts-setting" },
        { icon: <FaExchangeAlt />, label: "Transactions", path: "/payment-transactions" },
        { icon: <FaChartBar />, label: "Reports", path: "/reports" },
      ],
    },
  ];

  const renderMenuItem = (item) => {
    if (item.type === "link") {
      return (
        <li key={item.label} onClick={() => navigate(item.path)} className={location.pathname === item.path ? "active" : ""}>
          <span className="icon">{item.icon}</span>
          <span className="label">{item.label}</span>
        </li>
      );
    }
    if (item.type === "heading") {
      return (
        <React.Fragment key={item.label}>
          <li className="sidebar-heading"><span><b>{item.label}</b></span></li>
          {item.children.map((child) => (
            <li key={child.label} onClick={() => navigate(child.path)} className={`nested-link ${location.pathname === child.path ? "active" : ""}`}>
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
      <div className="topbar">
        <div className="left-section">
          <div className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}><FaBars size={22} /></div>
        </div>

        <div className="user-info">
          {/* ✅ DYNAMIC PROFILE IMAGE IN NAVBAR */}
          {user?.profile_image ? (
            <img 
              src={`http://localhost:5000/uploads/${user.profile_image}`} 
              alt="User" 
              className="user-avatar" 
              style={{ width: "35px", height: "35px", borderRadius: "50%", objectFit: "cover", cursor: 'pointer', border: "2px solid #fff" }}
              onClick={() => navigate("/profile")}
            />
          ) : (
            <FaUserCircle size={26} className="user-icon" onClick={() => navigate("/profile")} style={{ cursor: 'pointer' }} />
          )}

          <select className="select-arrow" onChange={(e) => { if (e.target.value === "logout") logOut(); if (e.target.value === "profile") navigate("/profile"); }}>
            <option>{user?.name || "Guest"}</option>
            <option value="profile">Profile</option>
            <option value="logout">Logout</option>
          </select>
        </div>
      </div>

      <div ref={sidebarRef} className={`sidebar ${isDashboard ? "sidebar-static" : ""} ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header"><h2>Menu</h2></div>
        <ul className="sidebar-menu">
          {menuSections.map(renderMenuItem)}
          <li onClick={logOut}><span className="icon"><FaSignOutAlt /></span><span className="label">Logout</span></li>
        </ul>
      </div>
      {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)}></div>}
    </>
  );
};

export default NavigationBar;