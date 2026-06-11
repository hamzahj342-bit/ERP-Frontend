import React, { useState, useEffect, useCallback } from "react";
import NavigationBar from "../Components/NavigationBar";
import { FaArrowLeft, FaPlus, FaTrash } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import Footer from "../Components/Footer";
import { toast } from "react-toastify";
import api from "../../api";
import '../Model.css';
import '../Transactions.css'; // Shared CSS for grid and styling

const FP_SaleForm = () => {
    const navigate = useNavigate();

    const [rows, setRows] = useState([
        { product_master_id: "", product_name: "", recipe_id: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", stock: 0 }
    ]);
    const location = useLocation();
    const invoiceType = new URLSearchParams(location.search).get('invoiceType');

    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState("");
    const [invoiceNo, setInvoiceNo] = useState("");
    const [date, setDate] = useState("");
    const [showCustomerModal, setShowCustomerModal] = useState(false);

    const [subTotal, setSubTotal] = useState(0);
    const [taxableAmount, setTaxableAmount] = useState(0);
    const [taxAmount, setTaxAmount] = useState(0);
    const [globalDiscount, setGlobalDiscount] = useState("");
    const [grandTotal, setGrandTotal] = useState(0);
    const [isTaxable, setIsTaxable] = useState(() => invoiceType !== 'nonTaxable');
    const [taxMode, setTaxMode] = useState('exclusive');
    const [taxRate, setTaxRate] = useState(0);
    const [taxId, setTaxId] = useState(null);

    // --- Data Fetching ---
    const fetchCustomers = async () => {
        try {
            const res = await api.get("/entities/transactions");
            setCustomers(res.data.filter((ent) => ent.type === "customer"));
        } catch (err) { console.error("Error fetching customers:", err); }
    };

    const fetchProducts = async () => {
        try {
            const res = await api.get("/fp-sale/products-for-sale");
            setProducts(res.data);
        } catch (err) { console.error("Error fetching products:", err); }
    };

    const fetchInvoiceNo = useCallback(async () => {
        try {
            const res = await api.get("/fp-sale/invoice-no", { params: { type: "Sale" } });
            setInvoiceNo(res.data.invoice_no);
        } catch (err) { console.error("Error fetching invoice:", err); }
    }, []);

    useEffect(() => {
        fetchCustomers();
        fetchProducts();
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

    // --- Calculations ---
    const calculateTotals = (currentRows, discountValue, currentIsTaxable, currentTaxMode, currentTaxRate) => {
        const currentSubTotal = currentRows.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0);
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

    const handleChange = (index, field, value) => {
        const updatedRows = [...rows];
        updatedRows[index][field] = value;

        if (field === "quantity" || field === "unitPrice") {
            const qty = parseFloat(updatedRows[index].quantity) || 0;
            const price = parseFloat(updatedRows[index].unitPrice) || 0;
            const stock = parseFloat(updatedRows[index].stock) || 0;

            if (qty > stock) {
                toast.error(`Only ${stock} units available!`);
                updatedRows[index].quantity = "";
                updatedRows[index].total = "0.00";
            } else {
                updatedRows[index].total = (qty * price).toFixed(2);
            }
        }
        setRows(updatedRows);
        calculateTotals(updatedRows, globalDiscount, isTaxable, taxMode, taxRate);
    };

    const handleTaxableChange = (checked) => {
        setIsTaxable(checked);
        calculateTotals(rows, globalDiscount, checked, taxMode, taxRate);
    };

    const handleGlobalDiscountChange = (value) => {
        setGlobalDiscount(value);
        calculateTotals(rows, value, isTaxable, taxMode, taxRate);
    };

    const addRow = () => setRows([...rows, { product_master_id: "", product_name: "", recipe_id: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", stock: 0 }]);
    const deleteRow = (index) => {
        const updatedRows = rows.filter((_, i) => i !== index);
        setRows(updatedRows);
        calculateTotals(updatedRows, globalDiscount, isTaxable, taxMode, taxRate);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCustomer || !date) return toast.error("Please fill customer and date.");
        
        const validRows = rows.filter((r) => r.product_master_id && parseFloat(r.quantity) > 0);
        if (validRows.length === 0) return toast.error("Please add at least one valid product.");
        if (isTaxable && (!taxRate || Number(taxRate) <= 0)) return toast.error("Please enter a valid tax rate for taxable sales.");

        const user = JSON.parse(localStorage.getItem("user"));
        const saleData = {
            entity_customer_id: selectedCustomer,
            grand_total: Number(grandTotal),
            discount: parseFloat(globalDiscount) || 0,
            type: "Sale",
            date,
            createdby: user?.username || "guest",
            invoice_no: invoiceNo,
            is_taxable: isTaxable,
            tax_mode: taxMode,
            tax_rate: Number(taxRate) || 0,
            tax_id: taxId,
            details: validRows.map((r) => ({
                product_master_id: r.product_master_id,
                product_name: r.product_name,
                recipe_id: r.recipe_id,
                quantity: Number(r.quantity),
                unit_price: Number(r.unitPrice),
                total_price: Number(r.total),
                uom_id: r.uom_id,
            })),
        };

        try {
            await api.post("/fp-sale", saleData);
            toast.success("Sale Recorded Successfully!");
            navigate("/fp-sale-list");
        } catch (err) {
            toast.error(err.response?.data?.message || "Error creating sale.");
        }
    };

    const handleQuickCustomerAdd = async () => {
        const name = document.getElementById('new_cust_name').value;
        const contact = document.getElementById('new_cust_contact').value;
        const address = document.getElementById('new_cust_address').value;
        if (!name) return toast.error("Name is required");

        try {
            const res = await api.post("/entities", { name, contact, address, type: "customer" });
            setCustomers(prev => [...prev, res.data]);
            setSelectedCustomer(res.data.id);
            setShowCustomerModal(false);
            toast.success("Customer added!");
        } catch (err) { toast.error("Failed to add customer"); }
    };

    return (
        <div className="rm-page-wrapper">
            <NavigationBar />
            <div className="rm-content-container">
                <div className="rm-header-section">
                    <button className="back-btn" onClick={() => navigate("/fp-sale-list")}>
                        <FaArrowLeft />
                    </button>
                    <h2 className="form-title">Finished Goods Sale Form</h2>
                </div>

                <div className="rm-main-card">
                    {/* Top Section */}
                    <div className="info-grid">
                        <div className="info-item">
                            <label>Invoice No</label>
                            <input type="text" value={invoiceNo} readOnly className="rm-input-field readonly-input" />
                        </div>
                        <div className="info-item">
                            <label>Customer</label>
                            <div style={{ display: 'flex', gap: '5px' }}>
                                <select className="rm-input-field" value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)}>
                                    <option value="">Select Customer</option>
                                    {customers.map((ent) => <option key={ent.id} value={ent.id}>{ent.name}</option>)}
                                </select>
                                <button type="button" className="quick-add-btn" title="Quick Add" onClick={() => setShowCustomerModal(true)}><FaPlus /></button>
                            </div>
                        </div>
                        <div className="info-item">
                            <label>Sale Date</label>
                            <input type="date" className="rm-input-field" value={date} onChange={(e) => setDate(e.target.value)} />
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="items-table-header">
                            <span>Product Selection</span>
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
                                        value={row.recipe_id}
                                        onChange={(e) => {
                                            const selected = products.find(p => String(p.recipe_id) === String(e.target.value));
                                            if (selected) {
                                                handleChange(index, "product_master_id", selected.product_master_id);
                                                handleChange(index, "recipe_id", selected.recipe_id);
                                                handleChange(index, "product_name", selected.product_name);
                                                handleChange(index, "uom_name", selected.uom_name);
                                                handleChange(index, "uom_id", selected.uom_id);
                                                handleChange(index, "stock", Number(selected.current_stock) || 0);
                                            }
                                        }}
                                        style={{ marginTop: '20px'}}
                                    >
                                        <option value="">Select Product</option>
                                        {products.map((p) => <option key={p.recipe_id} value={p.recipe_id}>{p.display_name}</option>)}
                                    </select>
                                    <small style={{ color: "gray", fontSize: '11px' }}>Available: {row.stock}</small>
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

                        {/* Summary Section */}
                        <div className="summary-container">
                            <div className="summary-row">
                                <span>Sub Total:</span>
                                <span>{subTotal}</span>
                            </div>
                            {isTaxable && (
                                <>
                                    {/* Tax Mode input is hidden; default is exclusive. */}
                                    <div className="summary-row">
                                        <span>Tax Rate (%)</span>
                                        <input
                                            type="number"
                                            className="rm-input-field readonly-input"
                                            value={taxRate}
                                            readOnly
                                            style={{ width: '120px' }}
                                        />
                                    </div>
                                    <div className="summary-row">
                                        <span>Taxable Amount:</span>
                                        <span>{taxableAmount}</span>
                                    </div>
                                    <div className="summary-row">
                                        <span>Tax Amount:</span>
                                        <span>{taxAmount}</span>
                                    </div>
                                </>
                            )}
                            <div className="summary-row">
                                <span>Discount:</span>
                                <input type="number" className="rm-input-field summary-input" value={globalDiscount} onChange={(e) => handleGlobalDiscountChange(e.target.value)} style={{ width: '120px' }} />
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

            {/* Customer Quick Add Modal */}
            {showCustomerModal && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <div className="modal-header">
                            <h3>Quick Add Customer</h3>
                            <button className="close-x" onClick={() => setShowCustomerModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="info-item">
                                <label>Customer Name *</label>
                                <input type="text" id="new_cust_name" className="rm-input-field" />
                            </div>
                            <div className="info-item">
                                <label>Contact</label>
                                <input type="text" id="new_cust_contact" className="rm-input-field" />
                            </div>
                            <div className="info-item">
                                <label>Address</label>
                                <input type="text" id="new_cust_address" className="rm-input-field" />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="save-btn-main" onClick={handleQuickCustomerAdd}>Save Customer</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FP_SaleForm;