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
import { formatRmDetailsList } from '../utils/rmQtyDisplay';

const RM_Sale = ({ channel = null }) => {
  const [sales, setSales] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const navigate = useNavigate();

  // Channel-aware paths/labels: same screen serves the generic RM tab
  // (channel=null) and the Retail / Wholesale tabs.
  const channelLabel = channel === 'retail' ? 'Retail' : channel === 'wholesale' ? 'Wholesale' : null;
  const formPath = channel ? `/${channel}/sale-form` : '/rm-sale-form';
  const backPath = channel ? '/dashboard' : '/rm-transactions';
  const pageTitle = channelLabel ? `${channelLabel} Sales` : 'Raw Material Sales';

  // Fetch paginated data using api.js
  const fetchSales = async () => {
    try {
      const res = await api.get("/rm-transactions", {
        params: {
          type: "sale",
          page: page,
          limit: 50,
          ...(channel ? { channel } : {})
        }
      });

      const data = res.data;
      console.log("RM Sale API Response:", data);

      if (Array.isArray(data.data)) {
        setSales(data.data);
        setTotalPages(data.totalPages);
      } else {
        setSales([]);
      }
    } catch (err) {
      console.error("Error fetching sales:", err);
      setSales([]);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [page, channel]); // Runs whenever the page or channel changes

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
          fetchSales(); // Table refresh taake dynamic button change ho jaye
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
      navigate(`${formPath}?editId=${masterId}`);
    }
  };

  return (
    <>
      <NavigationBar />
      <div className="rm-page">
        <div className="top-nav-container" style={{marginTop: '30px'}}>
          <button className="back-btn" onClick={() => navigate(backPath)}>
            <FaArrowLeft />
          </button>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>{pageTitle}</h3>
            <button className="add-sale-btn" onClick={() => setIsInvoiceModalOpen(true)}>
              <FaPlus /> ADD NEW SALE
            </button>
          </div>

          <div className="table-container">
            <table className="product-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th><FaFileInvoice /> INVOICE NO</th>
                  {/* <th>CREATED AT</th> */}
                  <th><FaCalendarAlt /> DATE</th>
                  {/* <th><FaUserAlt /> CREATED BY</th> */}
                  <th>CUSTOMER</th>
                  <th>ITEM NAME</th>
                  <th>GRAND TOTAL</th>
                  {/* <th>INVOICE STATUS</th> */}
                  <th style={{ textAlign: 'center' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {sales.length > 0 ? (
                  sales.map((s) => (
                    <tr key={s.master_id}>
                      <td style={{ color: '#94a3b8' }}>#{s.master_id}</td>
                      <td style={{ fontWeight: '700' }}>{s.invoice_no}</td>
                      {/* <td>{s.createdat ? new Date(s.createdat).toLocaleDateString() : "-"}</td> */}
                      <td>{s.date ? new Date(s.date).toLocaleDateString() : "-"}</td>
                      {/* <td><span className="user-tag">{s.createdby}</span></td> */}
                      <td><span className="supplier-tag">{s.entity_name}</span></td>
                      <td><span className="user-tag">{formatRmDetailsList(s.details)}</span></td>
                      <td style={{ fontWeight: '700', color: '#2b6cb0' }}>
                        {parseFloat(s.grand_total).toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </td>
                      {/* <td>   
                        <span className={`status-badge ${
  s.status === 'Approved' 
    ? 'status-approved' 
    : (s.status === 'Draft' || !s.status) 
      ? 'status-draft' // Red color wali class yahan lagegi
      : 'status-draft'
}`}>
  {s.status === 'Draft' || !s.status ? 'Unapproved' : s.status}
</span>
                      </td> */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                          <button onClick={() => navigate(`/rm-invoice/${s.invoice_no}`)} className="primary-btn">
                            <FaEye /> VIEW
                          </button>

                          {/* 🛑 CONDITIONAL RENDERING CONTROL BLOCK */}
                          {s.status === 'Approved' ? (
                            // Button shape text display for Approved status
                            <span className="approved-text-btn">
                              <FaCheckCircle /> APPROVED
                            </span>
                          ) : (
                            // Show Edit and Approve buttons only when invoice is 'Draft'
                            <>
                              <button onClick={() => handleEditInvoice(s.master_id)} className="edit-btn-action">
                                <FaEdit /> EDIT
                              </button>
                              <button onClick={() => handleApproveInvoice(s.master_id, s.invoice_no)} className="approve-btn-action">
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
                    <td colSpan="10" style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>No Transactions Found</td>
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
            navigate(`${formPath}?invoiceType=${type}`);
          }}
          title={channelLabel ? `${channelLabel} Sale Invoice Type` : "Sale Invoice Type"}
        />
      </div>
      <Footer />
    </>
  );
};

export default RM_Sale;