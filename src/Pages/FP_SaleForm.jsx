import React, { useState, useEffect, useCallback } from "react";
import NavigationBar from "../Components/NavigationBar";
import { FaArrowLeft, FaPlus, FaTrash } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import Footer from "../Components/Footer";
import { toast } from "react-toastify";
import api from "../../api";
import '../Model.css';
import '../Transactions.css';

const FP_SaleForm = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const queryParams = new URLSearchParams(location.search);
    const invoiceType = queryParams.get('invoiceType');
    const editId = queryParams.get('editId');
    const isEditMode = !!editId;

    const [rows, setRows] = useState([
        { product_master_id: "", product_name: "", recipe_id: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", stock: 0 }
    ]);

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

    const fetchInvoiceNo = useCallback(async () => {
        if (isEditMode) return;
        try {
            const res = await api.get("/fp-sale/invoice-no", { params: { type: "Sale" } });
            setInvoiceNo(res.data.invoice_no);
        } catch (err) {
            console.error("Error fetching invoice:", err);
        }
    }, [isEditMode]);

    // ---------------------------------------------------------
    // CALCULATION LOGIC MATRIX
    // ---------------------------------------------------------
    const calculateTotals = (currentRows, discountValue, currentIsTaxable = isTaxable, currentTaxMode = taxMode, currentTaxRate = taxRate) => {
        const currentSubTotal = currentRows.reduce((sum, row) => {
            const qty = parseFloat(row.quantity) || 0;
            const price = parseFloat(row.unitPrice) || 0;
            return sum + (qty * price);
        }, 0);

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

  // ---------------------------------------------------------
    // 🔥 MASTER DATA & EDIT MODE AUTO-FILL (BUG-FREE WRAPPER MAPPING)
    // ---------------------------------------------------------
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // Parallel API Requests
                const [productsRes, customersRes] = await Promise.all([
                    api.get("/fp-sale/products-for-sale"),
                    api.get("/entities/transactions")
                ]);

                setProducts(productsRes.data);
                const onlyCustomers = customersRes.data.filter(ent => ent.type === "customer");
                setCustomers(onlyCustomers);

                if (!isEditMode) {
                    try {
                        const taxRes = await api.get("/tax-master/latest/active");
                        setTaxId(taxRes.data.id);
                        setTaxRate(Number(taxRes.data.tax_rate) || 0);
                        setTaxMode(taxRes.data.taxtype || 'exclusive');
                    } catch (taxErr) {
                        console.error("Error fetching latest tax:", taxErr);
                        setTaxMode('exclusive');
                    }
                    fetchInvoiceNo();
                } else {
                    // Fetch edit view data
                    const editRes = await api.get(`/fp-sale/edit-preview/${editId}`);
                    
                    // Handling both formats: direct object OR nested wrapper object { success, data: { master, details } }
                    const responseData = editRes.data?.data ? editRes.data.data : editRes.data;
                    
                    // Extracting safely with structural fallbacks
                    const master = responseData?.master || responseData;
                    const details = responseData?.details || responseData?.Sale_Details || [];

                    if (!master || !master.invoice_no) {
                        console.error("Malformed payload received:", editRes.data);
                        throw new Error("Invoice master record configuration is missing or invalid.");
                    }

                    setInvoiceNo(master.invoice_no);
                    setSelectedCustomer(master.entity_customer_id || master.entityid);
                    
                    // Reading date directly from master structure as per database design
                    const incomingDate = master.date || master.invoiceDate;
                    if (incomingDate) {
                        setDate(new Date(incomingDate).toISOString().split('T')[0]);
                    }
                    
                    setSubTotal(parseFloat(master.sub_total || master.subtotal || 0).toFixed(2));
                    setGlobalDiscount(master.discount || "");
                    setIsTaxable(master.is_taxable);
                    setTaxMode(master.tax_mode || 'exclusive');
                    setTaxRate(Number(master.tax_rate) || 0);
                    setTaxId(master.tax_id);
                    setTaxableAmount(parseFloat(master.taxable_amount || 0).toFixed(2));
                    setTaxAmount(parseFloat(master.tax_amount || 0).toFixed(2));
                    setGrandTotal(parseFloat(master.grand_total || 0).toFixed(2));

                    if (Array.isArray(details) && details.length > 0) {
                        const mappedRows = details.map(d => {
                            const qty = Math.abs(parseFloat(d.quantity) || 0);
                            const price = parseFloat(d.unit_price) || 0;
                            
                            const matchingProduct = productsRes.data.find(p => String(p.recipe_id) === String(d.recipe_id));

                            return {
                                product_master_id: d.product_master_id,
                                product_name: d.product_name,
                                recipe_id: d.recipe_id,
                                quantity: qty,
                                unitPrice: price,
                                total: (qty * price).toFixed(2),
                                uom_id: d.uom_id || matchingProduct?.uom_id || "",
                                uom_name: d.uom_name || matchingProduct?.uom_name || "",
                                stock: Number(matchingProduct?.current_stock) || 0
                            };
                        });
                        setRows(mappedRows);
                    }
                }
            } catch (err) {
                console.error("Error loading initial form data:", err);
                toast.error("Failed to load required data.");
                if (isEditMode) navigate("/fp-sale-list");
            }
        };

        loadInitialData();
    }, [editId, isEditMode, navigate, fetchInvoiceNo]);

    const handleChange = (index, field, value) => {
        const updated = [...rows];
        updated[index][field] = value;

        if (field === "quantity" || field === "unitPrice") {
            const qty = parseFloat(updated[index].quantity) || 0;
            const price = parseFloat(updated[index].unitPrice) || 0;
            const stock = parseFloat(updated[index].stock) || 0;

            if (field === "quantity" && qty > stock) {
                toast.error(`Only ${stock} units available!`);
                updated[index].quantity = "";
                updated[index].total = "0.00";
            } else {
                updated[index].total = (qty * price).toFixed(2);
            }
        }

        setRows(updated);
        calculateTotals(updated, globalDiscount, isTaxable, taxMode, taxRate);
    };

    const handleGlobalDiscountChange = (value) => {
        setGlobalDiscount(value);
        calculateTotals(rows, value, isTaxable, taxMode, taxRate);
    };

    const addRow = () => {
        setRows([...rows, { product_master_id: "", product_name: "", recipe_id: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", stock: 0 }]);
    };

    const deleteRow = (index) => {
        const updated = rows.filter((_, i) => i !== index);
        setRows(updated);
        calculateTotals(updated, globalDiscount, isTaxable, taxMode, taxRate);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCustomer) return toast.error("Please select a customer.");
        if (!date) return toast.error("Please select a sale date.");

        const validRows = rows.filter(r => r.product_master_id && parseFloat(r.quantity) > 0 && parseFloat(r.unitPrice) > 0);
        if (validRows.length === 0) return toast.error("Please add at least one valid product row.");

        const disc = parseFloat(globalDiscount) || 0;
        if (disc > parseFloat(subTotal)) {
            return toast.error("Global Discount cannot exceed the Total Sub Amount.");
        }

        const user = JSON.parse(localStorage.getItem("user"));
        
        // Exact FP Master DB alignment payload
        const saleData = {
            entity_customer_id: selectedCustomer,
            grand_total: parseFloat(grandTotal),
            sub_total: parseFloat(subTotal),
            discount: disc,
            taxable_amount: parseFloat(taxableAmount),
            tax_amount: parseFloat(taxAmount),
            is_taxable: isTaxable,
            tax_mode: taxMode,
            tax_rate: parseFloat(taxRate),
            tax_id: taxId,
            type: "Sale",
            date: date, // Purely on Master root level
            createdby: user?.username || "guest",
            invoice_no: invoiceNo,
            details: validRows.map(r => ({
                product_master_id: r.product_master_id,
                product_name: r.product_name,
                recipe_id: r.recipe_id,
                quantity: parseFloat(r.quantity),
                unit_price: parseFloat(r.unitPrice),
                total_price: parseFloat(r.total),
                uom_id: r.uom_id
                // Date key here has been excluded as requested
            }))
        };

        try {
            if (isEditMode) {
                await api.put(`/fp-sale/${editId}`, saleData);
                toast.success(`Sale Draft Updated Successfully! Code: ${invoiceNo}`);
            } else {
                await api.post("/fp-sale", saleData);
                toast.success(`Sale Transaction Saved Successfully! Invoice: ${invoiceNo}`);
            }
            navigate("/fp-sale-list");
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
                    <h2 className="form-title">{isEditMode ? `Modify Sale Draft (${invoiceNo})` : "Finished Goods Sale"}</h2>
                </div>

                <div className="rm-main-card">
                    <div className="info-grid">
                        <div className="info-item">
                            <label>Invoice No</label>
                            <input type="text" value={invoiceNo} readOnly className="rm-input-field readonly-input" style={{ backgroundColor: '#f1f5f9' }} />
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
                                            } else {
                                                handleChange(index, "product_master_id", "");
                                                handleChange(index, "recipe_id", "");
                                                handleChange(index, "product_name", "");
                                                handleChange(index, "uom_name", "");
                                                handleChange(index, "uom_id", "");
                                                handleChange(index, "stock", 0);
                                            }
                                        }}
                                        style={{ marginTop : "20px" }}
                                    >
                                        <option value="">Select Product</option>
                                        {products.map((p) => <option key={p.recipe_id} value={p.recipe_id}>{p.display_name || p.product_name}</option>)}
                                    </select>
                                    <small style={{ color: "gray", fontSize: '11px', paddingLeft: '2px' }}>Available: {row.stock}</small>
                                </div>

                                <input type="text" className="rm-input-field readonly-input" placeholder="UOM" value={row.uom_name} readOnly />
                                <input type="number" className="rm-input-field" placeholder="Qty" value={row.quantity} onChange={(e) => handleChange(index, "quantity", e.target.value)} />
                                <input type="number" className="rm-input-field" placeholder="Price" value={row.unitPrice} onChange={(e) => handleChange(index, "unitPrice", e.target.value)} />
                                <input type="text" className="rm-input-field readonly-input" placeholder="Total" value={row.total} readOnly />

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

                        <button type="submit" className="save-btn-main">{isEditMode ? "Update Sale Draft" : "Save Sale Transaction"}</button>
                    </form>
                </div>
            </div>
            <Footer />

            {/* Quick Customer Add Modal */}
            {showCustomerModal && (
                <div className="modal-overlay" onClick={() => setShowCustomerModal(false)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Add New Customer</h3>
                            <button className="close-x" onClick={() => setShowCustomerModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group"><label>Name *</label><input type="text" id="new_cust_name" className="rm-input-field" /></div>
                            <div className="form-group"><label>Address</label><input type="text" id="new_cust_address" className="rm-input-field" /></div>
                            <div className="form-group"><label>Contact</label><input type="text" id="new_cust_contact" className="rm-input-field" /></div>
                        </div>
                        <div className="modal-footer">
                            <button className="save-btn-main" onClick={handleQuickCustomerAdd}>Save Customer</button>
                            <button className="quick-add-btn" onClick={() => setShowCustomerModal(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FP_SaleForm;