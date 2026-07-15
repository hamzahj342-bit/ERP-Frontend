import React, { useState, useEffect } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft, FaEye, FaPlus, FaFileInvoice, FaCalendarAlt, FaEdit, FaTrash, FaTruck } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import '../RMForm.css';
import Footer from '../Components/Footer';
import Pagination from '../Components/Pagination';
import api from "../../api"; 
import Swal from 'sweetalert2';

const GRN_Listing = () => {
  const [documents, setDocuments] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();

  const fetchGRNs = async () => {
    try {
      const res = await api.get("/loader-documents", {
        params: { type: "GRN", page: page, limit: 50 }
      });
      if (Array.isArray(res.data?.data)) {
        setDocuments(res.data.data);
        setTotalPages(res.data.totalPages);
      } else {
        setDocuments([]);
      }
    } catch (err) {
      console.error("Error fetching GRN documents:", err);
      setDocuments([]);
    }
  };

  useEffect(() => {
    fetchGRNs();
  }, [page]);

  // Handle Delete Document
  const handleDelete = async (id, no) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete GRN No: ${no}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/loader-documents/${id}`);
        Swal.fire('Deleted!', 'Document has been deleted.', 'success');
        fetchGRNs();
      } catch (err) {
        Swal.fire('Error!', err.response?.data?.message || 'Something went wrong.', 'error');
      }
    }
  };

  return (
    <>
      <NavigationBar />
      <div className="rm-page">
        <div className="top-nav-container" style={{ marginTop: '30px' }}>
          <button className="back-btn" onClick={() => navigate(-1)}>
            <FaArrowLeft />
          </button>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Goods Received Note (GRN)</h3>
            <button className="add-sale-btn" onClick={() => navigate('/grn-form')}>
              <FaPlus /> ADD NEW GRN
            </button>
          </div>

          <div className="table-container">
            <table className="product-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th><FaFileInvoice /> GRN NO</th>
                  <th><FaCalendarAlt /> DATE</th>
                  <th>SUPPLIER / ENTITY</th>
                  <th><FaTruck /> DRIVER NAME</th>
                  <th style={{ textAlign: 'center' }}>PURCHASE</th>
                  <th style={{ textAlign: 'center' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {documents.length > 0 ? (
                  documents.map((d) => (
                    <tr key={d.id}>
                      <td style={{ color: '#94a3b8' }}>#{d.id}</td>
                      <td style={{ fontWeight: '700' }}>{d.no}</td>
                      <td>{d.date ? new Date(d.date).toLocaleDateString() : "-"}</td>
                      <td><span className="supplier-tag">{d.entity?.name}</span></td>
                      <td><span className="user-tag">{d.driver?.driver_name}</span></td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`status-badge ${d.is_posted ? 'status-approved' : 'status-draft'}`}>
                          {d.is_posted ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                          
                          {/* 🔓 VIEW is always allowed */}
                          <button onClick={() => navigate(`/grn-view/${d.no}`)} className="primary-btn">
                            <FaEye /> VIEW
                          </button>

                          {/* 🛑 EDIT & DELETE are bound to is_posted */}
                          {!d.is_posted && (
                            <>
                              <button onClick={() => navigate(`/grn-form?editId=${d.id}`)} className="edit-btn-action">
                                <FaEdit /> EDIT
                              </button>
                              <button onClick={() => handleDelete(d.id, d.no)} className="approve-btn-action" style={{ backgroundColor: '#d33' }}>
                                <FaTrash /> DELETE
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>No GRN Documents Found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'center' }}>
            <Pagination page={page} totalPages={totalPages} onPageChange={(newPage) => setPage(newPage)} />
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default GRN_Listing;