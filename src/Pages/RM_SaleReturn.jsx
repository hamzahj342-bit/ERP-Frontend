import React, { useState, useEffect } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft, FaPlus, FaEye, FaFileInvoice, FaUserAlt, FaCalendarAlt, FaEdit, FaCheckCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import '../RMForm.css';
import Footer from '../Components/Footer';
import Pagination from '../Components/Pagination';
import api from "../../api"; 
import InvoiceTypeModal from '../Components/InvoiceTypeModal';
import Swal from 'sweetalert2';

const RM_SaleReturn = () => {
  const [saleReturns, setSaleReturns] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const navigate = useNavigate();

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
      if (Array.isArray(data.data)) {
        setSaleReturns(data.data);
        setTotalPages(data.totalPages || 1);
      } else {
        setSaleReturns([]);
      }
    } catch (err) {
      console.error("Error fetching sale returns:", err);
      setSaleReturns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSaleReturns();
  }, [page]);

  // ---------------------------------------------------------
  // 1️⃣ Approve Handler (Same logic as Sale)
  // ---------------------------------------------------------
  const handleApproveInvoice = async (masterId, invoiceNo) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to Approve Sale Return: ${invoiceNo}? This will post entries to Stock & Accounts.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#2b6cb0',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, Approve it!'
    });

    if (result.isConfirmed) {
      Swal.fire({ title: 'Processing...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      try {
        await api.put(`/rm-transactions/${masterId}/approve`);
        Swal.fire('Approved!', 'Sale Return has been posted.', 'success');
        fetchSaleReturns();
      } catch (err) {
        Swal.fire('Error!', err.response?.data?.message || 'Failed to approve.', 'error');
      }
    }
  };

  // ---------------------------------------------------------
  // 2️⃣ Edit Handler (Same logic as Sale)
  // ---------------------------------------------------------
  const handleEditInvoice = async (masterId) => {
    const result = await Swal.fire({
      title: 'Edit Draft?',
      text: 'Do you want to modify this Sale Return draft?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2b6cb0',
      confirmButtonText: 'Yes, Edit'
    });

    if (result.isConfirmed) {
      navigate(`/rm-sale-return-form?editId=${masterId}`);
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
            <h3>Raw Material Sale Returns</h3>
            <button className="add-sale-btn" onClick={() => setIsInvoiceModalOpen(true)}>
              <FaPlus /> ADD NEW SALE RETURN
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
                  <th>CUSTOMER</th>
                  <th>GRAND TOTAL</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'center' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="9" style={{textAlign: 'center', padding: '20px'}}>Loading...</td></tr>
                ) : saleReturns.length > 0 ? (
                  saleReturns.map((s) => (
                    <tr key={s.master_id}>
                      <td style={{ color: '#94a3b8' }}>#{s.master_id}</td>
                      <td style={{ fontWeight: '700' }}>{s.invoice_no}</td>
                      <td>{s.createdat ? new Date(s.createdat).toLocaleDateString() : "-"}</td>
                      <td>{s.date ? new Date(s.date).toLocaleDateString() : "-"}</td>
                      <td><span className="user-tag">{s.createdby}</span></td>
                      <td><span className="supplier-tag">{s.entity_name}</span></td>
                      <td style={{ fontWeight: '700', color: '#2b6cb0' }}>
                        {parseFloat(s.grand_total).toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </td>
                      <td>
                        <span className={`status-badge ${s.status === 'Approved' ? 'status-approved' : 'status-draft'}`}>
                          {s.status || 'Draft'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                          <button onClick={() => navigate(`/rm-invoice/${s.invoice_no}`)} className="primary-btn">
                            <FaEye /> VIEW
                          </button>
                          {s.status === 'Approved' ? (
                            <span className="approved-text-btn"><FaCheckCircle /> APPROVED</span>
                          ) : (
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
                  <tr><td colSpan="9" style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>No Transactions Found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'center' }}>
            <Pagination page={page} totalPages={totalPages} onPageChange={(newPage) => setPage(newPage)} />
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