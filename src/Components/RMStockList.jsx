import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationBar from './NavigationBar';
import Footer from './Footer';
import { toast } from 'react-toastify';
import { FaArrowLeft } from 'react-icons/fa';

const RMStockList = () => {
    const [stock, setStock] = useState([]);
    const [loading, setLoading] = useState(true);

    const navigate = useNavigate();

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
                    
                    {stock.length === 0 ? (
                        <p>No stock records found.</p>
                    ) : (
                        <table className="product-table">
                    <thead>
                     <tr>
                       <th>Stock ID</th>
                       <th>Material Name</th>
                       <th>Supplier Name</th>
                       <th>Current Stock</th>
                       <th>UOM</th> 
                    </tr>
                   </thead>
                    <tbody>
                     {stock.map((item) => (
                        <tr key={item.stock_id}>
                       <td>{item.stock_id}</td>
                       <td>{item.material_name}</td>  
                       <td>{item.supplier_name}</td> 
                       <td>{parseFloat(item.current_stock)}</td>
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