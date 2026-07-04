import React, { useState, useEffect, useCallback } from "react";
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";
import Select from "react-select";
import { FaArrowLeft, FaPlus, FaTrash } from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import api from "../../api";
import "../Transactions.css"; 

const GeneralVoucherForm = () => {
    const navigate = useNavigate();
    const { voucherId } = useParams();
    const isEditMode = Boolean(voucherId);

    const [accounts, setAccounts] = useState([]);
    const [invoiceNo, setInvoiceNo] = useState("");
    const [suppliers, setSuppliers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingVoucher, setIsLoadingVoucher] = useState(false);

    const [transactionDate, setTransactionDate] = useState("");

    // INITIAL STATE: 3-Row Set Concept
    const [voucherGroups, setVoucherGroups] = useState([
        {
            debit: { account_id: "", type: "debit", amount: "", entity_id: "" },
            credit: { account_id: "", type: "credit", amount: "", entity_id: "" },
            description: ""
        }
    ]);

    const fetchInvoiceNo = useCallback(async () => {
        try {
            const res = await api.get("/payment-transactions/invoice-no?prefix=JV");
            setInvoiceNo(res.data.invoice_no);
        } catch (err) {
            console.error("Error fetching invoice:", err);
            setInvoiceNo("JV-INV-ERROR");
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
        if (isEditMode) {
            fetchVoucherDetails(voucherId);
        } else {
            fetchEntities();
            fetchAccounts();
            fetchInvoiceNo();
        }
    }, [fetchInvoiceNo, isEditMode, voucherId]);

    const getControlAccType = (accountId) => {
        const acc = accounts.find(a => a.id == accountId);
        if (!acc) return null;
        const name = acc.account_name.toLowerCase();
        if (name.includes('salary')) return 'Salary';
        if (name.includes('payable')) return 'Payable'; 
        if (name.includes('receivable')) return 'Receivable'; 
         
        return null;
    };

    const fetchVoucherDetails = async (id) => {
        setIsLoadingVoucher(true);
        try {
            const res = await api.get(`/payment-transactions/voucher/${id}`);
            const voucher = res.data;
            setInvoiceNo(voucher.invoice_no);
            setTransactionDate(voucher.transaction_date || "");

            const groups = [];
            voucher.entries.forEach((entry) => {
                if (entry.debit > 0) {
                    groups.push({
                        debit: {
                            account_id: entry.account_id,
                            type: "debit",
                            amount: entry.debit,
                            entity_id: entry.entity_id || ""
                        },
                        credit: {
                            account_id: "",
                            type: "credit",
                            amount: "",
                            entity_id: ""
                        },
                        description: entry.remarks || ""
                    });
                } else if (entry.credit > 0) {
                    const latestGroup = groups[groups.length - 1];
                    if (latestGroup && !latestGroup.credit.account_id) {
                        latestGroup.credit = {
                            account_id: entry.account_id,
                            type: "credit",
                            amount: entry.credit,
                            entity_id: entry.entity_id || ""
                        };
                        latestGroup.description = latestGroup.description || entry.remarks || "";
                    } else {
                        groups.push({
                            debit: {
                                account_id: "",
                                type: "debit",
                                amount: "",
                                entity_id: ""
                            },
                            credit: {
                                account_id: entry.account_id,
                                type: "credit",
                                amount: entry.credit,
                                entity_id: entry.entity_id || ""
                            },
                            description: entry.remarks || ""
                        });
                    }
                }
            });

            setVoucherGroups(groups.length ? groups : [
                {
                    debit: { account_id: "", type: "debit", amount: "", entity_id: "" },
                    credit: { account_id: "", type: "credit", amount: "", entity_id: "" },
                    description: ""
                }
            ]);

            fetchEntities();
            fetchAccounts();
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

    const getEntityOptions = (list = []) => list.map(entity => ({ value: entity.id, label: entity.name }));

    const handleFieldChange = (groupIndex, rowType, field, value) => {
        const updatedGroups = [...voucherGroups];
        updatedGroups[groupIndex][rowType][field] = value;

        if (field === "account_id") {
            updatedGroups[groupIndex][rowType]["entity_id"] = "";
        }
        setVoucherGroups(updatedGroups);
    };

    const handleEntitySelect = (groupIndex, rowType, selectedOption) => {
        handleFieldChange(groupIndex, rowType, "entity_id", selectedOption?.value || "");
    };

    const handleDescriptionChange = (groupIndex, value) => {
        const updatedGroups = [...voucherGroups];
        updatedGroups[groupIndex]["description"] = value;
        setVoucherGroups(updatedGroups);
    };

    const addVoucherGroup = () => {
        setVoucherGroups([
            ...voucherGroups,
            {
                debit: { account_id: "", type: "debit", amount: "", entity_id: "" },
                credit: { account_id: "", type: "credit", amount: "", entity_id: "" },
                description: ""
            }
        ]);
    };

    const removeVoucherGroup = (groupIndex) => {
        if (voucherGroups.length <= 1) {
            return toast.warn("At least one voucher entry group (Debit, Credit & Description) is required.");
        }
        const updatedGroups = voucherGroups.filter((_, i) => i !== groupIndex);
        setVoucherGroups(updatedGroups);
    };

    const totalDebit = voucherGroups.reduce((sum, g) => sum + (parseFloat(g.debit.amount) || 0), 0);
    const totalCredit = voucherGroups.reduce((sum, g) => sum + (parseFloat(g.credit.amount) || 0), 0);
    const difference = Math.abs(totalDebit - totalCredit);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        if (!transactionDate) return toast.error("Please select a transaction date.");
        
        const finalItems = [];

        for (let i = 0; i < voucherGroups.length; i++) {
            const group = voucherGroups[i];
            
            if (!group.debit.account_id) return toast.error(`Please select Debit Account Head for Set ${i + 1}.`);
            if (!group.debit.amount || parseFloat(group.debit.amount) <= 0) return toast.error(`Please enter a valid Debit Amount for Set ${i + 1}.`);
            const { list: debList } = getEntityListAndLabel(group.debit.account_id);
            if (debList.length > 0 && !group.debit.entity_id) return toast.error(`Please select Subsidiary Entity for Debit line in Set ${i + 1}.`);

            if (!group.credit.account_id) return toast.error(`Please select Credit Account Head for Set ${i + 1}.`);
            if (!group.credit.amount || parseFloat(group.credit.amount) <= 0) return toast.error(`Please enter a valid Credit Amount for Set ${i + 1}.`);
            const { list: credList } = getEntityListAndLabel(group.credit.account_id);
            if (credList.length > 0 && !group.credit.entity_id) return toast.error(`Please select Subsidiary Entity for Credit line in Set ${i + 1}.`);

            finalItems.push({
                account_id: group.debit.account_id,
                type: "debit",
                amount: parseFloat(group.debit.amount),
                entity_id: group.debit.entity_id || null,
                remarks: group.description || null
            });

            finalItems.push({
                account_id: group.credit.account_id,
                type: "credit",
                amount: parseFloat(group.credit.amount),
                entity_id: group.credit.entity_id || null,
                remarks: group.description || null
            });
        }

        if (totalDebit !== totalCredit) {
            return toast.error(`Voucher out of balance! Difference: ${difference.toFixed(2)}. Debit must equal Credit.`);
        }

        setIsSubmitting(true);
        const user = JSON.parse(localStorage.getItem("user"));

        const payload = {
            transaction_date: transactionDate,
            description: "Multi-Row Voucher Entry", 
            created_by: user ? user.id : null,
            voucher_prefix: "JV",
            items: finalItems
        };

        try {
            let res;
            if (isEditMode) {
                res = await api.put(`/payment-transactions/invoice/${invoiceNo}`, payload);
            } else {
                res = await api.post("/payment-transactions", payload);
            }

            setIsSubmitting(false);
            Swal.fire({
                title: isEditMode ? "Voucher updated successfully!" : "Journal Voucher Successful!",
                text: isEditMode ? `Voucher updated: ${invoiceNo}` : `Voucher No: ${res.data.invoice_no}`,
                icon: "success",
            }).then(() => {
                if (!isEditMode) {
                    setTransactionDate("");
                    setVoucherGroups([
                        {
                            debit: { account_id: "", type: "debit", amount: "", entity_id: "" },
                            credit: { account_id: "", type: "credit", amount: "", entity_id: "" },
                            description: ""
                        }
                    ]);
                    fetchInvoiceNo();
                } else {
                    navigate('/payments-list');
                }
            });
        } catch (err) {
            setIsSubmitting(false);
            toast.error(err.response?.data?.error || "Transaction Failed!");
        }
    };

    return (
        <div className="rm-page-wrapper">
            <NavigationBar />

            <div className="rm-content-container">
                <div className="rm-header-section">
                    <button className="back-btn" onClick={() => navigate(-1)}>
                        <FaArrowLeft />
                    </button>
                    <h2 className="form-title">
                        {isEditMode ? `Edit Journal Voucher (ID: ${voucherId})` : "Journal Voucher Entry"}
                    </h2>
                </div>

                <div className="rm-main-card">
                    <form onSubmit={handleSubmit}>
                        {/* Top Info Grid */}
                        <div className="info-grid">
                            <div className="info-item">
                                <label>Voucher No</label>
                                <input type="text" value={invoiceNo} readOnly className="rm-input-field readonly-input" />
                            </div>
                            <div className="info-item">
                                <label>Transaction Date</label>
                                <input 
                                    type="date" 
                                    className="rm-input-field" 
                                    value={transactionDate} 
                                    onChange={(e) => setTransactionDate(e.target.value)} 
                                    required
                                />
                            </div>
                        </div>

                        {/* DYNAMIC 3-ROW GRID MATRIX */}
                        <div className="voucher-table-wrapper" style={{ marginTop: "25px", overflowX: "auto" }}>
                            <table className="rm-transaction-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ background: "#f1f3f5", textAlign: "left", borderBottom: "2px solid #dee2e6" }}>
                                        <th style={{ padding: "12px 10px" }}>Account Head</th>
                                        <th style={{ padding: "12px 10px", width: "140px" }}>Type</th>
                                        <th style={{ padding: "12px 10px" }}>Subsidiary / Entity</th>
                                        <th style={{ padding: "12px 10px", width: "200px" }}>Amount</th>
                                        <th style={{ padding: "12px 10px", width: "95px", textAlign: "center" }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {voucherGroups.map((group, groupIndex) => {
                                        const { list: debEntityList, label: debEntityLabel } = getEntityListAndLabel(group.debit.account_id);
                                        const { list: credEntityList, label: credEntityLabel } = getEntityListAndLabel(group.credit.account_id);

                                        return (
                                            <React.Fragment key={groupIndex}>
                                                                                   {/* ROW 2: CREDIT ENTRY */}
                                                <tr style={{ borderBottom: "1px dashed #e9ecef", background: "#ffffff" }}>
                                                    <td style={{ padding: "8px" }}>
                                                        <select 
                                                            className="rm-input-field"
                                                            value={group.credit.account_id}
                                                            onChange={(e) => handleFieldChange(groupIndex, "credit", "account_id", e.target.value)}
                                                            required
                                                        >
                                                            <option value="">Select From Account</option>
                                                            {accounts.map(acc => (
                                                                <option key={acc.id} value={acc.id}>{acc.account_name} ({acc.account_code})</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td style={{ padding: "8px" }}>
                                                        <input 
                                                            type="text" 
                                                            value="Credit (Cr)" 
                                                            readOnly 
                                                            className="rm-input-field readonly-input" 
                                                            style={{ background: "#fdf2f2", color: "#dc3545", fontWeight: "bold", border: "1px solid #fbcccc" }} 
                                                        />
                                                    </td>
                                                    <td style={{ padding: "8px" }}>
                                                        {credEntityList.length > 0 ? (
                                                            <Select
                                                                classNamePrefix="react-select"
                                                                options={getEntityOptions(credEntityList)}
                                                                value={getEntityOptions(credEntityList).find(opt => opt.value === group.credit.entity_id) || null}
                                                                onChange={(selected) => handleEntitySelect(groupIndex, "credit", selected)}
                                                                placeholder={`Select ${credEntityLabel}`}
                                                                isClearable
                                                            />
                                                        ) : (
                                                            <input type="text" placeholder="N/A" readOnly className="rm-input-field readonly-input" />
                                                        )}
                                                    </td>
                                                    <td style={{ padding: "8px" }}>
                                                        <input 
                                                            type="number" step="any" placeholder="0.00" className="rm-input-field"
                                                            value={group.credit.amount}
                                                            onChange={(e) => handleFieldChange(groupIndex, "credit", "amount", e.target.value)}
                                                            required
                                                        />
                                                    </td>
                                                     {/* CUSTOM IMAGE INSPIRED ACTION BUTTONS ZONE */}
                                                    <td rowSpan={3} style={{ padding: "8px", textAlign: "center", borderLeft: "1px solid #dee2e6", background: "#f8f9fa" }}>
                                                        <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center", justifyContent: "center" }}>
                                                            {/* Custom UI Plus Button */}
                                                            <button 
                                                                type="button" 
                                                                onClick={addVoucherGroup}
                                                                style={{ 
                                                                    background: "#edf2f9", 
                                                                    color: "#0d6efd", 
                                                                    border: "1px solid #d2e3f7", 
                                                                    width: "44px", 
                                                                    height: "54px", 
                                                                    borderRadius: "8px", 
                                                                    cursor: "pointer", 
                                                                    display: "flex", 
                                                                    alignItems: "center", 
                                                                    justifyContent: "center",
                                                                    fontSize: "16px",
                                                                    transition: "all 0.2s ease"
                                                                }}
                                                                title="Add New 3-Row Set"
                                                            >
                                                                <FaPlus />
                                                            </button>
                                                            {/* Custom UI Delete Button */}
                                                            <button 
                                                                type="button" 
                                                                onClick={() => removeVoucherGroup(groupIndex)}
                                                                style={{ 
                                                                    background: "#edf2f9", 
                                                                    color: "#dc3545", 
                                                                    border: "1px solid #d2e3f7", 
                                                                    width: "44px", 
                                                                    height: "54px", 
                                                                    borderRadius: "8px", 
                                                                    cursor: "pointer", 
                                                                    display: "flex", 
                                                                    alignItems: "center", 
                                                                    justifyContent: "center",
                                                                    fontSize: "16px",
                                                                    transition: "all 0.2s ease"
                                                                }}
                                                                title="Delete This Set"
                                                            >
                                                                <FaTrash />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {/* ROW 1: DEBIT ENTRY */}
                                                <tr style={{ borderBottom: "1px dashed #e9ecef", background: "#ffffff" }}>
                                                    <td style={{ padding: "8px" }}>
                                                        <select 
                                                            className="rm-input-field"
                                                            value={group.debit.account_id}
                                                            onChange={(e) => handleFieldChange(groupIndex, "debit", "account_id", e.target.value)}
                                                            required
                                                        >
                                                            <option value="">Select To Account</option>
                                                            {accounts.map(acc => (
                                                                <option key={acc.id} value={acc.id}>{acc.account_name} ({acc.account_code})</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td style={{ padding: "8px" }}>
                                                        <input 
                                                            type="text" 
                                                            value="Debit (Dr)" 
                                                            readOnly 
                                                            className="rm-input-field readonly-input" 
                                                            style={{ background: "#e8f4fd", color: "#0d6efd", fontWeight: "bold", border: "1px solid #bbeeeb" }} 
                                                        />
                                                    </td>
                                                    <td style={{ padding: "8px" }}>
                                                        {debEntityList.length > 0 ? (
                                                            <Select
                                                                classNamePrefix="react-select"
                                                                options={getEntityOptions(debEntityList)}
                                                                value={getEntityOptions(debEntityList).find(opt => opt.value === group.debit.entity_id) || null}
                                                                onChange={(selected) => handleEntitySelect(groupIndex, "debit", selected)}
                                                                placeholder={`Select ${debEntityLabel}`}
                                                                isClearable
                                                            />
                                                        ) : (
                                                            <input type="text" placeholder="N/A" readOnly className="rm-input-field readonly-input" />
                                                        )}
                                                    </td>
                                                    <td style={{ padding: "8px" }}>
                                                        <input 
                                                            type="number" step="any" placeholder="0.00" className="rm-input-field"
                                                            value={group.debit.amount}
                                                            onChange={(e) => handleFieldChange(groupIndex, "debit", "amount", e.target.value)}
                                                            required
                                                        />
                                                    </td>
                                                   
                                                </tr>

             

                                                {/* ROW 3: DESCRIPTION / REMARKS */}
                                                <tr style={{ borderBottom: "3px solid #dee2e6", background: "#fdfdfd" }}>
                                                    <td colSpan={4} style={{ padding: "6px 12px" }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                            <span style={{ fontSize: "12px", color: "#6c757d", fontWeight: "600", whiteSpace: "nowrap" }}>Group Remarks:</span>
                                                            <input 
                                                                type="text"
                                                                className="rm-input-field"
                                                                placeholder="Enter narration/description specific to this entry group pair..."
                                                                style={{ fontStyle: "italic" }}
                                                                value={group.description}
                                                                onChange={(e) => handleDescriptionChange(groupIndex, e.target.value)}
                                                            />
                                                        </div>
                                                    </td>
                                                </tr>
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Totals Matrix Status Block */}
                        <div className="summary-container" style={{ marginTop: "25px", background: "#f8f9fa", padding: "15px", borderRadius: "4px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", margin: "5px 0" }}>
                                <span>Total Debit (Dr):</span>
                                <b>{totalDebit.toFixed(2)}</b>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", margin: "5px 0" }}>
                                <span>Total Credit (Cr):</span>
                                <b>{totalCredit.toFixed(2)}</b>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", margin: "5px 0", color: difference > 0 ? "#dc3545" : "#198754" }}>
                                <span>Out of Balance Match:</span>
                                <b>{difference.toFixed(2)}</b>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className="save-btn-main" 
                            disabled={isSubmitting || difference !== 0 || isLoadingVoucher}
                            style={{ marginTop: "20px", opacity: (difference !== 0 || isLoadingVoucher) ? 0.6 : 1 }}
                        >
                            {isLoadingVoucher ? "Loading voucher..." : isSubmitting ? "Processing..." : isEditMode ? "Update General Voucher" : "Submit General Voucher Entry"}
                        </button>
                    </form>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default GeneralVoucherForm;