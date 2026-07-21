import React, { useState, useEffect, useCallback } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft, FaPlus, FaTrash } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import Footer from '../Components/Footer';
import { toast } from 'react-toastify';
import api from '../../api';
import '../Model.css';
import '../Transactions.css';

const DC_Form = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const queryParams = new URLSearchParams(location.search);
    const editId = queryParams.get('editId'); 
    const isEditMode = !!editId;

    const [rows, setRows] = useState([
        { rm_id: "", rm_name: "", quantity: "", uom_id: "", uom_name: "", supplier_id: "", shop_name: "", current_stock: 0, description: "" }
    ]);
    const [materials, setMaterials] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [drivers, setDrivers] = useState([]);

    const [selectedCustomer, setSelectedCustomer] = useState("");
    const [selectedDriver, setSelectedDriver] = useState("");
    const [vehicleNo, setVehicleNo] = useState("");
    const [dcNo, setDcNo] = useState("");
    const [date, setDate] = useState("");
    
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [showDriverModal, setShowDriverModal] = useState(false);

    const fetchDCNo = useCallback(async () => {
        if (isEditMode) return; 
        try {
            const res = await api.get("/loader-documents/next-number", {
                params: { type: "DC" }
            });
            setDcNo(res.data.doc_no);
        } catch (err) {
            console.error("Error fetching DC number:", err);
        }
    }, [isEditMode]);

   useEffect(() => {
    const loadInitialData = async () => {
        try {
            console.log("--- START LOADING INITIAL DATA ---");
            const [materialsRes, entitiesRes, driversRes] = await Promise.all([
                api.get("/rm-transactions/materials-with-suppliers"),
                api.get("/entities/transactions"),
                api.get("/drivers")
            ]);

            setMaterials(materialsRes.data);
            setDrivers(driversRes.data);
            setCustomers(entitiesRes.data.filter(ent => ent.type === 'customer'));

            if (!isEditMode) {
                fetchDCNo();
            } else {
                console.log("Edit Mode Active. Fetching ID:", editId);
                const editRes = await api.get(`/loader-documents/${editId}`);
                
                // FIX: API Response wrapped inside .data wrapper safely
                const responseEnvelope = editRes.data || {};
                const targetData = responseEnvelope.data || responseEnvelope; 

                console.log("Actual Target Object extracted:", targetData);

                // Safe extraction matching your log properties
                const docNo = targetData.no || "";
                const custId = targetData.entity_id || targetData.customer_id;
                const drvId = targetData.driver_id;
                const vNo = targetData.vehicle_no || "";
                const docDate = targetData.date || targetData.documentDate;
                
                // Target details backend key matches 'LoaderDocumentDetails'
                const details = targetData.LoaderDocumentDetails || targetData.details || [];

                setDcNo(docNo);
                setSelectedCustomer(custId ? String(custId) : "");
                setSelectedDriver(drvId ? String(drvId) : "");
                setVehicleNo(vNo);
                
                if (docDate) {
                    setDate(new Date(docDate).toISOString().split('T')[0]);
                }

                if (Array.isArray(details) && details.length > 0) {
                    const mappedRows = details.map((d, idx) => {
                        const cleanRmId = Number(d.material_id || d.rm_id);
                        const cleanSupplierId = d.supplier_id && Number(d.supplier_id) !== 0 ? String(d.supplier_id) : "";

                        const matchingMaterial = materialsRes.data.find(m => {
                            const mSupplierId = m.supplier_id ? String(m.supplier_id) : "";
                            return Number(m.rm_id) === cleanRmId && mSupplierId === cleanSupplierId;
                        });

                        const qty = Math.abs(parseFloat(d.quantity || d.qty) || 0);
                        const baseStock = matchingMaterial ? Number(matchingMaterial.current_stock) : 0;

                        return {
                            id: d.id || null,
                            rm_id: cleanRmId,
                            rm_name: matchingMaterial?.rm_name || d.material_name || "Material",
                            quantity: qty,
                            uom_id: matchingMaterial?.uom_id || d.uom_id || "",
                            uom_name: matchingMaterial?.uom_name || d.uom_name || "Kg",
                            supplier_id: cleanSupplierId,
                            shop_name: matchingMaterial?.shop_name || d.supplier_name || "Supplier",
                            current_stock: baseStock + qty,
                            description: matchingMaterial?.description || d.description || ""
                        };
                    });
                    setRows(mappedRows);
                }
            }
        } catch (err) {
            console.error("Error loading initial data:", err);
            toast.error("Failed to load required data.");
            navigate("/dc-list");
        }
    };

    loadInitialData();
}, [editId, isEditMode, navigate, fetchDCNo]);

    const handleMaterialSelection = (index, value) => {
        const updated = [...rows];
        if (!value) {
            updated[index] = { rm_id: "", rm_name: "", quantity: "", uom_id: "", uom_name: "", supplier_id: "", shop_name: "", current_stock: 0, description: "" };
            setRows(updated);
            return;
        }

        const [rmId, supplierId] = value.split("-");
        const selected = materials.find(m => {
            const mSupplierId = m.supplier_id ? String(m.supplier_id) : "";
            return Number(m.rm_id) === Number(rmId) && mSupplierId === (supplierId || "");
        });

        if (selected) {
            updated[index].rm_id = Number(selected.rm_id);
            updated[index].rm_name = selected.rm_name;
            updated[index].uom_id = selected.uom_id;
            updated[index].uom_name = selected.uom_name;
            updated[index].supplier_id = selected.supplier_id ? String(selected.supplier_id) : "";
            updated[index].shop_name = selected.shop_name;
            updated[index].current_stock = selected.current_stock;
            updated[index].quantity = "";
            updated[index].description = selected.description || "";
        }

        setRows(updated);
    };

    const handleChange = (index, field, value) => {
        const updated = [...rows];
        if (field === "quantity") {
            const typedQty = parseFloat(value) || 0;
            const available = parseFloat(updated[index].current_stock) || 0;
            if (typedQty > available) {
                toast.error(`Out of stock! Only ${available} units available.`);
                updated[index][field] = "";
                setRows(updated);
                return;
            }
        }
        updated[index][field] = value;
        setRows(updated);
    };

    const addRow = () => {
        setRows([...rows, { rm_id: "", rm_name: "", quantity: "", uom_id: "", uom_name: "", supplier_id: "", shop_name: "", current_stock: 0 }]);
    };

    const deleteRow = (index) => {
        setRows(rows.filter((_, i) => i !== index));
    };

    const handleQuickCustomerAdd = async () => {
        const name = document.getElementById('new_customer_name').value;
        const contact = document.getElementById('new_customer_contact').value;
        const address = document.getElementById('new_customer_address').value;
        if (!name) return toast.error("Customer name is required.");
        try {
            const res = await api.post("/entities", { name, contact, address, type: "customer" });
            setCustomers(prev => [...prev, res.data]);
            setSelectedCustomer(String(res.data.id));
            setShowCustomerModal(false);
            toast.success("Customer Linked Successfully!");
        } catch (err) { 
            toast.error("Failed to add customer."); 
        }
    };

    const handleQuickDriverAdd = async () => {
        const name = document.getElementById('new_driver_name').value;
        const contact = document.getElementById('new_driver_contact').value;
        const cnic = document.getElementById('new_driver_cnic').value;
        if (!name) return toast.error("Driver name is required.");
        try {
            const res = await api.post("/drivers", { driver_name: name, contact_no: contact, cnic });
            const formattedDriver = res.data.driver ? res.data.driver : res.data;
            setDrivers(prev => [...prev, formattedDriver]);
            setSelectedDriver(String(formattedDriver.id));
            setShowDriverModal(false);
            toast.success("Driver Added!");
        } catch (err) { 
            toast.error("Failed to add driver."); 
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCustomer) return toast.error("Please select a customer.");
        if (!selectedDriver) return toast.error("Please select a driver.");
        if (!vehicleNo.trim()) return toast.error("Please provide a vehicle number.");
        if (!date) return toast.error("Please select a document date.");

        const validRows = rows.filter(r => r.rm_id && parseFloat(r.quantity) > 0);
        if (validRows.length === 0) return toast.error("Please add at least one valid material row.");

        for (const row of validRows) {
            const available = Number(row.current_stock || 0);
            const requested = Number(row.quantity || 0);
            if (requested > available) {
                toast.error(`Insufficient stock for ${row.rm_name || 'selected material'}. Available: ${available}`);
                return;
            }
        }

        const user = JSON.parse(localStorage.getItem("user"));
        
        const payload = {
            no: dcNo,
            type: "DC",
            driver_id: Number(selectedDriver),
            vehicle_no: vehicleNo,
            date,
            created_by: user?.id || null,
            updated_by: user?.id || null,
            entity_id: Number(selectedCustomer),
            details: validRows.map(r => ({
                id: r.id || undefined, 
                material_id: Number(r.rm_id),
                material_name: r.rm_name,
                quantity: parseFloat(r.quantity),
                uom_id: r.uom_id ? Number(r.uom_id) : null,
                supplier_id: r.supplier_id ? Number(r.supplier_id) : null,
                description: r.description || null
            }))
        };

        try {
            if (isEditMode) {
                await api.put(`/loader-documents/${editId}`, payload);
                toast.success(`DC Updated Successfully!`);
            } else {
                const res = await api.post("/loader-documents", payload);
                toast.success(`DC Saved Successfully! No: ${res.data.no}`);
            }
            navigate("/dc-list");
        } catch (err) {
            toast.error(err.response?.data?.message || "Error saving DC record.");
        }
    };

    return (
        <div className="rm-page-wrapper">
            <NavigationBar />
            <div className="rm-content-container">
                <div className="rm-header-section">
                    <button className="back-btn" onClick={() => navigate(-1)}><FaArrowLeft /></button>
                    <h2 className="form-title">{isEditMode ? `Modify DC (${dcNo})` : "New Delivery Challan (DC)"}</h2>
                </div>

                <div className="rm-main-card">
                    <div className="info-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                        <div className="info-item">
                            <label>DC No</label>
                            <input type="text" value={dcNo} readOnly className="rm-input-field readonly-input" style={{backgroundColor: '#f1f5f9'}} />
                        </div>
                        <div className="info-item">
                            <label>Customer</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <select className="rm-input-field" value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)}>
                                    <option value="">Select Customer</option>
                                    {customers.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                                </select>
                                <button type="button" className="quick-add-btn" onClick={() => setShowCustomerModal(true)}><FaPlus /></button>
                            </div>
                        </div>
                        <div className="info-item">
                            <label>Driver</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <select className="rm-input-field" value={selectedDriver} onChange={(e) => setSelectedDriver(e.target.value)}>
                                    <option value="">Select Driver</option>
                                    {drivers.map(d => <option key={d.id} value={String(d.id)}>{d.driver_name}</option>)}
                                </select>
                                <button type="button" className="quick-add-btn" onClick={() => setShowDriverModal(true)}><FaPlus /></button>
                            </div>
                        </div>
                        <div className="info-item">
                            <label>Vehicle No</label>
                            <input type="text" className="rm-input-field" placeholder='e.g LET-6731' value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} />
                        </div>
                        <div className="info-item">
                            <label>Date</label>
                            <input type="date" className="rm-input-field" value={date} onChange={(e) => setDate(e.target.value)} />
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="items-table-header" style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1.5fr 4.5fr 1.5fr', gap: '12px', fontWeight: 'bold', paddingBottom: '10px' }}>
                            <span>Material</span>
                            <span>UOM</span>
                            <span>Qty</span>
                            <span>Description</span>
                            <span>Action</span>
                        </div>

                        {rows.map((row, index) => {
                            const mSubId = row.supplier_id ? String(row.supplier_id) : "";
                            const currentSelectionValue = row.rm_id ? `${row.rm_id}-${mSubId}` : "";

                            return (
                                <div className="item-row" key={index} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1.5fr 4.5fr 1.5fr', gap: '12px', alignItems: 'start', marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <select
                                            className="rm-input-field"
                                            value={currentSelectionValue}
                                            onChange={(e) => handleMaterialSelection(index, e.target.value)}
                                        >
                                            <option value="">Select Material</option>
                                            {materials.map(m => {
                                                const optSupplierId = m.supplier_id ? String(m.supplier_id) : "";
                                                const optValue = `${m.rm_id}-${optSupplierId}`;
                                                return (
                                                    <option key={optValue} value={optValue}>
                                                        {m.rm_name} - {m.shop_name || 'No Supplier'}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                        {row.rm_id && (
                                            <small className='text-success' style={{ fontSize: '12px', paddingLeft: '4px', marginTop: '2px' }}>
                                                Available Stock: {row.current_stock}
                                            </small>
                                        )}
                                    </div>

                                    <input type="text" className="rm-input-field readonly-input" placeholder="UOM" value={row.uom_name} readOnly />
                                    <input type="number" step="any" className="rm-input-field" placeholder="Qty" value={row.quantity} onChange={(e) => handleChange(index, "quantity", e.target.value)} />
                                    <input type="text" className="rm-input-field" placeholder="Description" value={row.description} onChange={(e) => handleChange(index, "description", e.target.value)} />

                                    <div style={{ display: 'flex', gap: '5px', marginTop: '4px' }}>
                                        <button type="button" className="quick-add-btn" style={{ color: '#3182ce' }} onClick={addRow}><FaPlus /></button>
                                        {rows.length > 1 && (
                                            <button type="button" className="quick-add-btn" style={{ color: '#e53e3e' }} onClick={() => deleteRow(index)}><FaTrash /></button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        <button type="submit" className="save-btn" style={{ marginTop: '20px' }}>
                            {isEditMode ? "Update DC" : "Save DC"}
                        </button>
                    </form>
                </div>
            </div>
            <Footer />

            {/* Quick Customer Modal */}
            {showCustomerModal && (
                <div className="modal-overlay" onClick={() => setShowCustomerModal(false)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Add New Customer</h3>
                        </div>
                        <div className="modal-body">
                            <div className="form-group"><label>Name *</label><input type="text" id="new_customer_name" className="rm-input-field" /></div>
                            <div className="form-group"><label>Address</label><input type="text" id="new_customer_address" className="rm-input-field" /></div>
                            <div className="form-group"><label>Contact</label><input type="text" id="new_customer_contact" className="rm-input-field" /></div>
                        </div>
                        <div className="modal-footer">
                            <button className="save-btn" onClick={handleQuickCustomerAdd}>Save</button>
                            <button className="quick-add-btn" onClick={() => setShowCustomerModal(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Driver Modal */}
            {showDriverModal && (
                <div className="modal-overlay" onClick={() => setShowDriverModal(false)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Add New Driver</h3>
                        </div>
                        <div className="modal-body">
                            <div className="form-group"><label>Driver Name *</label><input type="text" id="new_driver_name" className="rm-input-field" /></div>
                            <div className="form-group"><label>Contact Number</label><input type="text" id="new_driver_contact" className="rm-input-field" /></div>
                            <div className="form-group"><label>CNIC</label><input type="text" id="new_driver_cnic" className="rm-input-field" /></div>
                        </div>
                        <div className="modal-footer">
                            <button className="save-btn" onClick={handleQuickDriverAdd}>Save Driver</button>
                            <button className="quick-add-btn" onClick={() => setShowDriverModal(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DC_Form;