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
  const sidebarRef = useRef(null);

  // ✅ Vite Environment Variable for Image Base URL
  const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL || "http://localhost:5000";

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const isDashboard = location.pathname === "/dashboard";

  useEffect(() => {
    const updateUserData = () => {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    };

    window.addEventListener("storage", updateUserData);
    const interval = setInterval(updateUserData, 2000); 

    return () => {
      window.removeEventListener("storage", updateUserData);
      clearInterval(interval);
    };
  }, []);

  const logOut = () => {
    localStorage.clear();
    navigate("/");
  };

  // Sidebar outside click
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
        <li key={item.label} onClick={() => { navigate(item.path); setSidebarOpen(false); }} className={location.pathname === item.path ? "active" : ""}>
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
            <li key={child.label} onClick={() => { navigate(child.path); setSidebarOpen(false); }} className={`nested-link ${location.pathname === child.path ? "active" : ""}`}>
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
          <div className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <FaBars size={22} />
          </div>
        </div>

        <div className="user-info">
          {/* ✅ Dynamic Image Path with Fallback Logic */}
          <div className="avatar-wrapper" onClick={() => navigate("/profile")} style={{ cursor: 'pointer' }}>
            {user?.profile_image ? (
              <img 
                src={`${IMAGE_BASE_URL}/uploads/${user.profile_image}`} 
                alt="Profile" 
                className="user-avatar" 
                style={{ width: "35px", height: "35px", borderRadius: "50%", objectFit: "cover", border: "2px solid #fff" }}
                onError={(e) => {
                   // Agar image load na ho (invalid path), to hide karke icon dikhayein
                   e.target.onerror = null; 
                   e.target.src = "https://via.placeholder.com/35?text=U"; 
                }}
              />
            ) : (
              <FaUserCircle size={28} className="user-icon" style={{ color: 'white' }} />
            )}
          </div>

          <select 
            className="select-arrow" 
            value="" 
            onChange={(e) => { 
              if (e.target.value === "logout") logOut(); 
              if (e.target.value === "profile") navigate("/profile"); 
            }}
          >
            {/* ✅ Priority: username > name > default "User" */}
            <option value="" disabled hidden>
              {user?.username || user?.name || "User"}
            </option>
            <option value="profile">My Profile</option>
            <option value="logout">Logout</option>
          </select>
        </div>
      </div>

      <div ref={sidebarRef} className={`sidebar ${isDashboard ? "sidebar-static" : ""} ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header"><h2>ERP Menu</h2></div>
        <ul className="sidebar-menu">
          {menuSections.map(renderMenuItem)}
          <li onClick={logOut} style={{marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.2)'}}>
            <span className="icon"><FaSignOutAlt /></span>
            <span className="label">Logout</span>
          </li>
        </ul>
      </div>
      {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)}></div>}
    </>
  );
};

export default NavigationBar;