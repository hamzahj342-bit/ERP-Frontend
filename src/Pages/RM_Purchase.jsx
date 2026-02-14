import React, { useState, useEffect } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft } from 'react-icons/fa';
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
                  <td>{purchase.createdat ? new Date(purchase.createdat).toLocaleDateString() : ""}</td>
                  <td>{purchase.createdby}</td>
                  <td>{purchase.entity_name}</td>
                  <td>{parseFloat(purchase.grand_total) ?? "-"}</td>

                  <td>
                    <button
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

          {/* --- Pagination Buttons --- */}
          <div>
            <Pagination
  page={page}
  totalPages={totalPages}
  onPageChange={(newPage) => setPage(newPage)}
/>
          </div>

        </div>
      </div>

      <Footer />
    </>
  );
};

export default RM_Purchase;
