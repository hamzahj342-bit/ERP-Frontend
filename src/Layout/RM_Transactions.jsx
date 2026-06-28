import React from 'react';
import { FaShoppingCart, FaUndo, FaCashRegister, FaPlayCircle, FaExchangeAlt, FaArrowRight, FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import "../RM_CardLayout.css"
import NavigationBar from '../Components/NavigationBar';
import Footer from '../Components/Footer';

const TransactionCard = ({ title, icon, path, color, navigate, description }) => {
  return (
    <div className="tr-card" onClick={() => navigate(path)}>
      <div className="tr-card-inner">
        <div className="tr-icon-wrapper" style={{ backgroundColor: `${color}15`, color: color }}>
          {icon}
        </div>
        <div className="tr-content">
          <h4 className="tr-title">{title}</h4>
          <p className="tr-description">{description}</p>
        </div>
        <div className="tr-footer-link">
           <span style={{color: color}}>View Records <FaArrowRight /></span>
        </div>
      </div>
      <div className="tr-accent-bar" style={{ backgroundColor: color }}></div>
    </div>
  );
};

const RM_Transactions = () => {
  const navigate = useNavigate();

  const transactionData = [
    { id: 1, title: "RM Purchase", description: "Manage inward stock and invoices.", icon: <FaShoppingCart />, path: "/rm-purchase", color: "#10b981" },
    { id: 2, title: "Purchase Return", description: "Track materials sent back to suppliers.", icon: <FaUndo />, path: "/rm-return", color: "#f59e0b" },
    { id: 3, title: "RM Sale", description: "Manage outward sales and billing.", icon: <FaCashRegister />, path: "/rm-sale", color: "#3b82f6" },
    { id: 4, title: "Sale Return", description: "Manage materials returned by customers.", icon: <FaExchangeAlt />, path: "/rm-sale-return", color: "#ef4444" },
    { 
  id: 5, 
  title: "Opening Stock Entry", 
  description: "Initialize startup inventory and setup opening stock balances for new clients.", 
  icon: <FaPlayCircle />, // Startup entries ke liye active initiation icon
  path: "/rm-opening-stock-entry", 
  color: "#6b7280" // Professional Slate Gray color setup/initialization tasks ke liye
}
  ];

  return (
    <div className="page-wrapper">
      <NavigationBar />
      <main className="rm-main-container">
        <div className="rm-content-limit">
          <div className="rm-header" style={{marginTop: '30px'}}>
            <button className="back-btn" onClick={() => navigate('/dashboard')}>
              <FaArrowLeft />
            </button>
            <div className="header-info">
              <h2>Raw Material Transactions</h2>
              <p>Manage all your inward and outward raw material flow</p>
            </div>
          </div>

          <div className="tr-grid-row">
            {transactionData.map(transaction => (
              <TransactionCard 
                key={transaction.id}
                title={transaction.title}
                description={transaction.description}
                icon={transaction.icon}
                path={transaction.path}
                color={transaction.color}
                navigate={navigate}
              />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default RM_Transactions;