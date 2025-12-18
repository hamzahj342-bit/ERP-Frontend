import React, { useState, useEffect, useCallback } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft, FaPlus } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Footer from '../Components/Footer';
import { toast } from 'react-toastify';

const RM_PurchaseForm = () => {
    const navigate = useNavigate();

    const [rows, setRows] = useState([
        { rm_id: "", rm_name: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "" }
    ]);
    const [materials, setMaterials] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [selectedSupplier, setSelectedSupplier] = useState("");
    const [invoiceNo, setInvoiceNo] = useState("");
    const [date, setDate] = useState("");
    const [subTotal, setSubTotal] = useState(0); // New state to hold SUM of all row totals
    const [globalDiscount, setGlobalDiscount] = useState(""); // 🛑 NEW: Single Discount Input
    const [grandTotal, setGrandTotal] = useState(0);

    // 🔹 Fetch Next Invoice Number (Reused from previous fix)
    const fetchInvoiceNo = useCallback(async () => {
        try {
            const res = await fetch("http://localhost:5000/api/rm-transactions/rm-invoice?type=Purchase");
            const data = await res.json();
            if (res.ok) {
                setInvoiceNo(data.invoice_no);
            }
        } catch (err) {
            console.error("Error fetching invoice:", err);
        }
    }, []);

    // 🔹 Fetch Initial Data (Materials, Suppliers, Invoice No)
    useEffect(() => {
        // Fetch Materials and Suppliers logic remains the same
        fetch("http://localhost:5000/api/add-materials").then(res => res.json()).then(data => setMaterials(data)).catch(err => console.error("Error fetching materials:", err));
        fetch("http://localhost:5000/api/entities").then(res => res.json()).then(data => { const onlySuppliers = data.filter(ent => ent.type === "supplier"); setSuppliers(onlySuppliers); }).catch(err => console.error("Error fetching suppliers:", err));
        
        fetchInvoiceNo();
    }, [fetchInvoiceNo]);

    // 🔹 Grand Total Calculation Logic (Updated for Global Discount)
    const calculateTotals = (currentRows, discountValue) => {
        // 1. Calculate Subtotal (Sum of all Qty * Price)
        const currentSubTotal = currentRows.reduce((sum, row) => {
            const qty = parseFloat(row.quantity) || 0;
            const price = parseFloat(row.unitPrice) || 0;
            return sum + (qty * price);
        }, 0);
        
        const discount = parseFloat(discountValue) || 0;
        
        // 2. Calculate Grand Total
        let finalGrandTotal = currentSubTotal - discount;
        if (finalGrandTotal < 0) finalGrandTotal = 0; // Prevent negative total
        
        setSubTotal(currentSubTotal.toFixed(2));
        setGrandTotal(finalGrandTotal.toFixed(2));
    };
    
    // 🔹 Handler for Quantity/Price changes
    const handleChange = (index, field, value) => {
        const updated = [...rows];
        updated[index][field] = value;

        if (field === "quantity" || field === "unitPrice") {
            const qty = parseFloat(updated[index].quantity) || 0;
            const price = parseFloat(updated[index].unitPrice) || 0;
            updated[index].total = (qty * price).toFixed(2);
        }

        setRows(updated);
        // Recalculate based on updated rows and current discount
        calculateTotals(updated, globalDiscount); 
    };
    
    // 🔹 Handler for Global Discount Change
    const handleGlobalDiscountChange = (value) => {
        setGlobalDiscount(value);
        // Recalculate based on current rows and new discount
        calculateTotals(rows, value); 
    };


    const addRow = () => {
        setRows([...rows, { rm_id: "", rm_name: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "" }]);
    };

    const deleteRow = (index) => {
        const updated = rows.filter((_, i) => i !== index);
        setRows(updated);
        calculateTotals(updated, globalDiscount); // Recalculate after delete
    };

    // 🔹 Handle Submit (Updated to send total_discount field instead of per-row)
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedSupplier) return toast.error("Please select a supplier.");
        if (!date) return toast.error("Please select a purchase date.");

        const validRows = rows.filter(r => r.rm_id && parseFloat(r.quantity) > 0 && parseFloat(r.unitPrice) > 0);
        if (validRows.length === 0) return toast.error("Please add at least one valid material row.");
        
        // 🛑 Validation: Discount should not exceed Sub Total
        const disc = parseFloat(globalDiscount) || 0;
        if (disc > parseFloat(subTotal)) {
             return toast.error("Global Discount cannot exceed the Total Sub Amount.");
        }


        const user = JSON.parse(localStorage.getItem("user"));
        const token = localStorage.getItem("token");

        const purchaseData = {
            entityid: selectedSupplier,
            // 🚨 We send the final calculated Grand Total and the Global Discount amount
            grand_total: parseFloat(grandTotal), 
            discount: disc, // 🛑 NEW FIELD to send to backend
            type: "purchase",
            createdby: user?.username || "guest",
            invoice_no: invoiceNo, 
            details: validRows.map(r => ({
                rm_id: r.rm_id,
                rm_name: r.rm_name,
                quantity: r.quantity,
                unit_price: r.unitPrice,
                uom_id: r.uom_id,
                date,
                entity_supplier_id: selectedSupplier,
                // Note: No 'discount' field in detail rows now
            }))
        };

        // ... (API call and success handling remains the same)
        try {
            const res = await fetch("http://localhost:5000/api/rm-transactions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(purchaseData),
            });

            const data = await res.json();
            if (res.ok) {
                toast.success(`Purchase Transaction Successful! Invoice: ${data.invoice_no}`);
                // 1. Reset Form
                setRows([{ rm_id: "", rm_name: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "" }]);
                setSelectedSupplier("");
                setDate("");
                setGrandTotal(0);
                setSubTotal(0);
                setGlobalDiscount(""); // Reset discount field
                // 2. Re-fetch the next invoice number
                fetchInvoiceNo(); 
            } else {
                toast.error(data.message || "Failed to save purchase.");
            }
        } catch (err) {
            console.error("❌ Error creating purchase:", err);
            toast.error("Error saving purchase transaction.");
        }
    };

    return (
        <>
            <NavigationBar />
            <div className="rm-page">
                <button className="back-btn" style={{ marginTop: "30px" }} onClick={() => navigate("/rm-purchase")}>
                    <FaArrowLeft />
                </button>

                <div className="rm-card">
                    <h2>Raw Material Purchase Form</h2>

                    {/* Invoice No */}
                    <div className="form-group d-flex">
                        <h6><b>Purchase <br /> Invoice No:</b></h6>
                        <input
                            type="text"
                            value={invoiceNo}
                            readOnly
                            className="input"
                            style={{ backgroundColor: "#f3f3f3", margin: "-5px 0px 30px 5px", width: "auto" }}
                        />
                    </div>

                    {/* Supplier & Date */}
                    <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
                        <select
                            className="input"
                            value={selectedSupplier}
                            onChange={(e) => setSelectedSupplier(e.target.value)}
                        >
                            <option value="">Select Supplier</option>
                            {suppliers.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>

                        <button className="add-sup-cust" type="button" onClick={() => navigate("/add-suppliers")}>
                            Add Supplier
                        </button>

                        <label><b>Purchase Date:</b></label>
                        <input
                            type="date"
                            className="input"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>

                    <form onSubmit={handleSubmit}>
                        {rows.map((row, index) => (
                            <div className="rm-row" key={index}>
                                {/* Material Select */}
                                <select
                                    className="input"
                                    value={row.rm_id}
                                    onChange={(e) => {
                                        const selected = materials.find(m => m.rm_id === parseInt(e.target.value));
                                        handleChange(index, "rm_id", e.target.value);
                                        handleChange(index, "rm_name", selected ? selected.name : "");
                                        handleChange(index, "uom_id", selected ? selected.uom.id : "");
                                        handleChange(index, "uom_name", selected ? selected.uom.name : "");
                                    }}
                                >
                                    <option value="">Select Material</option>
                                    {materials.map(m => (
                                        <option key={m.rm_id} value={m.rm_id}>{m.name}</option>
                                    ))}
                                </select>

                                <button className="add-more" type="button" onClick={() => navigate("/add-materials")}>
                                    Add Material
                                </button>

                                <input type="text" className="input" placeholder="UOM" value={row.uom_name || ""} readOnly />

                                {/* Quantity */}
                                <input
                                    type="number"
                                    className="input"
                                    placeholder="Quantity"
                                    value={row.quantity}
                                    min="0"
                                    step="0.01"
                                    onChange={(e) => handleChange(index, "quantity", e.target.value)}
                                />

                                {/* Unit Price */}
                                <input
                                    type="number"
                                    className="input"
                                    placeholder="Unit Price"
                                    value={row.unitPrice}
                                    min="0"
                                    step="0.01"
                                    onChange={(e) => handleChange(index, "unitPrice", e.target.value)}
                                />

                                {/* Row Total (Qty * Price) */}
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Sub Total"
                                    value={row.total}
                                    readOnly
                                />

                                {/* Add Row Button */}
                                <button type="button" className="add-more" onClick={addRow}>
                                    <FaPlus size={20} />
                                </button>

                                {/* Delete Row Button */}
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
                                <input type="text" className="input" value={subTotal} readOnly style={{width: "auto", backgroundColor: '#f3f3f3' }} />
                            
                            
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
                            
                                <label className="grand-total"><b>Grand<br/>Total:</b></label>
                                <input type="text" className="input" value={grandTotal} readOnly style={{width: "auto",backgroundColor: '#f3f3f3' }} />
                            
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

export default RM_PurchaseForm;