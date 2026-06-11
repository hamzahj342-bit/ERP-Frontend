import React, { useState, useEffect } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft, FaPlus, FaEye, FaFileInvoice, FaUserAlt, FaCalendarAlt, FaReply } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import '../RMForm.css';
import Footer from '../Components/Footer';
import Pagination from '../Components/Pagination'; 
import api from "../../api"; 
import InvoiceTypeModal from '../Components/InvoiceTypeModal';

const RM_SaleReturn = () => {
  const [saleReturns, setSaleReturns] = useState([]); 
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchSaleReturns = async () => {
        setLoading(true);
        try {
            const res = await api.get("/rm-transactions", {
              params: {
                type: "SaleReturn",
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
        {/* Top Header Section */}
        <div className="top-nav-container" style={{marginTop: '30px'}}>
          <button className="back-btn" onClick={() => navigate('/rm-transactions')}>
            <FaArrowLeft />
          </button>
        </div>

        {/* Main Table Card */}
        <div className="card">
          <div className="card-header">
            <h3>
              Raw Material Sale Returns
            </h3>
            <button className="add-sale-btn" onClick={() => setIsInvoiceModalOpen(true)}>
              <FaPlus /> ADD NEW SALE RETURN
            </button>
          </div>
        
          <div className="table-container">
            {loading ? (
                <div className="loading-state">Loading sale return data...</div>
            ) : saleReturns.length === 0 ? (
                <div className="no-data">No Raw Material Sale Return records found.</div>
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
                        {saleReturns.map((ret) => (
                            <tr key={ret.master_id}>
                                <td className="id-cell">#{ret.master_id}</td>
                                <td className="invoice-cell">{ret.invoice_no}</td>
                                <td>{ret.createdat ? new Date(ret.createdat).toLocaleDateString() : "N/A"}</td>
                                <td>{ret.date ? new Date(ret.date).toLocaleDateString() : "N/A"}</td>
                                <td><span className="user-tag">{ret.createdby}</span></td>
                                <td><span className="supplier-tag">{ret.entity_name}</span></td>
                                <td className="total-cell">
                                  {parseFloat(ret.grand_total).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                </td>
                                <td className="action-cell">
                                    <button 
                                        onClick={() => handleViewDetails(ret.invoice_no)} 
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
      <InvoiceTypeModal
        open={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        onSelect={(type) => {
          setIsInvoiceModalOpen(false);
          navigate(`/rm-sale-return-form?invoiceType=${type}`);
        }}
        title="Sale Return Invoice Type"
      />
      <Footer />
    </>
  );
};

export default RM_SaleReturn;