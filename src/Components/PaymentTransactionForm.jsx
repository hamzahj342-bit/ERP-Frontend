import React, { useState, useEffect, useCallback } from "react";
import NavigationBar from "./NavigationBar";
import Footer from "./Footer";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import api from "../../api";


const PaymentTransactionForm = () => {
    const navigate = useNavigate();

    const [accounts, setAccounts] = useState([]);
    const [invoiceNo, setInvoiceNo] = useState("");
    const [fromBalance, setFromBalance] = useState(0);
    const [suppliers, setSuppliers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [selectedEntityId, setSelectedEntityId] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false); 
    const [formData, setFormData] = useState({
        from_account_id: "",
        to_account_id: "",
        debit: "",
        credit: "",
        transaction_date: "",
        description: "",
        entity_id: ""
    });

    // 1. INVOICE NUMBER FETCH LOGIC
    const fetchInvoiceNo = useCallback(async () => {
        try {
            const res = await api.get("/payment-transactions/invoice-no?type=payments");
            const data = res.data; 
            setInvoiceNo(data.invoice_no);
            return data.invoice_no;
        } catch (err) {
            console.error("Error fetching invoice:", err);
            setInvoiceNo("PAY-INV-ERROR");
            return null;
        }
    }, []);

    // 2. Fetch all accounts (Converted to Async/Await)
    const fetchAccounts = async () => {
        try {
            const res = await api.get("/accounts/list-with-balance");
            setAccounts(res.data);
        } catch (err) {
            console.error("Error fetching accounts:", err);
        }
    };

    // 3. Fetch Customers (Converted to Async/Await)
    const fetchCustomers = async () => {
        try {
            const res = await api.get("/entities/transactions"); 
            const data = res.data;
            const customerData = data.filter(item => item.type === "customer");
            setCustomers(customerData);
        } catch (err) {
            console.error("Error fetching customers:", err);
        }
    };

    // 4. Fetch Suppliers (Converted to Async/Await)
    const fetchSuppliers = async () => {
        try {
            const res = await api.get("/entities/transactions");
            const data = res.data;
            const supplierData = data.filter(item => item.type === "supplier");
            setSuppliers(supplierData);
        } catch (err) {
            console.error("Error fetching suppliers:", err);
        } 
    };

    const fetchEmployees = async () => {
    try {
        const res = await api.get("/entities/transactions"); // Assuming employees are in entities or a separate /employees route
        const data = res.data;
        const employeeData = data.filter(item => item.type === "employee");
        setEmployees(employeeData);
    } catch (err) {
        console.error("Error fetching employees:", err);
    }
};

    useEffect(() => {
        fetchSuppliers();
        fetchCustomers();
        fetchEmployees();
        fetchAccounts();
        fetchInvoiceNo();
    }, [fetchInvoiceNo]);

    // --- Baqi logic (getControlAccType, handleChange etc.) same rahega ---
    
    // const getControlAccType = (accountId) => {
    //     const acc = accounts.find(a => a.id == accountId);
    //     if (acc?.account_code === '0002-0001') return 'Payable'; 
    //     if (acc?.account_code === '0001-0004') return 'Receivable'; 
    //     return null;
    // };

    // const activeControlAcc = getControlAccType(formData.from_account_id) || getControlAccType(formData.to_account_id);
    // const entityList = activeControlAcc === 'Payable' ? suppliers : (activeControlAcc === 'Receivable' ? customers : []);
    // const entityTypeLabel = activeControlAcc === 'Payable' ? 'Supplier' : (activeControlAcc === 'Receivable' ? 'Customer' : 'Entity');

    const getControlAccType = (accountId) => {
    const acc = accounts.find(a => a.id == accountId);
    if (!acc) return null;
    
    const name = acc.account_name.toLowerCase();
    
    if (name.includes('payable')) return 'Payable'; 
    if (name.includes('receivable')) return 'Receivable'; 
    if (name.includes('salary')) return 'Salary'; // Salary detection logic
    return null;
};

// Dropdown list decide karne ka logic
const activeControlAcc = getControlAccType(formData.from_account_id) || getControlAccType(formData.to_account_id);

let entityList = [];
let entityTypeLabel = "Entity";

if (activeControlAcc === 'Payable') {
    entityList = suppliers;
    entityTypeLabel = "Supplier";
} else if (activeControlAcc === 'Receivable') {
    entityList = customers;
    entityTypeLabel = "Customer";
} else if (activeControlAcc === 'Salary') {
    entityList = employees;
    entityTypeLabel = "Employee";
}
    
    const handleChange = (field, value) => {
        setFormData(prev => {
            const updated = { ...prev, [field]: value };
            if (field === "from_account_id") {
                const acc = accounts.find(a => a.id == value);
                const balance = acc && acc.balance ? Number(acc.balance) || 0 : 0;
                setFromBalance(balance);
            }
            if (field === "credit") {
                updated.debit = value;
            }
            return updated;
        });
    };

      const handleEntityChange = (value) => {
        setSelectedEntityId(value);
    };

    // 5. SUBMIT HANDLER (Async/Await)
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        // Validation logic same hai jo aapne di thi
        if (!formData.from_account_id || !formData.to_account_id) {
            toast.error("Please select both accounts.");
            return;
        }
        if (formData.transaction_date === "") {
            toast.error("Please select a transaction date.");
            return;
        }

        setIsSubmitting(true);

        const user = JSON.parse(localStorage.getItem("user"));
        const debitAmount = parseFloat(formData.credit);

        const payload = {
            from_account_id: formData.from_account_id,
            to_account_id: formData.to_account_id,
            debit: debitAmount, 
            credit: debitAmount,
            transaction_date: formData.transaction_date,
            description: formData.description,
            created_by: user ? user.id : null,
            type: "payments",
            entity_id: selectedEntityId || null,
        };

        try {
            const res = await api.post("/payment-transactions", payload, {
            });

            setIsSubmitting(false);
            Swal.fire({
                title: "Payment Successful!",
                text: `Transaction completed with Invoice No: ${res.data.invoice_no}`, 
                icon: "success",
            }).then(() => {
                setFormData({
                    from_account_id: "", to_account_id: "", debit: "", credit: "",
                    transaction_date: "",
                    description: "", entity_id: ""
                });
                setSelectedEntityId("");
                setFromBalance(0);
                fetchInvoiceNo(); 
            });
        } catch (err) {
            setIsSubmitting(false);
            const msg = err.response?.data?.message || err.response?.data?.error || "Transaction Failed!";
            toast.error(msg);
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
