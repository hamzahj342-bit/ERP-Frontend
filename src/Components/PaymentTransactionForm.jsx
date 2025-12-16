import React, { useState, useEffect, useCallback } from "react";
import NavigationBar from "./NavigationBar";
import Footer from "./Footer";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Swal from "sweetalert2";


const PaymentTransactionForm = () => {
    const navigate = useNavigate();

    const [accounts, setAccounts] = useState([]);
    const [invoiceNo, setInvoiceNo] = useState("");
    const [fromBalance, setFromBalance] = useState(0);
    const [suppliers, setSuppliers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [selectedEntityId, setSelectedEntityId] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false); // To prevent double clicks
    const [formData, setFormData] = useState({
        from_account_id: "",
        to_account_id: "",
        debit: "",
        credit: "",
        transaction_date: new Date().toISOString().split("T")[0],
        description: "",
        entity_id: ""
    });

    // =======================================================
    // 1. INVOICE NUMBER FETCH LOGIC (Extracted for reusability)
    // =======================================================
    const fetchInvoiceNo = useCallback(async () => {
  try {
    const res = await fetch("http://localhost:5000/api/payment-transactions/invoice-no?type=payments");
    const data = await res.json();
    console.log("GET /invoice-no:", res.status, data); // debug
    if (res.ok) {
      setInvoiceNo(data.invoice_no);
      return data.invoice_no;
    } else {
      setInvoiceNo("PAY-INV-ERROR");
      return null;
    }
  } catch (err) {
    console.error("Error fetching invoice:", err);
    setInvoiceNo("PAY-INV-ERROR");
    return null;
  }
}, []);

    // Initial Data Fetch (Runs once on mount)
    useEffect(() => {
        fetchSuppliers();
        fetchCustomers();
        fetchAccounts();
        // Fetch the initial invoice number
        fetchInvoiceNo();
    }, [fetchInvoiceNo]);


    // Fetch all accounts (Extracted)
    const fetchAccounts = () => {
        fetch("http://localhost:5000/api/accounts/list-with-balance")
            .then(res => res.json())
            .then(data => setAccounts(data))
            .catch(err => console.error("Error fetching accounts:", err));
    };

    const fetchCustomers = () => {
        fetch("http://localhost:5000/api/entities")
            .then(res => res.json())
            .then(data => {
                const customerData = data.filter(item => item.type === "customer");
                setCustomers(customerData);
            })
            .catch(err => console.error("Error fetching customers:", err));
    };

    const fetchSuppliers = () => {
        fetch("http://localhost:5000/api/entities")
            .then(res => res.json())
            .then(data => {
                const supplierData = data.filter(item => item.type === "supplier");
                setSuppliers(supplierData);
            })
            .catch(err => console.error("Error fetching suppliers:", err));
    };
    
    // Determine control account logic... (no changes here)
    const getControlAccType = (accountId) => {
        const acc = accounts.find(a => a.id == accountId);
        if (acc?.account_code === '0002-0001') return 'Payable'; 
        if (acc?.account_code === '0001-0004') return 'Receivable'; 
        return null;
    };

    const activeControlAcc = getControlAccType(formData.from_account_id) || getControlAccType(formData.to_account_id);
    const entityList = activeControlAcc === 'Payable' ? suppliers : (activeControlAcc === 'Receivable' ? customers : []);
    const entityTypeLabel = activeControlAcc === 'Payable' ? 'Supplier' : (activeControlAcc === 'Receivable' ? 'Customer' : 'Entity');
    
    const handleEntityChange = (value) => {
        setSelectedEntityId(value);
    };
    
    const handleChange = (field, value) => {
        setFormData(prev => {
            const updated = { ...prev, [field]: value };
            if (field === "from_account_id") {
                const acc = accounts.find(a => a.id == value);
                const balance = acc && acc.balance
                    ? Number(acc.balance) || 0
                    : 0;
                setFromBalance(balance);
            }
            if (field === "credit") {
                updated.debit = value;
            }
            return updated;
        });
    };

    // =======================================================
    // 2. CORRECTED SUBMIT HANDLER (DO COPY PASTE)
    // =======================================================
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isSubmitting) return; // Prevent double submission

        // --- Frontend Validation ---
        if (!formData.from_account_id || !formData.to_account_id) {
            toast.error("Please select both accounts.");
            return;
        }
        if (activeControlAcc && !selectedEntityId) {
            toast.error(`Please select a specific ${entityTypeLabel}.`);
            return;
        }
        if (formData.from_account_id === formData.to_account_id) {
            toast.error("From & To account cannot be the same.");
            return;
        }
        const debitAmount = parseFloat(formData.credit);
        if (isNaN(debitAmount) || debitAmount <= 0) {
            toast.error("Please enter a valid amount.");
            return;
        }
    // if (Number(formData.credit) > fromBalance) {
    //   toast.error("Insufficient balance in From Account!");
    //   return;
    // }
        // --- End Validation ---

        setIsSubmitting(true);
        const token = localStorage.getItem("token");
        const user = JSON.parse(localStorage.getItem("user"));

        // 🚨 CRITICAL CHANGE 🚨: We DO NOT send the stale `invoiceNo` from state.
        // The backend is responsible for generating the final, atomic number.
        const payload = {
            // invoice_no: invoiceNo, 
            from_account_id: formData.from_account_id,
            to_account_id: formData.to_account_id,
            debit: debitAmount, // Use the validated number
            credit: debitAmount,
            transaction_date: formData.transaction_date,
            description: formData.description,
            created_by: user ? user.id : null,
            type: "payments",
            entity_id: selectedEntityId || null,
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
            setIsSubmitting(false);

//             const computeNextInvoice = (invoice) => {
//     if (!invoice) return invoice;
//     const parts = String(invoice).split("-");
//     const last = parts[parts.length - 1];
//     const num = parseInt(last, 10) || 0;
//     const prefix = parts.slice(0, parts.length - 1).join("-");
//     return `${prefix}-${String(num + 1).padStart(4, "0")}`;
//   };

            if (res.ok) {

//                 console.log("POST /payment-transactions response:", data); // debug
//   const assignedInvoice = data.invoice_no;
//   if (assignedInvoice) {
//     // immediate UI update
//     setInvoiceNo(computeNextInvoice(assignedInvoice));
//   }
//   // re-sync with server (overwrite if needed)
//   await fetchInvoiceNo();

                Swal.fire({
                    title: "Payment Successful!",
                    text: `Transaction completed with Invoice No: ${data.invoice_no}`, // Assuming backend returns the final invoice_no
                    icon: "success",
                    confirmButtonColor: "#3085d6",
                    confirmButtonText: "OK",
                }).then(() => {
                    // 1. Reset form fields for a new transaction
                    setFormData({
                        from_account_id: "",
                        to_account_id: "",
                        debit: "",
                        credit: "",
                        transaction_date: new Date().toISOString().split("T")[0],
                        description: "",
                        entity_id: ""
                    });
                    setSelectedEntityId("");
                    setFromBalance(0);
                    
                    // 2. 🚨 CRITICAL: Re-fetch the NEXT invoice number immediately
                    fetchInvoiceNo();
                    
                    // Optional: navigate("/payments-list"); 
                    // Keeping the navigation commented out lets the user stay on the form
                    // and start a new transaction with the correct new invoice number.
                });
            } else {
                toast.error(data.message || data.error || "Transaction Failed!");
            }
        } catch (err) {
            setIsSubmitting(false);
            console.error(err);
            toast.error("Network or server error!");
        }
    };
  return (
    <>
      <NavigationBar />
      <div className="rm-page">
        <button className="back-btn" onClick={() => navigate("/payment-transactions")}>
          <FaArrowLeft />
        </button>

        <div className="rm-card">
          <h2>Payment Transaction Form</h2>

          {/* Invoice No + Transaction Date */}
          <div className="form-group mb-3 d-flex"
          style={{gap:"15px"}}>
            <b>Invoice No:</b>
            <input type="text" className="input" value={invoiceNo} readOnly 
            style={{ background: "#f3f3f3",}} 
            />
            
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
            {/* 🚨 FIX: CONDITIONAL ENTITY DROPDOWN */}
            {activeControlAcc && (
                <div className="form-group" style={{ display: "flex", gap: "15px", marginTop: "10px"}}>
                    <b style={{marginTop:"10px"}}>{entityTypeLabel}:</b>
                    <select 
                        className="input" 
                        value={selectedEntityId} 
                        onChange={(e) => handleEntityChange(e.target.value)}
                    >
                        <option value="">Select {entityTypeLabel}</option>
                        {entityList.map(entity => (
                            <option key={entity.id} value={entity.id}>
                                {entity.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}


            {/* Debit */}
            <div className="form-group" style={{ display: "flex", gap: "15px",marginTop:"10px"}}>
              <b style={{marginTop:"10px"}}>Credit:</b>
              <input
                type="number"
                className="input"
                min="0.01"
                step="0.01"
                value={formData.debit}
                onChange={(e) => handleChange("credit", e.target.value)}
              />
              <b style={{marginTop:"10px"}}>Debit:</b>
              <input type="number" className="input" value={formData.debit} readOnly />
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
