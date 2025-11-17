import React, { useState, useEffect } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import '../RMForm.css';
import Footer from '../Components/Footer';

const RM_Sale = () => {
  const [sales, setSales] = useState([]); // master records

  const navigate = useNavigate();

  // Fetch Sale Master Data
  useEffect(() => {
    fetch('http://localhost:5000/api/rm-transactions?type=sale')
      .then(res => res.json())
      .then(data => {
        console.log("Sale API Response:", data);
        if (Array.isArray(data)) {
          setSales(data);
        } else if (Array.isArray(data.rows)) {
          setSales(data.rows);
        } else {
          setSales([]); // fallback
        }
      })
      .catch(() => setSales([]));
  }, []);

   const handleViewDetails = (invoiceNo) => {
        // ✅ CRITICAL: Yahan sahi route path aur parameter use hoga
        navigate(`/rm-invoice/${invoiceNo}`); 
    };
  return (
    <>
      <NavigationBar />
      <div className="rm-page">
        <button
          className="back-btn"
          style={{ marginTop: "30px" }}
          onClick={() => navigate('/dashboard')}
        >
          <FaArrowLeft />
        </button>

        {/* Table */}
        <div className="card">
          <button
            className="add-cust-sup"
            onClick={() => navigate('/rm-sale-form')}
          >
            Add New
          </button>
          <h3>Raw Material Sales</h3>
          <table className="product-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Invoice No</th>
                <th>Transaction Date</th>
                <th>Created By</th>
                <th>Customer</th>
                <th>Grand Total</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.master_id}>
                  <td>{sale.master_id}</td>
                  <td>{sale.invoice_no}</td>
                  <td>{sale.createdat ? new Date(sale.createdat).toLocaleDateString() : ""}</td>
                  <td>{sale.createdby}</td>
                  <td>{sale.entity_name}</td>
                  <td>{parseFloat(sale.grand_total) ?? "-"}</td>
                  <td>
                        <button 
                            // Button click par handleViewDetails call karein
                            onClick={() => handleViewDetails(sale.invoice_no)} 
                            className="primary-btn"
                        >
                            View Details
                        </button>
                    </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default RM_Sale;
