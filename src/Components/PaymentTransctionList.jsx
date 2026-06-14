import React, { useState, useEffect } from "react";
import NavigationBar from "../Components/NavigationBar";
import { FaArrowLeft, FaPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "../RMForm.css";
import Footer from "../Components/Footer";
import Pagination from "../Components/Pagination"; // Import your Pagination component
import api from "../../api";

const PaymentTransactionList = () => {
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false); // Added loading state
  const navigate = useNavigate();

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await api.get("/payment-transactions/list", {
        params: { 
          type: "payments",
          page: page, // Pass page to API
          limit: 50 // Optional: set a limit for items per page
        }
      });
      
      // Response structured as { data: [...], totalPages: X, ... }
      const { data, totalPages } = res.data;
      
      if (Array.isArray(data)) {
        setTransactions(data);
        setTotalPages(totalPages || 1);
      } else {
        setTransactions([]);
      }
    } catch (err) {
      console.error("Error fetching transactions:", err);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page]); // Re-fetch when page changes

  return (
    <>
      <NavigationBar />
      <div className="rm-page">
        <button
          className="back-btn"
          style={{ marginTop: "30px" }}
          onClick={() => navigate("/payment-transactions")}
        >
          <FaArrowLeft />
        </button>

        <div className="card">
          <div className="card-header">
            <h3>Payment Transactions</h3>
            <button className="add-sale-btn" onClick={() => navigate("/payments")}>
              <FaPlus /> NEW PAYMENT
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>
          ) : (
            <table className="product-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Invoice No</th>
                  <th>From Account</th>
                  <th>To Account</th>
                  <th>Transaction Date</th> {/* Updated header */}
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{tx.id}</td>
                    <td>{tx.invoice_no}</td>
                    <td>{tx.from_account_name}</td>
                    <td>{tx.to_account_name}</td>
                    <td>{tx.transaction_date || "-"}</td> {/* Show transaction_date */}
                    <td>
                      <button
                        className="primary-btn"
                        onClick={() => navigate(`/payment-transaction/${tx.invoice_no}`)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: '20px' }}>
                      No payment transactions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* Pagination Controls */}
          {!loading && transactions.length > 0 && (
            <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'center' }}>
              <Pagination 
                page={page} 
                totalPages={totalPages} 
                onPageChange={(newPage) => setPage(newPage)} 
              />
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default PaymentTransactionList;