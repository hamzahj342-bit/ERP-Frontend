import React, { useState, useEffect, useCallback } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft, FaPlus, FaTrash } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import Footer from '../Components/Footer';
import { toast } from 'react-toastify';
import api from '../../api';
import '../Model.css';
import '../Transactions.css';

const RM_SaleForm = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const queryParams = new URLSearchParams(location.search);
    const invoiceType = queryParams.get('invoiceType');
    const editId = queryParams.get('editId'); 
    const isEditMode = !!editId;

    const [rows, setRows] = useState([
        { rm_id: "", rm_name: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", supplier_id: "", shop_name: "", current_stock: 0 }
    ]);
    const [materials, setMaterials] = useState([]);
    const [customers, setCustomers] = useState([]);

    const [selectedCustomer, setSelectedCustomer] = useState("");
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
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [uoms, setUoms] = useState([]);
    const [sourceDocuments, setSourceDocuments] = useState([]);
    const [selectedSourceDoc, setSelectedSourceDoc] = useState("");
    const [originalSourceItems, setOriginalSourceItems] = useState([]);

    const getMaterialMeta = (material, fallbackDetail = {}) => {
        const uom = material?.uom || fallbackDetail?.uom || null;
        return {
            rm_id: Number(material?.rm_id ?? fallbackDetail?.material_id ?? fallbackDetail?.rm_id ?? 0),
            rm_name: material?.rm_name || material?.name || fallbackDetail?.material_name || fallbackDetail?.rm_name || "Material",
            uom_id: material?.uom_id ?? fallbackDetail?.uom_id ?? uom?.id ?? "",
            uom_name: material?.uom_name || material?.uom?.name || fallbackDetail?.uom_name || uom?.name || "",
            supplier_id: material?.supplier_id ?? fallbackDetail?.supplier_id ?? "",
            shop_name: material?.shop_name || fallbackDetail?.shop_name || "",
            current_stock: Number(material?.current_stock ?? fallbackDetail?.current_stock ?? 0),
        };
    };

    const fetchInvoiceNo = useCallback(async () => {
        if (isEditMode) return; 
        try {
            const res = await api.get("/rm-transactions/rm-invoice", {
                params: { type: "Sale" }
            });
            setInvoiceNo(res.data.invoice_no);
        } catch (err) {
            console.error("Error fetching invoice:", err);
        }
    }, [isEditMode]);

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

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // 1. Fetch Master Lists Pehle load karein
                const [materialsRes, customersRes, uomsRes, sourceDocsRes] = await Promise.all([
                    api.get("/rm-transactions/materials-with-suppliers"),
                    api.get("/entities/transactions"),
                    api.get('/uoms'),
                    api.get('/loader-documents/unposted', { params: { type: 'DC' } })
                ]);

                setMaterials(materialsRes.data);
                setUoms(uomsRes.data);
                setSourceDocuments(sourceDocsRes.data?.data || []);

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
                    // 2. Fetch Preview Mode Details
                    const editRes = await api.get(`/rm-transactions/edit-preview/${editId}`);
                    const { master, details, invoiceDate } = editRes.data;

                    setInvoiceNo(master.invoice_no);
                    setSelectedCustomer(master.entityid || master.entity_customer_id);
                    
                    if (invoiceDate) {
                        setDate(new Date(invoiceDate).toISOString().split('T')[0]);
                    } else if (master.date) {
                        setDate(new Date(master.date).toISOString().split('T')[0]);
                    }
                    
                    setSubTotal(parseFloat(master.subtotal || master.sub_total || 0).toFixed(2));
                    setGlobalDiscount(master.discount || "");
                    setIsTaxable(master.is_taxable);
                    setTaxMode(master.tax_mode || 'exclusive');
                    setTaxRate(Number(master.tax_rate) || 0);
                    setTaxId(master.tax_id);
                    setTaxableAmount(parseFloat(master.taxable_amount || 0).toFixed(2));
                    setTaxAmount(parseFloat(master.tax_amount || 0).toFixed(2));
                    setGrandTotal(parseFloat(master.grand_total || 0).toFixed(2));

                    let mappedRows = [];
                    if (Array.isArray(details) && details.length > 0) {
                        mappedRows = details.map((d) => {
                            const cleanRmId = Number(d.rm_id);
                            const cleanSupplierId = Number(d.original_supplier_id || d.entity_supplier_id || d.supplier_id);
                            const matchingMaterial = materialsRes.data.find(m => 
                                Number(m.rm_id) === cleanRmId && Number(m.supplier_id) === cleanSupplierId
                            );

                            const qty = Math.abs(parseFloat(d.quantity || d.qty) || 0);
                            const price = parseFloat(d.unit_price || d.price || d.unitPrice) || 0;

                            const finalUomName = matchingMaterial?.uom_name || d.uom_name || "Kg";
                            const finalRmName = matchingMaterial?.rm_name || d.rm_name || "Material";
                            const finalShopName = matchingMaterial?.shop_name || d.supplier_name || "Supplier";
                            const finalUomId = matchingMaterial?.uom_id || d.uom_id || "";

                            return {
                                rm_id: cleanRmId,
                                rm_name: finalRmName,
                                quantity: qty,
                                unitPrice: price,
                                total: (qty * price).toFixed(2),
                                uom_id: finalUomId,
                                uom_name: finalUomName,
                                supplier_id: String(cleanSupplierId),
                                shop_name: finalShopName,
                                current_stock: matchingMaterial ? Number(matchingMaterial.current_stock) : qty
                            };
                        });
                        setRows(mappedRows);
                    }

                    const sourceDocId = master.source_doc_id || master.inventory_doc_id || master.grn_id || master.dc_id || null;
                    const sourceDocNo = master.source_doc_no || master.inventory_doc_no || null;
                    if (sourceDocId) {
                        if (sourceDocNo) {
                            setSourceDocuments(prev => prev.some(doc => String(doc.id) === String(sourceDocId)) ? prev : [{ id: Number(sourceDocId), no: sourceDocNo }, ...prev]);
                        }
                        await handleSourceDocumentSelection(sourceDocId, mappedRows, materialsRes.data);
                    }
                }
            } catch (err) {
                console.error("Error loading initial form data:", err);
                toast.error("Failed to load required data.");
                if (isEditMode) navigate("/rm-sale");
            }
        };

        loadInitialData();
    }, [editId, isEditMode, navigate, fetchInvoiceNo]);

    const handleMaterialSelection = (index, value) => {
        const updated = [...rows];
        if (!value) {
            updated[index] = { rm_id: "", rm_name: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", supplier_id: "", shop_name: "", current_stock: 0 };
            setRows(updated);
            calculateTotals(updated, globalDiscount, isTaxable, taxMode, taxRate);
            return;
        }

        const [rmId, supplierId] = value.split("-");
        const selected = materials.find(m => Number(m.rm_id) === Number(rmId) && Number(m.supplier_id) === Number(supplierId));

        if (selected) {
            updated[index].rm_id = Number(selected.rm_id);
            updated[index].rm_name = selected.rm_name;
            updated[index].uom_id = selected.uom_id;
            updated[index].uom_name = selected.uom_name;
            updated[index].supplier_id = String(selected.supplier_id);
            updated[index].shop_name = selected.shop_name;
            updated[index].current_stock = selected.current_stock;
            updated[index].quantity = "";
            updated[index].total = "0.00";
        }

        setRows(updated);
        calculateTotals(updated, globalDiscount, isTaxable, taxMode, taxRate);
    };

    const handleSourceDocumentSelection = async (docId, existingRowsOverride = rows, materialsList = materials) => {
        setSelectedSourceDoc(docId || "");
        if (!docId) {
            setRows(Array.isArray(existingRowsOverride) && existingRowsOverride.length > 0 ? existingRowsOverride : [{ rm_id: "", rm_name: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", supplier_id: "", shop_name: "", current_stock: 0 }]);
            setOriginalSourceItems([]);
            return;
        }

        try {
            const res = await api.get(`/loader-documents/${docId}`);
            const sourceDoc = res.data?.data || res.data;
            const details = sourceDoc.LoaderDocumentDetails || sourceDoc.details || [];
            setSourceDocuments(prev => prev.some(doc => String(doc.id) === String(docId)) ? prev : [{ id: Number(docId), no: sourceDoc.no || `Source Document ${docId}` }, ...prev]);

            if (sourceDoc.entity_id) {
                setSelectedCustomer(String(sourceDoc.entity_id));
            }
            if (sourceDoc.date) {
                setDate(sourceDoc.date.split('T')[0]);
            }

            const fallbackRows = Array.isArray(existingRowsOverride) && existingRowsOverride.length > 0
                ? existingRowsOverride
                : [{ rm_id: "", rm_name: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", supplier_id: "", shop_name: "", current_stock: 0 }];

            const mappedRows = details.map((detail) => {
                const cleanRmId = Number(detail.material_id || detail.rm_id);
                const cleanSupplierId = detail.supplier_id ? Number(detail.supplier_id) : null;
                const existingRow = fallbackRows.find((row) => Number(row.rm_id) === cleanRmId) || {};
                const matchingMaterial = materialsList.find((m) => Number(m.rm_id) === cleanRmId && Number(m.supplier_id) === cleanSupplierId);
                const meta = getMaterialMeta(matchingMaterial, detail);

                return {
                    ...existingRow,
                    rm_id: cleanRmId,
                    rm_name: meta.rm_name,
                    quantity: existingRow.quantity ?? Number(detail.quantity || 0),
                    unitPrice: existingRow.unitPrice ?? "",
                    total: existingRow.total ?? "0.00",
                    uom_id: meta.uom_id,
                    uom_name: meta.uom_name,
                    supplier_id: cleanSupplierId ? String(cleanSupplierId) : "",
                    shop_name: meta.shop_name,
                    current_stock: meta.current_stock,
                    source_doc_id: sourceDoc.id,
                    source_doc_no: sourceDoc.no,
                    source_doc_type: sourceDoc.type,
                };
            });

            const nextRows = mappedRows.length > 0 ? mappedRows : fallbackRows;
            setRows(nextRows);
            setOriginalSourceItems(mappedRows.map((item) => ({ ...item, quantity: Number(item.quantity || 0) })));
            toast.success(`Loaded ${sourceDoc.no} for autofill.`);
        } catch (err) {
            console.error("Error loading source document:", err);
            toast.error("Failed to load selected DC document.");
        }
    };

    const handleChange = (index, field, value) => {
        const updated = [...rows];
        
        if (field === "quantity") {
            const inputQty = parseFloat(value) || 0;
            const originalItem = originalSourceItems[index];
            const maxAllowed = parseFloat(originalItem?.quantity || 0);

            if (selectedSourceDoc && originalItem && inputQty > maxAllowed) {
                toast.error(`Error: Maximum quantity allowed is ${maxAllowed}. You cannot exceed the original quantity.`);
                updated[index].quantity = String(maxAllowed);
                updated[index].total = "0.00";
                setRows(updated);
                calculateTotals(updated, globalDiscount, isTaxable, taxMode, taxRate);
                return;
            }

            const available = parseFloat(updated[index].current_stock) || 0;
            if (inputQty > available) {
                toast.error(`Out of stock! Only ${available} units available.`);
                updated[index][field] = "";
                updated[index].total = "0.00";
                setRows(updated);
                calculateTotals(updated, globalDiscount, isTaxable, taxMode, taxRate);
                return;
            }
        }

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
        setRows([...rows, { rm_id: "", rm_name: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", supplier_id: "", shop_name: "", current_stock: 0 }]);
    };

    const deleteRow = (index) => {
        const updated = rows.filter((_, i) => i !== index);
        setRows(updated);
        calculateTotals(updated, globalDiscount);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCustomer) return toast.error("Please select a customer.");
        if (!date) return toast.error("Please select a sale date.");

        const validRows = rows.filter(r => r.rm_id && parseFloat(r.quantity) > 0 && parseFloat(r.unitPrice) > 0);
        if (validRows.length === 0) return toast.error("Please add at least one valid material row.");

        const user = JSON.parse(localStorage.getItem("user"));
        const saleData = {
            entityid: selectedCustomer,
            grand_total: parseFloat(grandTotal),
            sub_total: parseFloat(subTotal),
            discount: parseFloat(globalDiscount) || 0,
            taxable_amount: parseFloat(taxableAmount),
            tax_amount: parseFloat(taxAmount),
            is_taxable: isTaxable,
            tax_mode: taxMode,
            tax_rate: parseFloat(taxRate),
            tax_id: taxId,
            type: "sale", 
            createdby: user?.username || "guest",
            invoice_no: invoiceNo,
            details: validRows.map(r => ({
                rm_id: Number(r.rm_id),
                rm_name: r.rm_name,
                quantity: parseFloat(r.quantity),
                unit_price: parseFloat(r.unitPrice),
                total_price: parseFloat(r.total),
                uom_id: r.uom_id,
                entity_supplier_id: Number(r.supplier_id),
                original_supplier_id: Number(r.supplier_id),
                supplier_id: Number(r.supplier_id),
                date,
                entity_customer_id: selectedCustomer,
            })),
            source_doc_id: selectedSourceDoc ? Number(selectedSourceDoc) : null,
            source_doc_type: selectedSourceDoc ? "DC" : null,
        };

        try {
            if (isEditMode) {
                await api.put(`/rm-transactions/${editId}`, saleData);
                toast.success(`Sale Draft Updated Successfully! Code: ${invoiceNo}`);
            } else {
                const res = await api.post("/rm-transactions", saleData);
                toast.success(`Sale Transaction Saved as Draft! Invoice: ${res.data.invoice_no}`);
            }
            navigate("/rm-sale");
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
                    <button className="back-btn" onClick={() => navigate("/rm-sale")}>
                        <FaArrowLeft />
                    </button>
                    <h2 className="form-title">{isEditMode ? `Modify Sale Draft (${invoiceNo})` : "Raw Material Sale"}</h2>
                </div>

                <div className="rm-main-card">
                    <div className="info-grid">
                        <div className="info-item">
                            <label>Invoice No</label>
                            <input type="text" value={invoiceNo} readOnly className="rm-input-field readonly-input" style={{backgroundColor: '#f1f5f9'}} />
                        </div>
                        <div className="info-item">
                            <label>Customer</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <select className="rm-input-field" value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} disabled={!!selectedSourceDoc}>
                                    <option value="">Select Customer</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <button type="button" className="quick-add-btn" onClick={() => setShowCustomerModal(true)} disabled={!!selectedSourceDoc}><FaPlus /></button>
                            </div>
                        </div>
                        <div className="info-item">
                            <label>Sale Date</label>
                            <input type="date" className="rm-input-field" value={date} onChange={(e) => setDate(e.target.value)} readOnly={!!selectedSourceDoc} />
                        </div>
                        <div className="info-item">
                            <label>Source DC</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <select className="rm-input-field" value={selectedSourceDoc} onChange={(e) => handleSourceDocumentSelection(e.target.value)}>
                                    <option value="">Select DC (optional)</option>
                                    {sourceDocuments.map(doc => (
                                        <option key={doc.id} value={doc.id}>{doc.no}</option>
                                    ))}
                                </select>
                                <button type="button" className="quick-add-btn" onClick={() => navigate('/dc-form')}><FaPlus /></button>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="items-table-header" style={{ display: 'grid', gridTemplateColumns: '3.5fr 1.2fr 1.5fr 1.5fr 1.5fr 1fr', gap: '12px', fontWeight: 'bold', paddingBottom: '10px' }}>
                            <span>Material</span>
                            <span>UOM</span>
                            <span>Qty</span>
                            <span>Unit Price</span>
                            <span>Total</span>
                            <span>Action</span>
                        </div>

                        {rows.map((row, index) => {
                            // Value formation strictly forcing exact syntax matching pattern
                            const currentSelectionValue = row.rm_id && row.supplier_id ? `${Number(row.rm_id)}-${String(row.supplier_id).trim()}` : "";

                            return (
                                <div className="item-row" key={index} style={{ display: 'grid', gridTemplateColumns: '3.5fr 1.2fr 1.5fr 1.5fr 1.5fr 1fr', gap: '12px', alignItems: 'start', marginBottom: '12px' }}>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <select
                                            className="rm-input-field"
                                            value={currentSelectionValue}
                                            disabled={!!selectedSourceDoc}
                                            onChange={(e) => handleMaterialSelection(index, e.target.value)}
                                        >
                                            <option value="">Select Material</option>
                                            
                                            {materials.map(m => (
                                                <option key={`${m.rm_id}-${m.supplier_id}`} value={`${Number(m.rm_id)}-${String(m.supplier_id).trim()}`}>
                                                    {m.rm_name} - {m.shop_name || 'No Supplier'}
                                                </option>
                                            ))}
                                        </select>
                                        {row.rm_id && (
                                            <small className='text-success' style={{ fontSize: '12px', paddingLeft: '4px', marginTop: '2px' }}>
                                                Available: {row.current_stock}
                                            </small>
                                        )}
                                    </div>

                                    <input type="text" className="rm-input-field readonly-input" style={{ marginTop: '0px' }} placeholder="UOM" value={row.uom_name} readOnly />
                                    <input type="number" className="rm-input-field" placeholder="Qty" value={row.quantity} onChange={(e) => handleChange(index, "quantity", e.target.value)} />
                                    <input type="number" className="rm-input-field" placeholder="Price" value={row.unitPrice} onChange={(e) => handleChange(index, "unitPrice", e.target.value)} />
                                    <input type="text" className="rm-input-field readonly-input" placeholder='Total' value={row.total} readOnly />

                                    <div style={{ display: 'flex', gap: '5px', marginTop: '4px' }}>
                                        <button type="button" className="quick-add-btn" style={{ color: '#3182ce' }} onClick={addRow} disabled={!!selectedSourceDoc}><FaPlus /></button>
                                        {rows.length > 1 && (
                                            <button type="button" className="quick-add-btn" style={{ color: '#e53e3e' }} onClick={() => deleteRow(index)} disabled={!!selectedSourceDoc}><FaTrash /></button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        <div className="summary-container" style={{ marginTop: '20px' }}>
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

                        <button type="submit" className="save-btn">{isEditMode ? "Update Sale Draft" : "Save Sale Draft"}</button>
                    </form>
                </div>
            </div>
            <Footer />
            {showCustomerModal && (
                <div className="modal-overlay" onClick={() => setShowCustomerModal(false)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Add New Customer</h3>
                           
                        </div>
                        <div className="modal-body">
                            <div className="form-group"><label>Name *</label><input type="text" id="new_cust_name" className="rm-input-field" /></div>
                            <div className="form-group"><label>Address</label><input type="text" id="new_cust_address" className="rm-input-field" /></div>
                            <div className="form-group"><label>Contact</label><input type="text" id="new_cust_contact" className="rm-input-field" /></div>
                        </div>
                        <div className="modal-footer">
                            <button className="save-btn" onClick={handleQuickCustomerAdd}>Save Customer</button>
                            <button className="quick-add-btn" onClick={() => setShowCustomerModal(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RM_SaleForm;