import React, { useState, useEffect, useCallback } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft, FaPlus } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Footer from '../Components/Footer';
import { toast } from 'react-toastify';
import api from "../../api"; 

const RM_SaleForm = () => {
    const navigate = useNavigate();

    const [rows, setRows] = useState([
        { rm_id: "", rm_name: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", stock: 0, entity_supplier_id: "", supplier_id: "" }
    ]);
    const [materials, setMaterials] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState("");
    const [invoiceNo, setInvoiceNo] = useState("");
    const [date, setDate] = useState("");
    
    // 🛑 States for Discount Logic
    const [subTotal, setSubTotal] = useState(0); 
    const [globalDiscount, setGlobalDiscount] = useState(""); 
    const [grandTotal, setGrandTotal] = useState(0);

    // 🔹 Fetch Invoice No (Standardized api.js)
    const fetchInvoiceNo = useCallback(async () => {
        try {
            const res = await api.get("/rm-transactions/rm-invoice", {
                params: { type: "Sale" }
            });
            setInvoiceNo(res.data.invoice_no);
        } catch (err) {
            console.error("Error fetching invoice number:", err);
        }
    }, []);

    // 🔹 Fetch Initial Data
    useEffect(() => {
        // Fetch Customers
        api.get("/entities")
            .then(res => setCustomers(res.data.filter(ent => ent.type === "customer")))
            .catch(err => console.error("Error fetching customers:", err));
        
        // Fetch Materials with Supplier Data
        api.get("/rm-transactions/materials-with-suppliers")
            .then(res => {
                console.log("🔍 Materials Data:", res.data);
                setMaterials(res.data);
            })
            .catch(err => console.error("Error fetching materials:", err));

        fetchInvoiceNo();
    }, [fetchInvoiceNo]);


    // 🔹 Calculation Logic
    const calculateTotals = (currentRows, discountValue) => {
        const currentSubTotal = currentRows.reduce((sum, row) => {
            const qty = parseFloat(row.quantity) || 0;
            const price = parseFloat(row.unitPrice) || 0;
            return sum + (qty * price);
        }, 0);
        
        const discount = parseFloat(discountValue) || 0;
        let finalGrandTotal = currentSubTotal - discount;
        if (finalGrandTotal < 0) finalGrandTotal = 0;
        
        setSubTotal(currentSubTotal.toFixed(2));
        setGrandTotal(finalGrandTotal.toFixed(2));
    };

    // 🔹 Handlers
    const handleChange = (index, field, value) => {
        const updatedRows = [...rows];
        updatedRows[index][field] = value;

        if (field === "quantity" || field === "unitPrice") {
            const qty = parseFloat(updatedRows[index].quantity) || 0;
            const price = parseFloat(updatedRows[index].unitPrice) || 0;
            
            // Stock Check
            if (field === "quantity" && qty > updatedRows[index].stock) {
                toast.error(`Only ${updatedRows[index].stock} units available!`);
                updatedRows[index].quantity = "";
                updatedRows[index].total = "";
            } else {
                updatedRows[index].total = (qty * price).toFixed(2);
            }
        }

        setRows(updatedRows);
        calculateTotals(updatedRows, globalDiscount);
    };

    const handleGlobalDiscountChange = (value) => {
        setGlobalDiscount(value);
        calculateTotals(rows, value);
    };

    const addRow = () => {
        setRows([...rows, { rm_id: "", rm_name: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", stock: 0, entity_supplier_id: "", supplier_id: "" }]);
    };

    const deleteRow = (index) => {
        const updatedRows = rows.filter((_, i) => i !== index);
        setRows(updatedRows);
        calculateTotals(updatedRows, globalDiscount);
    };
    
    const fetchStock = async (rm_id, supplier_id, index) => {
        try {
            const res = await api.get(`/rm-transactions/stock/${rm_id}/${supplier_id}`);
            const updatedRows = [...rows];
            updatedRows[index].stock = res.data.stock || 0;
            setRows(updatedRows);
        } catch (err) {
            console.error("Error fetching stock:", err);
        }
    };

    // 🔹 Submit Form
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedCustomer) return toast.error("Please select a customer.");
        if (!date) return toast.error("Please select a sale date.");

        const validRows = rows.filter(r => r.rm_id && parseFloat(r.quantity) > 0);
        if (validRows.length === 0) return toast.error("Please add at least one valid material row.");
        
        const disc = parseFloat(globalDiscount) || 0;
        if (disc > parseFloat(subTotal)) {
             return toast.error("Global Discount cannot exceed the Total Sub Amount.");
        }

        const user = JSON.parse(localStorage.getItem("user"));

        const saleData = {
            entityid: selectedCustomer, 
            grand_total: parseFloat(grandTotal),
            discount: disc, 
            type: "sale", 
            createdby: user ? user.username : "guest",
            invoice_no: invoiceNo,
            details: validRows.map(r => ({
                rm_id: r.rm_id,
                rm_name: r.rm_name,
                quantity: r.quantity,
                unit_price: r.unitPrice,
                uom_id: r.uom_id,
                supplier_id: r.supplier_id, 
                date: date
            }))
        };

        try {
            const res = await api.post("/rm-transactions", saleData);

            toast.success(`Sale Transaction Successful! Invoice: ${res.data.invoice_no}`);
            
            // Reset Form
            setRows([{ rm_id: "", rm_name: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", stock: 0, entity_supplier_id: "", supplier_id: "" }]);
            setSelectedCustomer("");
            setDate("");
            setSubTotal(0);
            setGlobalDiscount("");
            setGrandTotal(0);
            fetchInvoiceNo(); 
            navigate('/rm-sale');
        } catch (err) {
            console.error("Error creating sale:", err);
            toast.error(err.response?.data?.message || "Error creating sale transaction!");
        }
    };

    return (
        <>
            <NavigationBar />
            <div className="rm-page">
                <button
                    className="back-btn"
                    style={{ marginTop: "30px" }}
                    onClick={() => navigate("/rm-sale")}
                >
                    <FaArrowLeft />
                </button>

                <div className="rm-card">
                    <h2>Raw Material Sale Form</h2>

                    <div className="form-group d-flex">
                        <h6><b>Sale<br />Invoice No:</b></h6>
                        <input
                            type="text"
                            value={invoiceNo}
                            readOnly
                            className="input"
                            style={{ backgroundColor: "#f3f3f3", margin: "-5px 0 30px 5px", width: "auto" }}
                        />
                    </div>

                    {/* Customer & Date */}
                    <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
                        <select
                            className="input"
                            value={selectedCustomer}
                            onChange={(e) => setSelectedCustomer(e.target.value)}
                        >
                            <option value="">Select Customer</option>
                            {customers.map((ent) => (
                                <option key={ent.id} value={ent.id}>
                                    {ent.name}
                                </option>
                            ))}
                        </select>
                        <button className="add-sup-cust" type="button" onClick={() => navigate("/add-customers")}>
                            Add Customer
                        </button>

                        <label><b>Sale Date:</b></label>
                        <input
                            type="date"
                            className="input"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>

                    {/* Rows */}
                    <form onSubmit={handleSubmit}>
                        {rows.map((row, index) => (
                            <div className="rm-row" key={index}>
                                <select
                                    className="input"
                                    value={row.rm_id && row.supplier_id ? `${row.rm_id}-${row.supplier_id}` : ""}
                                    onChange={(e) => {
                                        const [rm_id, supplier_id] = e.target.value.split("-");
                                        const selected = materials.find(
                                            (m) => String(m.rm_id) === rm_id && String(m.supplier_id) === supplier_id
                                        );

                                        handleChange(index, "rm_id", rm_id);
                                        handleChange(index, "rm_name", selected?.rm_name || "");
                                        handleChange(index, "uom_id", selected?.uom_id || "");
                                        handleChange(index, "uom_name", selected?.uom?.uom_name || selected?.uom_name || "");
                                        handleChange(index, "supplier_id", supplier_id);

                                        if (rm_id && supplier_id) fetchStock(rm_id, supplier_id, index);
                                    }}
                                >
                                    <option value="">Select Material</option>
                                    {materials.map((m) => (
                                        <option
                                            key={`${m.rm_id}-${m.supplier_id}`} 
                                            value={`${m.rm_id}-${m.supplier_id}`}>
                                            {m.rm_name} - {m.shop_name}
                                        </option>
                                    ))}
                                </select>

                                <input type="text" className="input" placeholder="UOM" value={row.uom_name || ""} readOnly />

                                <input
                                    type="number"
                                    className="input"
                                    placeholder="Quantity"
                                    value={row.quantity}
                                    min="0"
                                    step="0.01"
                                    onChange={(e) => handleChange(index, "quantity", e.target.value)}
                                />
                                <small style={{ color: "gray" }}>Available: {row.stock}</small>

                                <input
                                    type="number"
                                    className="input"
                                    placeholder="Unit Price"
                                    value={row.unitPrice}
                                    min="0"
                                    step="0.01"
                                    onChange={(e) => handleChange(index, "unitPrice", e.target.value)}
                                />

                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Total Price"
                                    value={row.total}
                                    readOnly
                                />

                                <button type="button" className="add-more" onClick={addRow}>
                                    <FaPlus size={20} />
                                </button>
                                {rows.length > 1 && (
                                    <button type="button" className="del-btn" onClick={() => deleteRow(index)}>
                                        ❌
                                    </button>
                                )}
                            </div>
                        ))}

                        {/* Grand Totals Section */}
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "20px", marginTop: "20px" }}>
                            {/* Total Sub Amount */}
                            
                                <label className="grand-total"><b>Total<br />Sub Amount:</b></label>
                                <input type="text" className="input" value={subTotal} readOnly style={{ width: 'auto', backgroundColor: '#f3f3f3' }} />
                            
                            
                            {/* 🛑 NEW: Global Discount Input */}
                            
                                <label className="grand-total"><b>Global<br />Discount:</b></label>
                                <input
                                    type="number"
                                    className="input"
                                    placeholder="Discount"
                                    value={globalDiscount}
                                    min="0"
                                    step="0.01"
                                    onChange={(e) => handleGlobalDiscountChange(e.target.value)}
                                    style={{ width: 'auto' }}
                                />
                            
                            
                            {/* Final Grand Total */}
                            
                                <label className="grand-total"><b>Grand<br />Total:</b></label>
                                <input type="text" className="input" value={grandTotal} readOnly style={{ width: 'auto', backgroundColor: '#f3f3f3' }} />
                            
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="save-btn">Save</button>
                        </div>
                    </form>
                </div>
            </div>
            <Footer />
        </>
    );
};

export default RM_SaleForm;