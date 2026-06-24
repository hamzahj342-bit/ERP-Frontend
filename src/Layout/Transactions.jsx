import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    FaArrowRight,
    FaArrowLeft,
    FaMoneyBillWave, // General Voucher Icon
    FaWallet,        // Cash Voucher Icon
    FaUniversity,    // Bank Voucher Icon
} from 'react-icons/fa';
import '../FP_Production.css'; 
import Footer from '../Components/Footer';
import NavigationBar from '../Components/NavigationBar';

// Reusable Card component for Transactions
const TransactionTypeCard = ({ title, description, icon, path, color }) => {
    const navigate = useNavigate();
    
    return (
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
                
                <div className="fp-production-container"> 
                    <h3>🔄 General Financial Transactions</h3>
                    
                    <div className="production-cards-grid">
                        
                        {/* 1. CASH VOUCHERS CARD */}
                        <TransactionTypeCard 
                            title="💵 Cash Vouchers"
                            description="Manage Cash Payment Vouchers (CPV) and Cash Receipt Vouchers (CRV) for standard daily cash transactions."
                            icon={<FaWallet size={40} />}
                            path="/cash-vouchers-list" // 🌟 Apne react router path ke mutabiq name adjust kar lein
                            color="#198754" // Green for Cash Management
                        />

                        {/* 2. BANK VOUCHERS CARD */}
                        <TransactionTypeCard 
                            title="🏦 Bank Vouchers"
                            description="Manage Bank Payment Vouchers (BPV) and Bank Receipt Vouchers (BRV) for cheque, online transfer, and bank ledger records."
                            icon={<FaUniversity size={40} />}
                            path="/bank-vouchers-list" // 🌟 Apne react router path ke mutabiq name adjust kar lein
                            color="#0d6efd" // Blue for Corporate Bank Operations
                        />

                        {/* 3. GENERAL VOUCHER (JOURNAL VOUCHER) CARD */}
                        <TransactionTypeCard 
                            title="💸 General Voucher (JV)"
                            description="Record general operational journal entries, non-cash adjustments, and multi-ledger reconciliation entries."
                            icon={<FaMoneyBillWave size={40} />}
                            path="/payments-list" // Wahi path jo aap pehle use kar rahe thay (General Voucher List)
                            color="#DC3545" // Red Color
                        />

                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
};

export default Transactions;