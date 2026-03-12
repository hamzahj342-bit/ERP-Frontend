import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaEye, FaFileInvoice } from "react-icons/fa";
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";
import api from "../../api"; 

const SupplierInvoices = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // 1. Initial State ko properly define kiya taake .length error na aaye
  const [data, setData] = useState({ 
    rmPurchases: [], 
    supplierName: "" 
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/entities/${id}/supplierinvoices`);
        
        // 2. Response check: Agar backend se data na mile toh empty array set karein
        if (res.data) {
          setData({
            rmPurchases: res.data.rmPurchases || [],
            supplierName: res.data.rmPurchases[0]?.entity?.name || "Supplier"
          });
        }
      } catch (err) {
        console.error("Error fetching supplier invoices:", err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchInvoices();
  }, [id]);

  return (
    <>
      <NavigationBar />
      <div className="table-container" style={{ marginTop: '50px' }}>
        <div style={{ width: '100%', marginBottom: '20px' }}>
          <button className='back-btn' onClick={() => navigate('/suppliers')}>
            <FaArrowLeft /> 
          </button>
        </div>

        <div className="table-wrapper">
          <div className="header-flex" style={{ marginBottom: '25px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
            <div>
              <h2 style={{ color: '#1a73e8', margin: 0 }}>Supplier Invoice History</h2>
              <p style={{ color: '#666', marginTop: '5px' }}>
                Purchases from: <span style={{ fontWeight: 'bold', color: '#333' }}>{data.supplierName}</span>
              </p>
            </div>
            <FaFileInvoice size={35} color="#1a73e8" />
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <div className="loader">Loading Invoices...</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="entity-table">
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Date</th>
                    <th>Grand Total</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {/* 3. Safety Check: data.rmPurchases ko check kar rahe hain */}
                  {data?.rmPurchases?.length > 0 ? (
                    data.rmPurchases.map((inv) => (
                      <tr key={inv.id}>
                        <td style={{ fontWeight: '600' }}>{inv.invoice_no}</td>
                        <td>{new Date(inv.createdat).toLocaleDateString('en-GB')}</td>
                        <td style={{ fontWeight: 'bold', color: '#2c3e50' }}>
                          Rs. {Number(inv.grand_total).toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            className="edit-btn" 
                            onClick={() => navigate(`/rm-invoice/${inv.invoice_no}`)}
                          >
                            <FaEye /> View Detail
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                        No invoices found for this supplier.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default SupplierInvoices;