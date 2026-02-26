import React from 'react';
import { FaShoppingCart, FaUndo, FaCashRegister, FaExchangeAlt, FaArrowRight, FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import '../RM_CardLayout.css'; 
import NavigationBar from '../Components/NavigationBar';
import Footer from '../Components/Footer';

// TransactionCard component wohi rahega jo aapne RM_Transactions mein istemaal kiya tha
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
        <p className="card-value">₹ {value.toLocaleString()}</p> 
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

const FP_Transactions = () => {
  const navigate = useNavigate();

  // 💡 Data sirf Finished Product Sale aur Sale Return ka hoga
  const transactionData = [
    {
      id: 1,
      title: "Finished Product Sale", // Clear title for the revenue generating activity
      value: 950000, // Placeholder Value
      icon: <FaCashRegister size={30} />, // Cash Register or Shopping Cart
      path: "/fp-sale-list", // Finished Product Sale List Route
      color: "#28a745" // Green for positive cash flow/revenue
    },
    {
      id: 2,
      title: "Finished Product Sale Return", // Money or Stock reversal
      value: 25000, // Placeholder Value
      icon: <FaUndo size={30} />, // Undo or Return Icon
      path: "/fp-salereturn-list", // Finished Product Sale Return List Route
      color: "#dc3545" // Red for reversal/reduction in revenue
    },
  ];

  return (
    <>
      <NavigationBar />
      <div className="rm-page">
        <button
          className="back-btn"
          style={{ marginTop: "30px" }}
          onClick={() => navigate("/dashboard")}
        >
          <FaArrowLeft />
        </button>
    <div className="rm-transactions-container"> {/* Container class can be reused or renamed */}
      <h3>Finished Product Transactions Summary</h3>
      
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
      
      {/* Agar zarurat ho toh yahan koi aur table ya summary component add kar sakte hain */}
    </div>
    </div>
    <Footer />
    </>
  );
};

export default FP_Transactions;