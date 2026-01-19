import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationBar from './NavigationBar';
import Footer from './Footer';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaBoxes, FaUserTag } from 'react-icons/fa';
import api from "../../api"; 

const RMStockList = () => {
    const [stock, setStock] = useState([]);
    const [loading, setLoading] = useState(true);
    const [materialFilter, setMaterialFilter] = useState('');
    const [supplierFilter, setSupplierFilter] = useState('');
    
    // 🛑 NEW STATE: View Mode toggle karne ke liye
    // 'entity' = Purana route (/list), 'material' = Naya route (/material-list)
    const [viewMode, setViewMode] = useState('entity'); 

    const navigate = useNavigate();

    // Data Fetching Function (Ab ye viewMode par depend karega)
    const fetchStock = async (mode) => {
        setLoading(true);
        try {
            const endpoint = mode === 'entity' ? "/rm-stock/list" : "/rm-stock/material-list";
            const res = await api.get(endpoint);
            setStock(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching stock:", err);
            toast.error(`Failed to load ${mode} stock data.`);
            setLoading(false);
        }
    };

    // Jab viewMode change ho, data dubara fetch karein
    useEffect(() => {
        fetchStock(viewMode);
        // Reset filters when switching views
        setMaterialFilter('');
        setSupplierFilter('');
    }, [viewMode]);

    // Filtering Logic (No changes needed, handles both data structures)
    const filteredStock = useMemo(() => {
        let currentStock = [...stock];
        if (materialFilter) {
            const lowerCaseFilter = materialFilter.toLowerCase();
            currentStock = currentStock.filter(item => 
                item.material_name && item.material_name.toLowerCase().includes(lowerCaseFilter)
            );
        }
        if (supplierFilter) {
            const lowerCaseFilter = supplierFilter.toLowerCase();
            currentStock = currentStock.filter(item => 
                item.supplier_name && item.supplier_name.toLowerCase().includes(lowerCaseFilter)
            );
        }
        return currentStock;
    }, [stock, materialFilter, supplierFilter]);

    return (
        <>
            <NavigationBar />
            <div className="rm-page">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: "30px" }}>
                    <button className="back-btn" onClick={() => navigate('/dashboard')}>
                        <FaArrowLeft />
                    </button>

                    {/* 🛑 NEW: Toggle Buttons Section */}
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
                    
                    {/* Filters */}
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                        <input
                            type="text"
                            placeholder="Filter by Material"
                            value={materialFilter}
                            onChange={(e) => setMaterialFilter(e.target.value)}
                            className="input"
                        />
                        {/* Hide Supplier Filter in Material-wise view if needed */}
                        {viewMode === 'entity' && (
                            <input
                                type="text"
                                placeholder="Filter by Supplier"
                                value={supplierFilter}
                                onChange={(e) => setSupplierFilter(e.target.value)}
                                className="input"
                            />
                        )}
                    </div>

                    {loading ? (
                        <p>Loading {viewMode} stock data...</p>
                    ) : filteredStock.length === 0 ? (
                        <p>No records found.</p>
                    ) : (
                        <table className="product-table">
                            <thead>
                                <tr>
                                    {/* Stock ID sirf entity-wise mein hota hai */}
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
                                {filteredStock.map((item, index) => (
                                    <tr key={viewMode === 'entity' ? item.stock_id : index}>
                                        {viewMode === 'entity' && <td>{item.stock_id}</td>}
                                        <td>{item.material_name}</td> 
                                        <td>
                                            <span style={{ color: viewMode === 'material' ? '#7f8c8d' : 'inherit' }}>
                                                {item.supplier_name}
                                            </span>
                                        </td> 
                                        <td>{parseFloat(item.avg_unit_cost).toFixed(2)}</td>
                                        <td style={{ color: '#e74c3c' }}>{parseFloat(item.sold_qty).toFixed(2)}</td>
                                        <td>{parseFloat(item.consumed_qty).toFixed(2)}</td>
                                        <td style={{ fontWeight: 'bold', color: '#27ae60' }}>
                                            {parseFloat(item.current_stock).toFixed(2)}
                                        </td> 
                                        <td>{parseFloat(item.current_stock_price).toFixed(2)}</td>
                                        <td>{item.uom_name}</td> 
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
            <Footer />
        </>
    );
};

// Simple inline styles for buttons
const toggleStyles = (isActive) => ({
    padding: '10px 20px',
    cursor: 'pointer',
    backgroundColor: isActive ? '#3498db' : '#ecf0f1',
    color: isActive ? 'white' : '#2c3e50',
    border: '1px solid #bdc3c7',
    borderRadius: isActive ? '5px' : '5px',
    marginRight: '10px',
    fontWeight: 'bold',
    transition: 'all 0.3s ease'
});

export default RMStockList;