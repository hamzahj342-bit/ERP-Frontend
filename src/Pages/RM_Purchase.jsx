import React, { useState, useEffect } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft, FaEye, FaPlus, FaFileInvoice, FaUserAlt, FaCalendarAlt, FaEdit, FaCheckCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import '../RMForm.css';
import Footer from '../Components/Footer';
import Pagination from '../Components/Pagination';
import api from "../../api"; 
import InvoiceTypeModal from '../Components/InvoiceTypeModal';
import Swal from 'sweetalert2'; // Swal import kiya confirmation dialogs k liye

const RM_Purchase = () => {
  const [purchases, setPurchases] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const navigate = useNavigate();

  // Fetch paginated data using api.js
  const fetchPurchases = async () => {
    try {
      const res = await api.get("/rm-transactions", {
        params: {
          type: "purchase",
          page: page,
          limit: 50
        }
      });

      const data = res.data;
      console.log("RM Purchase API Response:", data);

      if (Array.isArray(data.data)) {
        setPurchases(data.data);
        setTotalPages(data.totalPages);
      } else {
        setPurchases([]);
      }
    } catch (err) {
      console.error("Error fetching purchases:", err);
      setPurchases([]);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, [page]); // Runs whenever the page changes

  // ---------------------------------------------------------
  // 1️⃣ Approve Handler with SweetAlert2 (Yes/No Confirmation)
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
      // Loading screen lagana taake backend processing k dauran user double-click na kare
      Swal.fire({
        title: 'Processing...',
        text: 'Posting ledger accounts and updating inventory stock.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      try {
        // Controller route template match: /:id/approve
        const res = await api.put(`/rm-transactions/${masterId}/approve`);
        
        if (res.status === 200 || res.status === 201) {
          Swal.fire({
            title: 'Approved!',
            text: `Invoice ${invoiceNo} has been successfully approved and posted.`,
            icon: 'success',
            confirmButtonColor: '#2b6cb0'
          });
          fetchPurchases(); // Table refresh taake dynamic button change ho jaye
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
  // 2️⃣ Edit Handler with SweetAlert2 Confirmation
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
      // Edit form screen par navigate karega query parameter pass kar ke
      navigate(`/rm-purchase-form?editId=${masterId}`);
    }
  };

  return (
    <>
      <NavigationBar />
      <div className="rm-page">
        <div className="top-nav-container" style={{marginTop: '30px'}}>
          <button className="back-btn" onClick={() => navigate('/rm-transactions')}>
            <FaArrowLeft />
          </button>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Raw Material Purchase</h3>
            <button className="add-sale-btn" onClick={() => setIsInvoiceModalOpen(true)}>
              <FaPlus /> ADD NEW PURCHASE
            </button>
          </div>

          <div className="table-container">
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
                  <th>INVOICE STATUS</th>
                  <th style={{ textAlign: 'center' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {purchases.length > 0 ? (
                  purchases.map((p) => (
                    <tr key={p.master_id}>
                      <td style={{ color: '#94a3b8' }}>#{p.master_id}</td>
                      <td style={{ fontWeight: '700' }}>{p.invoice_no}</td>
                      <td>{p.createdat ? new Date(p.createdat).toLocaleDateString() : "-"}</td>
                      <td>{p.date ? new Date(p.date).toLocaleDateString() : "-"}</td>
                      <td><span className="user-tag">{p.createdby}</span></td>
                      <td><span className="supplier-tag">{p.entity_name}</span></td>
                      <td style={{ fontWeight: '700', color: '#2b6cb0' }}>
                        {parseFloat(p.grand_total).toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </td>
                      <td>
                        {/* Dynamic Status Text Badge */}
                       <span className={`status-badge ${
  p.status === 'Approved' 
    ? 'status-approved' 
    : (p.status === 'Draft' || !p.status) 
      ? 'status-draft' // Red color wali class yahan lagegi
      : 'status-draft'
}`}>
  {p.status === 'Draft' || !p.status ? 'Unapproved' : p.status}
</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                          <button onClick={() => navigate(`/rm-invoice/${p.invoice_no}`)} className="primary-btn">
                            <FaEye /> VIEW
                          </button>

                          {/* 🛑 CONDITIONAL RENDERING CONTROL BLOCK */}
                          {p.status === 'Approved' ? (
                            // Button shape text display for Approved status
                            <span className="approved-text-btn">
                              <FaCheckCircle /> APPROVED
                            </span>
                          ) : (
                            // Show Edit and Approve buttons only when invoice is 'Draft'
                            <>
                              <button onClick={() => handleEditInvoice(p.master_id)} className="edit-btn-action">
                                <FaEdit /> EDIT
                              </button>
                              <button onClick={() => handleApproveInvoice(p.master_id, p.invoice_no)} className="approve-btn-action">
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
                    <td colSpan="9" style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>No Transactions Found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'center' }}>
            <Pagination page={page} totalPages={totalPages} onPageChange={(newPage) => setPage(newPage)} />
          </div>
        </div>
        <InvoiceTypeModal
          open={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          onSelect={(type) => {
            setIsInvoiceModalOpen(false);
            navigate(`/rm-purchase-form?invoiceType=${type}`);
          }}
          title="Purchase Invoice Type"
        />
      </div>
      <Footer />
    </>
  );
};

export default RM_Purchase;