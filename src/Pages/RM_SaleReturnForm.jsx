import React, { useState, useEffect, useCallback } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft, FaPlus, FaTrash } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
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
    const location = useLocation();
    const invoiceType = new URLSearchParams(location.search).get('invoiceType');

    const [materials, setMaterials] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState("");
    const [invoiceNo, setInvoiceNo] = useState("");
    const [date, setDate] = useState("");
    const [subTotal, setSubTotal] = useState(0);
    const [taxableAmount, setTaxableAmount] = useState(0);
    const [taxAmount, setTaxAmount] = useState(0);
    const [isTaxable, setIsTaxable] = useState(() => invoiceType !== 'nonTaxable');
    const [taxMode, setTaxMode] = useState('exclusive');
    const [taxRate, setTaxRate] = useState(0);
    const [taxId, setTaxId] = useState(null);
    const [globalDiscount, setGlobalDiscount] = useState(0);
    const [grandTotal, setGrandTotal] = useState(0);

    const updateGrandTotal = (currentRows, currentIsTaxable = isTaxable, currentTaxMode = taxMode, currentTaxRate = taxRate, discountValue = globalDiscount) => {
        const currentSubTotal = currentRows.reduce((sum, r) => sum + (parseFloat(r.total) || 0), 0);
        const discount = parseFloat(discountValue) || 0;
        const netValue = Math.max(0, currentSubTotal - discount);

        let calculatedTaxable = netValue;
        let calculatedTaxAmount = 0;
        let calculatedGrand = netValue;

        if (currentIsTaxable && (parseFloat(currentTaxRate) || 0) > 0) {
            const rate = parseFloat(currentTaxRate) / 100;
            if (currentTaxMode === 'inclusive') {
                calculatedTaxable = netValue / (1 + rate);
                calculatedTaxAmount = netValue - calculatedTaxable;
                calculatedGrand = netValue;
            } else {
                calculatedTaxable = netValue;
                calculatedTaxAmount = calculatedTaxable * rate;
                calculatedGrand = calculatedTaxable + calculatedTaxAmount;
            }
        }

        setSubTotal(currentSubTotal.toFixed(2));
        setTaxableAmount(calculatedTaxable.toFixed(2));
        setTaxAmount(calculatedTaxAmount.toFixed(2));
        setGrandTotal(Math.max(0, calculatedGrand).toFixed(2));
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
        // Fetch Eligible Customers
        api.get("/rm-transactions/eligible-customers")
            .then(res => setCustomers(res.data))
            .catch(err => console.error("Error fetching customers:", err));

        fetchInvoiceNo();
    }, [fetchInvoiceNo]);

    useEffect(() => {
        if (!selectedCustomer) {
            setMaterials([]);
            setTaxId(null);
            setTaxRate(0);
            setTaxMode('exclusive');
            updateGrandTotal(rows, isTaxable, 'exclusive', 0, globalDiscount);
            return;
        }

        api.get(`/rm-transactions/sold-materials/${selectedCustomer}`)
            .then(res => setMaterials(res.data))
            .catch(err => console.error("Error fetching materials:", err));

        api.get(`/rm-transactions/customer-last-tax/${selectedCustomer}`)
            .then(res => {
                setTaxId(res.data.tax_id || null);
                setTaxRate(Number(res.data.tax_rate) || 0);
                setTaxMode(res.data.tax_mode || 'exclusive');
                updateGrandTotal(rows, isTaxable, res.data.tax_mode || 'exclusive', Number(res.data.tax_rate) || 0, globalDiscount);
            })
            .catch(err => {
                console.error("Error fetching customer tax rate:", err);
                setTaxId(null);
                setTaxRate(0);
                setTaxMode('exclusive');
                updateGrandTotal(rows, isTaxable, 'exclusive', 0, globalDiscount);
            });
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
        updateGrandTotal(updatedRows, isTaxable, taxMode, taxRate);
    };

    const handleTaxableChange = (value) => {
        setIsTaxable(value);
        updateGrandTotal(rows, value, taxMode, taxRate);
    };

    const addRow = () => setRows([...rows, { rm_id: "", rm_name: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", soldQty: 0, supplier_name: "", original_supplier_id: "" }]);
    
    const deleteRow = (i) => { 
        const updated = rows.filter((_, idx) => idx !== i); 
        setRows(updated); 
        updateGrandTotal(updated, isTaxable, taxMode, taxRate); 
    };

    const handleGlobalDiscountChange = (value) => {
        setGlobalDiscount(value);
        updateGrandTotal(rows, isTaxable, taxMode, taxRate, value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCustomer) return toast.error("Please select a customer.");
        if (!date) return toast.error("Please select a return date.");
        if (isTaxable && (!taxRate || Number(taxRate) <= 0)) return toast.error("Please select a valid tax configuration for taxable returns.");
        
        const validRows = rows.filter(r => r.rm_id && parseFloat(r.quantity) > 0);
        if (validRows.length === 0) return toast.error("Please add at least one valid row.");

        const user = JSON.parse(localStorage.getItem("user"));
        const returnData = {
            entityid: selectedCustomer,
            grand_total: parseFloat(grandTotal),
            sub_total: parseFloat(subTotal),
            taxable_amount: parseFloat(taxableAmount),
            tax_amount: parseFloat(taxAmount),
            is_taxable: isTaxable,
            tax_mode: taxMode,
            tax_rate: parseFloat(taxRate),
            tax_id: taxId,
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
                            <div className="summary-row">
                                <label>Sub Total:</label>
                                <span>{subTotal}</span>
                            </div>
                            {isTaxable && (
                                <>
                                    {/* Tax Mode input is hidden; default is exclusive. */}
                                    <div className="summary-row">
                                        <label>Tax Rate (%)</label>
                                        <input 
                                            type="number" 
                                            className="rm-input-field readonly-input" 
                                            style={{ width: '120px' }} 
                                            value={taxRate} 
                                            readOnly 
                                        />
                                    </div>
                                    <div className="summary-row">
                                        <label>Taxable Amount:</label>
                                        <span>{taxableAmount}</span>
                                    </div>
                                    <div className="summary-row">
                                        <label>Tax Amount:</label>
                                        <span>{taxAmount}</span>
                                    </div>
                                </>
                            )}
                            <div className="summary-row">
                                <label>Discount:</label>
                                <input type="number" className="rm-input-field" style={{ width: '120px' }} value={globalDiscount} onChange={(e) => handleGlobalDiscountChange(e.target.value)} />
                            </div>
                            <div className="summary-row grand-total-box">
                                <b>Grand Total:</b>
                                <b>{grandTotal}</b>
                            </div>
                        </div>

                        <button type="submit" className="save-btn-main">Save</button>
                    </form>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default RM_SaleReturnForm;