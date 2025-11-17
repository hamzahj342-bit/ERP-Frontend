import React, { useState, useEffect } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft, FaPlus } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Footer from '../Components/Footer';
import {toast} from 'react-toastify';

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

  // Form submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedSupplier) {
      toast.error("Please select a supplier.");
      return;
    }
    if (!date) {
      toast.error("Please select a return date.");
      return;
    }
    if (handleSubmit) {
      toast.success("Purchase Return Transaction Successfull")
    }
    const validRows = rows.filter(r => r.rm_id); 

if (validRows.length === 0) {
  toast.error("Please add at least one material item.");
  return;
}

    const user = JSON.parse(localStorage.getItem("user"));
    const token = localStorage.getItem("token");

    const returnData = {
      entityid: selectedSupplier,
      grand_total: grandTotal,
      type: "PurchaseReturn",
      createdby: user ? user.username : "guest",
      invoice_no: invoiceNo,
      details: rows.map(r => ({
        rm_id: r.rm_id,
        rm_name: r.rm_name,
        quantity: r.quantity,
        unit_price: r.unitPrice,
        uom_id: r.uom_id,
        date: date
      }))
    };

    console.log("Submitting Return Data:", returnData);

    fetch("http://localhost:5000/api/rm-transactions", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(returnData)
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Return created:", data);
        navigate('/rm-return');
      })
      .catch((err) => console.error("Error creating return:", err));
  };

  // ✅ Fetch only eligible suppliers (those with previous Purchase entries)
useEffect(() => {
  fetch("http://localhost:5000/api/rm-transactions/eligible-suppliers")
    .then((res) => res.json())
    .then((data) => {
      setSuppliers(data); // data already in { id, name } format
    })
    .catch((err) => console.error("Error fetching eligible suppliers:", err));
}, []);

  // Fetch materials of selected supplier only
  useEffect(() => {
  if (selectedSupplier) {
    fetch(`http://localhost:5000/api/rm-transactions/materials/${selectedSupplier}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setMaterials(data);
        else {
          console.error("Unexpected API response:", data);
          setMaterials([]); // prevent .map error
        }
      })
      .catch((err) => {
        console.error("Error fetching supplier materials:", err);
        setMaterials([]);
      });
  } else {
    setMaterials([]);
  }
}, [selectedSupplier]); 
 useEffect(() => {
   fetch("http://localhost:5000/api/rm-transactions/rm-invoice?type=Return")
     .then(res => res.json())
     .then(data => setInvoiceNo(data.invoice_no))
     .catch(err => console.error("Error fetching invoice number:", err));
 }, []);

  // Handle input changes
  const handleChange = (index, field, value) => {
    const updatedRows = [...rows];
    updatedRows[index][field] = value;

    if (field === "quantity" || field === "unitPrice") {
      const qty = parseFloat(updatedRows[index].quantity) || 0;
      const price = parseFloat(updatedRows[index].unitPrice) || 0;

      // check stock (supplier-specific)
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

  // Update Grand Total
  const updateGrandTotal = (rows) => {
    const total = rows.reduce(
      (sum, row) => sum + (parseFloat(row.total) || 0),
      0
    );
    setGrandTotal(total);
  };

  // Add new row
  const addRow = () => {
    setRows([...rows, { rm_id: "", rm_name: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", stock: 0 }]);
  };

  // Delete row
  const deleteRow = (index) => {
    const updatedRows = rows.filter((_, i) => i !== index);
    setRows(updatedRows);
    updateGrandTotal(updatedRows);
  };

  // Fetch stock when material selected (supplier-specific)
  const fetchStock = async (rm_id, index) => {
    try {
      const res = await fetch(`http://localhost:5000/api/rm-transactions/stock/${rm_id}/${selectedSupplier}`);
      const data = await res.json();
      const updatedRows = [...rows];
      updatedRows[index].stock = data.stock || 0;
      setRows(updatedRows);
    } catch (err) {
      console.error("Error fetching stock:", err);
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
