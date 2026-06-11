import React, { useState, useEffect } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft, FaPlus, FaTrash } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import Footer from '../Components/Footer';
import { toast } from 'react-toastify';
import api from "../../api";
import '../Transactions.css';

const RM_ReturnForm = () => {
    const navigate = useNavigate();
    const [rows, setRows] = useState([
        { rm_id: "", rm_name: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", stock: 0 }
    ]);
    const location = useLocation();
    const invoiceType = new URLSearchParams(location.search).get('invoiceType');

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
        } else {
            setMaterials([]);
            setTaxId(null);
            setTaxRate(0);
            setTaxMode('exclusive');
            updateGrandTotal(rows, isTaxable, 'exclusive', 0, globalDiscount);
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
        updateGrandTotal(updatedRows, isTaxable, taxMode, taxRate);
    };

    const updateGrandTotal = (rows, currentIsTaxable = isTaxable, currentTaxMode = taxMode, currentTaxRate = taxRate, discountValue = globalDiscount) => {
        const currentSubTotal = rows.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0);
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

    const handleTaxableChange = (value) => {
        setIsTaxable(value);
        updateGrandTotal(rows, value, taxMode, taxRate);
    };

    const handleGlobalDiscountChange = (value) => {
        setGlobalDiscount(value);
        updateGrandTotal(rows, isTaxable, taxMode, taxRate, value);
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
                            <label>Invoice No</label>
                            <input type="text" value={invoiceNo} readOnly className="rm-input-field readonly-input" />
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

                        {/* Summary Section - Updated to include Discount and consistent tax controls */}
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
                             {/* <div className="summary-row">
                                <label>Discount:</label>
                                <input type="number" className="rm-input-field" value={globalDiscount} onChange={(e) => handleGlobalDiscountChange(e.target.value)} />
                            </div> */}
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