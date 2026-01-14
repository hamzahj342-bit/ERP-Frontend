import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    FaSlidersH,      // Main Adjustment Icon
    FaBoxOpen,       // Icon for Raw Materials
    FaCheckDouble,   // Icon for Finished Products
    FaArrowRight, 
    FaArrowLeft,
} from 'react-icons/fa';
import '../FP_Production.css'; 
import Footer from '../Components/Footer';
import NavigationBar from '../Components/NavigationBar';

// Reusable Card Component (Wahi style jo Reports mein tha)
const AdjustmentCard = ({ title, description, icon, path, color }) => {
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
                    Open Adjustment <FaArrowRight />
                </button>
            </div>
        </div>
    );
};

const InventoryAdjustment = () => {
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
                <div style={{ alignItems: 'center', gap: '10px', marginBottom: '20px', textAlign: 'center' }}>
                    <h3 style={{ margin: 0,  }}>Inventory Adjustment & Wastage</h3>
                </div>

                <hr style={{ margin: '20px 0' }} />
                
                <div className="production-cards-grid">
                    
                    {/* 1. RAW MATERIAL ADJUSTMENT CARD */}
                    <AdjustmentCard 
                        title="Raw Material Adjustment"
                        description="Adjust stock for Raw Materials. Use this for wastage, leakage, or manual inventory corrections of RM batches."
                        icon={<FaBoxOpen size={40} />}
                        path="/rm-adjustment" // Is path pe RM form bnega
                        color="#2c3e50" // Dark blue-grey for industrial feel
                    />

                    {/* 2. FINISHED PRODUCT ADJUSTMENT CARD */}
                    <AdjustmentCard 
                        title="Finished Product Adjustment"
                        description="Modify stock for Finished Goods. Record damages, samples, or production count corrections for FP batches."
                        icon={<FaCheckDouble size={40} />}
                        path="/fp-adjustment" // Is path pe FP form bnega
                        color="#8e44ad" // Purple for finished goods
                    />

                </div>
            </div>
        </div>
        <Footer />
        </>
    );
};

export default InventoryAdjustment;