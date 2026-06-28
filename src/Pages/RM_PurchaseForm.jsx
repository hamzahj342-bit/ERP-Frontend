import React, { useState, useEffect, useCallback } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft, FaPlus, FaTrash } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import Footer from '../Components/Footer';
import { toast } from 'react-toastify';
import api from '../../api';
import '../Model.css';
import '../Transactions.css';

const RM_PurchaseForm = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const queryParams = new URLSearchParams(location.search);
    const invoiceType = queryParams.get('invoiceType');
    const editId = queryParams.get('editId'); 
    const isEditMode = !!editId;

    const [rows, setRows] = useState([
        { rm_id: "", rm_name: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "" }
    ]);
    const [materials, setMaterials] = useState([]);
    const [suppliers, setSuppliers] = useState([]);

    const [selectedSupplier, setSelectedSupplier] = useState("");
    const [invoiceNo, setInvoiceNo] = useState("");
    const [date, setDate] = useState("");
    const [subTotal, setSubTotal] = useState(0);
    const [globalDiscount, setGlobalDiscount] = useState("");
    const [taxableAmount, setTaxableAmount] = useState(0);
    const [taxAmount, setTaxAmount] = useState(0);
    const [isTaxable, setIsTaxable] = useState(() => invoiceType !== 'nonTaxable');
    const [taxMode, setTaxMode] = useState('exclusive'); 
    const [taxRate, setTaxRate] = useState(0);
    const [taxId, setTaxId] = useState(null);
    const [grandTotal, setGrandTotal] = useState(0);
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [showMaterialModal, setShowMaterialModal] = useState(false);
    const [uoms, setUoms] = useState([]);
    // --- State Controlled Modal Variables for flawless UI Sync ---
const [newMaterialName, setNewMaterialName] = useState("");
const [newMaterialUom, setNewMaterialUom] = useState("");

    const fetchInvoiceNo = useCallback(async () => {
        if (isEditMode) return; 
        try {
            const res = await api.get("/rm-transactions/rm-invoice", {
                params: { type: "Purchase" }
            });
            setInvoiceNo(res.data.invoice_no);
        } catch (err) {
            console.error("Error fetching invoice:", err);
        }
    }, [isEditMode]);

    // ---------------------------------------------------------
    // 🔥 FIXED CALCULATION LOGIC (REUSED SAFELY)
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
    // 🔥 MASTER DATA & EDIT MODE AUTO-FILL (COMBINED TO PREVENT LOOPS)
    // ---------------------------------------------------------
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // Parallel API Requests
                const [materialsRes, suppliersRes, uomsRes] = await Promise.all([
                    api.get("/add-materials"),
                    api.get("/entities/transactions"),
                    api.get('/uoms')
                ]);

                setMaterials(materialsRes.data);
                setUoms(uomsRes.data);

                const onlySuppliers = suppliersRes.data.filter(ent => ent.type === "supplier");
                setSuppliers(onlySuppliers);

                // If NOT Edit Mode, load default tax
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
                    // IF EDIT MODE -> Fetch data after dependencies are loaded
                    const editRes = await api.get(`/rm-transactions/edit-preview/${editId}`);
                    const { master, details, invoiceDate } = editRes.data;

                    setInvoiceNo(master.invoice_no);
                    setSelectedSupplier(master.entityid);
                    
                    if (invoiceDate) {
                        setDate(new Date(invoiceDate).toISOString().split('T')[0]);
                    }
                    
                    setSubTotal(parseFloat(master.subtotal || 0).toFixed(2));
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
                            
                            // Materials response se fallback UOM check karna
                            const matchingMaterial = materialsRes.data.find(m => m.rm_id === parseInt(d.rm_id));

                            return {
                                rm_id: d.rm_id,
                                rm_name: d.rm_name,
                                quantity: qty,
                                unitPrice: price,
                                total: (qty * price).toFixed(2),
                                uom_id: d.uom_id || matchingMaterial?.uom?.id || "",
                                uom_name: d.uom_name || matchingMaterial?.uom?.name || ""
                            };
                        });
                        setRows(mappedRows);
                    }
                }
            } catch (err) {
                console.error("Error loading initial form data:", err);
                toast.error("Failed to load required data.");
                if (isEditMode) navigate("/rm-purchase");
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
            updated[index].total = (qty * price).toFixed(2);
        }

        setRows(updated);
        calculateTotals(updated, globalDiscount, isTaxable, taxMode, taxRate);
    };

    const handleGlobalDiscountChange = (value) => {
        setGlobalDiscount(value);
        calculateTotals(rows, value, isTaxable, taxMode, taxRate);
    };

    const addRow = () => {
        setRows([...rows, { rm_id: "", rm_name: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "" }]);
    };

    const deleteRow = (index) => {
        const updated = rows.filter((_, i) => i !== index);
        setRows(updated);
        calculateTotals(updated, globalDiscount);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedSupplier) return toast.error("Please select a supplier.");
        if (!date) return toast.error("Please select a purchase date.");

        const validRows = rows.filter(r => r.rm_id && parseFloat(r.quantity) > 0 && parseFloat(r.unitPrice) > 0);
        if (validRows.length === 0) return toast.error("Please add at least one valid material row.");

        const disc = parseFloat(globalDiscount) || 0;
        if (disc > parseFloat(subTotal)) {
            return toast.error("Global Discount cannot exceed the Total Sub Amount.");
        }

        const user = JSON.parse(localStorage.getItem("user"));
        const purchaseData = {
            entityid: selectedSupplier,
            grand_total: parseFloat(grandTotal),
            sub_total: parseFloat(subTotal),
            discount: disc,
            taxable_amount: parseFloat(taxableAmount),
            tax_amount: parseFloat(taxAmount),
            is_taxable: isTaxable,
            tax_mode: taxMode,
            tax_rate: parseFloat(taxRate),
            tax_id: taxId,
            type: "purchase",
            createdby: user?.username || "guest",
            invoice_no: invoiceNo,
            details: validRows.map(r => ({
                rm_id: r.rm_id,
                rm_name: r.rm_name,
                quantity: parseFloat(r.quantity),
                unit_price: parseFloat(r.unitPrice),
                total_price: parseFloat(r.total),
                uom_id: r.uom_id,
                date,
                entity_supplier_id: selectedSupplier,
            }))
        };

        try {
            if (isEditMode) {
                await api.put(`/rm-transactions/${editId}`, purchaseData);
                toast.success(`Invoice Draft Updated Successfully! Code: ${invoiceNo}`);
            } else {
                const res = await api.post("/rm-transactions", purchaseData);
                toast.success(`Purchase Transaction Saved as Draft! Invoice: ${res.data.invoice_no}`);
            }
            navigate("/rm-purchase");
        } catch (err) {
            toast.error(err.response?.data?.message || "Error saving purchase transaction.");
        }
    };

    const handleQuickSupplierAdd = async () => {
        const name = document.getElementById('new_sup_name').value;
        const contact = document.getElementById('new_sup_contact').value;
        const address = document.getElementById('new_sup_address').value;
        if (!name) return toast.error("Supplier name is required");
        try {
            const res = await api.post("/entities", { name, contact, address, type: "supplier" });
            setSuppliers(prev => [...prev, res.data]);
            setSelectedSupplier(res.data.id);
            setShowSupplierModal(false);
            toast.success("Supplier Added!");
        } catch (err) { toast.error("Failed to add supplier"); }
    };

    const handleQuickMaterialAdd = async () => {
    if (!newMaterialName || !newMaterialUom) return toast.error("Please fill all fields");
    
    try {
        const payload = { 
            name: newMaterialName, 
            material_name: newMaterialName, // Fallback if backend looks for material_name
            uom_id: parseInt(newMaterialUom) 
        };

        const res = await api.post("/add-materials", payload);
        
        // Handling both raw object and nested data responses safely
        const savedItem = res.data?.data || res.data;
        
        if (savedItem) {
            setMaterials(prev => [...prev, savedItem]);
            toast.success("Material Added!");
        } else {
            // Safe fallback: re-sync list from backend if response format is messy
            const refreshRes = await api.get("/add-materials");
            setMaterials(refreshRes.data);
            toast.info("Materials list synchronized.");
        }
        
        // Reset and close
        setNewMaterialName("");
        setNewMaterialUom("");
        setShowMaterialModal(false);
    } catch (err) { 
        console.error("Quick Material Add Error:", err);
        toast.error(err.response?.data?.message || "Failed to add material"); 
    }
};

    return (
        <div className="rm-page-wrapper">
            <NavigationBar />

            <div className="rm-content-container">
                <div className="rm-header-section">
                    <button className="back-btn" onClick={() => navigate("/rm-purchase")}>
                        <FaArrowLeft />
                    </button>
                    <h2 className="form-title">{isEditMode ? `Modify Draft (${invoiceNo})` : "Raw Material Purchase"}</h2>
                </div>

                <div className="rm-main-card">
                    <div className="info-grid">
                        <div className="info-item">
                            <label>Invoice No</label>
                            <input type="text" value={invoiceNo} readOnly className="rm-input-field readonly-input" style={{backgroundColor: isEditMode ? '#e2e8f0' : '#f1f5f9'}} />
                        </div>
                        <div className="info-item">
                            <label>Supplier</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <select className="rm-input-field" value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)}>
                                    <option value="">Select Supplier</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <button type="button" className="quick-add-btn" onClick={() => setShowSupplierModal(true)}><FaPlus /></button>
                            </div>
                        </div>
                        <div className="info-item">
                            <label>Purchase Date</label>
                            <input type="date" className="rm-input-field" value={date} onChange={(e) => setDate(e.target.value)} />
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="items-table-header">
                            <span>Material</span>
                            <span>UOM</span>
                            <span>Qty</span>
                            <span>Unit Price</span>
                            <span>Total</span>
                            <span>Action</span>
                        </div>

                        {rows.map((row, index) => (
                            <div className="item-row" key={index}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <select
                                        className="rm-input-field"
                                        value={row.rm_id}
                                        onChange={(e) => {
                                            const selected = materials.find(m => m.rm_id === parseInt(e.target.value));
                                            handleChange(index, "rm_id", e.target.value);
                                            handleChange(index, "rm_name", selected?.name || "");
                                            handleChange(index, "uom_id", selected?.uom?.id || "");
                                            handleChange(index, "uom_name", selected?.uom?.name || "");
                                        }}
                                    >
                                        <option value="">Select Material</option>
                                        {materials.map(m => <option key={m.rm_id} value={m.rm_id}>{m.name}</option>)}
                                    </select>
                                    <button type="button" className="quick-add-btn" onClick={() => setShowMaterialModal(true)}><FaPlus /></button>
                                </div>

                                <input type="text" className="rm-input-field readonly-input" placeholder="UOM" value={row.uom_name} readOnly />
                                <input type="number" className="rm-input-field" placeholder="Qty" value={row.quantity} onChange={(e) => handleChange(index, "quantity", e.target.value)} />
                                <input type="number" className="rm-input-field" placeholder="Price" value={row.unitPrice} onChange={(e) => handleChange(index, "unitPrice", e.target.value)} />
                                <input type="text" className="rm-input-field readonly-input" placeholder='Total' value={row.total} readOnly />

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

                        <button type="submit" className="save-btn-main">{isEditMode ? "Update Draft" : "Save Draft"}</button>
                    </form>
                </div>
            </div>
            <Footer />

            {showSupplierModal && (
                <div className="modal-overlay" onClick={() => setShowSupplierModal(false)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <h3>Add New Supplier</h3>
                        <div className="form-group"><label>Name</label><input type="text" id="new_sup_name" className="rm-input-field" /></div>
                        <div className="form-group"><label>Address</label><textarea id="new_sup_address" className="rm-input-field"></textarea></div>
                        <div className="form-group"><label>Contact</label><input type="text" id="new_sup_contact" className="rm-input-field" /></div>
                        <div className="modal-actions">
                            <button className="save-btn-main" onClick={handleQuickSupplierAdd}>Save Supplier</button>
                            <button className="quick-add-btn" onClick={() => setShowSupplierModal(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {showMaterialModal && (
    <div className="modal-overlay" onClick={() => {
        setShowMaterialModal(false);
        setNewMaterialName("");
        setNewMaterialUom("");
    }}>
        <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Add New Material</h3>
            <div className="form-group">
                <label>Material Name</label>
                <input 
                    type="text" 
                    className="rm-input-field" 
                    value={newMaterialName}
                    onChange={(e) => setNewMaterialName(e.target.value)}
                    placeholder="Enter material name"
                />
            </div>
            <div className="form-group">
                <label>UOM</label>
                <select 
                    className="rm-input-field"
                    value={newMaterialUom}
                    onChange={(e) => setNewMaterialUom(e.target.value)}
                >
                    <option value="">Select UOM</option>
                    {uoms.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
            </div>
            <div className="modal-actions">
                <button type="button" className="save-btn-main" onClick={handleQuickMaterialAdd}>Save Material</button>
                <button type="button" className="quick-add-btn" onClick={() => {
                    setShowMaterialModal(false);
                    setNewMaterialName("");
                    setNewMaterialUom("");
                }}>Cancel</button>
            </div>
        </div>
    </div>
)}
        </div>
    );
};

export default RM_PurchaseForm;