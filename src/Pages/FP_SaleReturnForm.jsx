import React, { useState, useEffect, useCallback } from "react";
import NavigationBar from "../Components/NavigationBar";
import { FaArrowLeft, FaPlus, FaTrash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
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
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState("");
    const [invoiceNo, setInvoiceNo] = useState("");
    const [date, setDate] = useState("");
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
        const total = updatedRows.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0);
        setGrandTotal(total.toFixed(2));
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

export default FP_SaleReturnForm;