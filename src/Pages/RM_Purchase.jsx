import React, { useState, useEffect } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft, FaEye, FaPlus, FaFileInvoice, FaUserAlt, FaCalendarAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import '../RMForm.css';
import Footer from '../Components/Footer';
import Pagination from '../Components/Pagination';
import api from "../../api"; 

const RM_Purchase = () => {
  const [purchases, setPurchases] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const navigate = useNavigate();

  // Fetch paginated data using api.js
  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        // Axios automatically builds the query string from 'params'
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

    fetchPurchases();
  }, [page]); // Runs whenever the page changes

  const handleViewDetails = (invoiceNo) => {
    navigate(`/rm-invoice/${invoiceNo}`);
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
            <button className="add-sale-btn" onClick={() => navigate('/rm-purchase-form')}>
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
                      <td style={{ textAlign: 'center' }}>
                        <button onClick={() => navigate(`/rm-invoice/${p.invoice_no}`)} className="primary-btn">
                          <FaEye /> VIEW
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>No Transactions Found</td>
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
  );};

export default RM_Purchase;
