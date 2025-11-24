import React, { useState, useEffect } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
// Aap RMForm.css ki jagah common ya dedicated CSS use kar sakte hain
import '../RMForm.css'; 
import Footer from '../Components/Footer';

const FP_SaleReturnList = () => {
  const [sales, setSales] = useState([]); // master records (FG Sales)

  const navigate = useNavigate();

  // ✅ Fetch Finished Goods Sale Master Data
  useEffect(() => {
    // 🛑 New Backend API Endpoint: /api/fp-sale?type=Sale
    fetch('http://localhost:5000/api/fp-sale?type=SaleReturn')
      .then(res => res.json())
      .then(data => {
        console.log("FG Sale API Response:", data);
        // API response structure ko handle karein (direct array ya { rows: [...] })
        if (Array.isArray(data)) {
          setSales(data);
        } else if (Array.isArray(data.rows)) {
          setSales(data.rows);
        } else {
          setSales([]); // fallback
        }
      })
      .catch((error) => {
          console.error("Error fetching FG sales:", error);
          setSales([]);
      });
  }, []);
  
  // Helper function for date formatting
  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  // 💡 Yeh function tab call hoga jab user list mein kisi row par click karega
    const handleViewDetails = (invoiceNo) => {
        // ✅ CRITICAL: Yahan sahi route path aur parameter use hoga
        navigate(`/fp-invoice-detail/${invoiceNo}`); 
    };

  return (
    <>
      <NavigationBar />
      <div className="rm-page">
        <button
          className="back-btn"
          style={{ marginTop: "30px" }}
          onClick={() => navigate('/fp-transactions')}
        >
          <FaArrowLeft />
        </button>

        {/* Table */}
        <div className="card">
          <button
            className="add-cust-sup"
            // 🛑 Navigate to the new Finished Goods Sale Form
            onClick={() => navigate('/fp-salereturn-form')} 
          >
            Add Sale Return
          </button>
          <h3>Finished Goods Sale Returns List</h3>
          <table className="product-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Invoice No</th>
                <th>Transaction Date</th>
                <th>Customer</th>
                <th>Grand Total (Rs)</th>
                <th>Created By</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sales.length > 0 ? (
                sales.map((sale) => (
                  // Assuming backend returns SaleMaster fields with entity_name joined
                  <tr key={sale.id}>
                    <td>{sale.id}</td> 
                    <td>{sale.invoice_no}</td>
                    <td>{sale.createdat ? new Date(sale.createdat).toLocaleDateString() : ""}</td> 
                    {/* Note: entity_name field backend join se aana chahiye */}
                    <td>{sale.customer?.name || sale.entity_name || "N/A"}</td>
                    <td>{parseFloat(sale.grand_total) || "-"}</td>
                    <td>{sale.createdby || "—"}</td>
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
                ))
              ) : (
                 <tr>
                    <td colSpan="6" style={{textAlign: "center"}}>No Finished Goods Sales Returns transactions found.</td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default FP_SaleReturnList;