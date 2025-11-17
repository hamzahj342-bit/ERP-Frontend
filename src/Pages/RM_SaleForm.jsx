import React, { useState, useEffect } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft, FaPlus } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Footer from '../Components/Footer';
import { toast } from 'react-toastify';

const RM_SaleForm = () => {
  const [rows, setRows] = useState([
    { rm_id: "", rm_name: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", stock: 0, entity_supplier_id: "" }
  ]);
  const [materials, setMaterials] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [date, setDate] = useState("");
  const [grandTotal, setGrandTotal] = useState(0);
  const navigate = useNavigate();

  // ✅ Submit Form
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedCustomer) {
      toast.error("Please select a customer.");
      return;
    }
    if (!date) {
      toast.error("Please select a sale date.");
      return;
    }

    const validRows = rows.filter(r => r.rm_id);
    if (validRows.length === 0) {
      toast.error("Please add at least one material item.");
      return;
    }

    const user = JSON.parse(localStorage.getItem("user"));
    const token = localStorage.getItem("token");

    const saleData = {
      entityid: selectedCustomer, // customer id
      grand_total: Number(grandTotal),
      type: "Sale",
      voucher_type: "Sale",
      createdby: user ? user.username : "guest",
      invoice_no: invoiceNo,
      details: rows.map(r => ({
        rm_id: r.rm_id,
        rm_name: r.rm_name,
        quantity: r.quantity,
        unit_price: r.unitPrice,
        uom_id: r.uom_id,
        supplier_id: r.supplier_id, // comes from dropdown
        date: date
      }))
    };

    console.log("Submitting Sale Data:", JSON.stringify(saleData, null, 2));

    try {
      const res = await fetch("http://localhost:5000/api/rm-transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(saleData),
      });

      const data = await res.json();
      console.log("Sale created:", data);

      toast.success("Sale Transaction Successful!");
      navigate("/rm-sale");
    } catch (err) {
      console.error("Error creating sale:", err);
      toast.error("Error creating sale transaction!");
    }
  };

  // ✅ Fetch Customers
  useEffect(() => {
    fetch("http://localhost:5000/api/entities")
      .then(res => res.json())
      .then(data => setCustomers(data.filter(ent => ent.type === "customer")))
      .catch(err => console.error("Error fetching customers:", err));
  }, []);

  // ✅ Fetch Materials
  useEffect(() => {
    fetch("http://localhost:5000/api/rm-transactions/materials-with-suppliers")
      .then(res => res.json())
      .then(data => {
        console.log("🔍 Materials Data:", data);
        setMaterials(data);
      })
      .catch(err => console.error("Error fetching materials:", err));
  }, []);

  // ✅ Fetch Invoice No
  useEffect(() => {
    fetch("http://localhost:5000/api/rm-transactions/rm-invoice?type=Sale")
      .then(res => res.json())
      .then(data => setInvoiceNo(data.invoice_no))
      .catch(err => console.error("Error fetching invoice number:", err));
  }, []);

  // ✅ Handle field changes
  const handleChange = (index, field, value) => {
    const updatedRows = [...rows];
    updatedRows[index][field] = value;

    if (field === "quantity" || field === "unitPrice") {
      const qty = parseFloat(updatedRows[index].quantity) || 0;
      const price = parseFloat(updatedRows[index].unitPrice) || 0;

      if (qty > updatedRows[index].stock) {
        toast.error(`Only ${updatedRows[index].stock} units available!`);
        updatedRows[index].quantity = "";
        updatedRows[index].total = "";
      } else {
        updatedRows[index].total = (qty * price);
      }
    }

    setRows(updatedRows);
    updateGrandTotal(updatedRows);
  };

  // ✅ Update Grand Total
  const updateGrandTotal = (rows) => {
    const total = rows.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0);
    setGrandTotal(total);
  };

  // ✅ Add Row
  const addRow = () => {
    setRows([...rows, { rm_id: "", rm_name: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", stock: 0, entity_supplier_id: "" }]);
  };

  // ✅ Delete Row
  const deleteRow = (index) => {
    const updatedRows = rows.filter((_, i) => i !== index);
    setRows(updatedRows);
    updateGrandTotal(updatedRows);
  };

  // ✅ Fetch Stock
  const fetchStock = async (rm_id, supplier_id, index) => {
    try {
      const res = await fetch(`http://localhost:5000/api/rm-transactions/stock/${rm_id}/${supplier_id}`);
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
          onClick={() => navigate("/rm-sale")}
        >
          <FaArrowLeft />
        </button>

        <div className="rm-card">
          <h2>Raw Material Sale Form</h2>

          <div className="form-group d-flex">
            <h6><b>Sale<br />Invoice No:</b></h6>
            <input
              type="text"
              value={invoiceNo}
              readOnly
              className="input"
              style={{ backgroundColor: "#f3f3f3", margin: "-5px 0 30px 5px", width: "auto" }}
            />
          </div>

          {/* Customer & Date */}
          <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
            <select
              className="input"
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
            >
              <option value="">Select Customer</option>
              {customers.map((ent) => (
                <option key={ent.id} value={ent.id}>
                  {ent.name}
                </option>
              ))}
            </select>
            <button className="add-sup-cust" onClick={() => navigate("/add-customers")}>
              Add Customer
            </button>

            <label><b>Sale Date:</b></label>
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Rows */}
          <form onSubmit={handleSubmit}>
            {rows.map((row, index) => (
              <div className="rm-row" key={index}>
                <select
                  className="input"
                  value={row.rm_id && row.supplier_id ? `${row.rm_id}-${row.supplier_id}` : ""}
                  onChange={(e) => {
                    const [rm_id, supplier_id] = e.target.value.split("-");
                    const selected = materials.find(
                    (m) => String(m.rm_id) === rm_id && String(m.supplier_id) === supplier_id
                     );



                    handleChange(index, "rm_id", rm_id);
                    handleChange(index, "rm_name", selected?.rm_name || "");
                    handleChange(index, "uom_id", selected?.uom_id || "");
                    handleChange(index, "uom_name", selected?.uom?.uom_name || selected?.uom_name || "");

                    handleChange(index, "supplier_id", supplier_id);

                    if (rm_id && supplier_id) fetchStock(rm_id, supplier_id, index);
                    console.log("Selected material:", selected);

                  }}
                >
                  <option value="">Select Material</option>
                  {materials.map((m) => (
              <option
               key={`${m.rm_id}-${m.supplier_id}`} 
               value={`${m.rm_id}-${m.supplier_id}`}>
                {m.rm_name} - {m.shop_name}
               </option>
                 ))}

                </select>

                <input type="text" className="input" placeholder="UOM" value={row.uom_name || ""} readOnly />

                <input
                  type="number"
                  className="input"
                  placeholder="Quantity"
                  value={row.quantity}
                  onChange={(e) => handleChange(index, "quantity", e.target.value)}
                />
                <small style={{ color: "gray" }}>Available: {row.stock}</small>

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
                  placeholder="Total Price"
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

export default RM_SaleForm;
