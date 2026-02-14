import React, { useState, useEffect } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import '../RMForm.css';
import Footer from '../Components/Footer';
import Pagination from '../Components/Pagination'; // Pagination component import kiya

import api from "../../api"; 

const RM_Sale = () => {
  const [sales, setSales] = useState([]); // master records
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // ✅ Fetch Sale Master Data using api.js
  useEffect(() => {
    const fetchSales = async () => {
        setLoading(true);
        try {
            // URL params ko 'params' object mein handle kiya gaya hai
            const res = await api.get("/rm-transactions", {
              params: {
                type: "sale",
                page: page,
                limit: 50
              }
            });
            
            const data = res.data;
            console.log("Sale API Response:", data);

            // API Response handle karne ka aapka robust tareeka
            let records = [];
            let total = 1;

            if (data && Array.isArray(data.data)) {
                records = data.data;
                total = data.totalPages || 1;
            } else if (data && Array.isArray(data.rows)) {
                records = data.rows;
                total = data.totalPages || 1;
            } else if (Array.isArray(data)) {
                records = data;
                total = 1;
            }

            setSales(records);
            setTotalPages(total);

        } catch (error) {
            console.error("Error fetching RM Sales:", error);
            setSales([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    };
    
    fetchSales();
  }, [page]); 

  const handleViewDetails = (invoiceNo) => {
    navigate(`/rm-invoice/${invoiceNo}`); 
  };
    
  return (
    <>
      <NavigationBar />
      <div className="rm-page">
        <button
          className="back-btn"
          style={{ marginTop: "30px" }}
          onClick={() => navigate('/rm-transactions')}
        >
          <FaArrowLeft />
        </button>

        {/* Table */}
        <div className="card">
          <button
            className="add-cust-sup"
            onClick={() => navigate('/rm-sale-form')}
          >
            Add New
          </button>
          <h3>Raw Material Sales</h3>
          
            {loading ? (
                <p>Loading sales data...</p>
            ) : sales.length === 0 ? (
                <p>No Raw Material Sale records found.</p>
            ) : (
                <table className="product-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Invoice No</th>
                            <th>Transaction Date</th>
                            <th>Created By</th>
                            <th>Customer</th>
                            <th>Grand Total</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sales.map((sale) => (
                            <tr key={sale.master_id}>
                                <td>{sale.master_id}</td>
                                <td>{sale.invoice_no}</td>
                                <td>{sale.createdat ? new Date(sale.createdat).toLocaleDateString() : "N/A"}</td>
                                <td>{sale.createdby}</td>
                                <td>{sale.entity_name}</td>
                                <td>{parseFloat(sale.grand_total)?.toFixed(2) ?? "-"}</td>
                                <td>
                                    <button 
                                        onClick={() => handleViewDetails(sale.invoice_no)} 
                                        className="primary-btn"
                                    >
                                        View Details
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            
            {/* Pagination Component add kiya */}
            <div>
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

export default RM_Sale;