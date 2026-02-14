import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationBar from '../Components/NavigationBar'; 
import Footer from '../Components/Footer';           
import Pagination from '../Components/Pagination';
import { toast } from 'react-toastify';
import { FaArrowLeft } from 'react-icons/fa';
import api from "../../api"; 

const FinishedProductList = () => {
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState(""); 
    const [debouncedSearch, setDebouncedSearch] = useState(""); 
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const navigate = useNavigate();

    // Native Debounce Logic
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(1); // Reset to page 1 on new search
        }, 500);

        return () => clearTimeout(handler);
    }, [searchTerm]);

    const fetchFinishedProducts = async () => {
        setLoading(true);
        try {
            const res = await api.get("/finished-products", {
                params: {
                    page: page,
                    limit: 50,
                    search: debouncedSearch
                }
            });

            if (res.data && res.data.data) {
                setProducts(res.data.data);
                setTotalPages(res.data.totalPages || 1);
            }
            setLoading(false);
        } catch (err) {
            console.error("Error fetching products:", err);
            toast.error("Failed to load data.");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFinishedProducts();
    }, [page, debouncedSearch]);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <>
            <NavigationBar />
            <div className="rm-page">
                <button className="back-btn" style={{ marginTop: "30px" }} onClick={() => navigate('/dashboard')}>
                    <FaArrowLeft />
                </button>

                <div className="rm-card">
                    <h2 style={{ color: '#007bff', textAlign: 'center', fontSize: '2rem', marginBottom: '20px' }}>
                        Raw Material Stock (By Material Summary)
                    </h2>

                    <div style={{ marginBottom: '20px' }}>
                        <input
                            type="text"
                            placeholder="Filter by Material..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className='input'
                            // style={{
                            //     width: '100%',
                            //     padding: '12px 15px',
                            //     borderRadius: '8px',
                            //     border: '1px solid #ddd',
                            //     fontSize: '1rem',
                            //     outline: 'none'
                            // }}
                        />
                    </div>
                    
                    {loading ? (
                        <p style={{ textAlign: 'center', padding: '20px' }}>Loading data...</p>
                    ) : (
                        <table className="product-table">
                            <thead>
                                <tr>
                                    <th>Batch ID</th>
                                    <th>Product Name</th>
                                    <th style={{ textAlign: 'center' }}>Original Qty</th>
                                    <th style={{ textAlign: 'center' }}>Sold Qty</th>
                                    <th style={{ textAlign: 'center' }}>Available Stock</th>
                                    <th style={{ textAlign: 'center' }}>Consumed Qty</th>
                                    <th>Unit Cost</th>
                                    <th>Production Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.length > 0 ? products.map((item) => {
                                    const currentStock = Number(item.quantity) - Number(item.sold) - Number(item.consumed_qty || 0);
                                    return (
                                        <tr key={item.id}>
                                            <td>#{item.id}</td>
                                            <td style={{ fontWeight: '500'}}>
                                                {item.product_master?.name || 'N/A'}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>{parseFloat(item.quantity).toFixed(3)}</td>
                                            <td style={{ textAlign: 'center', color: '#e74c3c' }}>{parseFloat(item.sold).toFixed(3)}</td>
                                            <td style={{ textAlign: 'center', fontWeight: 'bold', color: currentStock > 0 ? '#27ae60' : '#bdc3c7' }}>
                                                {currentStock.toFixed(3)}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>{parseFloat(item.consumed_qty || 0).toFixed(3)}</td>
                                            <td>{parseFloat(item.unit_cost).toFixed(2)}</td>
                                            <td>{formatDate(item.createdat)}</td>
                                        </tr>
                                    )
                                }) : (
                                    <tr><td colSpan="8" style={{ textAlign: 'center' }}>No records found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    )}

                    <div style={{ marginTop: '20px' }}>
                        <Pagination
                            page={page}
                            totalPages={totalPages}
                            onPageChange={(newPage) => setPage(newPage)}
                        />
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
};

export default FinishedProductList;