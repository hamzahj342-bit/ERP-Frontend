import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    FaUserTie,
    FaUsers,
    FaIdCard,
    FaLink,
    FaArrowLeft, 
    FaArrowRight 
} from 'react-icons/fa';
import NavigationBar from '../Components/NavigationBar';
import Footer from '../Components/Footer';

const MenuCard = ({ title, description, icon, path, color }) => {
    const navigate = useNavigate();
    
    return (
        <div 
            className="card shadow-sm border-0 rounded-3 p-4 d-flex flex-column justify-content-between"
            style={{ 
                borderLeft: `5px solid ${color}`,
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                backgroundColor: '#ffffff',
                minHeight: '220px'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 .125rem .25rem rgba(0,0,0,0.075)';
            }}
        >
            <div>
                <div className="d-flex align-items-center gap-3 mb-3">
                    <span style={{ color: color, display: 'flex', alignItems: 'center' }}>
                        {icon}
                    </span>
                    <h5 className="card-title fw-bold m-0 text-dark" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                        {title}
                    </h5>
                </div>
                <p className="card-text text-muted small lh-base" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    {description}
                </p>
            </div>
            
            <div className="mt-4">
                <button 
                    className="btn w-100 text-white fw-bold d-flex align-items-center justify-content-center gap-2 rounded-2" 
                    style={{ backgroundColor: color, border: 'none', padding: '10px' }}
                    onClick={() => navigate(path)}
                >
                    Open Ledger <FaArrowRight size={14} />
                </button>
            </div>
        </div>
    );
};

const EntityLedgerMenu = () => {
    const navigate = useNavigate();

    return (
        <>
            <NavigationBar />
            <div className="bg-light min-vh-100 py-5">
                <div className="container-xl">

                    {/* Page Header */}
                    <div className="row justify-content-center text-center mb-4">
                     <div className="">
                            <button
                                className="back-btn mt-4"
                                
                                onClick={() => navigate('/reports')}
                            >
                                <FaArrowLeft />
                            </button>
                        </div>
                        <div className="col-10 col-md-8 col-lg-6">
                            <h2 className="fw-bold text-primary mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                                📜 Entity Ledger Reports
                            </h2>
                            <p className="text-muted" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                                Select a specialized ledger category below to analyze transactional histories and running balances.
                            </p>
                        </div>
                    </div>
                    
                    {/* 4 Column CSS Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '16px',
                        alignItems: 'stretch'
                    }}>
                        <MenuCard 
                            title="Suppliers Ledger"
                            description="Track purchase invoices, raw material procurement entries, payments made, and current outstanding balances for your suppliers (A/P)."
                            icon={<FaUserTie size={32} />}
                            path="/ledgers/suppliers"
                            color="#1a73e8"
                        />
                        <MenuCard 
                            title="Customers Ledger"
                            description="Monitor sales invoices, dispatched orders, payment receipts, and overall accounts receivable balances for your buyers (A/R)."
                            icon={<FaUsers size={32} />}
                            path="/ledgers/customers"
                            color="#00A86B"
                        />
                        <MenuCard 
                            title="Employees Ledger"
                            description="Manage staff ledger records, payroll disbursements, advance payments, salary deductions, and outstanding salary liabilities."
                            icon={<FaIdCard size={32} />}
                            path="/ledgers/employees"
                            color="#e05e00"
                        />
                        <MenuCard 
                            title="Linked Entity Ledger"
                            description="Exclusively view and balance consolidated statements for unique business entities that act as both active Customers and Suppliers."
                            icon={<FaLink size={32} />}
                            path="/ledgers/linked-entities"
                            color="#6f42c1"
                        />
                    </div>

                </div>
            </div>
            <Footer />
        </>
    );
};

export default EntityLedgerMenu;