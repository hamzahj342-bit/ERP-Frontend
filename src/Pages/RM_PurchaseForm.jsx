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

    const [rows, setRows] = useState([
        { rm_id: "", rm_name: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "" }
    ]);
    const [materials, setMaterials] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const location = useLocation();
    const invoiceType = new URLSearchParams(location.search).get('invoiceType');

    const [selectedSupplier, setSelectedSupplier] = useState("");
    const [invoiceNo, setInvoiceNo] = useState("");
    const [date, setDate] = useState("");
    const [subTotal, setSubTotal] = useState(0);
    const [globalDiscount, setGlobalDiscount] = useState("");
    const [taxableAmount, setTaxableAmount] = useState(0);
    const [taxAmount, setTaxAmount] = useState(0);
    const [isTaxable, setIsTaxable] = useState(() => invoiceType !== 'nonTaxable');
    const [taxMode, setTaxMode] = useState('exclusive'); // hidden from user
    const [taxRate, setTaxRate] = useState(0);
    const [taxId, setTaxId] = useState(null);
    const [grandTotal, setGrandTotal] = useState(0);
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [showMaterialModal, setShowMaterialModal] = useState(false);
    const [uoms, setUoms] = useState([]);

    const fetchInvoiceNo = useCallback(async () => {
        try {
            const res = await api.get("/rm-transactions/rm-invoice", {
                params: { type: "Purchase" }
            });
            setInvoiceNo(res.data.invoice_no);
        } catch (err) {
            console.error("Error fetching invoice:", err);
        }
    }, []);

    useEffect(() => {
        api.get("/add-materials")
            .then(res => setMaterials(res.data))
            .catch(err => console.error("Error fetching materials:", err));

        api.get("/entities/transactions")
            .then(res => {
                const onlySuppliers = res.data.filter(ent => ent.type === "supplier");
                setSuppliers(onlySuppliers);
            })
            .catch(err => console.error("Error fetching suppliers:", err));

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

    const handleTaxableChange = (value) => {
        setIsTaxable(value);
        calculateTotals(rows, globalDiscount, value, taxMode, taxRate);
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
                quantity: r.quantity,
                unit_price: r.unitPrice,
                total_price: r.total,
                uom_id: r.uom_id,
                date,
                entity_supplier_id: selectedSupplier,
            }))
        };

        try {
            const res = await api.post("/rm-transactions", purchaseData);
            toast.success(`Purchase Transaction Successful! Invoice: ${res.data.invoice_no}`);
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
        const name = document.getElementById('new_rm_name').value;
        const uom_id = document.getElementById('new_rm_uom').value;
        if (!name || !uom_id) return toast.error("Please fill all fields");
        try {
            const res = await api.post("/add-materials", { name, uom_id: parseInt(uom_id) });
            setMaterials(prev => [...prev, res.data]);
            setShowMaterialModal(false);
            toast.success("Material Added!");
        } catch (err) { toast.error("Failed to add material"); }
    };

    useEffect(() => {
        api.get('/uoms').then(res => setUoms(res.data)).catch(() => toast.error('Failed to fetch UOMs'));
    }, []);

    return (
        <div className="rm-page-wrapper">
            <NavigationBar />

            <div className="rm-content-container">
                <div className="rm-header-section">
                    <button className="back-btn" onClick={() => navigate("/rm-purchase")}>
                        <FaArrowLeft />
                    </button>
                    <h2 className="form-title">Raw Material Purchase</h2>
                </div>

                <div className="rm-main-card">
                    {/* Top Info Grid */}
                    <div className="info-grid">
                        <div className="info-item">
                            <label>Invoice No</label>
                            <input type="text" value={invoiceNo} readOnly className="rm-input-field readonly-input" />
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
                                            handleChange(index, "uom_id", selected?.uom.id || "");
                                            handleChange(index, "uom_name", selected?.uom.name || "");
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

            {/* Modals remain same as your logic but with better classes */}
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
                <div className="modal-overlay" onClick={() => setShowMaterialModal(false)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <h3>Add New Material</h3>
                        <div className="form-group"><label>Material Name</label><input type="text" id="new_rm_name" className="rm-input-field" /></div>
                        <div className="form-group">
                            <label>UOM</label>
                            <select id="new_rm_uom" className="rm-input-field">
                                <option value="">Select UOM</option>
                                {uoms.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                        <div className="modal-actions">
                            <button className="save-btn-main" onClick={handleQuickMaterialAdd}>Save Material</button>
                            <button className="quick-add-btn" onClick={() => setShowMaterialModal(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RM_PurchaseForm;