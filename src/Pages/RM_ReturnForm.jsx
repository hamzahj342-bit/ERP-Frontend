import React, { useState, useEffect, useCallback } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft, FaPlus, FaTrash } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import Footer from '../Components/Footer';
import { toast } from 'react-toastify';
import api from "../../api";
import '../Transactions.css';

const RM_ReturnForm = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // URL parameters and Edit Mode flags
    const queryParams = new URLSearchParams(location.search);
    const invoiceType = queryParams.get('invoiceType');
    const editId = queryParams.get('editId'); 
    const isEditMode = !!editId;

    const [rows, setRows] = useState([
        { rm_id: "", rm_name: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", stock: 0 }
    ]);

    const [materials, setMaterials] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [selectedSupplier, setSelectedSupplier] = useState("");
    const [date, setDate] = useState("");
    const [invoiceNo, setInvoiceNo] = useState("");
    const [subTotal, setSubTotal] = useState(0);
    const [taxableAmount, setTaxableAmount] = useState(0);
    const [taxAmount, setTaxAmount] = useState(0);
    const [isTaxable, setIsTaxable] = useState(() => invoiceType !== 'nonTaxable');
    const [taxMode, setTaxMode] = useState('exclusive');
    const [taxRate, setTaxRate] = useState(0);
    const [taxId, setTaxId] = useState(null);
    const [globalDiscount, setGlobalDiscount] = useState(0);
    const [grandTotal, setGrandTotal] = useState(0);

    // 1. Fetch eligible suppliers
    useEffect(() => {
        api.get("/rm-transactions/eligible-suppliers")
            .then((res) => setSuppliers(res.data))
            .catch((err) => console.error("Error fetching eligible suppliers:", err));
    }, []);

    // 2. Fetch materials & tax info of selected supplier (Only runs automatically in Creation Mode)
    useEffect(() => {
        if (!selectedSupplier) {
            setMaterials([]);
            if (!isEditMode) {
                setTaxId(null);
                setTaxRate(0);
                setTaxMode('exclusive');
                updateGrandTotal(rows, isTaxable, 'exclusive', 0, globalDiscount);
            }
            return;
        }

        // Fetch supplier specific raw materials
        api.get(`/rm-transactions/materials/${selectedSupplier}`)
            .then((res) => {
                if (Array.isArray(res.data)) setMaterials(res.data);
                else setMaterials([]);
            })
            .catch((err) => {
                console.error("Error fetching supplier materials:", err);
                setMaterials([]);
            });

        // Fetch tax configurations only if creating a new form instance
        if (!isEditMode) {
            api.get(`/rm-transactions/supplier-last-tax/${selectedSupplier}`)
                .then((res) => {
                    setTaxId(res.data.tax_id || null);
                    setTaxRate(Number(res.data.tax_rate) || 0);
                    setTaxMode(res.data.tax_mode || 'exclusive');
                    updateGrandTotal(rows, isTaxable, res.data.tax_mode || 'exclusive', Number(res.data.tax_rate) || 0, globalDiscount);
                })
                .catch((err) => {
                    console.error("Error fetching supplier tax rate:", err);
                    setTaxId(null);
                    setTaxRate(0);
                    setTaxMode('exclusive');
                    updateGrandTotal(rows, isTaxable, 'exclusive', 0, globalDiscount);
                });
        }
    }, [selectedSupplier, isEditMode]);

    // 3. Fetch Next Invoice Number (Only if not editing)
    useEffect(() => {
        if (isEditMode) return;
        api.get("/rm-transactions/rm-invoice", { params: { type: "Return" } })
            .then(res => setInvoiceNo(res.data.invoice_no))
            .catch(err => console.error("Error fetching invoice number:", err));
    }, [isEditMode]);

    // ---------------------------------------------------------
    // 🔥 EDIT MODE: Fetch and Populate Draft Data
    // ---------------------------------------------------------
    useEffect(() => {
        const loadDraftDataForEdit = async () => {
            if (!isEditMode) return;

            try {
                const res = await api.get(`/rm-transactions/edit-preview/${editId}`);
                const { master, details, invoiceDate } = res.data;

                setInvoiceNo(master.invoice_no);
                setSelectedSupplier(master.entityid);
                
                if (invoiceDate) {
                    setDate(new Date(invoiceDate).toISOString().split('T')[0]);
                }
                
                setIsTaxable(master.is_taxable);
                setTaxMode(master.tax_mode || 'exclusive');
                setTaxRate(Number(master.tax_rate) || 0);
                setTaxId(master.tax_id);
                setGlobalDiscount(master.discount || 0);

                // Map database rows smoothly
                if (Array.isArray(details) && details.length > 0) {
                    const mappedRows = await Promise.all(details.map(async (d) => {
                        const qty = Math.abs(parseFloat(d.quantity) || 0);
                        const price = parseFloat(d.unit_price) || 0;
                        
                        let itemStock = 0;
                        try {
                            const stockRes = await api.get(`/rm-transactions/stock/${d.rm_id}/${master.entityid}`);
                            itemStock = stockRes.data.stock || 0;
                        } catch(e) { console.error("Error fetching stock during edit mapping:", e); }

                        return {
                            rm_id: d.rm_id,
                            rm_name: d.rm_name || "",
                            quantity: qty,
                            unitPrice: price,
                            total: (qty * price).toFixed(2),
                            uom_id: d.uom_id,
                            uom_name: d.uom_name || "", // Synced continuously below
                            stock: itemStock
                        };
                    }));
                    setRows(mappedRows);
                    updateGrandTotal(mappedRows, master.is_taxable, master.tax_mode || 'exclusive', Number(master.tax_rate) || 0, master.discount || 0);
                }
            } catch (err) {
                console.error("Error loading return draft data:", err);
                toast.error("Failed to load return transaction draft details.");
                navigate("/rm-return");
            }
        };

        loadDraftDataForEdit();
    }, [editId, isEditMode]);

    // ---------------------------------------------------------
    // 🔥 AUTO-SYNC LOGIC FOR UOM NAMES (Identical to Purchase Form)
    // ---------------------------------------------------------
    useEffect(() => {
        if (materials.length > 0 && rows.length > 0) {
            const updatedRows = rows.map(row => {
                if (row.rm_id && !row.uom_name) {
                    const found = materials.find(m => m.rm_id === parseInt(row.rm_id));
                    if (found) {
                        return { ...row, uom_name: found.uom?.uom_name || found.uom?.name || "" };
                    }
                }
                return row;
            });
            if (JSON.stringify(updatedRows) !== JSON.stringify(rows)) {
                setRows(updatedRows);
            }
        }
    }, [materials, rows]);

    // 4. Fetch Stock Function
    const fetchStock = async (rm_id, index) => {
        if (!selectedSupplier) return;
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
        updateGrandTotal(updatedRows, isTaxable, taxMode, taxRate);
    };

    const updateGrandTotal = (currentRows, currentIsTaxable = isTaxable, currentTaxMode = taxMode, currentTaxRate = taxRate, discountValue = globalDiscount) => {
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
            sub_total: parseFloat(subTotal),
            taxable_amount: parseFloat(taxableAmount),
            tax_amount: parseFloat(taxAmount),
            is_taxable: isTaxable,
            tax_mode: taxMode,
            tax_rate: parseFloat(taxRate),
            tax_id: taxId,
            type: "PurchaseReturn",
            createdby: user ? user.username : "guest",
            invoice_no: invoiceNo,
            details: validRows.map(r => ({
                rm_id: r.rm_id,
                rm_name: r.rm_name,
                quantity: parseFloat(r.quantity),
                unit_price: r.unitPrice,
                total_price: r.total,
                uom_id: r.uom_id,
                date: date
            }))
        };

        try {
            if (isEditMode) {
                await api.put(`/rm-transactions/${editId}`, returnData);
                toast.success("Purchase Return Draft Updated Successfully");
            } else {
                await api.post("/rm-transactions", returnData);
                toast.success("Purchase Return Transaction Successful");
            }
            navigate('/rm-return');
        } catch (err) {
            toast.error(err.response?.data?.message || "Error saving return transaction data!");
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
                    <h2 className="form-title">{isEditMode ? `Modify Return Draft (${invoiceNo})` : "Raw Material Purchase Return"}</h2>
                </div>

                <div className="rm-main-card">
                    <div className="info-grid">
                        <div className="info-item">
                            <label>Invoice No</label>
                            <input type="text" value={invoiceNo} readOnly className="rm-input-field readonly-input" style={{backgroundColor: '#e2e8f0'}} />
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
                                            handleChange(index, "uom_id", selected ? selected.uom?.id : "");
                                            handleChange(index, "uom_name", selected ? (selected.uom?.uom_name || selected.uom?.name) : "");
                                            
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
                                    <small style={{ marginTop: '4px', fontSize: '11px', fontWeight: 'bold' }} className="text-success">Available: {row.stock}</small>
                                </div>

                                <input type="text" className="rm-input-field readonly-input" placeholder="UOM" value={row.uom_name || ""} readOnly />
                                
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

                                <input type="text" className="rm-input-field readonly-input" value={row.total} readOnly placeholder='Total Price'/>

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
                            <div className="summary-row grand-total-box">
                                <b>Grand Total:</b>
                                <b>{grandTotal}</b>
                            </div>
                        </div>

                        <button type="submit" className="save-btn-main">
                            {isEditMode ? "Update Return Draft" : "Save"}
                        </button>
                    </form>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default RM_ReturnForm;