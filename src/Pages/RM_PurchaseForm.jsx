import React, { useState, useEffect } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft, FaPlus } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Footer from '../Components/Footer';
import { toast } from 'react-toastify';

const RM_PurchaseForm = () => {
  const [rows, setRows] = useState([
    { rm_id: "", rm_name: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "" }
  ]);
  const [materials, setMaterials] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [date, setDate] = useState("");
  const [grandTotal, setGrandTotal] = useState(0);
  const navigate = useNavigate();

  // 🔹 Fetch Materials & Suppliers
  useEffect(() => {
    fetch("http://localhost:5000/api/add-materials")
      .then(res => res.json())
      .then(data => setMaterials(data))
      .catch(err => console.error("Error fetching materials:", err));

    fetch("http://localhost:5000/api/entities")
      .then(res => res.json())
      .then(data => {
        const onlySuppliers = data.filter(ent => ent.type === "supplier");
        setSuppliers(onlySuppliers);
      })
      .catch(err => console.error("Error fetching suppliers:", err));
  }, []);

  // 🔹 Fetch Next Invoice Number
  useEffect(() => {
    fetch("http://localhost:5000/api/rm-transactions/rm-invoice?type=Purchase")
      .then(res => res.json())
      .then(data => setInvoiceNo(data.invoice_no))
      .catch(err => console.error("Error fetching invoice:", err));
  }, []);

  // 🔹 Handle Row Changes
  const handleChange = (index, field, value) => {
    const updated = [...rows];
    updated[index][field] = value;

    if (field === "quantity" || field === "unitPrice") {
      const qty = parseFloat(updated[index].quantity) || 0;
      const price = parseFloat(updated[index].unitPrice) || 0;
      updated[index].total = (qty * price);
    }

    setRows(updated);
    updateGrandTotal(updated);
  };

  const updateGrandTotal = (rows) => {
    const total = rows.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0);
    setGrandTotal(total);
  };

  const addRow = () => {
    setRows([...rows, { rm_id: "", rm_name: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "" }]);
  };

  const deleteRow = (index) => {
    const updated = rows.filter((_, i) => i !== index);
    setRows(updated);
    updateGrandTotal(updated);
  };

  // 🔹 Handle Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedSupplier) return toast.error("Please select a supplier.");
    if (!date) return toast.error("Please select a purchase date.");

    const validRows = rows.filter(r => r.rm_id);
    if (validRows.length === 0) return toast.error("Please add at least one material.");

    const user = JSON.parse(localStorage.getItem("user"));
    const token = localStorage.getItem("token");

    const purchaseData = {
      entityid: selectedSupplier, // supplier only
      grand_total: grandTotal,
      type: "purchase",
      createdby: user?.username || "guest",
      invoice_no: invoiceNo,
      details: validRows.map(r => ({
        rm_id: r.rm_id,
        rm_name: r.rm_name,
        quantity: r.quantity,
        unit_price: r.unitPrice,
        uom_id: r.uom_id,
        date,
        entity_supplier_id: selectedSupplier, // ✅ supplier for backend consistency
      }))
    };

    console.log("🟢 Submitting Purchase:", purchaseData);

    try {
      const res = await fetch("http://localhost:5000/api/rm-transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(purchaseData),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Purchase Transaction Successful!");
        navigate("/rm-purchase");
      } else {
        toast.error(data.message || "Failed to save purchase.");
      }
    } catch (err) {
      console.error("❌ Error creating purchase:", err);
      toast.error("Error saving purchase transaction.");
    }
  };

  return (
    <>
      <NavigationBar />
      <div className="rm-page">
        <button className="back-btn" style={{ marginTop: "30px" }} onClick={() => navigate("/rm-purchase")}>
          <FaArrowLeft />
        </button>

        <div className="rm-card">
          <h2>Raw Material Purchase Form</h2>

          <div className="form-group d-flex">
            <h6><b>Purchase <br /> Invoice No:</b></h6>
            <input
              type="text"
              value={invoiceNo}
              readOnly
              className="input"
              style={{ backgroundColor: "#f3f3f3", margin: "-5px 0px 30px 5px", width: "auto" }}
            />
          </div>

          <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
            <select
              className="input"
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
            >
              <option value="">Select Supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <button className="add-sup-cust" onClick={() => navigate("/add-suppliers")}>
              Add Supplier
            </button>

            <label><b>Purchase Date:</b></label>
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <form onSubmit={handleSubmit}>
            {rows.map((row, index) => (
              <div className="rm-row" key={index}>
                <select
                  className="input"
                  value={row.rm_id}
                  onChange={(e) => {
                    const selected = materials.find(m => m.rm_id === parseInt(e.target.value));
                    handleChange(index, "rm_id", e.target.value);
                    handleChange(index, "rm_name", selected ? selected.name : "");
                    handleChange(index, "uom_id", selected ? selected.uom.id : "");
                    handleChange(index, "uom_name", selected ? selected.uom.name : "");
                  }}
                >
                  <option value="">Select Material</option>
                  {materials.map(m => (
                    <option key={m.rm_id} value={m.rm_id}>{m.name}</option>
                  ))}
                </select>

                <button className="add-more" type="button" onClick={() => navigate("/add-materials")}>
                  Add Material
                </button>

                <input type="text" className="input" placeholder="UOM" value={row.uom_name || ""} readOnly />

                <input
                  type="number"
                  className="input"
                  placeholder="Quantity"
                  value={row.quantity}
                  onChange={(e) => handleChange(index, "quantity", e.target.value)}
                />

                <input
                  type="number"
                  className="input"
                  placeholder="Unit Price"
                  value={row.unitPrice}
                  onChange={(e) => handleChange(index, "unitPrice", e.target.value)}
                />

                <input
                  type="text"
                  className="input"
                  placeholder="Total"
                  value={row.total}
                  readOnly
                />

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

            <div>
              <label className="grand-total"><b>Grand Total:</b></label>
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

export default RM_PurchaseForm;
