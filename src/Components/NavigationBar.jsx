import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaBars, FaUserCircle, FaSignOutAlt, FaHome, FaBoxOpen, FaUsers,
  FaTruck, FaShoppingCart, FaCashRegister, FaUserPlus,
  FaHistory, FaCog, FaChartBar
} from "react-icons/fa";
import "../Bar.css";

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

  // ✅ Menu items
  const menuItems = [
    { icon: <FaHome />, label: "Home", path: "/dashboard" },
    { icon: <FaBoxOpen />, label: "Products", path: "/products" },
    { icon: <FaUsers />, label: "Customers", path: "/customers" },
    { icon: <FaTruck />, label: "Suppliers", path: "/suppliers" },
    { icon: <FaShoppingCart />, label: "Purchase", path: "/purchase" },
    { icon: <FaCashRegister />, label: "Sales", path: "/sales" },
    { icon: <FaUserPlus />, label: "Add Entity", path: "/entities" },
    { icon: <FaHistory />, label: "Transactions", path: "/transactions" },
    { icon: <FaCog />, label: "Settings", path: "/settings" },
    { icon: <FaChartBar />, label: "Reports", path: "/reports" },
  ];

  return (
    <>
      {/* ✅ TOP NAVBAR */}
      <div className="topbar">
        <div className="left-section">
          {/* {!isDashboard && ( */}
            <div className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <FaBars size={22} />
            </div>
          {/* )} */}
          {/* <h4 className="logo-text">ERP</h4> */}
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

      {/* ✅ SIDEBAR */}
      <div
        ref={sidebarRef}
        className={`sidebar ${isDashboard ? "sidebar-static" : ""} ${sidebarOpen ? "open" : ""}`}
      >
        <div className="sidebar-header">
          <h2>Menu</h2>
        </div>

        <ul className="sidebar-menu">
          {menuItems.map((item) => (
            <li
              key={item.label}
              onClick={() => navigate(item.path)}
              className={location.pathname === item.path ? "active" : ""}
            >
              <span className="icon">{item.icon}</span>
              <span className="label">{item.label}</span>
            </li>
          ))}
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
