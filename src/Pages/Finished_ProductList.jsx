import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationBar from '../Components/NavigationBar'; 
import Footer from '../Components/Footer';           
import { toast } from 'react-toastify';
import { FaArrowLeft } from 'react-icons/fa';
import api from "../../api"; 

const FinishedProductList = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchFinishedProducts = async () => {
        try {
            // Backend endpoint jo humne naye table ke liye banaya hai
            const res = await api.get("/finished-products");
            setProducts(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching finished products:", err);
            toast.error("Failed to load finished goods data.");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFinishedProducts();
    }, []);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    };

    if (loading) {
        return (
            <>
                <NavigationBar />
                <div className="rm-page">Loading Finished Goods Inventory...</div>
                <Footer />
            </>
        );
    }

    return (
        <>
            <NavigationBar />
            <div className="rm-page">
                {/* Back Button */}
                <button
                    className="back-btn"
                    style={{ marginTop: "30px" }}
                    onClick={() => navigate('/dashboard')} 
                >
                    <FaArrowLeft />
                </button>

                <div className="rm-card">
                    <h2>Production History</h2>
                    <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '15px' }}>
                        Tracking total production vs items sold per batch.
                    </p>
                    
                    {products.length === 0 ? (
                        <p>No finished product records found.</p>
                    ) : (
                        <table className="product-table">
                            <thead>
                                <tr>
                                    <th>Batch ID</th>
                                    <th>Product Name</th>
                                    <th style={{ textAlign: 'center' }}>Original Qty</th>
                                    <th style={{ textAlign: 'center' }}>Sold Qty</th>
                                    <th style={{ textAlign: 'center' }}>Available Stock</th>
                                    <th style={{textAlign: 'center' }}>Consumed Qty</th>
                                    <th>Unit Cost</th>
                                    <th>Production Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((item) => {
                                    const currentStock = Number(item.quantity) - Number(item.sold) - Number(item.consumed_qty || 0);
                                    return (
                                        <tr key={item.id}>
                                            <td>#{item.id}</td>
                                            <td style={{ fontWeight: '500' }}>
                                                {item.product_master?.name || 'N/A'}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {parseFloat(item.quantity).toFixed(3)}
                                            </td>
                                            <td style={{ textAlign: 'center', color: '#e74c3c' }}>
                                                {parseFloat(item.sold).toFixed(3)}
                                            </td>
                                            <td style={{ 
                                                textAlign: 'center', 
                                                fontWeight: 'bold', 
                                                color: currentStock > 0 ? '#27ae60' : '#bdc3c7' 
                                            }}>
                                                {currentStock.toFixed(3)}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>{parseFloat(item.consumed_qty || 0).toFixed(3)}</td>
                                            <td>{parseFloat(item.unit_cost).toFixed(2)}</td>
                                            <td>{formatDate(item.createdat)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
            <Footer />
        </>
    );
};

export default FinishedProductList;