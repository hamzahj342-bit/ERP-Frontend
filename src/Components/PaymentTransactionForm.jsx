import React, { useState, useEffect, useCallback } from "react";
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import api from "../../api";
import "../Transactions.css"; 

const PaymentTransactionForm = () => {
    const navigate = useNavigate();

    const [accounts, setAccounts] = useState([]);
    const [invoiceNo, setInvoiceNo] = useState("");
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

    const fetchInvoiceNo = useCallback(async () => {
        try {
            const res = await api.get("/payment-transactions/invoice-no?type=payments");
            setInvoiceNo(res.data.invoice_no);
        } catch (err) {
            console.error("Error fetching invoice:", err);
            setInvoiceNo("PAY-INV-ERROR");
        }
    }, []);

    const fetchAccounts = async () => {
        try {
            const res = await api.get("/accounts/list-with-balance");
            setAccounts(res.data);
        } catch (err) { console.error("Error fetching accounts:", err); }
    };

    const fetchEntities = async () => {
        try {
            const res = await api.get("/entities/transactions");
            const data = res.data;
            setCustomers(data.filter(item => item.type === "customer"));
            setSuppliers(data.filter(item => item.type === "supplier"));
            setEmployees(data.filter(item => item.type === "employee"));
        } catch (err) { console.error("Error fetching entities:", err); }
    };

    useEffect(() => {
        fetchEntities();
        fetchAccounts();
        fetchInvoiceNo();
    }, [fetchInvoiceNo]);

    const getControlAccType = (accountId) => {
        const acc = accounts.find(a => a.id == accountId);
        if (!acc) return null;
        const name = acc.account_name.toLowerCase();
        if (name.includes('payable')) return 'Payable'; 
        if (name.includes('receivable')) return 'Receivable'; 
        if (name.includes('salary')) return 'Salary'; 
        return null;
    };

    const activeControlAcc = getControlAccType(formData.from_account_id) || getControlAccType(formData.to_account_id);
    let entityList = [];
    let entityTypeLabel = "Entity";

    if (activeControlAcc === 'Payable') { entityList = suppliers; entityTypeLabel = "Supplier"; }
    else if (activeControlAcc === 'Receivable') { entityList = customers; entityTypeLabel = "Customer"; }
    else if (activeControlAcc === 'Salary') { entityList = employees; entityTypeLabel = "Employee"; }

    const handleChange = (field, value) => {
        setFormData(prev => {
            const updated = { ...prev, [field]: value };
            if (field === "credit") { updated.debit = value; }
            return updated;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        if (!formData.from_account_id || !formData.to_account_id) return toast.error("Please select both accounts.");
        if (!formData.transaction_date) return toast.error("Please select a transaction date.");
        
        setIsSubmitting(true);
        const user = JSON.parse(localStorage.getItem("user"));
        const amount = parseFloat(formData.credit);

        const payload = {
            from_account_id: formData.from_account_id,
            to_account_id: formData.to_account_id,
            debit: amount, 
            credit: amount,
            transaction_date: formData.transaction_date,
            description: formData.description,
            created_by: user ? user.id : null,
            type: "payments",
            entity_id: selectedEntityId || null,
        };

        try {
            const res = await api.post("/payment-transactions", payload);
            setIsSubmitting(false);
            Swal.fire({
                title: "Payment Successful!",
                text: `Invoice No: ${res.data.invoice_no}`, 
                icon: "success",
            }).then(() => {
                setFormData({ from_account_id: "", to_account_id: "", debit: "", credit: "", transaction_date: "", description: "", entity_id: "" });
                setSelectedEntityId("");
                fetchInvoiceNo(); 
            });
        } catch (err) {
            setIsSubmitting(false);
            toast.error(err.response?.data?.message || "Transaction Failed!");
        }
    };

    return (
        <div className="rm-page-wrapper">
            <NavigationBar />

            <div className="rm-content-container">
                <div className="rm-header-section">
                    <button className="back-btn" onClick={() => navigate("/payment-transactions")}>
                        <FaArrowLeft />
                        {/* className="back-btn-styled"*/}
                    </button>
                    <h2 className="form-title">Payment Transaction</h2>
                </div>

                <div className="rm-main-card">
                    <form onSubmit={handleSubmit}>
                        {/* Top Info Grid */}
                        <div className="info-grid">
                            <div className="info-item">
                                <label>Invoice No</label>
                                <input type="text" value={invoiceNo} readOnly className="rm-input-field readonly-input" />
                            </div>
                            <div className="info-item">
                                <label>Transaction Date</label>
                                <input 
                                    type="date" 
                                    className="rm-input-field" 
                                    value={formData.transaction_date} 
                                    onChange={(e) => handleChange("transaction_date", e.target.value)} 
                                    required
                                />
                            </div>
                        </div>

                        {/* Account Selection Grid */}
                        <div className="info-grid">
                            <div className="info-item">
                                <label>From Account (Source)</label>
                                <select 
                                    className="rm-input-field" 
                                    value={formData.from_account_id} 
                                    onChange={(e) => handleChange("from_account_id", e.target.value)}
                                    required
                                >
                                    <option value="">Select Account</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.account_name} ({acc.account_code})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="info-item">
                                <label>To Account (Destination)</label>
                                <select 
                                    className="rm-input-field" 
                                    value={formData.to_account_id} 
                                    onChange={(e) => handleChange("to_account_id", e.target.value)}
                                    required
                                >
                                    <option value="">Select Account</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.account_name} ({acc.account_code})</option>
                                    ))}
                                </select>
                            </div>

                            {activeControlAcc && (
                                <div className="info-item">
                                    <label>{entityTypeLabel}</label>
                                    <select 
                                        className="rm-input-field" 
                                        value={selectedEntityId} 
                                        onChange={(e) => setSelectedEntityId(e.target.value)}
                                        required
                                    >
                                        <option value="">Select {entityTypeLabel}</option>
                                        {entityList.map(entity => (
                                            <option key={entity.id} value={entity.id}>{entity.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Amount Section */}
                        <div className="info-grid" style={{ borderBottom: 'none' }}>
                            <div className="info-item">
                                <label>Amount (Credit)</label>
                                <input
                                    type="number"
                                    className="rm-input-field"
                                    placeholder="0.00"
                                    value={formData.credit}
                                    onChange={(e) => handleChange("credit", e.target.value)}
                                    required
                                />
                            </div>
                            <div className="info-item">
                                <label>Debit Amount (Auto)</label>
                                <input type="number" className="rm-input-field readonly-input" value={formData.credit} readOnly />
                            </div>
                        </div>

                        {/* Description Section */}
                        <div className="info-item" style={{ marginTop: '10px' }}>
                            <label>Description / Remarks</label>
                            <textarea 
                                className="rm-input-field" 
                                rows={3} 
                                placeholder="Enter transaction details..."
                                value={formData.description} 
                                onChange={(e) => handleChange("description", e.target.value)}
                            ></textarea>
                        </div>

                        <div className="summary-container">
                            <div className="summary-row grand-total-box">
                                <b>Total Payment:</b>
                                <b>{formData.credit || 0}</b>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className="save-btn-main" 
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Processing..." : "Submit Payment Transaction"}
                        </button>
                    </form>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default PaymentTransactionForm;