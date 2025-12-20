import React, { useState, useEffect } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft, FaPlus } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Footer from '../Components/Footer';
import { toast } from 'react-toastify';
import api from "../../api"; 

const RM_SaleReturnForm = () => {
  const [rows, setRows] = useState([
    { rm_id: "", rm_name: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", soldQty: 0, supplier_name: "", original_supplier_id: "" }
  ]);
  const [materials, setMaterials] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [date, setDate] = useState("");
  const [grandTotal, setGrandTotal] = useState(0);
  const navigate = useNavigate();

  // --- Helper Functions ---

  const updateGrandTotal = (currentRows) => {
    const total = currentRows.reduce((sum, r) => sum + (parseFloat(r.total) || 0), 0);
    setGrandTotal(total);
  };

  const handleChange = (index, field, value) => {
    const updatedRows = [...rows];
    updatedRows[index][field] = value;

    if (field === "quantity" || field === "unitPrice") {
      const qty = parseFloat(updatedRows[index].quantity) || 0;
      const price = parseFloat(updatedRows[index].unitPrice) || 0;
      const maxSoldQty = parseFloat(updatedRows[index].soldQty) || 0;

      // ✅ Validation: Max sold quantity check
      if (qty > maxSoldQty) {
        toast.error(`Customer bought only ${maxSoldQty} units!`);
        updatedRows[index].quantity = String(maxSoldQty); 
        updatedRows[index].total = (maxSoldQty * price);
      } else {
        updatedRows[index].total = (qty * price);
      }
    }

    setRows(updatedRows);
    updateGrandTotal(updatedRows);
  };

  const addRow = () => setRows([...rows, { rm_id: "", rm_name: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", soldQty: 0, supplier_name: "", original_supplier_id: "" }]);
  const deleteRow = (i) => { 
    const updated = rows.filter((_, idx) => idx !== i); 
    setRows(updated); 
    updateGrandTotal(updated); 
  };

  // --- Effects (Using standardized api.js) ---

  // 1. Fetch eligible customers
  useEffect(() => {
    api.get("/rm-transactions/eligible-customers")
      .then(res => setCustomers(res.data))
      .catch(err => console.error("Error fetching customers:", err));
  }, []);

  // 2. Fetch sold materials for selected customer
  useEffect(() => {
    if (!selectedCustomer) return setMaterials([]);
    api.get(`/rm-transactions/sold-materials/${selectedCustomer}`)
      .then(res => setMaterials(res.data))
      .catch(err => console.error("Error fetching materials:", err));
  }, [selectedCustomer]);

  // 3. Fetch SaleReturn invoice no
  useEffect(() => {
    api.get("/rm-transactions/rm-invoice", { params: { type: "SaleReturn" } })
      .then(res => setInvoiceNo(res.data.invoice_no))
      .catch(err => console.error("Error fetching invoice number:", err));
  }, []);

  // --- Submit Handler ---

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return toast.error("Please select a customer.");
    if (!date) return toast.error("Please select a return date.");
    
    const validRows = rows.filter(r => r.rm_id && parseFloat(r.quantity) > 0);
    if (validRows.length === 0) return toast.error("Please add at least one material item with quantity.");

    const user = JSON.parse(localStorage.getItem("user"));

    const returnData = {
      entityid: selectedCustomer,
      grand_total: grandTotal,
      type: "SaleReturn",
      createdby: user ? user.username : "guest",
      invoice_no: invoiceNo,
      details: validRows.map(r => ({
        rm_id: r.rm_id,
        rm_name: r.rm_name,
        quantity: r.quantity,
        unit_price: r.unitPrice,
        uom_id: r.uom_id,
        date,
        supplier_name: r.supplier_name,
        original_supplier_id: r.original_supplier_id
      }))
    };

    try {
      await api.post("/rm-transactions", returnData);
      toast.success("SaleReturn Transaction Successful");
      navigate('/rm-sale-return');
    } catch (err) {
      console.error("Error creating sale return:", err);
      toast.error(err.response?.data?.message || "Something went wrong!");
    }
  };
 

  return (
    <>
      <NavigationBar />
      <div className="rm-page">
        <button className="back-btn" style={{ marginTop: "30px" }} onClick={() => navigate('/rm-sale-return')}><FaArrowLeft /></button>

        <div className="rm-card">
          <h2>Raw Material Sale Return Form</h2>
          <div className="form-group d-flex">
            <h6><b>Sale Return <br/> Invoice No:</b></h6>
            <input type="text" value={invoiceNo} readOnly className="input" style={{ backgroundColor: "#f3f3f3" , margin: "-5px 0px 30px 5px", width: "auto"}}/>
          </div>

          <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
            <select 
            className="input" 
            value={selectedCustomer} 
            onChange={(e) => {
              setSelectedCustomer(e.target.value);
              setRows([{ rm_id: "", rm_name: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", soldQty: 0, supplier_name: "", original_supplier_id: "" }]);
            }}>
              <option value="">Select Customer</option>
              {customers.map(c => 
              <option key={c.id} value={c.id}>
                {c.name}
                </option>)}
            </select>
{/*             <button type="button" className='add-sup-cust' onClick={() => navigate('/add-customers')}>Add Customer</button> */}
                
            <label><b>SaleReturn Date:</b></label>
            <input 
            type="date" 
            className="input" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} />
          </div>

          <form onSubmit={handleSubmit}>
            {rows.map((row, index) => (
              <div className="rm-row" key={index}>
                <select 
                className="input" 
                // 🛑 FIX 1: Unique combined value for rm_id and original_supplier_id
                value={row.rm_id && row.original_supplier_id ? `${row.rm_id}-${row.original_supplier_id}` : ""} 
                onChange={(e) => {
                  const combinedValue = e.target.value;

                  // Reset if 'Select Material' is chosen
                  if (!combinedValue) {
                    return handleChange(index, "rm_id", "");
                  }

                  // Split the combined value to get both IDs
                  const [rmIdStr, supplierIdStr] = combinedValue.split('-');
                  const rmId = parseInt(rmIdStr);
                  const supplierId = parseInt(supplierIdStr);
                  
                  // Find the correct material using BOTH IDs
                  const selected = materials.find(m => 
                    m.rm_id === rmId && 
                    m.original_supplier_id === supplierId
                  );

                  // Update state with values
                  if (selected) {
                    handleChange(index, "rm_id", rmIdStr); // String ID for state consistency
                    handleChange(index, "rm_name", selected.rm_name || "");
                    handleChange(index, "uom_id", selected.uom_id || "");
                    handleChange(index, "uom_name", selected.uom_name || "");
                    handleChange(index, "soldQty", selected.soldQty || 0);
                    handleChange(index, "supplier_name", selected.shop_name || "");
                    // Store original_supplier_id as string
                    handleChange(index, "original_supplier_id", supplierIdStr); 
                  } else {
                    // Reset current row if somehow logic fails
                    console.error("Could not find matching material/supplier combination.");
                  }

                }}>
                  <option 
                  value="">Select Material</option>
                  {materials.map(m => 
                  <option 
                   // 🛑 FIX 2: Unique key and value for each option
                    key={`${m.rm_id}-${m.original_supplier_id}`}
                    value={`${m.rm_id}-${m.original_supplier_id}`}>
                    {m.rm_name} - {m.shop_name} 
                    </option>)}
                       {/* (Sold: {m.soldQty}) */}
                </select>

                <input type="text" placeholder="UOM" value={row.uom_name || ""} readOnly className="input"/>
                <input type="number" placeholder="Quantity" value={row.quantity} onChange={(e) => handleChange(index, "quantity", e.target.value)} className="input"/>
                <small style={{ color: "gray" }}>Customer bought: {row.soldQty}</small>
                <input type="number" placeholder="Unit Price" value={row.unitPrice} onChange={(e) => handleChange(index, "unitPrice", e.target.value)} className="input"/>
                <input type="text" placeholder="Total Price" value={row.total} readOnly className="input"/>
                
                <button type="button" className="add-more" onClick={addRow}><FaPlus size={20} /></button>
                {rows.length > 1 && <button type="button" className="del-btn" onClick={() => deleteRow(index)}>❌</button>}
              </div>
            ))}

            <div>
              <label className="grand-total"><b>Grand Total: </b></label>
              <input type="text" className="input" value={grandTotal} readOnly />
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

export default RM_SaleReturnForm;