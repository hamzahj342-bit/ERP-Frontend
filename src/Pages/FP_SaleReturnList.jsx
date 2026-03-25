import React, { useState, useEffect } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import '../RMForm.css';
import Footer from '../Components/Footer';
import Pagination from '../Components/Pagination'; // ✅ Imported Pagination component
import api from "../../api"; 

const FP_SaleReturnList = () => {
  const [sales, setSales] = useState([]); 
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const limit = 50;
  const navigate = useNavigate();

  // ✅ Fetch Finished Goods Sale Return Data (GET using api.js)
  useEffect(() => {
    const fetchSaleReturns = async () => {
        setLoading(true);
        try {
            // URL params ko 'params' object mein handle karna professional tarika hai
            const res = await api.get("/fp-sale", {
              params: {
                type: "SaleReturn",
                page: page,
                limit: limit
              }
            });
            
            const data = res.data;
            console.log("FG Sale Return API Response:", data);

            // Logic matching your original structure
            if (data && Array.isArray(data.data)) {
                setSales(data.data);
                setTotalPages(data.totalPages || 1);
            } 
            else if (data && Array.isArray(data.rows)) {
                setSales(data.rows);
                setTotalPages(Math.ceil((data.count || 1) / limit));
            }
            else {
                setSales([]);
                setTotalPages(1);
            }
        } catch (error) {
            console.error("Error fetching FG sales returns:", error);
            setSales([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    };
    
    fetchSaleReturns();
  }, [page]); 
  
  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString();
  };

  const handleViewDetails = (invoiceNo) => {
      navigate(`/fp-invoice-detail/${invoiceNo}`); 
  };

  return (
    <>
      <NavigationBar />
      <div className="rm-page">
        <button
          className="back-btn"
          style={{ marginTop: "30px" }}
          onClick={() => navigate('/fp-transactions')}
        >
          <FaArrowLeft />
        </button>

        {/* Table */}
        <div className="card">
          <button
            className="add-sale-btn"
            onClick={() => navigate('/fp-salereturn-form')} 
          >
            Add New
          </button>
          <h3>Finished Goods Sale Returns List</h3>
          
            {/* Loading and Data Display */}
            {loading ? (
                <p>Loading Finished Goods Sale Returns...</p>
            ) : sales.length === 0 ? (
                <p style={{textAlign: "center"}}>No Finished Goods Sale Returns transactions found.</p>
            ) : (
                <table className="product-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Invoice No</th>
                            <th>Created At</th>
                            <th>Invoice Date</th>
                            <th>Customer</th>
                            <th>Grand Total (Rs)</th>
                            <th>Created By</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sales.map((sale) => (
                            <tr key={sale.id}>
                                <td>{sale.id}</td> 
                                <td>{sale.invoice_no}</td>
                                <td>{formatDate(sale.createdat)}</td> 
                                <td>{formatDate(sale.date)}</td>
                                <td>{sale.customer?.name || sale.entity_name || "N/A"}</td>
                                <td>{parseFloat(sale.grand_total)?.toFixed(2) || "-"}</td>
                                <td>{sale.createdby || "—"}</td>
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
            
            {/* ✅ Pagination Component */}
            <div style={{ marginTop: "25px" }}>
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

export default FP_SaleReturnList;