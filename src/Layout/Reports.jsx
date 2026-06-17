import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    FaFileInvoiceDollar, // Icon for Entity Ledger/Invoice Report
    FaChartLine,        // Icon for Profit & Loss / Performance
    FaArrowRight, 
    FaArrowLeft,
    FaBalanceScale,    // Icon for Capital & Net Worth Report
    FaBookOpen,       // Icon for Trial Balance Report
    FaChartBar         // Icon for Segmented Profit & Loss Report

} from 'react-icons/fa';
import { MdPrecisionManufacturing, MdInventory } from 'react-icons/md';
import '../FP_Production.css'; // Assuming you use the same Card.css for consistent styling
import Footer from '../Components/Footer';
import NavigationBar from '../Components/NavigationBar';

// Reusable Card component for Reports
const ReportCard = ({ title, description, icon, path, color }) => {
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
                    View Report <FaArrowRight />
                </button>
            </div>
        </div>
    );
};

const Reports = () => {
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
                <h3>📈 Financial Reports</h3>
                
                <div className="production-cards-grid">
                    
                    {/* 1. ENTITY LEDGER REPORT CARD */}
                    <ReportCard 
                        title="📜 Entity Ledger Report"
                        description="View detailed transactional history and running balances for a specific Customer (A/R) or Supplier (A/P)."
                        icon={<FaFileInvoiceDollar size={40} />}
                        path="/entity-ledger" // Assuming this is your target route
                        color="#00A86B" // Green for Money Tracking
                    />

                    {/* 2. PROFIT & LOSS REPORT CARD */}
                    <ReportCard 
                        title="💰 Profit & Loss Report"
                        description="Calculate your financial performance over a period by comparing Revenues against Expenses (Income Statement)."
                        icon={<FaChartLine size={40} />}
                        path="/profit-loss" // Assuming this is your target route
                        color="#CC5500" // Orange/Brown for Financial Statement
                    />

                    <ReportCard 
                        title="💰 Accounts Report"
                        description="Calculate your financial performance over a period by comparing Revenues against Expenses (Income Statement)."
                        icon={<FaChartLine size={40} />}
                        path="/accounts-report" // Assuming this is your target route
                        color="#00a3ccff" // Orange/Brown for Financial Statement
                    />

                    <ReportCard 
                       title="📊 Sales Detail Report"
                       description="Analyze your sales performance by Customer and Items. Track both Finished Products and Raw Material sales in one place."
                       icon={<FaFileInvoiceDollar size={40} />}
                       path="/sales-report" // Jo bhi aapka route name hai
                       color="#4caf50" // Professional Green color for Sales/Growth
                    />
                    
                    <ReportCard 
                       title="🏭 Production Analytics Report"
                       description="Monitor manufacturing output and material consumption. Track finished goods produced and raw materials utilized per batch."
                       icon={<MdPrecisionManufacturing size={40} />}
                       path="/production-report" 
                       color="#3f51b5" // Professional Indigo/Blue color for Manufacturing/Industry
                     />
                    {/* Add more reports here if needed, e.g., Trial Balance, Balance Sheet */}

                    <ReportCard 
                       title="📦 Inventory & Stock Report"
                       description="Real-time tracking of Raw Materials and Finished Goods. Monitor current stock levels, average unit costs, and warehouse availability."
                       icon={<MdInventory size={40} />}
                       path="/stock-report" 
                       color="#10b981" // Professional Emerald/Green color for Inventory & Growth
                    />


                    <ReportCard 
  title="💰 Balance Summary"
  description="View real-time closing balances for Customers, Suppliers, and Employees. Track Receivables and Payables at a glance."
  icon={<FaFileInvoiceDollar size={40} />} 
  path="/entity-balance-report" 
  color="#3f51b5" 
/>

<ReportCard 
   title="⚖️ Capital & Net Worth Report"
   description="Comprehensive statement of owner's equity using the structural balance equation (Assets - Liabilities). Monitor real-time enterprise net worth and capital reserves."
   icon={<FaBalanceScale size={40} />}
   path="/capital-report" 
   color="#0d47a1" // Professional Deep Blue color for Financial Structure, Capital & Equity
/>

<ReportCard 
   title="📊 Detailed Trial Balance"
   description="Comprehensive ledger audit statement displaying Opening Balances, Period Debit/Credit Transactions, and Final Closing Balances across all chart of accounts."
   icon={<FaBookOpen size={40} />}
   path="/trial-balance" 
   color="#495057" // Professional Dark Charcoal/Slate gray for accounting ledgers and balancing metrics
/>

<ReportCard 
   title="📈 Segmented Profit & Loss Report"
   description="Analyze profitability by different segments, products, or regions. Identify top-performing areas and optimize resource allocation."
   icon={<FaChartBar size={40} />}
   path="/segmented-profit-loss" 
   color="#ff9800" // Professional Amber/Orange color for Performance & Analytics
/>

                </div>
            </div>
        </div>
        <Footer />
        </>
    );
};

export default Reports;