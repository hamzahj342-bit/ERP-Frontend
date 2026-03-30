import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationBar from '../Components/NavigationBar'; 
import Footer from '../Components/Footer';           
import Pagination from '../Components/Pagination';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaBoxes, FaUserTag, FaSearch, FaWarehouse } from 'react-icons/fa';
import api from "../../api"; 
import "../css/RM/RMStockList.css"; // CSS Import

const RMStockList = () => {
    const [stock, setStock] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(""); 
    const [debouncedSearch, setDebouncedSearch] = useState(""); 
    const [viewMode, setViewMode] = useState('entity');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const navigate = useNavigate();

    // Debounce Logic
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(1); 
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const fetchStock = async () => {
        setLoading(true);
        try {
            const endpoint = viewMode === 'entity' ? "/rm-stock/list" : "/rm-stock/material-list";
            const res = await api.get(endpoint, { 
                params: { page: page, limit: 50, search: debouncedSearch } 
            });
            if (res.data && res.data.data) {
                setStock(res.data.data);
                setTotalPages(res.data.totalPages || 1);
            } else {
                setStock([]);
                setTotalPages(1);
            }
        } catch (err) {
            toast.error(`Failed to load inventory.`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStock(); }, [page, debouncedSearch, viewMode]);

    useEffect(() => {
        setSearchTerm("");
        setPage(1);
    }, [viewMode]);

    return (
        <div className="page-wrapper">
            <NavigationBar />
            <div className="stock-page-wrapper">
                <div className="stock-container">
                    
                    {/* Header with Back Button & Toggle */}
                    <div className="stock-header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '30px 0px 25px 0px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <button className="back-btn" onClick={() => navigate('/dashboard')}>
                                <FaArrowLeft />
                            </button>
                            <h2 style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>Raw Material Stock</h2>
                        </div>

                        <div className="view-toggle-container">
                            <button className={`view-toggle-btn ${viewMode === 'entity' ? 'active' : ''}`} onClick={() => setViewMode('entity')}>
                                <FaUserTag /> Entity View
                            </button>
                            <button className={`view-toggle-btn ${viewMode === 'material' ? 'active' : ''}`} onClick={() => setViewMode('material')}>
                                <FaBoxes /> Summary View
                            </button>
                        </div>
                    </div>

                    <div className="stock-card-main">
                        {/* Search Bar Section */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FaWarehouse /> {viewMode === 'entity' ? 'Batch-wise Inventory' : 'Total Material Stock'}
                            </h3>
                            <div className="search-box-wrapper" style={{ maxWidth: '350px', marginBottom: 0 }}>
                                <FaSearch className="search-icon-inside" />
                                <input
                                    type="text"
                                    placeholder={viewMode === 'entity' ? "Search Material or Supplier..." : "Filter Materials..."}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="stock-search-input"
                                />
                            </div>
                        </div>

                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}><div className="loader"></div><p>Fetching Stock...</p></div>
                        ) : (
                            <div className="prod-table-container">
                                <table className="stock-table-responsive">
                                    <thead>
                                        <tr>
                                            {viewMode === 'entity' && <th>ID</th>}
                                            <th>Material</th>
                                            {viewMode === 'entity' && <th>Supplier</th>}
                                            <th>Avg Cost</th>
                                            <th style={{ textAlign: 'center' }}>Sold</th>
                                            <th style={{ textAlign: 'center' }}>Consumed</th>
                                            <th style={{ textAlign: 'center' }}>Available</th>
                                            <th>Valuation</th>
                                            <th>UOM</th> 
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stock.length > 0 ? stock.map((item, index) => (
                                            <tr key={viewMode === 'entity' ? item.stock_id : index}>
                                                {viewMode === 'entity' && <td><span style={{color:'#94a3b8', fontSize: '0.8rem'}}>#{item.stock_id}</span></td>}
                                                <td style={{ fontWeight: '600', color: '#1e293b' }}>{item.material_name}</td> 
                                                {viewMode === 'entity' && <td style={{ color: '#475569' }}>{item.supplier_name}</td>}
                                                <td>{parseFloat(item.avg_unit_cost || 0).toFixed(2)}</td>
                                                <td style={{ textAlign: 'center', color: '#ef4444' }}>{parseFloat(item.sold_qty || 0).toFixed(2)}</td>
                                                <td style={{ textAlign: 'center', color: '#f59e0b' }}>{parseFloat(item.consumed_qty || 0).toFixed(2)}</td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span className="stock-qty-bold">{parseFloat(item.current_stock || 0).toFixed(2)}</span>
                                                </td> 
                                                <td style={{ fontWeight: '600' }}>{parseFloat(item.current_stock_price || 0).toFixed(2)}</td>
                                                <td><span className="uom-badge">{item.uom_name}</span></td> 
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No records found for current search.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'center' }}>
                            <Pagination page={page} totalPages={totalPages} onPageChange={(newPage) => setPage(newPage)} />
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default RMStockList;