import React, { useState, useEffect } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import '../RMForm.css';
import Footer from '../Components/Footer';

const RM_Purchase = () => {
  const [purchases, setPurchases] = useState([]); // master records

  const navigate = useNavigate();

  // Fetch Purchase Master Data
  useEffect(() => {
  fetch('http://localhost:5000/api/rm-transactions?type=purchase')
    .then(res => res.json())
    .then(data => {
       console.log("API Response:", data); 
      // Agar data object hai aur andar array hai, toh sahi property use karein
      if (Array.isArray(data)) {
        setPurchases(data);
      } else if (Array.isArray(data.rows)) {
        setPurchases(data.rows);
      } else {
        setPurchases([]); // fallback
      }
    })
    .catch(() => setPurchases([]));
}, []);

 // 💡 Yeh function tab call hoga jab user list mein kisi row par click karega
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
          onClick={() => navigate('/rm-transactions')}
        >
          <FaArrowLeft />
        </button>

        {/* Table */}
        <div className="card">
          <button
            className="add-cust-sup"
            onClick={() => navigate('/rm-purchase-form')}
          >
            Add New
          </button>
          <h3>Raw Material Purchase</h3>
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
              {purchases.map((purchase) => (
                <tr key={purchase.master_id}>
                  <td>{purchase.master_id}</td>
                  <td>{purchase.invoice_no}</td>
                  {/* 👇 yaha created_at ko Transaction Date ke naam se show kar rahe hain */}
                  <td>{purchase.createdat ? new Date(purchase.createdat).toLocaleDateString() : ""}</td>
                  <td>{purchase.createdby}</td>
                  <td>{purchase.entity_name}</td>
                  <td>{parseFloat(purchase.grand_total) ?? "-"}</td>
                  <td>
                        <button 
                            // Button click par handleViewDetails call karein
                            onClick={() => handleViewDetails(purchase.invoice_no)} 
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

export default RM_Purchase;
