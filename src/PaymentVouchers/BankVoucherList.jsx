import React, { useState, useEffect } from "react";
import NavigationBar from "../Components/NavigationBar";
import { FaArrowLeft, FaPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "../RMForm.css";
import Footer from "../Components/Footer";
import Pagination from "../Components/Pagination"; 
import api from "../../api";

const BankVoucherList = () => {
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false); 
  const navigate = useNavigate();

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await api.get("/payment-transactions/list", {
        params: { 
          type: "BPV", // 🌟 Strictly target Bank operations at backend level
          page: page, 
          limit: 20   
        }
      });
      
      const { data, totalPages } = res.data;
      
      if (Array.isArray(data)) {
        setTransactions(data);
        setTotalPages(totalPages || 1);
      } else {
        setTransactions([]);
      }
    } catch (err) {
      console.error("Error fetching bank vouchers:", err);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page]); 

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
            <h3>Bank Vouchers (BPV / BRV)</h3>
            <div style={{ display: "flex", gap: "10px" }}>
              <button className="add-sale-btn" onClick={() => navigate("/bank-voucher-form?type=BPV")}>
                <FaPlus /> NEW BANK PAYMENT
              </button>
              <button className="add-sale-btn" style={{ backgroundColor: "#198754" }} onClick={() => navigate("/bank-voucher-form?type=BRV")}>
                <FaPlus /> NEW BANK RECEIPT
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px' }}>Loading Vouchers...</div>
          ) : (
            <table className="product-table">
              <thead>
                <tr>
                  <th style={{ width: "80px" }}>ID</th>
                  <th>Voucher No</th>
                  <th>Transaction Date</th> 
                  <th>Total Amount</th>
                  <th style={{ textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.invoice_no}>
                    <td style={{ color: "#6c757d", fontWeight: "500" }}>{tx.id}</td>
                    <td style={{ fontWeight: "600", color: "#495057" }}>{tx.invoice_no}</td>
                    <td>{tx.transaction_date || "-"}</td> 
                    <td style={{ fontWeight: "600", color: "#0d6efd" }}>
                      {parseFloat(tx.total_amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: "center", flexDirection: "row", display: "flex", justifyContent: "center" }}>
                      <button
                        className="primary-btn"
                        style={{ width: "140px" }}
                        onClick={() => navigate(`/payment-transaction/${tx.invoice_no}`)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: '30px', color: "#6c757d" }}>
                      No bank vouchers found.
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

export default BankVoucherList;