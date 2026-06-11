import React, { useState, useEffect, useCallback } from "react";
import NavigationBar from "../Components/NavigationBar";
import { FaArrowLeft, FaPlus, FaTrash } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import Footer from "../Components/Footer";
import { toast } from "react-toastify";
import api from "../../api";
import '../Model.css';
import '../Transactions.css'; // Shared CSS for grid and styling

const FP_SaleReturnForm = () => {
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
    const [subTotal, setSubTotal] = useState(0);
    const [taxableAmount, setTaxableAmount] = useState(0);
    const [taxAmount, setTaxAmount] = useState(0);
    const [isTaxable, setIsTaxable] = useState(() => invoiceType !== 'nonTaxable');
    const [taxMode, setTaxMode] = useState('exclusive');
    const [taxRate, setTaxRate] = useState(0);
    const [taxId, setTaxId] = useState(null);
    const [grandTotal, setGrandTotal] = useState(0);

    // --- Data Fetching ---
    const fetchProductsForReturn = async (customerId) => {
        if (!customerId) return setProducts([]);
        try {
            const res = await api.get(`/fp-sale/products-by-customer/${customerId}`);
            setProducts(res.data);
        } catch (err) {
            console.error("Error fetching products:", err);
            toast.error("Failed to load products for this customer");
        }
    };

    const fetchCustomers = async () => {
        try {
            const res = await api.get("/fp-sale/customers-for-return");
            setCustomers(res.data);
        } catch (err) { console.error("Error fetching customers:", err); }
    };

    const fetchInvoiceNo = useCallback(async () => {
        try {
            const res = await api.get("/fp-sale/invoice-no", { params: { type: "SaleReturn" } });
            setInvoiceNo(res.data.invoice_no);
        } catch (err) { console.error("Error fetching invoice:", err); }
    }, []);

    useEffect(() => {
        fetchCustomers();
        fetchInvoiceNo();
    }, [fetchInvoiceNo]);

    // --- Handlers ---
    const handleCustomerChange = (e) => {
        const customerId = e.target.value;
        setSelectedCustomer(customerId);
        setRows([{ product_master_id: "", product_name: "", recipe_id: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", stock: 0 }]);
        setGrandTotal(0);
        fetchProductsForReturn(customerId);
    };

    useEffect(() => {
        if (!selectedCustomer) {
            setTaxId(null);
            setTaxRate(0);
            setTaxMode('exclusive');
            calculateTotals(rows, isTaxable, 'exclusive', 0);
            return;
        }

        api.get(`/fp-sale/customer-last-tax/${selectedCustomer}`)
            .then(res => {
                setTaxId(res.data.tax_id || null);
                setTaxRate(Number(res.data.tax_rate) || 0);
                setTaxMode('exclusive');
                calculateTotals(rows, isTaxable, 'exclusive', Number(res.data.tax_rate) || 0);
            })
            .catch(err => {
                console.error("Error fetching customer last tax rate:", err);
                setTaxId(null);
                setTaxRate(0);
                setTaxMode('exclusive');
                calculateTotals(rows, isTaxable, 'exclusive', 0);
            });
    }, [selectedCustomer]);

    const calculateTotals = (currentRows, currentIsTaxable = isTaxable, currentTaxMode = taxMode, currentTaxRate = taxRate) => {
        const currentSubTotal = currentRows.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0);
        const discount = 0;
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
            const maxReturnQty = parseFloat(updatedRows[index].stock) || 0;

            if (qty > maxReturnQty) {
                toast.error(`Max return quantity is ${maxReturnQty} units!`);
                updatedRows[index].quantity = maxReturnQty; // Auto-set to max
            }
            
            const finalQty = parseFloat(updatedRows[index].quantity) || 0;
            updatedRows[index].total = (finalQty * price).toFixed(2);
        }

        setRows(updatedRows);
        calculateTotals(updatedRows);
    };

    const handleTaxableChange = (value) => {
        setIsTaxable(value);
        calculateTotals(rows, value, taxMode, taxRate);
    };

    const addRow = () => setRows([...rows, { product_master_id: "", product_name: "", recipe_id: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", stock: 0 }]);
    
    const deleteRow = (index) => {
        const updatedRows = rows.filter((_, i) => i !== index);
        setRows(updatedRows);
        const total = updatedRows.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0);
        setGrandTotal(total.toFixed(2));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCustomer || !date) return toast.error("Please fill customer and date.");

        const validRows = rows.filter((r) => r.product_master_id && Number(r.quantity) > 0);
        if (validRows.length === 0) return toast.error("Please add at least one valid product.");

        const user = JSON.parse(localStorage.getItem("user"));
        const saleData = {
            entity_customer_id: selectedCustomer,
            grand_total: Number(grandTotal),
            sub_total: Number(subTotal),
            taxable_amount: Number(taxableAmount),
            tax_amount: Number(taxAmount),
            is_taxable: isTaxable,
            tax_mode: taxMode,
            tax_rate: Number(taxRate),
            tax_id: taxId,
            type: "SaleReturn",
            date,
            createdby: user?.username || "guest",
            invoice_no: invoiceNo,
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
            toast.success("Sale Return Successful!");
            navigate("/fp-salereturn-list");
        } catch (err) {
            toast.error(err.response?.data?.message || "Error creating return.");
        }
    };

    return (
        <div className="rm-page-wrapper">
            <NavigationBar />
            <div className="rm-content-container">
                <div className="rm-header-section">
                    <button className="back-btn" onClick={() => navigate("/fp-salereturn-list")}>
                        <FaArrowLeft />
                    </button>
                    <h2 className="form-title">Finished Goods Sale Return</h2>
                </div>

                <div className="rm-main-card">
                    {/* Top Section */}
                    <div className="info-grid">
                        <div className="info-item">
                            <label>Return Invoice No</label>
                            <input type="text" value={invoiceNo} readOnly className="rm-input-field readonly-input" />
                        </div>
                        <div className="info-item">
                            <label>Customer (Last 3 Months)</label>
                            <select className="rm-input-field" value={selectedCustomer} onChange={handleCustomerChange}>
                                <option value="">Select Customer</option>
                                {customers.map((ent) => <option key={ent.id} value={ent.id}>{ent.name}</option>)}
                            </select>
                        </div>
                        <div className="info-item">
                            <label>Return Date</label>
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
                                                const maxReturnQty = parseFloat(selected.max_return_qty) || 0;
                                                const updatedRows = [...rows];
                                                updatedRows[index] = {
                                                    ...updatedRows[index],
                                                    product_master_id: selected.product_master_id,
                                                    recipe_id: selected.recipe_id,
                                                    product_name: selected.name,
                                                    uom_id: selected.uom_id,
                                                    uom_name: selected.uom_name,
                                                    stock: maxReturnQty,
                                                    quantity: ""
                                                };
                                                setRows(updatedRows);
                                            }
                                        }}
                                        style={{ marginTop: '20px'}}
                                    >
                                        <option value="">Select Product</option>
                                        {Array.from(new Map(products.map(p => [p.recipe_id, p])).values()).map((p) => (
                                            <option key={p.recipe_id} value={p.recipe_id}>{p.name}</option>
                                        ))}
                                    </select>
                                    <small style={{ color: "gray", fontSize: '11px' }}>Max Return: {row.stock}</small>
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

export default FP_SaleReturnForm;