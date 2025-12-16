import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    FaArrowRight,
    FaArrowLeft,
    FaMoneyBillWave, // Icon for money/payment/general finance
    FaChartLine, // Icon for investment/growth
} from 'react-icons/fa';
import '../FP_Production.css'; // Assuming you use the same Card.css for consistent styling
import Footer from '../Components/Footer';
import NavigationBar from '../Components/NavigationBar';

// Reusable Card component for Transactions
const TransactionTypeCard = ({ title, description, icon, path, color }) => {
    const navigate = useNavigate();
    
    return (
        // Reusing .production-card class for consistent styling
        <div className="production-card" style={{ borderLeft: `5px solid ${color}` }}>
            <div className="card-header-prod">
                <span className="card-icon-prod" style={{ color: color }}>
                    {icon}
                </span>
                <h3 className="card-title-prod">{title}</h3>
            </div>
            
            <div className="card-body-prod">
                <p>{description}</p>
            </div>
            
            <div className="card-footer-prod">
                <button 
                    className="action-btn" 
                    style={{ backgroundColor: color }}
                    onClick={() => navigate(path)}
                >
                    View Entries <FaArrowRight />
                </button>
            </div>
        </div>
    );
};

const Transactions = () => {
    const navigate = useNavigate();

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
                
                <div className="fp-production-container"> {/* Reusing container class */}
                    <h3>🔄 General Financial Transactions</h3>
                    
                    <div className="production-cards-grid">
                        
                        {/* 1. INVESTMENT TRANSACTIONS CARD */}
                        <TransactionTypeCard 
                            title="📈 Investment Transactions"
                            description="Record transactions related to investments, capital inflows, or major fixed asset purchases (e.g., machinery)."
                            icon={<FaChartLine size={40} />}
                            path="/investment-list" 
                            color="#28a745" // Green for Growth/Inflow
                        />

                        {/* 2. PAYMENT TRANSACTIONS CARD */}
                        <TransactionTypeCard 
                            title="💸 Payment Transactions"
                            description="Record general operational payments, bank transfers, and expenses not covered by specific purchase/sales modules."
                            icon={<FaMoneyBillWave size={40} />}
                            path="/payments" 
                            color="#DC3545" // Red for General Outflow/Expense
                        />

                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
};

export default Transactions;