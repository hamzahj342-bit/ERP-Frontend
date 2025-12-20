import React, { useState, useEffect } from "react";
import NavigationBar from "../Components/NavigationBar";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "../RMForm.css";
import Footer from "../Components/Footer";
import api from "../../api"; 

const PaymentTransactionList = () => {
  const [transactions, setTransactions] = useState([]);
  const navigate = useNavigate();

  // Fetch payment transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        // fetch + .then ki jagah api.get with await
        const res = await api.get("/payment-transactions/list", {
          params: { type: "payments" }
        });
        
        const data = res.data; // Axios mein data direct yahan hota hai
        console.log("Payment Transactions:", data);

        // Aapki original logic same to same
        if (Array.isArray(data)) {
          setTransactions(data);
        } else if (Array.isArray(data.rows)) {
          setTransactions(data.rows);
        } else {
          setTransactions([]);
        }
      } catch (err) {
        console.error("Error fetching transactions:", err);
        setTransactions([]);
      }
    };

    fetchTransactions();
  }, []);

  // View details handler (Same logic)
  const handleViewDetails = (invoiceNo) => {
    navigate(`/payment-transaction/${invoiceNo}`);
  };

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
          <button
            className="add-cust-sup"
            onClick={() => navigate("/payments")}
          >
            Add New
          </button>
          <h3>Payment Transactions</h3>

          <table className="product-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Invoice No</th>
                <th>From Account</th>
                <th>To Account</th>
                <th>Created At</th>
                <th>Debit</th>
                <th>Credit</th>
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
                  <td>
                    {tx.createdat
                      ? new Date(tx.createdat).toLocaleDateString()
                      : ""}
                  </td>
                  <td>{parseFloat(tx.debit).toFixed(2)}</td>
                  <td>{parseFloat(tx.credit).toFixed(2)}</td>
                  <td>
                    <button
                      className="primary-btn"
                      onClick={() => handleViewDetails(tx.invoice_no)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center" }}>
                    No payment transactions found.
                  </td>
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

export default PaymentTransactionList;
