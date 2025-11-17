import React, { useState, useEffect } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import '../RMForm.css';
import Footer from '../Components/Footer';

const RM_Return = () => {
  const [returns, setReturns] = useState([]); // master records

  const navigate = useNavigate();

  // Fetch Return Master Data
  useEffect(() => {
    fetch('http://localhost:5000/api/rm-transactions?type=Return')
      .then(res => res.json())
      .then(data => {
        console.log("Return API Response:", data);
        if (Array.isArray(data)) {
          setReturns(data);
        } else if (Array.isArray(data.rows)) {
          setReturns(data.rows);
        } else {
          setReturns([]); // fallback
        }
      })
      .catch(() => setReturns([]));
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
            onClick={() => navigate('/rm-return-form')}
          >
            Add New
          </button>
          <h3>Raw Material Returns</h3>
          <table className="product-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Invoice No</th>
                <th>Transaction Date</th>
                <th>Created By</th>
                <th>Supplier</th>
                <th>Grand Total</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {returns.map((ret) => (
                <tr key={ret.master_id}>
                  <td>{ret.master_id}</td>
                  <td>{ret.invoice_no}</td>
                  <td>{ret.createdat ? new Date(ret.createdat).toLocaleDateString() : ""}</td>
                  <td>{ret.createdby}</td>
                  <td>{ret.entity_name}</td>
                  <td>{parseFloat(ret.grand_total) ?? "-"}</td>
                  <td>
                        <button 
                            // Button click par handleViewDetails call karein
                            onClick={() => handleViewDetails(ret.invoice_no)} 
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

export default RM_Return;
