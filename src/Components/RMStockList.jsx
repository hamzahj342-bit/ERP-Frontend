import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationBar from '../Components/NavigationBar'; 
import Footer from '../Components/Footer';           
import Pagination from '../Components/Pagination';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaBoxes, FaUserTag, FaSearch, FaWarehouse, FaTags } from 'react-icons/fa';
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
    const [categories, setCategories] = useState([]);
    const [activeCategoryId, setActiveCategoryId] = useState(null);
    const [activeCategoryName, setActiveCategoryName] = useState('');
    const [hasPackSizes, setHasPackSizes] = useState(false);
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
            if (viewMode === 'category' && !activeCategoryId) {
                setStock([]);
                setTotalPages(1);
                return;
            }

            let endpoint = "/rm-stock/list";
            const params = { page, limit: 50, search: debouncedSearch };

            if (viewMode === 'material' || viewMode === 'category') {
                endpoint = "/rm-stock/material-list";
            }

            if (viewMode === 'category' && activeCategoryId) {
                params.category_id = activeCategoryId;
            }

            const res = await api.get(endpoint, { params });
            if (res.data && res.data.data) {
                setStock(res.data.data);
                setTotalPages(res.data.totalPages || 1);
                setHasPackSizes(Boolean(res.data.has_pack_sizes));
            } else {
                setStock([]);
                setTotalPages(1);
                setHasPackSizes(false);
            }
        } catch (err) {
            toast.error(`Failed to load inventory.`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStock(); }, [page, debouncedSearch, viewMode, activeCategoryId]);

    useEffect(() => {
        setSearchTerm("");
        setPage(1);
        if (viewMode !== 'category') {
            setActiveCategoryId(null);
            setActiveCategoryName('');
        }
    }, [viewMode]);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await api.get('/material-categories');
                setCategories(res.data);
            } catch (err) {
                toast.error('Failed to load categories');
            }
        };
        fetchCategories();
    }, []);

    const categoryFilteredStock = activeCategoryId ? stock : [];

    // Show Pack Stock only when at least one RM has a pack size defined
    const showPackStock = hasPackSizes || stock.some(
        (item) => Array.isArray(item.pack_breakdown) && item.pack_breakdown.length > 0
    );

    const displayStock = (viewMode === 'category' && activeCategoryId) ? categoryFilteredStock : stock;
    const emptyColSpan = (viewMode === 'entity' ? 8 : 6) + (showPackStock ? 1 : 0);

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
                            <button className={`view-toggle-btn ${viewMode === 'category' ? 'active' : ''}`} onClick={() => setViewMode('category')}>
                                <FaTags /> Category View
                            </button>
                        </div>
                    </div>

                    <div className="stock-card-main">
                        {/* Search Bar Section */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FaWarehouse /> {
                                    viewMode === 'entity'
                                        ? 'Batch-wise Inventory'
                                        : viewMode === 'material'
                                            ? 'Total Material Stock'
                                            : activeCategoryId
                                                ? `Category Stock - ${activeCategoryName}`
                                                : 'Category-Wise Inventory'
                                }
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
                        {viewMode === 'category' && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
                                {categories.length > 0 ? categories.map((category) => (
                                    <button
                                        key={category.id}
                                        className={`view-toggle-btn ${activeCategoryId === category.id ? 'active' : ''}`}
                                        onClick={() => {
                                            setActiveCategoryId(category.id);
                                            setActiveCategoryName(category.name);
                                        }}
                                        style={{ borderRadius: 8, padding: '10px 16px' }}
                                    >
                                        {category.name}
                                    </button>
                                )) : (
                                    <span style={{ color: '#64748b' }}>No categories available.</span>
                                )}
                            </div>
                        )}

                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}><div className="loader"></div><p>Fetching Stock...</p></div>
                        ) : viewMode === 'category' && !activeCategoryId ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                Select a category above to view stock details.
                            </div>
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
                                            {showPackStock && (
                                                <th style={{ textAlign: 'center' }}>Pack Stock</th>
                                            )}
                                            <th>Valuation</th>
                                            <th>UOM</th> 
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayStock.length > 0 ? displayStock.map((item, index) => (
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
                                                {showPackStock && (
                                                    <td style={{ textAlign: 'center', fontSize: '0.9rem', color: '#334155' }}>
                                                        {item.pack_stock_display || '-'}
                                                    </td>
                                                )}
                                                <td style={{ fontWeight: '600' }}>{parseFloat(item.current_stock_price || 0).toFixed(2)}</td>
                                                <td><span className="uom-badge">{item.uom_name}</span></td> 
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={emptyColSpan} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No records found for current search.</td>
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