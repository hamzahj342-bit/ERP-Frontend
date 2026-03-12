import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaEye, FaFileInvoiceDollar, } from "react-icons/fa";
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";
import api from "../../api";

const CustomerInvoices = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState({ fpSales: [], rmSales: [], customer: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLedger = async () => {
      try {
        const res = await api.get(`/entities/${id}/invoices`);
        // Note: Backend se customer ki detail bhi sath bhejni hogi ya alag se fetch karni hogi
        setData(res.data);
      } catch (err) {
        console.error("Error fetching ledger:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLedger();
  }, [id]);

  if (loading) return <div className="loader">Loading Ledger...</div>;

  return (
    <>
      <NavigationBar />
      <div className="table-container" style={{ marginTop: '50px' }}>
        <button className='back-btn' onClick={() => navigate('/customers')}>
          <FaArrowLeft />
        </button>

        <div className="table-wrapper">
          <div className="header-flex" style={{ marginBottom: '30px' }}>
            <div>
              <h2 style={{ color: '#1a73e8' }}>Customer Ledger</h2>
              <p>History for: <b>{data.fpSales[0]?.customer?.name || "Customer"}</b></p>
            </div>
            <FaFileInvoiceDollar size={40} color="#1a73e8" />
          </div>

          {/* SECTION 1: Finished Goods */}
          <h3 style={{ color: '#2c3e50', borderLeft: '5px solid #1a73e8', paddingLeft: '15px' }}>
            Finished Goods Invoices
          </h3>
          <table className="entity-table" style={{ marginBottom: '40px' }}>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Grand Total</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.fpSales.length > 0 ? data.fpSales.map(inv => (
                <tr key={inv.id}>
                  <td>{inv.invoice_no}</td>
                  <td>{new Date(inv.createdat).toLocaleDateString('en-GB')}</td>
                  <td style={{ fontWeight: 'bold' }}>Rs. {Number(inv.grand_total).toLocaleString()}</td>
                  <td>
                    <button className="edit-btn" onClick={() => navigate(`/fp-invoice-detail/${inv.invoice_no}`)}>
                      <FaEye /> View Detail
                    </button>
                  </td>
                </tr>
              )) : <tr><td colSpan="4" style={{ textAlign: 'center' }}>No FP Invoices found.</td></tr>}
            </tbody>
          </table>

          {/* SECTION 2: Raw Materials */}
          <h3 style={{ color: '#2c3e50', borderLeft: '5px solid #e67e22', paddingLeft: '15px' }}>
            Raw Material Invoices
          </h3>
          <table className="entity-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Grand Total</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.rmSales.length > 0 ? data.rmSales.map(inv => (
                <tr key={inv.id}>
                  <td>{inv.invoice_no}</td>
                  <td>{new Date(inv.createdat).toLocaleDateString('en-GB')}</td>
                  <td style={{ fontWeight: 'bold' }}>Rs. {Number(inv.grand_total).toLocaleString()}</td>
                  <td>
                    <button className="edit-btn"
                            onClick={() => navigate(`/rm-invoice/${inv.invoice_no}`)}>
                      <FaEye /> View Detail
                    </button>
                  </td>
                </tr>
              )) : <tr><td colSpan="4" style={{ textAlign: 'center' }}>No RM Invoices found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default CustomerInvoices;