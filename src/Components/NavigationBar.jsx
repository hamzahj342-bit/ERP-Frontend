import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaBars, FaUserCircle, FaSignOutAlt, FaHome, FaTruck, FaUserTie,
  FaFileAlt, FaSeedling, FaCubes, FaMoneyBillAlt, FaTools, FaHistory,
  FaExchangeAlt, FaBoxes, FaLayerGroup, FaSlidersH, FaHandshake, FaChartBar, FaUserPlus, FaFileInvoice, FaBuilding,
  FaStore, FaWarehouse, FaCashRegister, FaUndo, FaShoppingCart
} from "react-icons/fa";
import { MdScience } from "react-icons/md";
import { hasPermission, hasAnyPermission, REPORT_PERMISSION_KEYS } from "../permissions";
import "../Bar.css";

const NavigationBar = () => {
  const navigate = useNavigate();

   // ✅ Vite Environment Variable for Image Base URL
  const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL || "http://localhost:5000";
  // ✅ Smart Image Logic: Cloudinary vs Local
const getProfileImage = () => {
  if (!user?.profile_image) return null;
  console.log("Current Profile Image State:", user.profile_image);


  if (user.profile_image.startsWith("http")) {
    return user.profile_image;
  }


    const cleanFileName = user.profile_image.replace("uploads\\", "").replace("uploads/", "");

    const finalUrl = `${IMAGE_BASE_URL}/uploads/${cleanFileName}`.replace(/\\/g, "/");

    console.log("Fixed URL:", finalUrl); 
    return finalUrl;
};

  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef(null);

 
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
    { type: "link", icon: <FaHome />, label: "Dashboard", path: "/dashboard", perm: "dashboard" },
    { type: "link", icon: <FaHandshake />, label: "Customers", path: "/customers", perm: "customers" },
    { type: "link", icon: <FaTruck />, label: "Suppliers", path: "/suppliers", perm: "suppliers" },
    { type: "link", icon: <FaUserTie />, label: "Employees", path: "/employees", perm: "employees" },
    { type: "link", icon: <FaSlidersH />, label: "Adjustments", path: "/inventory-adjustment", perm: "adjustments" },
    { type: "link", icon: <FaFileAlt />, label: "Invoice Details", path: "/rm-invoice-detail", perm: "invoice_details" },
    {
      type: "heading", label: "RAW MATERIAL", icon: <FaSeedling />,
      children: [
        { icon: <MdScience />, label: "Materials List", path: "/materials-list", perm: "rm.materials_list" },
        { icon: <FaBoxes />, label: "RM Stocks", path: "/rm-stock", perm: "rm.stocks" },
        { icon: <FaFileInvoice />, label: "Goods Received Note", path: "/grn-list", perm: "rm.grn" },
        { icon: <FaFileInvoice />, label: "Delivery Challan", path: "/dc-list", perm: "rm.delivery_challan" },
        { icon: <FaExchangeAlt />, label: "RM Transactions", path: "/rm-transactions", perm: "rm.transactions" },
      ], 
    },
    {
      type: "heading", label: "RETAIL", icon: <FaStore />,
      children: [
        { icon: <FaShoppingCart />, label: "Retail Purchase", path: "/retail/purchases", perm: "retail.transactions" },
        { icon: <FaUndo />, label: "Retail Purchase Return", path: "/retail/purchase-returns", perm: "retail.transactions" },
        { icon: <FaCashRegister />, label: "Retail Sales", path: "/retail/sales", perm: "retail.transactions" },
        { icon: <FaUndo />, label: "Retail Sale Returns", path: "/retail/sale-returns", perm: "retail.transactions" },
      ],
    },
    {
      type: "heading", label: "WHOLESALE", icon: <FaWarehouse />,
      children: [
        { icon: <FaShoppingCart />, label: "Wholesale Purchase", path: "/wholesale/purchases", perm: "wholesale.transactions" },
        { icon: <FaUndo />, label: "Wholesale Purchase Return", path: "/wholesale/purchase-returns", perm: "wholesale.transactions" },
        { icon: <FaCashRegister />, label: "Wholesale Sales", path: "/wholesale/sales", perm: "wholesale.transactions" },
        { icon: <FaUndo />, label: "Wholesale Sale Returns", path: "/wholesale/sale-returns", perm: "wholesale.transactions" },
      ],
    },
    {
      type: "heading", label: "FINISHED PRODUCT", icon: <FaCubes />,
      children: [
        { icon: <FaTools />, label: "FP Production", path: "/fp-production", perm: "fp.production" },
        { icon: <FaExchangeAlt />, label: "FP Transactions", path: "/fp-transactions", perm: "fp.transactions" },
            { icon: <FaFileInvoice />, label: "FP Delivery Challan", path: "/dc-fp-list", perm: "fp.delivery_challan" },
        { icon: <FaLayerGroup />, label: "Product Batches", path: "/product-batches", perm: "fp.product_batches" },
        { icon: <FaHistory />, label: "FP History", path: "/finished-products", perm: "fp.history" },
      ],
    },
    {
      type: "heading", label: "CHART OF ACCOUNT", icon: <FaMoneyBillAlt />,
      children: [
        { icon: <FaUserPlus />, label: "Create Account", path: "/accounts-setting", perm: "accounts.create" },
        { icon: <FaExchangeAlt />, label: "Transactions", path: "/payment-transactions", perm: "accounts.transactions" },
        { icon: <FaChartBar />, label: "Reports", path: "/reports", anyPerm: REPORT_PERMISSION_KEYS },
      ],
    },
    {
      type: "heading", label: "ADMINISTRATION", icon: <FaUserTie />,
      children: [
        { icon: <FaUserPlus />, label: "User Management", path: "/user-management", anyPerm: ["roles.manage", "users.manage"] },
        { icon: <FaBuilding />, label: "Companies", path: "/companies-admin", perm: "users.manage" },
      ],
    },
  ];

  // A menu entry is visible if the user has its required permission
  // (or any of anyPerm, used for the aggregate "Reports" tab).
  const canSee = (item) => {
    if (item.anyPerm) return hasAnyPermission(item.anyPerm);
    return hasPermission(item.perm);
  };

  const renderMenuItem = (item) => {
    if (item.type === "link") {
      if (!canSee(item)) return null;
      return (
        <li key={item.label} onClick={() => { navigate(item.path); setSidebarOpen(false); }} className={location.pathname === item.path ? "active" : ""}>
          <span className="icon">{item.icon}</span>
          <span className="label">{item.label}</span>
        </li>
      );
    }
    if (item.type === "heading") {
      const visibleChildren = item.children.filter(canSee);
      if (visibleChildren.length === 0) return null; // hide empty group heading
      return (
        <React.Fragment key={item.label}>
          <li className="sidebar-heading"><span><b>{item.label}</b></span></li>
          {visibleChildren.map((child) => (
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
  src={getProfileImage()} 
  alt="Profile" 
  className="user-avatar" 
  style={{ width: "35px", height: "35px", borderRadius: "50%", objectFit: "cover", border: "2px solid #fff" }}
  onError={(e) => {
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