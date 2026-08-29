import React, { useState, useEffect, useCallback } from "react";
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";
import Select from "react-select";
import { FaArrowLeft, FaPlus, FaTrash } from "react-icons/fa";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import api from "../../api";

const BankVoucherForm = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editId = searchParams.get("editId");
    const [voucherType, setVoucherType] = useState(
        searchParams.get("prefix")?.toUpperCase() === "BRV" ? "BRV" : "BPV"
    );
    const isEditMode = Boolean(editId);

    const [accounts, setAccounts] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [invoiceNo, setInvoiceNo] = useState("");
    const [suppliers, setSuppliers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingVoucher, setIsLoadingVoucher] = useState(false);

    // Form Header States matching Original UI
    const [transactionDate, setTransactionDate] = useState("");
    const [selectedBankAccount, setSelectedBankAccount] = useState("");
    const [paymentMode, setPaymentMode] = useState("Cheque");
    const [chequeNumber, setChequeNumber] = useState("");
    const [chequeDate, setChequeDate] = useState("");
    const [depositSlipNumber, setDepositSlipNumber] = useState("");

    const [voucherRows, setVoucherRows] = useState([
        { account_id: "", entity_id: "", amount: "", description: "" }
    ]);

    const fetchInvoiceNo = useCallback(async () => {
        try {
            const res = await api.get(`/payment-transactions/invoice-no?prefix=${voucherType}`);
            setInvoiceNo(res.data.invoice_no);
        } catch (err) {
            setInvoiceNo(`${voucherType}-INV-ERROR`);
        }
    }, [voucherType]);

    useEffect(() => {
        const fetchInitialData = async () => {
            let bankList = [];
            // 1. Fetch Accounts
            try {
                const accRes = await api.get("/accounts/list-with-balance");
                setAccounts(accRes.data || []);
            } catch (err) {
                console.error("Error loading accounts list:", err);
                toast.error("Failed to load account heads.");
            }

            // 2. Fetch Subsidiaries
            try {
                const entityRes = await api.get("/entities/transactions");
                if (entityRes.data) {
                    setCustomers(entityRes.data.filter(item => item.type === "customer"));
                    setSuppliers(entityRes.data.filter(item => item.type === "supplier"));
                    setEmployees(entityRes.data.filter(item => item.type === "employee"));
                }
            } catch (err) {
                console.error("Error loading entities:", err);
                toast.error("Failed to load subsidiaries.");
            }

            // 3. Fetch Asset Bank Controls
            try {
                const bankAccRes = await api.get("/payment-transactions/asset-controls?type=bank");
                bankList = bankAccRes.data || [];
                setBankAccounts(bankList);
            } catch (err) {
                console.error("Dynamic asset-controls API failed:", err);
                setBankAccounts([]);
            }

            if (isEditMode) {
                fetchVoucherDetails(editId, bankList);
            } else {
                fetchInvoiceNo();
            }
        };

        fetchInitialData();
    }, [fetchInvoiceNo, isEditMode, editId]);

    // Fallback filter for Bank Accounts if asset-controls endpoint is empty
    const renderBankAccounts = () => {
        if (bankAccounts && bankAccounts.length > 0) {
            return bankAccounts;
        }
        return accounts.filter(acc => {
            const isAsset = (acc.category_name?.toLowerCase() === "assets" || acc.category?.toLowerCase() === "assets");
            const hasBank = acc.account_name?.toLowerCase().includes("bank");
            return isAsset && hasBank;
        });
    };

    const getControlAccType = (accountId) => {
        const acc = accounts.find(a => String(a.id) === String(accountId));
        if (!acc) return null;
        const name = acc.account_name.toLowerCase();
        if (name.includes('salary')) return 'Salary';
        if (name.includes('payable')) return 'Payable';
        if (name.includes('receivable')) return 'Receivable';
        return null;
    };

    const fetchVoucherDetails = async (id, currentBankAccounts = []) => {
        setIsLoadingVoucher(true);
        try {
            const res = await api.get(`/payment-transactions/voucher/${id}`);
            const voucher = res.data;
            const type = voucher.type === "BRV" ? "BRV" : "BPV";
            setVoucherType(type);
            setInvoiceNo(voucher.invoice_no);
            setTransactionDate(voucher.transaction_date ? voucher.transaction_date.split('T')[0] : "");
            
            // Setting optional header instrument details
            setPaymentMode(voucher.payment_mode || "Cheque");
            setChequeNumber(voucher.cheque_no || voucher.cheque_number || "");
            setChequeDate(voucher.cheque_date ? voucher.cheque_date.split('T')[0] : "");
            setDepositSlipNumber(voucher.deposit_slip_number || voucher.slip_no || "");

            const isBankPayment = type === "BPV";
            const availableBankList = currentBankAccounts.length > 0 ? currentBankAccounts : bankAccounts;
            const bankAccountIds = new Set(availableBankList.map(b => String(b.id)));

            // 1. Detect Top Header Bank Account
            let detectedHeaderBankId = "";
            const headerBankEntry = voucher.entries.find(entry => {
                const entryAccId = String(entry.account_id);
                const isHeaderSide = isBankPayment ? Number(entry.credit) > 0 : Number(entry.debit) > 0;
                const isBankName = entry.account_name?.toLowerCase().includes("bank");
                const isKnownBankId = bankAccountIds.has(entryAccId);
                
                return isHeaderSide && (isBankName || isKnownBankId);
            });

            if (headerBankEntry) {
                detectedHeaderBankId = String(headerBankEntry.account_id);
                setSelectedBankAccount(detectedHeaderBankId);
            }

            // 2. Filter Table Grid Rows
            const gridEntries = voucher.entries.filter(entry => {
                const entryAccId = String(entry.account_id);
                const isBankName = entry.account_name?.toLowerCase().includes("bank");
                const isKnownBankId = bankAccountIds.has(entryAccId);

                if (detectedHeaderBankId && entryAccId === detectedHeaderBankId) return false;
                if (isKnownBankId || isBankName) return false;

                if (isBankPayment && !(Number(entry.debit) > 0)) return false;
                if (!isBankPayment && !(Number(entry.credit) > 0)) return false;

                return true;
            });

            const mappedRows = gridEntries.map(entry => ({
                account_id: String(entry.account_id),
                entity_id: entry.entity_id ? String(entry.entity_id) : "",
                amount: Number(entry.debit || entry.credit || 0),
                description: entry.remarks || ""
            }));

            setVoucherRows(mappedRows.length ? mappedRows : [{ account_id: "", entity_id: "", amount: "", description: "" }]);
        } catch (err) {
            console.error("Error loading voucher details:", err);
            toast.error(err.response?.data?.error || "Unable to load voucher to edit.");
        } finally {
            setIsLoadingVoucher(false);
        }
    };

    const getEntityListAndLabel = (accountId) => {
        const type = getControlAccType(accountId);
        if (type === 'Salary') return { list: employees, label: "Employee" };
        if (type === 'Payable') return { list: suppliers, label: "Supplier" };
        if (type === 'Receivable') return { list: customers, label: "Customer" };
        return { list: [], label: "" };
    };

    const getEntityOptions = (list = []) => list.map(entity => ({ value: String(entity.id), label: entity.name }));

    const handleRowChange = (index, field, value) => {
        const updatedRows = [...voucherRows];
        updatedRows[index][field] = value;
        if (field === "account_id") updatedRows[index]["entity_id"] = "";
        setVoucherRows(updatedRows);
    };

    const handleEntitySelect = (index, selectedOption) => {
        handleRowChange(index, "entity_id", selectedOption?.value || "");
    };

    const addVoucherRow = () => {
        setVoucherRows([...voucherRows, { account_id: "", entity_id: "", amount: "", description: "" }]);
    };

    const removeVoucherRow = (index) => {
        if (voucherRows.length <= 1) return toast.warn("At least one line item is required.");
        setVoucherRows(voucherRows.filter((_, i) => i !== index));
    };

    const totalAmount = voucherRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        if (!transactionDate || !selectedBankAccount) {
            return toast.error("Please select Transaction Date and Corporate Bank Account.");
        }

        const finalItems = [];
        for (let i = 0; i < voucherRows.length; i++) {
            const row = voucherRows[i];
            if (!row.account_id || !row.amount || parseFloat(row.amount) <= 0) {
                return toast.error(`Invalid Account Head or Amount at Row ${i + 1}`);
            }
            const { list } = getEntityListAndLabel(row.account_id);
            if (list.length > 0 && !row.entity_id) {
                return toast.error(`Please select Subsidiary / Entity at Row ${i + 1}`);
            }

            finalItems.push({
                account_id: row.account_id,
                type: voucherType === "BPV" ? "debit" : "credit",
                amount: parseFloat(row.amount),
                entity_id: row.entity_id || null,
                remarks: row.description || null
            });
        }

        const payload = {
            transaction_date: transactionDate,
            description: `${voucherType} Entry - Bank Transaction`,
            voucher_prefix: voucherType,
            bank_account_id: selectedBankAccount,
            account_id: selectedBankAccount,
            payment_mode: paymentMode,
            cheque_no: chequeNumber || null,
            cheque_date: chequeDate || null,
            deposit_slip_number: depositSlipNumber || null,
            items: finalItems
        };

        setIsSubmitting(true);
        try {
            let res;
            if (isEditMode) {
                res = await api.put(`/payment-transactions/invoice/${invoiceNo}`, payload);
            } else {
                res = await api.post("/payment-transactions", payload);
            }

            setIsSubmitting(false);
            Swal.fire({
                title: isEditMode ? "Voucher updated successfully!" : "Success",
                text: `Voucher No: ${res.data.invoice_no}`,
                icon: "success"
            }).then(() => {
                if (!isEditMode) {
                    setTransactionDate("");
                    setSelectedBankAccount("");
                    setChequeNumber("");
                    setChequeDate("");
                    setDepositSlipNumber("");
                    setVoucherRows([{ account_id: "", entity_id: "", amount: "", description: "" }]);
                    fetchInvoiceNo();
                } else {
                    navigate('/bank-vouchers-list');
                }
            });
        } catch (err) {
            setIsSubmitting(false);
            toast.error(err.response?.data?.error || "Transaction Failed!");
        }
    };

    if (isEditMode && isLoadingVoucher) {
        return (
            <div className="rm-page-wrapper">
                <NavigationBar />
                <div className="rm-content-container" style={{ padding: '60px', textAlign: 'center' }}>
                    <h2>Loading voucher details...</h2>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="rm-page-wrapper">
            <NavigationBar />
            <div className="rm-content-container">
                {/* Original Header Section with Arrow Back Button */}
                <div className="rm-header-section" style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "20px" }}>
                    <button 
                        className="back-btn" 
                        type="button" 
                        onClick={() => navigate(-1)}
                        // style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "8px", padding: "8px 12px", cursor: "pointer" }}
                    >
                        <FaArrowLeft />
                    </button>
                    <h2 className="form-title" style={{ margin: 0, fontSize: "20px", fontWeight: "700" }}>
                        {voucherType === "BPV"
                            ? (isEditMode ? "Edit Bank Payment Voucher (BPV)" : "Bank Payment Voucher (BPV)")
                            : (isEditMode ? "Edit Bank Receipt Voucher (BRV)" : "Bank Receipt Voucher (BRV)")}
                    </h2>
                </div>

                <div className="rm-main-card" style={{ background: "#fff", padding: "25px", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                    <form onSubmit={handleSubmit}>
                        {/* Top Header Controls Matching Exact Screenshot */}
                        <div className="info-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "15px", marginBottom: "25px" }}>
                            <div className="info-item">
                                <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#6c757d", display: "block", marginBottom: "6px" }}>VOUCHER NO</label>
                                <input type="text" value={invoiceNo} readOnly className="rm-input-field readonly-input" style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #e2e8f0", background: "#f8f9fa" }} />
                            </div>
                            <div className="info-item">
                                <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#6c757d", display: "block", marginBottom: "6px" }}>TRANSACTION DATE</label>
                                <input type="date" className="rm-input-field" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} required style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #e2e8f0" }} />
                            </div>
                            <div className="info-item">
                                <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#6c757d", display: "block", marginBottom: "6px" }}>CORPORATE BANK ACCOUNT</label>
                                <select className="rm-input-field" value={selectedBankAccount} onChange={(e) => setSelectedBankAccount(e.target.value)} required style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                                    <option value="">Select Bank Account</option>
                                    {renderBankAccounts().map(acc => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.account_name} {acc.account_code ? `(${acc.account_code})` : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="info-item">
                                <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#6c757d", display: "block", marginBottom: "6px" }}>PAYMENT / INSTRUMENT MODE</label>
                                <select className="rm-input-field" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                                    <option value="Cheque">Cheque</option>
                                    <option value="Online / Pay Order">Online / Pay Order</option>
                                    <option value="Demand Draft">Demand Draft</option>
                                </select>
                            </div>
                        </div>

                        {/* Optional Instrument Details Section with Dashed Outline */}
                        <div style={{ marginBottom: "25px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "15px" }}>
                            <div>
                                <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#6c757d", display: "block", marginBottom: "6px" }}>CHEQUE NUMBER</label>
                                <input type="text" className="rm-input-field" placeholder="e.g. CHQ-882910" value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #e2e8f0" }} />
                            </div>
                            <div>
                                <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#6c757d", display: "block", marginBottom: "6px" }}>CHEQUE DATE</label>
                                <input type="date" className="rm-input-field" value={chequeDate} onChange={(e) => setChequeDate(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #e2e8f0" }} />
                            </div>
                            <div>
                                <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#6c757d", display: "block", marginBottom: "6px" }}>DEPOSIT SLIP NUMBER (IF ANY)</label>
                                <input type="text" className="rm-input-field" placeholder="e.g. SLIP-1022" value={depositSlipNumber} onChange={(e) => setDepositSlipNumber(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #e2e8f0" }} />
                            </div>
                        </div>

                        {/* Table Items Grid */}
                        <div className="voucher-table-wrapper">
                            <table className="rm-transaction-table" style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 8px" }}>
                                <thead>
                                    <tr style={{ background: "#f8f9fa", textAlign: "left" }}>
                                        <th style={{ padding: "10px 12px", fontSize: "13px", fontWeight: "600", color: "#2d3748" }}>Account Head</th>
                                        <th style={{ padding: "10px 12px", fontSize: "13px", fontWeight: "600", color: "#2d3748" }}>Subsidiary / Entity Lookup</th>
                                        <th style={{ padding: "10px 12px", fontSize: "13px", fontWeight: "600", color: "#2d3748", width: "160px" }}>Amount</th>
                                        <th style={{ padding: "10px 12px", fontSize: "13px", fontWeight: "600", color: "#2d3748" }}>Narration Description</th>
                                        <th style={{ padding: "10px 12px", fontSize: "13px", fontWeight: "600", color: "#2d3748", width: "90px", textAlign: "center" }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {voucherRows.map((row, index) => {
                                        const { list: entityList, label: entityLabel } = getEntityListAndLabel(row.account_id);
                                        return (
                                            <tr key={index}>
                                                <td style={{ padding: "4px" }}>
                                                    <select className="rm-input-field" value={row.account_id} onChange={(e) => handleRowChange(index, "account_id", e.target.value)} required style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                                                        <option value="">Select Account Head</option>
                                                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.account_name}</option>)}
                                                    </select>
                                                </td>
                                                <td style={{ padding: "4px" }}>
                                                    {entityList.length > 0 ? (
                                                        <Select
                                                            classNamePrefix="react-select"
                                                            options={getEntityOptions(entityList)}
                                                            value={getEntityOptions(entityList).find(opt => String(opt.value) === String(row.entity_id)) || null}
                                                            onChange={(selected) => handleEntitySelect(index, selected)}
                                                            placeholder={`Select ${entityLabel}`}
                                                            isClearable
                                                        />
                                                    ) : <input type="text" placeholder="N/A" readOnly className="rm-input-field readonly-input" style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #e2e8f0", background: "#f8f9fa" }} />}
                                                </td>
                                                <td style={{ padding: "4px" }}>
                                                    <input type="number" step="any" className="rm-input-field" value={row.amount} onChange={(e) => handleRowChange(index, "amount", e.target.value)} required placeholder="Amount" style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #e2e8f0" }} />
                                                </td>
                                                <td style={{ padding: "4px" }}>
                                                    <input type="text" className="rm-input-field" value={row.description} onChange={(e) => handleRowChange(index, "description", e.target.value)} placeholder="Narration" style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #e2e8f0" }} />
                                                </td>
                                                <td style={{ padding: "4px", textAlign: "center" }}>
                                                    <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                                                        <button type="button" onClick={addVoucherRow} style={{ background: "#ebf8ff", color: "#3182ce", border: "none", width: "34px", height: "34px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><FaPlus /></button>
                                                        <button type="button" onClick={() => removeVoucherRow(index)} style={{ background: "#fff5f5", color: "#e53e3e", border: "none", width: "34px", height: "34px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><FaTrash /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Total Net Balanced Amount Footer Matching Screenshot */}
                        <div style={{ marginTop: "15px", background: "#f7fafc", padding: "14px", borderRadius: "6px", textAlign: "right" }}>
                            <span style={{ fontWeight: "700", fontSize: "14px", color: "#2d3748" }}>
                                Total Net Balanced Amount: <span style={{ color: "#3182ce" }}>{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </span>
                        </div>

                        {/* Save Button Styled as Screenshot */}
                        <button 
                            type="submit" 
                            disabled={isSubmitting} 
                            style={{ marginTop: "20px", background: "#10b981", color: "#fff", border: "none", padding: "12px 24px", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}
                        >
                            {isSubmitting ? "Posting..." : (isEditMode ? `Update ${voucherType} Voucher` : `Save ${voucherType} Voucher`)}
                        </button>
                    </form>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default BankVoucherForm;