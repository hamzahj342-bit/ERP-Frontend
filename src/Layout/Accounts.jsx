import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    FaListAlt, // Icon for Category/List
    FaUserPlus, // Icon for Creating a new Account (Entity/Ledger)
    FaArrowRight, 
    FaArrowLeft,   
} from 'react-icons/fa';
import '../FP_Production.css'; // Assuming you use the same Card.css for consistent styling
import Footer from '../Components/Footer';
import NavigationBar from '../Components/NavigationBar';

// Reusable Card component for Accounts setup
const AccountSetupCard = ({ title, description, icon, path, color }) => {
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
                    Open Form <FaArrowRight />
                </button>
            </div>
        </div>
    );
};

const Accounts = () => {
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
            <h3>💰 Accounts Setup and Management</h3>
            
            <div className="production-cards-grid">
                
                {/* 1. CREATE ACCOUNT CATEGORY CARD */}
                <AccountSetupCard 
                    title="📚 Create Account Category"
                    description="Define major ledger groups (e.g., Assets, Liabilities, Revenue, Expense) for organized reporting."
                    icon={<FaListAlt size={40} />}
                    path="/account-categories" // Route for Category Form
                    color="#FFD700" // Gold/Yellow for Ledger Structure
                />

                {/* 2. CREATE ACCOUNT LEDGER CARD */}
                <AccountSetupCard 
                    title="👤 Create New Account (Ledger)"
                    description="Set up individual ledgers (e.g., Bank Account, Cash Account, specific Customer/Supplier Ledger)."
                    icon={<FaUserPlus size={40} />}
                    path="/accounts" // Route for Ledger Form
                    color="#4682B4" // Steel Blue for new Ledger
                />

            </div>
            
            {/* Optional: Yahan aap General Ledger ka link ya koi aur financial summary de sakte hain */}
        </div>
        </div>
        <Footer />
        </>
    );
};

export default Accounts;