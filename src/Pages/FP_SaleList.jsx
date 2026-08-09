import React, { useState, useEffect } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft, FaEye, FaPlus, FaFileInvoice, FaUserAlt, FaCalendarAlt, FaEdit, FaCheckCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import '../RMForm.css';
import Footer from '../Components/Footer';
import Pagination from '../Components/Pagination';
import api from '../../api';
import ApprovedInvoiceEditModal from '../Components/ApprovedInvoiceEditModal';
import InvoiceTypeModal from '../Components/InvoiceTypeModal';
import Swal from 'sweetalert2'; // Confirmation system confirmation dialogs

const FP_SaleList = () => {
  const [sales, setSales] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [approvedModalOpen, setApprovedModalOpen] = useState(false);
  const [approvedInvoiceId, setApprovedInvoiceId] = useState(null);

  const limit = 50;
  const navigate = useNavigate();

  // Fetch paginated data - Strictly using your original "/fp-sale" endpoint
  const fetchSales = async () => {
    setLoading(true);
    try {
      const res = await api.get("/fp-sale", {
        params: {
          type: "Sale", // Keeping your exact configuration
          page: page,
          limit: limit
        }
      });

      const data = res.data;
      if (data && data.data) {
        setSales(data.data);
        setTotalPages(data.totalPages || 1);
      } else {
        setSales([]);
      }
    } catch (error) {
      console.error("Error fetching FG sales:", error);
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [page]);

  // ---------------------------------------------------------
  // 1️⃣ Approve Handler: Using your strict route pattern "/fp-sale/:id/approve"
  // ---------------------------------------------------------
  const handleApproveInvoice = async (masterId, invoiceNo) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to Approve Invoice No: ${invoiceNo}? This action will post entries to Stock & Accounts and cannot be reversed!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#2b6cb0',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, Approve it!',
      cancelButtonText: 'No, Cancel'
    });

    if (result.isConfirmed) {
      Swal.fire({
        title: 'Processing...',
        text: 'Posting ledger accounts and updating inventory stock.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      try {
        // Exact route match according to your parameters: /fp-sale/:id/approve
        const res = await api.put(`/fp-sale/${masterId}/approve`);
        
        if (res.status === 200 || res.status === 201) {
          Swal.fire({
            title: 'Approved!',
            text: `Invoice ${invoiceNo} has been successfully approved and posted.`,
            icon: 'success',
            confirmButtonColor: '#2b6cb0'
          });
          fetchSales(); // Refresh matrix layout
        }
      } catch (err) {
        console.error("Error approving invoice:", err);
        Swal.fire({
          title: 'Error!',
          text: err.response?.data?.message || 'Something went wrong while approving the invoice.',
          icon: 'error',
          confirmButtonColor: '#2b6cb0'
        });
      }
    }
  };

  // ---------------------------------------------------------
  // 2️⃣ Edit Handler: Navigates to the form with query parameter editId
  // ---------------------------------------------------------
  const handleEditInvoice = async (masterId) => {
    const result = await Swal.fire({
      title: 'Edit Draft?',
      text: 'Do you want to modify this invoice draft?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2b6cb0',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Yes, Edit',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      navigate(`/fp-sale-form?editId=${masterId}`);
    }
  };

  const handleViewDetails = (invoiceNo) => {
    navigate(`/fp-invoice-detail/${invoiceNo}`);
  };
  
  return (
    <>
      <NavigationBar />

      <div className="rm-page">
        {/* Top Header Section */}
        <div className="top-nav-container" style={{ marginTop: '30px' }}>
          <button className="back-btn" onClick={() => navigate('/fp-transactions')}>
            <FaArrowLeft />
          </button>
        </div>

        <div className="card">
          {/* Header with Title and Add Button */}
          <div className="card-header">
            <h3>Finished Goods Sales List</h3>
            <button className="add-sale-btn" onClick={() => setIsInvoiceModalOpen(true)}>
              <FaPlus /> ADD NEW FG SALE
            </button>
          </div>

          <div className="table-container">
            {loading ? (
              <div className="loading-state">Loading sales data...</div>
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
                    <th>INVOICE STATUS</th>
                    <th><FaUserAlt /> CREATED BY</th>
                    <th style={{ textAlign: 'center' }}>ACTION</th>
                  </tr>
                </thead>

                <tbody>
                  {sales.length > 0 ? (
                    sales.map((sale) => (
                      <tr key={sale.id}>
                        <td className="id-cell" style={{ color: '#94a3b8' }}>#{sale.id}</td>
                        <td className="invoice-cell" style={{ fontWeight: '700' }}>{sale.invoice_no}</td>
                        <td>{sale.createdat ? new Date(sale.createdat).toLocaleDateString() : "-"}</td>
                        <td>{sale.date ? new Date(sale.date).toLocaleDateString() : "-"}</td>
                        <td><span className="supplier-tag">{sale.customer?.name || sale.entity_name || "N/A"}</span></td>
                        <td className="total-cell" style={{ fontWeight: '700', color: '#2b6cb0' }}> 
                          {parseFloat(sale.grand_total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td>
                          {/* Dynamic Status Text Badge */}
                          <span className={`status-badge ${
  sale.status === 'Approved' 
    ? 'status-approved' 
    : (sale.status === 'Draft' || !sale.status) 
      ? 'status-draft' // Red color wali class yahan lagegi
      : 'status-draft'
}`}>
  {sale.status === 'Draft' || !sale.status ? 'Unapproved' : sale.status}
</span>
                        </td>
                        <td><span className="user-tag">{sale.createdby || "—"}</span></td>
                        <td className="action-cell" style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                            <button 
                              onClick={() => handleViewDetails(sale.invoice_no)} 
                              className="primary-btn"
                            >
                              <FaEye /> VIEW
                            </button>

                            {/* 🛑 CONDITIONAL RENDERING CONTROL BLOCK */}
                            {sale.status === 'Approved' ? (
                              <>
                                <button
                                  onClick={() => {
                                    setApprovedInvoiceId(sale.id);
                                    setApprovedModalOpen(true);
                                  }}
                                  className="edit-btn-action"
                                >
                                  <FaEdit /> EDIT
                                </button>
                                <span className="approved-text-btn">
                                  <FaCheckCircle /> APPROVED
                                </span>
                              </>
                            ) : (
                              <>
                                <button 
                                  onClick={() => handleEditInvoice(sale.id)} 
                                  className="edit-btn-action"
                                >
                                  <FaEdit /> EDIT
                                </button>
                                <button 
                                  onClick={() => handleApproveInvoice(sale.id, sale.invoice_no)} 
                                  className="approve-btn-action"
                                >
                                  <FaCheckCircle /> APPROVE
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" className="no-data" style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
                        No Finished Goods Sales transactions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          <div className="pagination-footer" style={{ marginTop: '25px', display: 'flex', justifyContent: 'center' }}>
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
          navigate(`/fp-sale-form?invoiceType=${type}`);
        }}
        title="FG Sale Invoice Type"
      />

      <ApprovedInvoiceEditModal
        open={approvedModalOpen}
        onClose={() => {
          setApprovedModalOpen(false);
          setApprovedInvoiceId(null);
        }}
        invoiceId={approvedInvoiceId}
        invoiceCategory="fp"
        onSaved={fetchSales}
      />

      <Footer />
    </>
  );
};

export default FP_SaleList;