import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationBar from '../Components/NavigationBar'; // Assuming path
import Footer from '../Components/Footer';             // Assuming path
import { toast } from 'react-toastify';
import { FaArrowLeft } from 'react-icons/fa';
import api from "../../api"; 

const ProductBatchList = () => {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchBatches = async () => {
            try {
                // headers ab api.js handle karega (interceptors ke zariye)
                const res = await api.get("/product-batches");

                // Jo data backend se join ke saath aa raha hai, wahi batches mein jayega
                setBatches(res.data);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching batches:", err);
                toast.error("Failed to load product batch data.");
                setLoading(false);
            }
        };

        fetchBatches();
    }, []);

    // Format date logic same to same
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    };

    if (loading) {
        return <><NavigationBar /><div className="rm-page">Loading Product Batches...</div><Footer /></>;
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
                    <h2>Finished Goods Batch List</h2>
                    
                    {batches.length === 0 ? (
                        <p>No product batches found.</p>
                    ) : (
                        <table className="product-table">
                            <thead>
                                <tr>
                                    <th>Batch ID</th>
                                    <th>Product Master ID</th>
                                    <th>Product Name</th>
                                    <th>Remaining Qty</th>
                                    <th>Unit Cost</th>
                                    <th>Created By</th>
                                    <th>Created Date</th>
                                    {/* <th>Action (Future)</th> */}
                                </tr>
                            </thead>
                            <tbody>
                                {batches.map((batch) => (
                                    <tr key={batch.id}>
                                        <td>{batch.id}</td>
                                        <td>{batch.product_master_id}</td>
                                        <td>{batch.product?.name || 'N/A'}</td>
                                        <td>{parseFloat(batch.qty_remaining).toFixed(3)}</td>
                                        <td>{parseFloat(batch.unit_cost).toFixed(3)}</td>
                                        <td>{batch.createdby || 'System'}</td>
                                        <td>{formatDate(batch.createdat)}</td>
                                        {/* <td><button className="del-btn">View</button></td> */}
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

export default ProductBatchList;