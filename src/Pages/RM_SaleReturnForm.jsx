import React, { useState, useEffect, useCallback } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft, FaPlus, FaTrash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Footer from '../Components/Footer';
import { toast } from 'react-toastify';
import api from "../../api"; 
import '../Model.css';
import '../Transactions.css'; // Standardized CSS

const RM_SaleReturnForm = () => {
    const navigate = useNavigate();

    const [rows, setRows] = useState([
        { rm_id: "", rm_name: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", soldQty: 0, supplier_name: "", original_supplier_id: "" }
    ]);
    const [materials, setMaterials] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState("");
    const [invoiceNo, setInvoiceNo] = useState("");
    const [date, setDate] = useState("");
    const [grandTotal, setGrandTotal] = useState(0);

    const updateGrandTotal = (currentRows) => {
        const total = currentRows.reduce((sum, r) => sum + (parseFloat(r.total) || 0), 0);
        setGrandTotal(total.toFixed(2));
    };

    const fetchInvoiceNo = useCallback(async () => {
        try {
            const res = await api.get("/rm-transactions/rm-invoice", { params: { type: "SaleReturn" } });
            setInvoiceNo(res.data.invoice_no);
        } catch (err) {
            console.error("Error fetching invoice:", err);
        }
    }, []);

    useEffect(() => {
        api.get("/rm-transactions/eligible-customers")
            .then(res => setCustomers(res.data))
            .catch(err => console.error("Error fetching customers:", err));
        fetchInvoiceNo();
    }, [fetchInvoiceNo]);

    useEffect(() => {
        if (!selectedCustomer) {
            setMaterials([]);
            return;
        }
        api.get(`/rm-transactions/sold-materials/${selectedCustomer}`)
            .then(res => setMaterials(res.data))
            .catch(err => console.error("Error fetching materials:", err));
    }, [selectedCustomer]);

    const handleChange = (index, field, value) => {
        const updatedRows = [...rows];
        updatedRows[index][field] = value;

        if (field === "quantity" || field === "unitPrice") {
            const qty = parseFloat(updatedRows[index].quantity) || 0;
            const price = parseFloat(updatedRows[index].unitPrice) || 0;
            const maxSoldQty = parseFloat(updatedRows[index].soldQty) || 0;

            if (qty > maxSoldQty) {
                toast.error(`Customer bought only ${maxSoldQty} units!`);
                updatedRows[index].quantity = maxSoldQty; 
                updatedRows[index].total = (maxSoldQty * price).toFixed(2);
            } else {
                updatedRows[index].total = (qty * price).toFixed(2);
            }
        }

        setRows(updatedRows);
        updateGrandTotal(updatedRows);
    };

    const addRow = () => setRows([...rows, { rm_id: "", rm_name: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", soldQty: 0, supplier_name: "", original_supplier_id: "" }]);
    
    const deleteRow = (i) => { 
        const updated = rows.filter((_, idx) => idx !== i); 
        setRows(updated); 
        updateGrandTotal(updated); 
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCustomer) return toast.error("Please select a customer.");
        if (!date) return toast.error("Please select a return date.");
        
        const validRows = rows.filter(r => r.rm_id && parseFloat(r.quantity) > 0);
        if (validRows.length === 0) return toast.error("Please add at least one valid row.");

        const user = JSON.parse(localStorage.getItem("user"));
        const returnData = {
            entityid: selectedCustomer,
            grand_total: parseFloat(grandTotal),
            type: "SaleReturn",
            createdby: user?.username || "guest",
            invoice_no: invoiceNo,
            details: validRows.map(r => ({
                rm_id: r.rm_id,
                rm_name: r.rm_name,
                quantity: r.quantity,
                unit_price: r.unitPrice,
                total_price: r.total,
                uom_id: r.uom_id,
                date,
                supplier_name: r.supplier_name,
                original_supplier_id: r.original_supplier_id
            }))
        };

        try {
            await api.post("/rm-transactions", returnData);
            toast.success("Sale Return Successful!");
            navigate('/rm-sale-return');
        } catch (err) {
            toast.error(err.response?.data?.message || "Error saving return.");
        }
    };

    return (
        <div className="rm-page-wrapper">
            <NavigationBar />

            <div className="rm-content-container">
                <div className="rm-header-section">
                    <button className="back-btn" onClick={() => navigate("/rm-sale-return")}>
                        <FaArrowLeft />
                    </button>
                    <h2 className="form-title">Raw Material Sale Return</h2>
                </div>

                <div className="rm-main-card">
                    {/* Top Info Grid */}
                    <div className="info-grid">
                        <div className="info-item">
                            <label>Return Invoice No</label>
                            <input type="text" value={invoiceNo} readOnly className="rm-input-field readonly-input" />
                        </div>
                        <div className="info-item">
                            <label>Customer</label>
                            <select 
                                className="rm-input-field" 
                                value={selectedCustomer} 
                                onChange={(e) => {
                                    setSelectedCustomer(e.target.value);
                                    setRows([{ rm_id: "", rm_name: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", soldQty: 0, supplier_name: "", original_supplier_id: "" }]);
                                }}
                            >
                                <option value="">Select Customer</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="info-item">
                            <label>Return Date</label>
                            <input type="date" className="rm-input-field" value={date} onChange={(e) => setDate(e.target.value)} />
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="items-table-header">
                            <span>Material - Supplier</span>
                            <span>UOM</span>
                            <span>Qty</span>
                            <span>Unit Price</span>
                            <span>Total</span>
                            <span>Action</span>
                        </div>

                        {rows.map((row, index) => (
                            <div className="item-row" key={index}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <select 
                                        className="rm-input-field" 
                                        value={row.rm_id && row.original_supplier_id ? `${row.rm_id}-${row.original_supplier_id}` : ""} 
                                        onChange={(e) => {
                                            const combinedValue = e.target.value;
                                            if (!combinedValue) return handleChange(index, "rm_id", "");

                                            const [rmIdStr, supplierIdStr] = combinedValue.split('-');
                                            const selected = materials.find(m => String(m.rm_id) === rmIdStr && String(m.original_supplier_id) === supplierIdStr);

                                            if (selected) {
                                                handleChange(index, "rm_id", rmIdStr);
                                                handleChange(index, "rm_name", selected.rm_name);
                                                handleChange(index, "uom_id", selected.uom_id);
                                                handleChange(index, "uom_name", selected.uom_name);
                                                handleChange(index, "soldQty", selected.soldQty);
                                                handleChange(index, "supplier_name", selected.shop_name);
                                                handleChange(index, "original_supplier_id", supplierIdStr);
                                            }
                                        }}
                                        style={{ marginTop: '20px'}}
                                    >
                                        <option value="">Select Material</option>
                                        {materials.map(m => (
                                            <option key={`${m.rm_id}-${m.original_supplier_id}`} value={`${m.rm_id}-${m.original_supplier_id}`}>
                                                {m.rm_name} - {m.shop_name}
                                            </option>
                                        ))}
                                    </select>
                                    <small style={{ color: "gray", fontSize: '11px' }}>Sold: {row.soldQty}</small>
                                </div>

                                <input type="text" className="rm-input-field readonly-input" placeholder="UOM" value={row.uom_name} readOnly />
                                <input type="number" className="rm-input-field" placeholder="Qty" value={row.quantity} onChange={(e) => handleChange(index, "quantity", e.target.value)} />
                                <input type="number" className="rm-input-field" placeholder="Price" value={row.unitPrice} onChange={(e) => handleChange(index, "unitPrice", e.target.value)} />
                                <input type="text" className="rm-input-field readonly-input" value={row.total} readOnly />

                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <button type="button" className="quick-add-btn" style={{ color: '#3182ce' }} onClick={addRow}><FaPlus /></button>
                                    {rows.length > 1 && (
                                        <button type="button" className="quick-add-btn" style={{ color: '#e53e3e' }} onClick={() => deleteRow(index)}><FaTrash /></button>
                                    )}
                                </div>
                            </div>
                        ))}

                        <div className="summary-container">
                            <div className="summary-row grand-total-box">
                                <b>Grand Total:</b>
                                <b>{grandTotal}</b>
                            </div>
                        </div>

                        <button type="submit" className="save-btn-main">Save Sale Return</button>
                    </form>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default RM_SaleReturnForm;