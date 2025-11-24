import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    FaClipboardList, // For Recipe/Formula
    FaPlus, 
    FaCubes, // For Finished Product
    FaArrowRight ,
    FaArrowLeft,
    FaFlask,
} from 'react-icons/fa';
import '../FP_Production.css'; // Assuming you use the same Card.css as before
import Footer from '../Components/Footer';
import NavigationBar from '../Components/NavigationBar';

const ProductionCard = ({ title, description, icon, path, color }) => {
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
                    Start Action <FaArrowRight />
                </button>
            </div>
        </div>
    );
};

const FP_Production = () => {
    const navigate = useNavigate();
    return (
         <>
    <NavigationBar/>
    <div className="rm-page">
                    <button
                              className="back-btn"
                              style={{ marginTop: "30px" }}
                              onClick={() => navigate("/dashboard")}
                            >
                              <FaArrowLeft/>
                            </button>
        <div className="fp-production-container">
            <h3>🏭 Finished Product Production Management</h3>
            
            <div className="production-cards-grid">
                
                {/* 1. CREATE RECIPE CARD */}
                <ProductionCard 
                    title="📝 Create Recipe & Details"
                    description="Define the Bill of Materials (BOM) for a new Finished Product, including all required Raw Materials and quantities."
                    icon={<FaFlask size={40} />}
                    path="/recipe" // Recipe Creation Route
                    color="#17a2b8" // Cyan/Blue
                />

                {/* 2. CREATE FINISHED PRODUCT CARD */}
                <ProductionCard 
                    title="📦 Create Finished Product"
                    description="Record a production batch using an existing recipe. This consumes RM stock and increases FP stock."
                    icon={<FaCubes size={40} />}
                    path="/production" // Production Record Route
                    color="#28a745" // Green/Success
                />

            </div>
        </div>
        </div>
        <Footer />
        </>
    );
};

export default FP_Production;