import React, { useState, useEffect } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft, FaPlus, FaEye, FaFileInvoice, FaUserAlt, FaCalendarAlt, FaUndo } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import '../RMForm.css';
import Footer from '../Components/Footer';
import Pagination from '../Components/Pagination';
import api from '../../api';
import InvoiceTypeModal from '../Components/InvoiceTypeModal';

const RM_Return = () => {
  const [returns, setReturns] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchReturns = async () => {
      setLoading(true);
      try {
        const res = await api.get("/rm-transactions", {
          params: {
            type: "Return",
            page: page,
            limit: 50
          }
        });
        
        const data = res.data;
        if (data && Array.isArray(data.data)) {
          setReturns(data.data);
          setTotalPages(data.totalPages || 1); 
        } else {
          setReturns([]);
          setTotalPages(1);
        }
      } catch (error) {
        console.error("Error fetching RM Returns:", error);
        setReturns([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchReturns();
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
          {/* Title and Add Button Row */}
          <div className="card-header">
            <h3>Raw Material Returns</h3>
            <button className="add-sale-btn" onClick={() => setIsInvoiceModalOpen(true)}>
              <FaPlus /> ADD NEW RETURN
            </button>
          </div>
          
          <div className="table-container">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '50px', color: '#718096' }}>Loading returns data...</div>
            ) : returns.length === 0 ? (
              <div className="no-data">No Raw Material Return records found.</div>
            ) : (
               <table className="product-table">
                 <thead>
                   <tr>
                     <th>ID</th>
                     <th><FaFileInvoice /> INVOICE NO</th>
                     <th>CREATED AT</th>
                     <th><FaCalendarAlt /> DATE</th>
                     <th><FaUserAlt /> CREATED BY</th>
                     <th>SUPPLIER</th>
                     <th>GRAND TOTAL</th>
                     <th style={{ textAlign: 'center' }}>ACTION</th>
                   </tr>
                 </thead>
                 <tbody>
                   {returns.map((ret) => (
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
          navigate(`/rm-return-form?invoiceType=${type}`);
        }}
        title="Return Invoice Type"
      />
      <Footer />
    </>
  );
};

export default RM_Return;