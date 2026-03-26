import React, { useState, useEffect } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft, FaPlus, FaEye, FaFileInvoice, FaUserAlt, FaCalendarAlt, FaReply } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import '../RMForm.css';
import Footer from '../Components/Footer';
import Pagination from '../Components/Pagination'; 
import api from "../../api"; 

const FP_SaleReturnList = () => {
  const [sales, setSales] = useState([]); 
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const limit = 50;
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSaleReturns = async () => {
        setLoading(true);
        try {
            const res = await api.get("/fp-sale", {
              params: {
                type: "SaleReturn",
                page: page,
                limit: limit
              }
            });
            
            const data = res.data;
            
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
        {/* Top Header Section */}
        <div className="top-nav-container" style={{marginTop: '30px'}}>
          <button className="back-btn" onClick={() => navigate('/fp-transactions')}>
            <FaArrowLeft />
          </button>
        </div>

        {/* Table Card */}
        <div className="card">
          <div className="card-header">
            <h3>
              Finished Goods Sale Returns List
            </h3>
            <button className="add-sale-btn" onClick={() => navigate('/fp-salereturn-form')}>
              <FaPlus /> ADD NEW FG RETURN
            </button>
          </div>
          
          <div className="table-container">
            {loading ? (
                <div className="loading-state">Loading Finished Goods Sale Returns...</div>
            ) : sales.length === 0 ? (
                <div className="no-data">No Finished Goods Sale Returns transactions found.</div>
            ) : (
                <table className="product-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th><FaFileInvoice /> INVOICE NO</th>
                            <th>CREATED AT</th>
                            <th><FaCalendarAlt /> DATE</th>
                            <th>CUSTOMER</th>
                            <th>GRAND TOTAL</th>
                            <th><FaUserAlt /> CREATED BY</th>
                            <th style={{ textAlign: 'center' }}>ACTION</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sales.map((sale) => (
                            <tr key={sale.id}>
                                <td className="id-cell">#{sale.id}</td> 
                                <td className="invoice-cell">{sale.invoice_no}</td>
                                <td>{formatDate(sale.createdat)}</td> 
                                <td>{formatDate(sale.date)}</td>
                                <td><span className="supplier-tag">{sale.customer?.name || sale.entity_name || "N/A"}</span></td>
                                <td className="total-cell">
                                  {parseFloat(sale.grand_total).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                </td>
                                <td><span className="user-tag">{sale.createdby || "—"}</span></td>
                                <td className="action-cell">
                                    <button 
                                        onClick={() => handleViewDetails(sale.invoice_no)} 
                                        className="primary-btn"
                                    >
                                        <FaEye /> VIEW
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
          </div>
            
          <div className="pagination-footer">
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