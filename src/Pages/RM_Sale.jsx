import React, { useState, useEffect } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft, FaPlus, FaEye, FaFileInvoice, FaUserAlt, FaCalendarAlt, FaShoppingCart } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import '../RMForm.css';
import Footer from '../Components/Footer';
import Pagination from '../Components/Pagination';
import api from "../../api"; 

const RM_Sale = () => {
  const [sales, setSales] = useState([]); 
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchSales = async () => {
        setLoading(true);
        try {
            const res = await api.get("/rm-transactions", {
              params: {
                type: "sale",
                page: page,
                limit: 50
              }
            });
            
            const data = res.data;
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
        {/* Top Header Section */}
        <div className="top-nav-container" style={{marginTop: '30px'}}>
          <button className="back-btn" onClick={() => navigate('/rm-transactions')}>
            <FaArrowLeft />
          </button>
        </div>

        <div className="card">
          {/* Header with Title and Add Button */}
          <div className="card-header">
            <h3> 
              Raw Material Sales
            </h3>
            <button className="add-sale-btn" onClick={() => navigate('/rm-sale-form')}>
              <FaPlus /> ADD NEW SALE
            </button>
          </div>
          
          <div className="table-container">
            {loading ? (
                <div className="loading-state">Loading sales data...</div>
            ) : sales.length === 0 ? (
                <div className="no-data">No Raw Material Sale records found.</div>
            ) : (
                <table className="product-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th><FaFileInvoice /> INVOICE NO</th>
                            <th>CREATED AT</th>
                            <th><FaCalendarAlt /> DATE</th>
                            <th><FaUserAlt /> CREATED BY</th>
                            <th>CUSTOMER</th>
                            <th>GRAND TOTAL</th>
                            <th style={{ textAlign: 'center' }}>ACTION</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sales.map((sale) => (
                            <tr key={sale.master_id}>
                                <td className="id-cell">#{sale.master_id}</td>
                                <td className="invoice-cell">{sale.invoice_no}</td>
                                <td>{sale.createdat ? new Date(sale.createdat).toLocaleDateString() : "N/A"}</td>
                                <td>{sale.date ? new Date(sale.date).toLocaleDateString() : "N/A"}</td>
                                <td><span className="user-tag">{sale.createdby}</span></td>
                                <td><span className="supplier-tag">{sale.entity_name}</span></td>
                                <td className="total-cell">
                                  {parseFloat(sale.grand_total).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                </td>
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

export default RM_Sale;