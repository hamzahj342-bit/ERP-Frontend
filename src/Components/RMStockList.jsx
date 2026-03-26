import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationBar from './NavigationBar';
import Footer from './Footer';
import Pagination from './Pagination';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaBoxes, FaUserTag } from 'react-icons/fa';
import api from "../../api"; 

const RMStockList = () => {
    const [stock, setStock] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Search States (As per your FinishedProductList logic)
    const [searchTerm, setSearchTerm] = useState(""); 
    const [debouncedSearch, setDebouncedSearch] = useState(""); 

    // View Mode & Pagination
    const [viewMode, setViewMode] = useState('entity');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const navigate = useNavigate();

    // 1. Native Debounce Logic (Matches your FinishedProductList)
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(1); // Reset to page 1 on new search
        }, 500);

        return () => clearTimeout(handler);
    }, [searchTerm]);

    // 2. Fetch Function
    const fetchStock = async () => {
        setLoading(true);
        try {
            const endpoint = viewMode === 'entity' ? "/rm-stock/list" : "/rm-stock/material-list";
            const res = await api.get(endpoint, { 
                params: { 
                    page: page, 
                    limit: 50, 
                    search: debouncedSearch // Use debounced value here
                } 
            });
            if (res.data && res.data.data) {
                setStock(res.data.data);
                setTotalPages(res.data.totalPages || 1);
            } else {
                setStock([]);
                setTotalPages(1);
            }
        } catch (err) {
            console.error("Error fetching stock:", err);
            toast.error(`Failed to load data.`);
        } finally {
            setLoading(false);
        }
    };

    // 3. Fetch when page, debounced search or view mode changes
    useEffect(() => {
        fetchStock();
    }, [page, debouncedSearch, viewMode]);

    // Reset logic when switching view modes
    useEffect(() => {
        setSearchTerm("");
        setPage(1);
    }, [viewMode]);

    return (
        <>
            <NavigationBar />
            <div className="rm-page">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: "30px" }}>
                    <button className="back-btn" onClick={() => navigate('/dashboard')}>
                        <FaArrowLeft />
                    </button>

                    <div className="view-toggle-buttons">
                        <button 
                            className={`toggle-btn ${viewMode === 'entity' ? 'active' : ''}`}
                            onClick={() => setViewMode('entity')}
                            style={toggleStyles(viewMode === 'entity')}
                        >
                            <FaUserTag /> Entity-wise Stock
                        </button>
                        <button 
                            className={`toggle-btn ${viewMode === 'material' ? 'active' : ''}`}
                            onClick={() => setViewMode('material')}
                            style={toggleStyles(viewMode === 'material')}
                        >
                            <FaBoxes /> Material-wise Stock
                        </button>
                    </div>
                </div>

                <div className="rm-card">
                    <h2>Raw Material Stock ({viewMode === 'entity' ? 'By Supplier' : 'By Material Summary'})</h2>
                    
                    {/* Search Input - Using your preferred design */}
                    <div style={{ marginBottom: '20px' }}>
                        <input
                            type="text"
                            placeholder={viewMode === 'entity' ? "Search by material or supplier..." : "Filter by Material..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input"
                        />
                    </div>

                    {loading ? (
                        <p style={{ textAlign: 'center', padding: '20px' }}>Loading data...</p>
                    ) : (
                        <>
                          <table className="product-table">
                              <thead>
                                  <tr>
                                      {viewMode === 'entity' && <th>Stock ID</th>}
                                      <th>Material Name</th>
                                      <th>Supplier</th>
                                      <th>Avg Unit Cost</th>
                                      <th>Sold Qty</th>
                                      <th>Consumed Qty</th>
                                      <th>Current Stock</th>
                                      <th>Total Price</th>
                                      <th>UOM</th> 
                                  </tr>
                              </thead>
                              <tbody>
                                  {stock.length > 0 ? stock.map((item, index) => (
                                      <tr key={viewMode === 'entity' ? item.stock_id : index}>
                                          {viewMode === 'entity' && <td>#{item.stock_id}</td>}
                                          <td>{item.material_name}</td> 
                                          <td>
                                              <span style={{ color: viewMode === 'material' ? '#7f8c8d' : 'inherit' }}>
                                                  {item.supplier_name}
                                              </span>
                                          </td> 
                                          <td>{parseFloat(item.avg_unit_cost || 0).toFixed(2)}</td>
                                          <td style={{ color: '#e74c3c' }}>{parseFloat(item.sold_qty || 0).toFixed(2)}</td>
                                          <td>{parseFloat(item.consumed_qty || 0).toFixed(2)}</td>
                                          <td style={{ fontWeight: 'bold', color: '#27ae60' }}>
                                              {parseFloat(item.current_stock || 0).toFixed(2)}
                                          </td> 
                                          <td>{parseFloat(item.current_stock_price || 0).toFixed(2)}</td>
                                          <td>{item.uom_name}</td> 
                                      </tr>
                                  )) : (
                                      <tr>
                                          <td colSpan={viewMode === 'entity' ? 9 : 8} style={{ textAlign: 'center' }}>
                                              No records found.
                                          </td>
                                      </tr>
                                  )}
                              </tbody>
                          </table>

                          {totalPages > 1 && (
                            <div style={{ marginTop: '20px' }}>
                                <Pagination 
                                    page={page} 
                                    totalPages={totalPages} 
                                    onPageChange={(newPage) => setPage(newPage)} 
                                />
                            </div>
                          )}
                        </>
                    )}
                </div>
            </div>
            <Footer />
        </>
    );
};

const toggleStyles = (isActive) => ({
    padding: '10px 20px',
    cursor: 'pointer',
    backgroundColor: isActive ? '#3498db' : '#ecf0f1',
    color: isActive ? 'white' : '#2c3e50',
    border: '1px solid #bdc3c7',
    borderRadius: '5px',
    marginRight: '10px',
    fontWeight: 'bold',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
});

export default RMStockList;