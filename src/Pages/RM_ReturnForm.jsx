import React, { useState, useEffect } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft, FaPlus } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Footer from '../Components/Footer';
import {toast} from 'react-toastify';
import api from "../../api"; 

const RM_ReturnForm = () => {
  const [rows, setRows] = useState([
    { rm_id: "", rm_name: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", stock: 0 }
  ]);
  const [materials, setMaterials] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [date, setDate] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [grandTotal, setGrandTotal] = useState(0);
  const navigate = useNavigate();

  // 1. Fetch eligible suppliers (those with previous purchases)
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

  // 4. Fetch Stock (Supplier-specific)
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

  // --- Handlers ---
  const handleChange = (index, field, value) => {
    const updatedRows = [...rows];
    updatedRows[index][field] = value;

    if (field === "quantity" || field === "unitPrice") {
      const qty = parseFloat(updatedRows[index].quantity) || 0;
      const price = parseFloat(updatedRows[index].unitPrice) || 0;

      if (qty > updatedRows[index].stock) {
        toast.error(`Only ${updatedRows[index].stock} units available from this supplier!`);
        updatedRows[index].quantity = "";
        updatedRows[index].total = "";
      } else {
        updatedRows[index].total = (qty * price);
      }
    }
    setRows(updatedRows);
    updateGrandTotal(updatedRows);
  };

  const updateGrandTotal = (rows) => {
    const total = rows.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0);
    setGrandTotal(total);
  };

  const addRow = () => {
    setRows([...rows, { rm_id: "", rm_name: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", stock: 0 }]);
  };

  const deleteRow = (index) => {
    const updatedRows = rows.filter((_, i) => i !== index);
    setRows(updatedRows);
    updateGrandTotal(updatedRows);
  };

  // 5. Form Submit (POST using api.js)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedSupplier) return toast.error("Please select a supplier.");
    if (!date) return toast.error("Please select a return date.");

    const validRows = rows.filter(r => r.rm_id && parseFloat(r.quantity) > 0); 
    if (validRows.length === 0) return toast.error("Please add at least one material item.");

    const user = JSON.parse(localStorage.getItem("user"));

    const returnData = {
      entityid: selectedSupplier,
      grand_total: grandTotal,
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
      console.error("Error creating return:", err);
      toast.error(err.response?.data?.message || "Error creating return!");
    }
  };

  return (
    <>
      <NavigationBar />
      <div className="rm-page">
        <button
          className="back-btn"
          style={{ marginTop: "30px" }}
          onClick={() => navigate('/rm-return')}
        >
          <FaArrowLeft />
        </button>

        <div className="rm-card">
          <h2>Raw Material Purchase Return Form</h2>
          <div className="form-group d-flex">
            <h6><b>Purchase Return <br/> Invoice No:</b> </h6>
  <input
    type="text"
    value={invoiceNo}
    readOnly
    className="input"
    style={{ backgroundColor: "#f3f3f3" , margin: "-5px 0px 30px 5px", width: "auto"}}
  />
 </div>

          {/* Supplier & Date Select */}
          <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
            <select
              className="input"
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
            >
              <option value="">Select Supplier</option>
              {suppliers.map((ent) => (
                <option key={ent.id} value={ent.id}>
                  {ent.name}
                </option>
              ))}
            </select>
            {/* <button className='add-sup-cust' onClick={() => navigate('/add-suppliers')}>Add Suppliers</button> */}

            <label><b>Return Date:</b></label>
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Form Rows */}
          <form onSubmit={handleSubmit}>
            {rows.map((row, index) => (
              <div className="rm-row" key={index}>
                {/* Material Dropdown */}
                <select
                  className="input"
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
                >
                  <option value="">Select Material</option>
                  {Array.isArray(materials) && materials.length > 0 ? (
                      materials.map((m) => (
                      <option key={m.rm_id} value={m.rm_id}>
                        {m.rm_name}
                      </option>
                    ))
                  ) : (
                    <option>No materials found</option>
                  )}
                </select>

                {/* UOM */}
                <input
                  type="text"
                  className="input"
                  placeholder="UOM"
                  value={row.uom_name || ""}
                  readOnly
                />

                {/* Quantity */}
                <input
                  type="number"
                  className="input"
                  placeholder="Quantity"
                  value={row.quantity}
                  onChange={(e) => handleChange(index, "quantity", e.target.value)}
                />
                <small style={{ color: "gray" }}>Available from this supplier: {row.stock}</small>

                {/* Unit Price */}
                <input
                  type="number"
                  className="input"
                  placeholder="Unit Price"
                  value={row.unitPrice}
                  onChange={(e) => handleChange(index, "unitPrice", e.target.value)}
                />

                {/* Total */}
                <input
                  type="text"
                  className="input"
                  placeholder="Total Price"
                  value={row.total}
                  readOnly
                />

                {/* Add/Delete Buttons */}
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

            {/* Grand Total */}
            <div>
              <label className="grand-total">
                <b>Grand Total: </b>
              </label>
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

export default RM_ReturnForm;
