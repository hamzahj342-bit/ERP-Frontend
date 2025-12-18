import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationBar from './NavigationBar';
import Footer from './Footer';
import { toast } from 'react-toastify';
import { FaArrowLeft } from 'react-icons/fa';

const RMStockList = () => {
    const [stock, setStock] = useState([]); // Original fetched data
    const [loading, setLoading] = useState(true);
    // 🛑 NEW STATES for Filtering
    const [materialFilter, setMaterialFilter] = useState('');
    const [supplierFilter, setSupplierFilter] = useState('');

    const navigate = useNavigate();

    // ✅ Data Fetching (Runs only once on component mount)
    useEffect(() => {
        const token = localStorage.getItem("token");

        fetch("http://localhost:5000/api/rm-stock/list", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
        .then(res => {
            if (!res.ok) {
                throw new Error("Failed to fetch stock data");
            }
            return res.json();
        })
        .then(data => {
            setStock(data);
            setLoading(false);
        })
        .catch(err => {
            console.error("Error fetching stock:", err);
            toast.error("Failed to load stock data.");
            setLoading(false);
        });
    }, []);
    
    // ✅ Filtering Logic using useMemo
    // This hook recalculates filteredStock only when stock, materialFilter, or supplierFilter changes.
    const filteredStock = useMemo(() => {
        let currentStock = [...stock];

        // 1. Filter by Material Name
        if (materialFilter) {
            const lowerCaseFilter = materialFilter.toLowerCase();
            currentStock = currentStock.filter(item => 
                item.material_name && item.material_name.toLowerCase().includes(lowerCaseFilter)
            );
        }

        // 2. Filter by Supplier Name
        if (supplierFilter) {
            const lowerCaseFilter = supplierFilter.toLowerCase();
            currentStock = currentStock.filter(item => 
                item.supplier_name && item.supplier_name.toLowerCase().includes(lowerCaseFilter)
            );
        }

        return currentStock;
    }, [stock, materialFilter, supplierFilter]);


    if (loading) {
        return <><NavigationBar /><div className="rm-page">Loading Stock...</div><Footer /></>;
    }

    return (
        <>
            <NavigationBar />
            <div className="rm-page">
                <button
                    className="back-btn"
                    style={{ marginTop: "30px" }}
                    onClick={() => navigate('/dashboard')}
                >
                    <FaArrowLeft />
                </button>
                <div className="rm-card">
                    <h2>Raw Material Stock Ledger</h2>
                    
                    {/* 🛑 NEW: Filter Inputs Section */}
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', borderRadius: '5px' }}>
                        
                        {/* Material Name Filter */}
                        <input
                            type="text"
                            placeholder="Filter by Material Name"
                            value={materialFilter}
                            onChange={(e) => setMaterialFilter(e.target.value)}
                            className="input"
                            
                        />

                        {/* Supplier Name Filter */}
                        <input
                            type="text"
                            placeholder="Filter by Supplier Name"
                            value={supplierFilter}
                            onChange={(e) => setSupplierFilter(e.target.value)}
                            className="input"
                            
                        />
                        
                        {/* Clear Filter Button (Optional but helpful) */}
                        {(materialFilter || supplierFilter) && (
                            <button 
                                onClick={() => { 
                                    setMaterialFilter(''); 
                                    setSupplierFilter(''); 
                                }}
                                style={{ padding: '8px 15px', cursor: 'pointer', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '8px' }}
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                    {/* 🛑 END Filter Section */}
                    
                    {filteredStock.length === 0 && (materialFilter || supplierFilter) ? (
                        <p>No stock records found matching the current filters.</p>
                    ) : filteredStock.length === 0 && !loading ? (
                        <p>No stock records found.</p>
                    ) : (
                        <table className="product-table">
                            <thead>
                                <tr>
                                    <th>Stock ID</th>
                                    <th>Material Name</th>
                                    <th>Supplier Name</th>
                                    <th>Current Stock</th>
                                    <th>Current Stock Price</th>
                                    <th>UOM</th> 
                                </tr>
                            </thead>
                            <tbody>
                                {/* 🛑 Use filteredStock here */}
                                {filteredStock.map((item) => (
                                    <tr key={item.stock_id}>
                                        <td>{item.stock_id}</td>
                                        <td>{item.material_name}</td> 
                                        <td>{item.supplier_name}</td> 
                                        {/* Display stock with fixed decimal points for better readability */}
                                        <td>{parseFloat(item.current_stock).toFixed(2)}</td> 
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

export default RMStockList;