import React, { useState, useEffect } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft, FaPlus, FaTrash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Footer from '../Components/Footer';
import { toast } from 'react-toastify';
import api from "../../api";
import '../Transactions.css';

const RM_ReturnForm = () => {
    const navigate = useNavigate();
    const [rows, setRows] = useState([
        { rm_id: "", rm_name: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", stock: 0 }
    ]);
    const [materials, setMaterials] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [selectedSupplier, setSelectedSupplier] = useState("");
    const [date, setDate] = useState("");
    const [invoiceNo, setInvoiceNo] = useState("");
    const [grandTotal, setGrandTotal] = useState(0);

    // 1. Fetch eligible suppliers
    useEffect(() => {
        api.get("/rm-transactions/eligible-suppliers")
            .then((res) => setSuppliers(res.data))
            .catch((err) => console.error("Error fetching eligible suppliers:", err));
    }, []);

    // 2. Fetch materials of selected supplier only
    useEffect(() => {
        if (selectedSupplier) {
            api.get(`/rm-transactions/materials/${selectedSupplier}`)
                .then((res) => {
                    if (Array.isArray(res.data)) setMaterials(res.data);
                    else setMaterials([]);
                })
                .catch((err) => {
                    console.error("Error fetching supplier materials:", err);
                    setMaterials([]);
                });
        } else {
            setMaterials([]);
        }
    }, [selectedSupplier]);

    // 3. Fetch Next Invoice Number
    useEffect(() => {
        api.get("/rm-transactions/rm-invoice", { params: { type: "Return" } })
            .then(res => setInvoiceNo(res.data.invoice_no))
            .catch(err => console.error("Error fetching invoice number:", err));
    }, []);

    // 4. Fetch Stock
    const fetchStock = async (rm_id, index) => {
        try {
            const res = await api.get(`/rm-transactions/stock/${rm_id}/${selectedSupplier}`);
            const updatedRows = [...rows];
            updatedRows[index].stock = res.data.stock || 0;
            setRows(updatedRows);
        } catch (err) {
            console.error("Error fetching stock:", err);
        }
    };

    const handleChange = (index, field, value) => {
        const updatedRows = [...rows];
        updatedRows[index][field] = value;

        if (field === "quantity" || field === "unitPrice") {
            const qty = parseFloat(updatedRows[index].quantity) || 0;
            const price = parseFloat(updatedRows[index].unitPrice) || 0;

            if (qty > updatedRows[index].stock && field === "quantity") {
                toast.error(`Only ${updatedRows[index].stock} units available!`);
                updatedRows[index].quantity = "";
                updatedRows[index].total = "";
            } else {
                updatedRows[index].total = (qty * price).toFixed(2);
            }
        }
        setRows(updatedRows);
        updateGrandTotal(updatedRows);
    };

    const updateGrandTotal = (rows) => {
        const total = rows.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0);
        setGrandTotal(total.toFixed(2));
    };

    const addRow = () => {
        setRows([...rows, { rm_id: "", rm_name: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", stock: 0 }]);
    };

    const deleteRow = (index) => {
        const updatedRows = rows.filter((_, i) => i !== index);
        setRows(updatedRows);
        updateGrandTotal(updatedRows);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedSupplier) return toast.error("Please select a supplier.");
        if (!date) return toast.error("Please select a return date.");

        const validRows = rows.filter(r => r.rm_id && parseFloat(r.quantity) > 0);
        if (validRows.length === 0) return toast.error("Please add at least one material item.");

        const user = JSON.parse(localStorage.getItem("user"));
        const returnData = {
            entityid: selectedSupplier,
            grand_total: parseFloat(grandTotal),
            type: "PurchaseReturn",
            createdby: user ? user.username : "guest",
            invoice_no: invoiceNo,
            details: validRows.map(r => ({
                rm_id: r.rm_id,
                rm_name: r.rm_name,
                quantity: r.quantity,
                unit_price: r.unitPrice,
                total_price: r.total,
                uom_id: r.uom_id,
                date: date
            }))
        };

        try {
            await api.post("/rm-transactions", returnData);
            toast.success("Purchase Return Transaction Successful");
            navigate('/rm-return');
        } catch (err) {
            toast.error(err.response?.data?.message || "Error creating return!");
        }
    };

    return (
        <div className="rm-page-wrapper">
            <NavigationBar />

            <div className="rm-content-container">
                <div className="rm-header-section">
                    <button className="back-btn" onClick={() => navigate('/rm-return')}>
                        <FaArrowLeft />
                    </button>
                    <h2 className="form-title">Raw Material Purchase Return</h2>
                </div>

                <div className="rm-main-card">
                    {/* Top Info Grid - Same as Purchase */}
                    <div className="info-grid">
                        <div className="info-item">
                            <label>Purchase Return Invoice No</label>
                            <input type="text" value={invoiceNo} readOnly className="rm-input-field readonly-input" style={{backgroundColor: '#f3f3f3'}} />
                        </div>
                        <div className="info-item">
                            <label>Select Supplier</label>
                            <select
                                className="rm-input-field"
                                value={selectedSupplier}
                                onChange={(e) => setSelectedSupplier(e.target.value)}
                            >
                                <option value="">Select Supplier</option>
                                {suppliers.map((ent) => (
                                    <option key={ent.id} value={ent.id}>{ent.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="info-item">
                            <label>Return Date</label>
                            <input
                                type="date"
                                className="rm-input-field"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* Table Header - Same Layout */}
                        <div className="items-table-header">
                            <span>Material</span>
                            <span>UOM</span>
                            <span>Quantity</span>
                            <span>Unit Price</span>
                            <span>Total Price</span>
                            <span>Action</span>
                        </div>

                        {rows.map((row, index) => (
                            <div className="item-row" key={index}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <select
                                        className="rm-input-field"
                                        value={row.rm_id}
                                        onChange={(e) => {
                                            const selected = materials.find(m => m.rm_id === parseInt(e.target.value));
                                            handleChange(index, "rm_id", e.target.value);
                                            handleChange(index, "rm_name", selected ? selected.rm_name : "");
                                            handleChange(index, "uom_id", selected ? selected.uom.id : "");
                                            handleChange(index, "uom_name", selected ? selected.uom.uom_name : "");
                                            const id = parseInt(e.target.value);
                                            if (!isNaN(id)) fetchStock(id, index);
                                        }}
                                        style={{marginTop: '20px'}}
                                    >
                                        <option value="">Select Material</option>
                                        {Array.isArray(materials) && materials.map((m) => (
                                            <option key={m.rm_id} value={m.rm_id}>{m.rm_name}</option>
                                        ))}
                                    </select>
                                    <small style={{ color: "#718096", marginTop: '4px', fontSize: '11px' }}>Available: {row.stock}</small>
                                </div>

                                <input type="text" className="rm-input-field readonly-input" placeholder="UOM" value={row.uom_name || ""} readOnly style={{backgroundColor: '#f3f3f3'}} />
                                
                                <input
                                    type="number"
                                    className="rm-input-field"
                                    placeholder="Qty"
                                    value={row.quantity}
                                    onChange={(e) => handleChange(index, "quantity", e.target.value)}
                                />

                                <input
                                    type="number"
                                    className="rm-input-field"
                                    placeholder="Unit Price"
                                    value={row.unitPrice}
                                    onChange={(e) => handleChange(index, "unitPrice", e.target.value)}
                                />

                                <input type="text" className="rm-input-field readonly-input" value={row.total} readOnly style={{backgroundColor: '#f3f3f3'}} />

                                <div style={{ display: "flex", gap: "8px" }}>
                                    <button type="button" className="quick-add-btn" style={{ color: '#3182ce' }} onClick={addRow}>
                                        <FaPlus />
                                    </button>
                                    {rows.length > 1 && (
                                        <button type="button" className="quick-add-btn" style={{ color: '#e53e3e' }} onClick={() => deleteRow(index)}>
                                            <FaTrash />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Summary Section - Exact Same as Purchase */}
                        <div className="summary-container">
                            <div className="summary-row grand-total-box">
                                <b>Grand Total:</b>
                                <b>{grandTotal}</b>
                            </div>
                        </div>

                        <button type="submit" className="save-btn-main">
                            Save
                        </button>
                    </form>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default RM_ReturnForm;