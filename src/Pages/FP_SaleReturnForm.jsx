import React, { useState, useEffect } from "react";
import NavigationBar from "../Components/NavigationBar";
import { FaArrowLeft, FaPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Footer from "../Components/Footer";
import { toast } from "react-toastify";
import api from "../../api";

const FP_SaleReturnForm = () => {
  const navigate = useNavigate();
  
  const [rows, setRows] = useState([
    {
      product_master_id: "",
      product_name: "",
      recipe_id: "",
      quantity: "",
      unitPrice: "",
      total: "",
      uom_id: "",
      uom_name: "",
      stock: 0, // Max return quantity
    },
  ]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [date, setDate] = useState("");
  const [grandTotal, setGrandTotal] = useState(0);

  // 1. Fetch products based on customer (Using api.js)
  const fetchProductsForReturn = async (customerId) => {
    if (!customerId) {
      setProducts([]);
      return;
    }
    try {
      const res = await api.get(`/fp-sale/products-by-customer/${customerId}`);
      setProducts(res.data);
    } catch (err) {
      console.error("Error fetching customer sale products:", err);
      toast.error("Failed to load products for this customer");
    }
  };

  // 2. Fetch eligible customers (last 3 months)
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await api.get("/fp-sale/customers-for-return");
        setCustomers(res.data);
      } catch (err) {
        console.error("Error fetching customers:", err);
      }
    };
    fetchCustomers();
  }, []);

  // 3. Fetch Invoice No for SaleReturn
  useEffect(() => {
    const fetchInvoiceNo = async () => {
      try {
        const res = await api.get("/fp-sale/invoice-no", {
          params: { type: "SaleReturn" }
        });
        setInvoiceNo(res.data.invoice_no);
      } catch (err) {
        console.error("Error fetching invoice number:", err);
      }
    };
    fetchInvoiceNo();
  }, []);

  // --- Handlers ---

  const handleCustomerChange = (e) => {
    const customerId = e.target.value;
    setSelectedCustomer(customerId);
    
    setRows([
        { product_master_id: "", product_name: "", recipe_id: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", stock: 0 },
    ]);
    setGrandTotal(0);

    if (customerId) {
      fetchProductsForReturn(customerId);
    } else {
      setProducts([]);
    }
  };

  const handleProductSelectChange = (e, index) => {
    const selectedRecipeId = e.target.value;
    const selected = products.find((p) => String(p.recipe_id) === String(selectedRecipeId));
    
    if (!selected) {
        updateRowData(index, { product_master_id: "", recipe_id: selectedRecipeId, product_name: "", uom_id: "", uom_name: "", stock: 0, quantity: "" });
        return;
    }

    const maxReturnQty = parseFloat(selected.max_return_qty) || 0; 
    updateRowData(index, {
        product_master_id: selected.product_master_id,
        recipe_id: selected.recipe_id,
        product_name: selected.name,
        uom_id: selected.uom_id,
        uom_name: selected.uom_name,
        stock: maxReturnQty,
        quantity: ""
    });
  };

  // Helper function to update row state cleanly
  const updateRowData = (index, data) => {
    const updatedRows = [...rows];
    updatedRows[index] = { ...updatedRows[index], ...data };
    setRows(updatedRows);
  };

  const handleChange = (index, field, value) => {
    const updatedRows = [...rows];
    updatedRows[index][field] = value;

    if (field === "quantity" || field === "unitPrice") {
      const qty = parseFloat(updatedRows[index].quantity) || 0;
      const price = parseFloat(updatedRows[index].unitPrice) || 0;
      const maxReturnQty = parseFloat(updatedRows[index].stock) || 0;

      if (qty > maxReturnQty) {
        toast.error(`Max return quantity is ${maxReturnQty} units!`);
        updatedRows[index].quantity = ""; 
      }

      const finalQty = parseFloat(updatedRows[index].quantity) || 0;
      updatedRows[index].total = (finalQty * price);
    }

    setRows(updatedRows);
    const total = updatedRows.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0);
    setGrandTotal(total);
  };


   const addRow = () => {
    setRows([
      ...rows,
      {
        product_master_id: "", product_name: "", recipe_id: "", quantity: "", 
        unitPrice: "", total: "", uom_id: "", uom_name: "", stock: 0,
      },
    ]);
  }; 

  const deleteRow = (index) => {
    const updatedRows = rows.filter((_, i) => i !== index);
    setRows(updatedRows);
    updateGrandTotal(updatedRows);
  };

  // 4. Submit Function (POST using api.js)
  const handleSubmit = async (e) => {
    e.preventDefault();

    const validRows = rows.filter((r) => r.product_master_id && Number(r.quantity) > 0);
    if (validRows.length === 0) {
      toast.error("Please add at least one product item.");
      return;
    }

    const user = JSON.parse(localStorage.getItem("user"));

    const saleData = {
      entity_customer_id: selectedCustomer, 
      grand_total: Number(grandTotal),
      type: "SaleReturn", 
      date: date,
      createdby: user ? user.username : "guest",
      invoice_no: invoiceNo,
      details: validRows.map((r) => ({
        product_master_id: r.product_master_id,
        product_name: r.product_name,
        recipe_id: r.recipe_id, 
        quantity: Number(r.quantity),
        unit_price: Number(r.unitPrice),
        total_price: Number(r.total), 
        uom_id: r.uom_id,
      })),
    };

    try {
      await api.post("/fp-sale", saleData);
      toast.success("Sale Return Successful!");
      navigate("/fp-salereturn-list"); 
    } catch (err) {
      console.error("Error creating return:", err);
      toast.error(err.response?.data?.message || "Error creating return transaction!");
    }
  };


  return (
    <>
      <NavigationBar />
      <div className="rm-page">
        <button
          className="back-btn"
          style={{ marginTop: "30px" }}
          onClick={() => navigate("/fp-salereturn-list")}
        >
          <FaArrowLeft /> 
        </button>
        <div className="rm-card">
          <h2>Finished Goods Sale Return Form</h2> 
          <div className="form-group d-flex">
            <h6>
              <b>
                Return
                <br />
                Invoice No:
              </b>
            </h6>
            <input
              type="text"
              value={invoiceNo}
              readOnly
              className="input"
              style={{
                backgroundColor: "#f3f3f3",
                margin: "-5px 0 30px 5px",
                width: "auto",
              }}
            />
          </div>
          {/* Customer & Date */} 
          <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
            <select
              className="input"
              value={selectedCustomer}
              onChange={handleCustomerChange}
            >
              <option key="default-customer" value="">
                Select Customer (Last 3 Months Sales)
              </option>
              {customers.map((ent) => (
                <option key={ent.id} value={ent.id}>
                  {ent.name}       
                </option>
              ))}
            </select>
            <label>
              <b>Return Date:</b>
            </label>
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
                  value={row.recipe_id}
                  onChange={(e) => handleProductSelectChange(e, index)} 
                >
                  <option value="">Select Product</option> 
                  {Array.from(new Map(products.map(p => [p.recipe_id, p])).values()).map((p) => (
    <option key={p.recipe_id} value={p.recipe_id}>
      {p.name}
    </option>
  ))}
                </select>
                <input
                  type="text"
                  className="input"
                  placeholder="UOM"
                  value={row.uom_name || ""}
                  readOnly
                />
                <input
                  type="number"
                  className="input"
                  placeholder="Quantity"
                  value={row.quantity}
                  min="0.0001"
                  step="0.0001"
                  onChange={(e) =>
                    handleChange(index, "quantity", e.target.value)
                  }
                />
                <small style={{ color: "gray", minWidth: "120px" }}>
                  Max Return: {Number(row.stock)} {/* ✅ Max Return Qty Show */}
                </small>
                <input
                  type="number"
                  className="input"
                  placeholder="Unit Price"
                  value={row.unitPrice}
                  min="0.01"
                  step="0.01"
                  onChange={(e) =>
                    handleChange(index, "unitPrice", e.target.value)
                  }
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
                  <button
                    type="button"
                    className="del-btn"
                    onClick={() => deleteRow(index)}
                  >
                    ❌        
                  </button>
                )}
              </div>
            ))}
            <div>
              <label className="grand-total">
                <b>Grand Total:</b>
              </label>
              <input
                type="text"
                className="input"
                value={grandTotal}
                readOnly
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="save-btn">
                Save Sale Return
              </button>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default FP_SaleReturnForm;