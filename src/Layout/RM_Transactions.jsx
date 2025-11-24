import React from 'react';
import { FaShoppingCart, FaUndo, FaCashRegister, FaExchangeAlt, FaArrowRight, FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import "../RM_Transactions.css"
import NavigationBar from '../Components/NavigationBar';
import Footer from '../Components/Footer';

const TransactionCard = ({ title, value, icon, path, color, navigate }) => {
  return (
    <div className="transaction-card" style={{ borderLeft: `5px solid ${color}` }}>
      <div className="card-header">
        <span className="card-icon" style={{ color: color }}>
          {icon}
        </span>
        <h3 className="card-title">{title}</h3>
      </div>
      {/* <div className="card-body">
        <p className="card-value">{value.toLocaleString()}</p> 
        {/* Assume value is a number, showing a placeholder value here 
      </div> */}
      <div className="card-footer">
        <button 
          className="view-btn" 
          style={{ backgroundColor: color }}
          onClick={() => navigate(path)}
        >
          View Details <FaArrowRight />
        </button>
      </div>
    </div>
  );
};

const RM_Transactions = () => {
  const navigate = useNavigate();

  // 💡 Placeholder Data: Aapko yeh data actual API calls se fetch karna hoga
  const transactionData = [
    {
      id: 1,
      title: "RM Purchase (Inward)",
      value: 55000,
      icon: <FaShoppingCart size={30} />,
      path: "/rm-purchase", // Is path par purchase entries show hongi
      color: "#28a745" // Green for inflow
    },
    {
      id: 2,
      title: "RM Purchase Return",
      value: 15000,
      icon: <FaUndo size={30} />,
      path: "/rm-return", // Is path par return entries show hongi
      color: "#ffc107" // Yellow for partial reversal
    },
    {
      id: 3,
      title: "RM Sale (Outward)",
      value: 80000,
      icon: <FaCashRegister size={30} />,
      path: "/rm-sale", // Is path par sale entries show hongi
      color: "#dc3545" // Red for outflow/sale (ya dark blue for revenue)
    },
    {
      id: 4,
      title: "RM Sale Return",
      value: 5000,
      icon: <FaExchangeAlt size={30} />,
      path: "/rm-sale-return", // Is path par sale return entries show hongi
      color: "#17a2b8" // Cyan for reversal
    },
  ];

  return (
    <>
    <NavigationBar/>
    <div className="rm-page">
                    <button
                              className="back-btn"
                              style={{ marginTop: "30px" }}
                              onClick={() => navigate('/dashboard')}
                            >
                              <FaArrowLeft/>
                            </button>
    <div className="rm-transactions-container">
      <h3>Raw Material Transactions Summary</h3>
      
      <div className="transaction-cards-grid">
        {transactionData.map(transaction => (
          <TransactionCard 
            key={transaction.id}
            title={transaction.title}
            value={transaction.value}
            icon={transaction.icon}
            path={transaction.path}
            color={transaction.color}
            navigate={navigate}
          />
        ))}
      </div>
      
      {/* Yahan aap koi aur table ya summary component add kar sakte hain */}
    </div>
    </div>
    <Footer />
    </>
  );
};

export default RM_Transactions;