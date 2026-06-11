import React, { useState, useEffect } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft, FaPlus, FaEye, FaFileInvoice, FaUserAlt, FaCalendarAlt, FaBoxOpen } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import '../RMForm.css';
import Footer from '../Components/Footer';
import Pagination from '../Components/Pagination';
import api from '../../api';
import InvoiceTypeModal from '../Components/InvoiceTypeModal';

const FP_SaleList = () => {
  const [sales, setSales] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const limit = 50;
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSales = async () => {
      setLoading(true);
      try {
        const res = await api.get("/fp-sale", {
          params: {
            type: "Sale",
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

    fetchSales();
  }, [page]);

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

        <div className="card">
          {/* Header with Title and Add Button */}
          <div className="card-header">
            <h3>
              Finished Goods Sales List
            </h3>
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
                    <th><FaUserAlt /> CREATED BY</th>
                    <th style={{ textAlign: 'center' }}>ACTION</th>
                  </tr>
                </thead>

                <tbody>
                  {sales.length > 0 ? (
                    sales.map((sale) => (
                      <tr key={sale.id}>
                        <td className="id-cell">#{sale.id}</td>
                        <td className="invoice-cell">{sale.invoice_no}</td>
                        <td>{sale.createdat ? new Date(sale.createdat).toLocaleDateString() : "-"}</td>
                        <td>{sale.date ? new Date(sale.date).toLocaleDateString() : "-"}</td>
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
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="no-data">
                        No Finished Goods Sales transactions found.
                      </td>
                    </tr>
                  )}
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
          navigate(`/fp-sale-form?invoiceType=${type}`);
        }}
        title="FG Sale Invoice Type"
      />

      <Footer />
    </>
  );
};

export default FP_SaleList;