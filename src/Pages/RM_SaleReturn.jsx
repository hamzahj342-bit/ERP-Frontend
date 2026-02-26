import React, { useState, useEffect } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import '../RMForm.css';
import Footer from '../Components/Footer';
import Pagination from '../Components/Pagination'; // Pagination component import kiya
import api from "../../api"; 

const RM_SaleReturn = () => {
  const [saleReturns, setSaleReturns] = useState([]); // master records
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // ✅ Fetch Sale Return Master Data using api.js
  useEffect(() => {
    const fetchSaleReturns = async () => {
        setLoading(true);
        try {
            // URL params ko query string ki jagah 'params' object mein handle kiya gaya hai
            const res = await api.get("/rm-transactions", {
              params: {
                type: "SaleReturn",
                page: page,
                limit: 50
              }
            });
            
            const data = res.data;
            console.log("Sale Return API Response:", data);

            // Aapka robust logic different data structures handle karne ke liye
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

            setSaleReturns(records);
            setTotalPages(total);

        } catch (error) {
            console.error("Error fetching RM Sale Returns:", error);
            setSaleReturns([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    };
    
    fetchSaleReturns();
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
            className="add-sale-btn"
            onClick={() => navigate('/rm-sale-return-form')}
          >
            Add New
          </button>
          <h3>Raw Material Sale Returns</h3>
        
            {loading ? (
                <p>Loading sale return data...</p>
            ) : saleReturns.length === 0 ? (
                <p>No Raw Material Sale Return records found.</p>
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
                        {saleReturns.map((ret) => (
                            <tr key={ret.master_id}>
                                <td>{ret.master_id}</td>
                                <td>{ret.invoice_no}</td>
                                <td>{ret.createdat ? new Date(ret.createdat).toLocaleDateString() : "N/A"}</td>
                                <td>{ret.createdby}</td>
                                <td>{ret.entity_name}</td>
                                <td>{parseFloat(ret.grand_total)?.toFixed(2) ?? "-"}</td>
                                <td>
                                    <button 
                                        onClick={() => handleViewDetails(ret.invoice_no)} 
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

export default RM_SaleReturn;