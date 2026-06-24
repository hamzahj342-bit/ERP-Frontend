import React, { useState, useEffect, useCallback } from "react";
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";
import { FaArrowLeft, FaPlus, FaTrash } from "react-icons/fa";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import api from "../../api";

const BankVoucherForm = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    
    // 🌟 Safely parse exact parameter type without strict case breaking strings
    const rawType = searchParams.get("type")?.trim().toUpperCase();
    const voucherType = rawType === "BRV" ? "BRV" : "BPV";

    // --- State Management ---
    const [accounts, setAccounts] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]); 
    const [invoiceNo, setInvoiceNo] = useState("");
    const [suppliers, setSuppliers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false); 

    // --- Voucher Master Header Fields ---
    const [transactionDate, setTransactionDate] = useState("");
    const [selectedBankAccount, setSelectedBankAccount] = useState("");
    const [paymentMode, setPaymentMode] = useState("Cheque"); // Default Mode
    const [chequeNo, setChequeNo] = useState("");
    const [chequeDate, setChequeDate] = useState("");
    const [depositSlipNo, setDepositSlipNo] = useState(""); 

    // --- Dynamic Transaction Grid Rows ---
    const [voucherRows, setVoucherRows] = useState([
        { account_id: "", entity_id: "", amount: "", description: "" }
    ]);

    // Fetch Sequence Invoice Number
    const fetchInvoiceNo = useCallback(async () => {
        try {
            const res = await api.get(`/payment-transactions/invoice-no?prefix=${voucherType}`);
            setInvoiceNo(res.data.invoice_no);
        } catch (err) {
            setInvoiceNo(`${voucherType}-INV-ERROR`);
        }
    }, [voucherType]);

    // Load All Structural Dependencies On Mount
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [accRes, bankRes, entityRes] = await Promise.all([
                    api.get("/accounts/list-with-balance"),
                    api.get("/payment-transactions/asset-controls?type=bank"), 
                    api.get("/entities/transactions")
                ]);
                
                setAccounts(accRes.data);
                setBankAccounts(bankRes.data); 
                setCustomers(entityRes.data.filter(item => item.type === "customer"));
                setSuppliers(entityRes.data.filter(item => item.type === "supplier"));
                setEmployees(entityRes.data.filter(item => item.type === "employee"));
            } catch (err) {
                console.error("Core System Boot Error:", err);
                toast.error("Failed to safely fetch required operational matrix assets.");
            }
        };
        fetchInitialData();
        fetchInvoiceNo();
    }, [fetchInvoiceNo, voucherType]);

    // Parse Control Account Dynamic Relationships
    const getControlAccType = (accountId) => {
        const acc = accounts.find(a => a.id == accountId);
        if (!acc) return null;
        const name = acc.account_name.toLowerCase();
        if (name.includes('payable')) return 'Payable'; 
        if (name.includes('receivable')) return 'Receivable'; 
        if (name.includes('salary')) return 'Salary'; 
        return null;
    };

    const getEntityListAndLabel = (accountId) => {
        const type = getControlAccType(accountId);
        if (type === 'Payable') return { list: suppliers, label: "Supplier" };
        if (type === 'Receivable') return { list: customers, label: "Customer" };
        if (type === 'Salary') return { list: employees, label: "Employee" };
        return { list: [], label: "" };
    };

    // --- Grid Event Handlers ---
    const handleRowChange = (index, field, value) => {
        const updatedRows = [...voucherRows];
        updatedRows[index][field] = value;
        if (field === "account_id") updatedRows[index]["entity_id"] = ""; 
        setVoucherRows(updatedRows);
    };

    const addVoucherRow = () => {
        setVoucherRows([...voucherRows, { account_id: "", entity_id: "", amount: "", description: "" }]);
    };

    const removeVoucherRow = (index) => {
        if (voucherRows.length <= 1) return toast.warn("At least one structural leg required.");
        setVoucherRows(voucherRows.filter((_, i) => i !== index));
    };

    const totalAmount = voucherRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

    // --- Transaction Post Submission Handler ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        
        if (!transactionDate || !selectedBankAccount) {
            return toast.error("Please fill Transaction Date and Select Bank Account.");
        }

        const finalItems = [];
        for (let i = 0; i < voucherRows.length; i++) {
            const row = voucherRows[i];
            if (!row.account_id || !row.amount || parseFloat(row.amount) <= 0) {
                return toast.error(`Invalid ledger amount parameter at Row ${i + 1}`);
            }
            const { list } = getEntityListAndLabel(row.account_id);
            if (list.length > 0 && !row.entity_id) {
                return toast.error(`Please select corresponding Subsidiary Entity at Row ${i + 1}`);
            }

            // 🌟 FIXED: BPV me baaki accounts Debit hotay hain aur BRV me baaki accounts Credit hotay hain
            finalItems.push({
                account_id: row.account_id,
                type: voucherType === "BPV" ? "debit" : "credit",
                amount: parseFloat(row.amount),
                entity_id: row.entity_id || null,
                remarks: row.description || null
            });
        }

        // Automatic Offset/Balanced Balancing Double Entry Generation
        // 🌟 FIXED: BPV me Corporate Bank account Credit hoga, aur BRV me Corporate Bank account Debit hoga
        finalItems.push({
            account_id: selectedBankAccount,
            type: voucherType === "BPV" ? "credit" : "debit",
            amount: totalAmount,
            entity_id: null,
            remarks: `Auto-balanced bank ledger control side for ${voucherType} via ${paymentMode}`
        });

        setIsSubmitting(true);
        try {
            const res = await api.post("/payment-transactions", {
                transaction_date: transactionDate,
                description: `${voucherType} Entry [Mode: ${paymentMode}] ${chequeNo ? `- Ref/Chq:${chequeNo}` : ''}`,
                voucher_prefix: voucherType,
                cheque_no: chequeNo || null,
                cheque_date: chequeDate || null,
                deposit_slip_no: depositSlipNo || null,
                items: finalItems
            });
            
            setIsSubmitting(false);
            Swal.fire({ title: "Voucher Posted Successfully!", text: `Voucher Generated Ref: ${res.data.invoice_no}`, icon: "success" })
                .then(() => {
                    setTransactionDate(""); setChequeNo(""); setChequeDate(""); setDepositSlipNo(""); setSelectedBankAccount(""); setPaymentMode("Cheque");
                    setVoucherRows([{ account_id: "", entity_id: "", amount: "", description: "" }]);
                    fetchInvoiceNo();
                });
        } catch (err) {
            setIsSubmitting(false);
            toast.error(err.response?.data?.error || "Transaction Pipeline Broken!");
        }
    };

    return (
        <div className="rm-page-wrapper">
            <NavigationBar />
            <div className="rm-content-container">
                <div className="rm-header-section">
                    <button className="back-btn" onClick={() => navigate(-1)} type="button"><FaArrowLeft /></button>
                    <h2 className="form-title">{voucherType === "BPV" ? "Bank Payment Voucher (BPV)" : "Bank Receipt Voucher (BRV)"}</h2>
                </div>
                
                <div className="rm-main-card">
                    <form onSubmit={handleSubmit}>
                        {/* Master Header Fields Block */}
                        <div className="info-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px" }}>
                            <div className="info-item">
                                <label>Voucher No</label>
                                <input type="text" value={invoiceNo} readOnly className="rm-input-field readonly-input" />
                            </div>
                            <div className="info-item">
                                <label>Transaction Date</label>
                                <input type="date" className="rm-input-field" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} required />
                            </div>
                            <div className="info-item">
                                <label>Corporate Bank Account</label>
                                <select className="rm-input-field" value={selectedBankAccount} onChange={(e) => setSelectedBankAccount(e.target.value)} required>
                                    <option value="">-- Choose Account --</option>
                                    {bankAccounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.account_name} ({acc.account_code})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="info-item">
                                <label>Payment / Instrument Mode</label>
                                <select className="rm-input-field" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                                    <option value="Cheque">Cheque</option>
                                    <option value="Online Transfer / IBFT">Online Transfer / IBFT</option>
                                    <option value="Direct Cash Deposit">Direct Cash Deposit</option>
                                </select>
                            </div>
                        </div>

                        {/* Flexible Banking Clearing Instrument Block */}
                        <div className="info-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginTop: "20px", padding: "18px", background: "#f8f9fa", borderRadius: "8px", border: "1px dashed #dee2e6" }}>
                            <div className="info-item">
                                <label>{paymentMode === "Cheque" ? "Cheque Number" : "Transaction ID / Reference No"}</label>
                                <input type="text" className="rm-input-field" placeholder={paymentMode === "Cheque" ? "e.g. CHQ-882910" : "e.g. TRX-9923812"} value={chequeNo} onChange={(e) => setChequeNo(e.target.value)} />
                            </div>
                            <div className="info-item">
                                <label>{paymentMode === "Cheque" ? "Cheque Date" : "Transfer Date"}</label>
                                <input type="date" className="rm-input-field" value={chequeDate} onChange={(e) => setChequeDate(e.target.value)} />
                            </div>
                            <div className="info-item">
                                <label>Deposit Slip Number (If Any)</label>
                                <input type="text" className="rm-input-field" placeholder="e.g. SLIP-1022" value={depositSlipNo} onChange={(e) => setDepositSlipNo(e.target.value)} />
                            </div>
                        </div>

                        {/* Transaction Matrix Accounts Ledger Area */}
                        <div className="voucher-table-wrapper" style={{ marginTop: "30px" }}>
                            <table className="rm-transaction-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ background: "#f1f3f5" }}>
                                        <th style={{ padding: "12px", textAlign: "left" }}>Account Head</th>
                                        <th style={{ padding: "12px", textAlign: "left" }}>Subsidiary / Entity Lookup</th>
                                        <th style={{ padding: "12px", width: "180px", textAlign: "left" }}>Amount</th>
                                        <th style={{ padding: "12px", textAlign: "left" }}>Narration Description</th>
                                        <th style={{ padding: "12px", width: "95px", textAlign: "center" }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {voucherRows.map((row, index) => {
                                        const { list: entityList, label: entityLabel } = getEntityListAndLabel(row.account_id);
                                        return (
                                            <tr key={index} style={{ borderBottom: "1px solid #dee2e6" }}>
                                                <td style={{ padding: "8px" }}>
                                                    <select className="rm-input-field" value={row.account_id} onChange={(e) => handleRowChange(index, "account_id", e.target.value)} required>
                                                        <option value="">Select Account Head</option>
                                                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.account_name}</option>)}
                                                    </select>
                                                </td>
                                                <td style={{ padding: "8px" }}>
                                                    {entityList.length > 0 ? (
                                                        <select className="rm-input-field" value={row.entity_id} onChange={(e) => handleRowChange(index, "entity_id", e.target.value)} required>
                                                            <option value="">Select {entityLabel}</option>
                                                            {entityList.map(entity => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
                                                        </select>
                                                    ) : <input type="text" placeholder="N/A (No Subsidiary Control)" readOnly className="rm-input-field readonly-input" />}
                                                </td>
                                                <td style={{ padding: "8px" }}>
                                                    <input type="number" step="any" className="rm-input-field" placeholder="0.00" value={row.amount} onChange={(e) => handleRowChange(index, "amount", e.target.value)} required />
                                                </td>
                                                <td style={{ padding: "8px" }}>
                                                    <input type="text" className="rm-input-field" placeholder="Enter transaction reference..." value={row.description} onChange={(e) => handleRowChange(index, "description", e.target.value)} />
                                                </td>
                                                <td style={{ padding: "8px", textAlign: "center" }}>
                                                    <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                                                        <button type="button" onClick={addVoucherRow} style={{ background: "#edf2f9", color: "#0d6efd", border: "1px solid #d2e3f7", width: "38px", height: "38px", borderRadius: "6px", cursor: "pointer" }}><FaPlus /></button>
                                                        <button type="button" onClick={() => removeVoucherRow(index)} style={{ background: "#fdebee", color: "#dc3545", border: "1px solid #fbcacf", width: "38px", height: "38px", borderRadius: "6px", cursor: "pointer" }}><FaTrash /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Balance Matrix Info Block */}
                        <div style={{ marginTop: "20px", background: "#f8f9fa", padding: "15px", borderRadius: "6px", textAlign: "right" }}>
                            <strong style={{ fontSize: "16px" }}>Total Net Balanced Amount: <span style={{ color: "#0d6efd" }}>{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></strong>
                        </div>

                        <button type="submit" className="save-btn-main" disabled={isSubmitting} style={{ marginTop: "20px", }}>
                            {isSubmitting ? "Processing Ledger Save..." : `Save ${voucherType} Voucher`}
                        </button>
                    </form>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default BankVoucherForm;