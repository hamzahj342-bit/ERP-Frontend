import React, { useState, useEffect } from "react";
import NavigationBar from "./NavigationBar";
import Footer from "./Footer";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const PaymentTransactionForm = () => {
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState([]);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [fromBalance, setFromBalance] = useState(0);

  const [formData, setFormData] = useState({
    from_account_id: "",
    to_account_id: "",
    debit: "",
    credit: "",
    transaction_date: new Date().toISOString().split("T")[0],
    description: "",
  });

  // Fetch all accounts
  useEffect(() => {
    fetch("http://localhost:5000/api/accounts/list")
      .then(res => res.json())
      .then(data => setAccounts(data))
      .catch(err => console.error("Error fetching accounts:", err));
  }, []);

  // Fetch invoice no
  useEffect(() => {
    fetch("http://localhost:5000/api/payment-transactions/invoice-no")
      .then(res => res.json())
      .then(data => setInvoiceNo(data.invoice_no))
      .catch(err => console.error("Error fetching invoice:", err));
  }, []);

  // Handle input change
  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === "from_account_id") {
        const acc = accounts.find(a => a.id == value);
        setFromBalance(acc ? Number(acc.balance) : 0);
      }
      if (field === "debit") {
        updated.credit = value; // auto-set credit
      }
      return updated;
    });
  };

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.from_account_id || !formData.to_account_id) {
      toast.error("Please select both accounts.");
      return;
    }
    if (formData.from_account_id === formData.to_account_id) {
      toast.error("From & To account cannot be the same.");
      return;
    }
    if (!formData.debit || Number(formData.debit) <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    if (Number(formData.debit) > fromBalance) {
      toast.error("Insufficient balance in From Account!");
      return;
    }

    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));

    const payload = {
      invoice_no: invoiceNo,
      from_account_id: formData.from_account_id,
      to_account_id: formData.to_account_id,
      debit: Number(formData.debit),
      credit: Number(formData.credit),
      transaction_date: formData.transaction_date,
      description: formData.description,
      created_by: user ? user.id : null,
    };

    try {
      const res = await fetch("http://localhost:5000/api/payment-transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        Swal.fire({
          title: "Payment Successful!",
          text: "The payment transaction has been completed.",
          icon: "success",
          confirmButtonColor: "#3085d6",
          confirmButtonText: "OK",
        }).then(() => navigate("/payments-list"));
      } else {
        toast.error(data.error || "Transaction Failed!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network or server error!");
    }
  };

  return (
    <>
      <NavigationBar />
      <div className="rm-page">
        <button className="back-btn" onClick={() => navigate("/payments-list")}>
          <FaArrowLeft />
        </button>

        <div className="rm-card">
          <h2>Payment Transaction Form</h2>

          {/* Invoice No + Transaction Date */}
          <div className="form-group mb-3 d-flex"
          style={{gap:"15px"}}>
            <b>Invoice No:</b>
            <input type="text" className="input" value={invoiceNo} readOnly style={{ background: "#f3f3f3" }} />
            
            <b>Transaction Date:</b>
            <input
              type="date"
              className="input"
              value={formData.transaction_date}
              onChange={(e) => handleChange("transaction_date", e.target.value)}
            />
          </div>

          <form onSubmit={handleSubmit}>
            {/* From Account + Balance */}
            <div className="form-group" style={{ display: "flex", gap: "15px"}}>
              <b>From Account:</b>
              <select className="input" value={formData.from_account_id} onChange={(e) => handleChange("from_account_id", e.target.value)}>
                <option value="">Select Account</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.account_name} - {acc.account_code}
                  </option>
                ))}
              </select>

              <b style={{marginTop:"10px"}}>Balance:</b>
              <input type="text" className="input" value={fromBalance} readOnly 
              style={{width:"auto"}}/>

               <b>To Account:</b>
              <select className="input" value={formData.to_account_id} onChange={(e) => handleChange("to_account_id", e.target.value)}>
                <option value="">Select Account</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.account_name} - {acc.account_code}
                  </option>
                ))}
              </select>
            </div>


            {/* Debit */}
            <div className="form-group" style={{ display: "flex", gap: "15px",marginTop:"10px"}}>
              <b style={{marginTop:"10px"}}>Debit:</b>
              <input
                type="number"
                className="input"
                min="0.01"
                step="0.01"
                value={formData.debit}
                onChange={(e) => handleChange("debit", e.target.value)}
              />
              <b style={{marginTop:"10px"}}>Credit:</b>
              <input type="number" className="input" value={formData.credit} readOnly />
            </div>

            {/* Description */}
            <div className="form-group" style={{ marginTop: "15px" }}>
              <b>Description:</b>
              <textarea className="input" rows={3} value={formData.description} onChange={(e) => handleChange("description", e.target.value)}></textarea>
            </div>

            <div className="form-actions" style={{ marginTop: "15px" }}>
              <button type="submit" className="save-btn">Submit Payment</button>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default PaymentTransactionForm;
