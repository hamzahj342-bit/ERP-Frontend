import React, { useState, useEffect, useCallback } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft, FaPlus, FaTrash } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import Footer from '../Components/Footer';
import { toast } from 'react-toastify';
import api from "../../api";
import '../Model.css';
import '../Transactions.css'; // Dono ka same CSS file

const RM_SaleForm = () => {
    const navigate = useNavigate();

    const [rows, setRows] = useState([
        { rm_id: "", rm_name: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", stock: 0, supplier_id: "" }
    ]);
    const [materials, setMaterials] = useState([]);
    const location = useLocation();
    const invoiceType = new URLSearchParams(location.search).get('invoiceType');

    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState("");
    const [invoiceNo, setInvoiceNo] = useState("");
    const [date, setDate] = useState("");
    
    const [subTotal, setSubTotal] = useState(0);
    const [taxableAmount, setTaxableAmount] = useState(0);
    const [taxAmount, setTaxAmount] = useState(0);
    const [globalDiscount, setGlobalDiscount] = useState("");
    const [grandTotal, setGrandTotal] = useState(0);
    const [isTaxable, setIsTaxable] = useState(() => invoiceType !== 'nonTaxable');
    const [taxMode, setTaxMode] = useState('exclusive');
    const [taxRate, setTaxRate] = useState(0);
    const [taxId, setTaxId] = useState(null);
    const [showCustomerModal, setShowCustomerModal] = useState(false);

    const fetchInvoiceNo = useCallback(async () => {
        try {
            const res = await api.get("/rm-transactions/rm-invoice", {
                params: { type: "Sale" }
            });
            setInvoiceNo(res.data.invoice_no);
        } catch (err) {
            console.error("Error fetching invoice:", err);
        }
    }, []);

    useEffect(() => {
        // Fetch Customers
        api.get("/entities/transactions")
            .then(res => setCustomers(res.data.filter(ent => ent.type === "customer")))
            .catch(err => console.error("Error fetching customers:", err));
        
        // Fetch Materials with Supplier Data (Sale ke liye zaruri hai)
        api.get("/rm-transactions/materials-with-suppliers")
            .then(res => setMaterials(res.data))
            .catch(err => console.error("Error fetching materials:", err));

        api.get("/tax-master/latest/active")
            .then(res => {
                setTaxId(res.data.id);
                setTaxRate(Number(res.data.tax_rate) || 0);
                setTaxMode(res.data.taxtype || 'exclusive');
            })
            .catch(err => {
                console.error("Error fetching latest tax:", err);
                setTaxMode('exclusive');
            });

        fetchInvoiceNo();
    }, [fetchInvoiceNo]);

    const calculateTotals = (currentRows, discountValue, currentIsTaxable, currentTaxMode, currentTaxRate) => {
        const currentSubTotal = currentRows.reduce((sum, row) => {
            const qty = parseFloat(row.quantity) || 0;
            const price = parseFloat(row.unitPrice) || 0;
            return sum + (qty * price);
        }, 0);
        
        const discount = parseFloat(discountValue) || 0;
        const netValue = Math.max(0, currentSubTotal - discount);
        let calculatedTaxable = netValue;
        let calculatedTaxAmount = 0;
        let calculatedGrandTotal = netValue;

        if (currentIsTaxable && (parseFloat(currentTaxRate) || 0) > 0) {
            const rate = parseFloat(currentTaxRate) / 100;
            if (currentTaxMode === 'inclusive') {
                calculatedTaxable = netValue / (1 + rate);
                calculatedTaxAmount = netValue - calculatedTaxable;
                calculatedGrandTotal = netValue;
            } else {
                calculatedTaxable = netValue;
                calculatedTaxAmount = calculatedTaxable * rate;
                calculatedGrandTotal = calculatedTaxable + calculatedTaxAmount;
            }
        }

        setSubTotal(currentSubTotal.toFixed(2));
        setTaxableAmount(calculatedTaxable.toFixed(2));
        setTaxAmount(calculatedTaxAmount.toFixed(2));
        setGrandTotal(Math.max(0, calculatedGrandTotal).toFixed(2));
    };

    const handleChange = (index, field, value) => {
        const updated = [...rows];
        updated[index][field] = value;

        if (field === "quantity" || field === "unitPrice") {
            const qty = parseFloat(updated[index].quantity) || 0;
            const price = parseFloat(updated[index].unitPrice) || 0;
            
            if (field === "quantity" && qty > updated[index].stock) {
                toast.error(`Only ${updated[index].stock} units available!`);
                updated[index].quantity = "";
                updated[index].total = "";
            } else {
                updated[index].total = (qty * price).toFixed(2);
            }
        }

        setRows(updated);
        calculateTotals(updated, globalDiscount, isTaxable, taxMode, taxRate);
    };

    const handleTaxableChange = (checked) => {
        setIsTaxable(checked);
        calculateTotals(rows, globalDiscount, checked, taxMode, taxRate);
    };

    const handleGlobalDiscountChange = (value) => {
        setGlobalDiscount(value);
        calculateTotals(rows, value, isTaxable, taxMode, taxRate);
    };

    const addRow = () => {
        setRows([...rows, { rm_id: "", rm_name: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", stock: 0, supplier_id: "" }]);
    };

    const deleteRow = (index) => {
        const updated = rows.filter((_, i) => i !== index);
        setRows(updated);
        calculateTotals(updated, globalDiscount, isTaxable, taxMode, taxRate);
    };
    
    const fetchStock = async (rm_id, supplier_id, index) => {
        try {
            const res = await api.get(`/rm-transactions/stock/${rm_id}/${supplier_id}`);
            const updated = [...rows];
            updated[index].stock = res.data.stock || 0;
            setRows(updated);
        } catch (err) {
            console.error("Error fetching stock:", err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCustomer) return toast.error("Please select a customer.");
        if (!date) return toast.error("Please select a sale date.");

        const validRows = rows.filter(r => r.rm_id && parseFloat(r.quantity) > 0);
        if (validRows.length === 0) return toast.error("Please add at least one valid row.");
        if (isTaxable && (!taxRate || Number(taxRate) <= 0)) return toast.error("Please enter a valid tax rate for taxable sales.");
        
        const disc = parseFloat(globalDiscount) || 0;
        const user = JSON.parse(localStorage.getItem("user"));

        const saleData = {
            entityid: selectedCustomer, 
            grand_total: parseFloat(grandTotal),
            discount: disc, 
            type: "sale", 
            createdby: user?.username || "guest",
            invoice_no: invoiceNo,
            is_taxable: isTaxable,
            tax_mode: taxMode,
            tax_rate: Number(taxRate) || 0,
            tax_id: taxId,
            details: validRows.map(r => ({
                rm_id: r.rm_id,
                rm_name: r.rm_name,
                quantity: r.quantity,
                unit_price: r.unitPrice,
                total_price: r.total,
                uom_id: r.uom_id,
                supplier_id: r.supplier_id, 
                date: date
            }))
        };

        try {
            await api.post("/rm-transactions", saleData);
            toast.success(`Sale Transaction Successful!`);
            navigate('/rm-sale');
        } catch (err) {
            toast.error(err.response?.data?.message || "Error saving sale transaction.");
        }
    };

    const handleQuickCustomerAdd = async () => {
        const name = document.getElementById('new_cust_name').value;
        const contact = document.getElementById('new_cust_contact').value;
        const address = document.getElementById('new_cust_address').value;
        if (!name) return toast.error("Customer name is required");
        try {
            const res = await api.post("/entities", { name, contact, address, type: "customer" });
            setCustomers(prev => [...prev, res.data]);
            setSelectedCustomer(res.data.id);
            setShowCustomerModal(false);
            toast.success("Customer Added!");
        } catch (err) {
            toast.error("Failed to add customer");
        }
    };

    return (
        <div className="rm-page-wrapper">
            <NavigationBar />

            <div className="rm-content-container">
                <div className="rm-header-section">
                    <button className="back-btn" onClick={() => navigate("/rm-sale")}>
                        <FaArrowLeft />
                    </button>
                    <h2 className="form-title">Raw Material Sale Form</h2>
                </div>

                <div className="rm-main-card">
                    {/* Top Info Grid */}
                    <div className="info-grid">
                        <div className="info-item">
                            <label>Sale Invoice No</label>
                            <input type="text" value={invoiceNo} readOnly className="rm-input-field readonly-input" />
                        </div>
                        <div className="info-item">
                            <label>Customer</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <select className="rm-input-field" value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)}>
                                    <option value="">Select Customer</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <button type="button" className="quick-add-btn" onClick={() => setShowCustomerModal(true)}><FaPlus /></button>
                            </div>
                        </div>
                        <div className="info-item">
                            <label>Sale Date</label>
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
                                        value={row.rm_id && row.supplier_id ? `${row.rm_id}-${row.supplier_id}` : ""}
                                        onChange={(e) => {
                                            const [rm_id, supplier_id] = e.target.value.split("-");
                                            const selected = materials.find(m => String(m.rm_id) === rm_id && String(m.supplier_id) === supplier_id);
                                            handleChange(index, "rm_id", rm_id);
                                            handleChange(index, "rm_name", selected?.rm_name || "");
                                            handleChange(index, "uom_id", selected?.uom_id || "");
                                            handleChange(index, "uom_name", selected?.uom?.uom_name || selected?.uom_name || "");
                                            handleChange(index, "supplier_id", supplier_id);
                                            if (rm_id && supplier_id) fetchStock(rm_id, supplier_id, index);
                                            }}
                                            style={{ marginTop: '20px' }}
                                    >
                                        <option value="">Select Material</option>
                                        {materials.map((m) => (
                                            <option key={`${m.rm_id}-${m.supplier_id}`} value={`${m.rm_id}-${m.supplier_id}`}>
                                                {m.rm_name} - {m.shop_name}
                                            </option>
                                        ))}
                                    </select>
                                    <small style={{ color: 'gray', fontSize: '11px' }}>Available: {row.stock}</small>
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
                                            value={taxRate}
                                            readOnly
                                            style={{ width: '120px' }}
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

            {/* Customer Modal */}
            {showCustomerModal && (
                <div className="modal-overlay" onClick={() => setShowCustomerModal(false)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <h3>Add New Customer</h3>
                        <div className="form-group"><label>Name</label><input type="text" id="new_cust_name" className="rm-input-field" /></div>
                        <div className="form-group"><label>Address</label><textarea id="new_cust_address" className="rm-input-field"></textarea></div>
                        <div className="form-group"><label>Contact</label><input type="text" id="new_cust_contact" className="rm-input-field" /></div>
                        <div className="modal-actions">
                            <button className="save-btn-main" onClick={handleQuickCustomerAdd}>Save Customer</button>
                            <button className="quick-add-btn" onClick={() => setShowCustomerModal(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RM_SaleForm;