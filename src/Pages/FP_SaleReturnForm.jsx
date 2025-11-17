import React, { useState, useEffect } from "react";
import NavigationBar from "../Components/NavigationBar";
import { FaArrowLeft, FaPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Footer from "../Components/Footer";
import { toast } from "react-toastify";

const FP_SaleReturnForm = () => {
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
      stock: 0, // ✅ Max return quantity will be stored here
    },
  ]);
  const [products, setProducts] = useState([]); // Products will be recipes sold to the selected customer
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [date, setDate] = useState("");
  const [grandTotal, setGrandTotal] = useState(0);
  const navigate = useNavigate();

  // Utility function to fetch products based on selected customer
  const fetchProductsForReturn = (customerId) => {
    if (!customerId) {
      setProducts([]);
      return;
    }
    // 🛑 Corrected route to fetch products sold to the specific customer
    fetch(`http://localhost:5000/api/fp-sale/products-by-customer/${customerId}`) 
      .then((res) => res.json())
      .then((data) => {
        // Data contains max_return_qty (total sold stock to this customer)
        setProducts(data);
        console.log("Products for Return fetched:", data);
      })
      .catch((err) => console.error("Error fetching customer sale products:", err));
  };


  // ✅ useEffect 1: Fetch eligible customers (last 3 months)
  useEffect(() => {
    // 🛑 Corrected route to fetch customers with sales in last 3 months
    fetch("http://localhost:5000/api/fp-sale/customers-for-return") 
      .then(res => res.json())
      .then(setCustomers)
      .catch(err => console.error("Error fetching eligible customers:", err));
  }, []);

  // ✅ useEffect 2: Fetch Invoice No for SaleReturn
  useEffect(() => {
    // Type ko 'SaleReturn' bhejein taaki 'FPR-' prefix bane
    fetch("http://localhost:5000/api/fp-sale/invoice-no?type=SaleReturn") 
      .then((res) => res.json())
      .then((data) => setInvoiceNo(data.invoice_no))
      .catch((err) => console.error("Error fetching invoice number:", err));
  }, []);

  // ✅ Customer Select Change Handler
  const handleCustomerChange = (e) => {
    const customerId = e.target.value;
    setSelectedCustomer(customerId);
    
    // Naye customer ke liye rows aur products ko reset karein
    setRows([
        { product_master_id: "", product_name: "", recipe_id: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", stock: 0 },
    ]);
    setGrandTotal(0);

    // Customer select hone par products fetch karein
    if (customerId) {
      fetchProductsForReturn(customerId);
    } else {
      setProducts([]);
    }
  };


  // ✅ Product Select Change Handler (sets max_return_qty to 'stock')
  const handleProductSelectChange = (e, index) => {
    const selectedRecipeId = e.target.value;

    const selected = products.find(
        (p) => String(p.recipe_id) === String(selectedRecipeId)
    );
    
    console.log("Selected Product Value:", selectedRecipeId);
    console.log("Found Product Object:", selected);

    if (!selected) {
        // Reset logic
        handleChange(index, "product_master_id", "");
        handleChange(index, "recipe_id", selectedRecipeId);
        handleChange(index, "product_name", "");
        handleChange(index, "uom_id", "");
        handleChange(index, "uom_name", "");
        handleChange(index, "stock", 0);
        handleChange(index, "quantity", "");
        return;
    }

    // ✅ CRITICAL: Max return quantity ko stock field mein set karein
    const maxReturnQty = parseFloat(selected.max_return_qty) || 0; 
    
    handleChange(index, "product_master_id", selected.product_master_id);
    handleChange(index, "recipe_id", selected.recipe_id);
    handleChange(index, "product_name", selected.name);
    handleChange(index, "uom_id", selected.uom_id);
    handleChange(index, "uom_name", selected.uom_name);
    handleChange(index, "stock", maxReturnQty); // ✅ Max return quantity set
    handleChange(index, "quantity", "");
    // Note: unitPrice user manually enter karega ya Sale Detail se fetch hoga
  };


  // ✅ Handle field changes & Validation against max_return_qty
  const handleChange = (index, field, value) => {
    const updatedRows = [...rows];
    updatedRows[index][field] = value;

    if (field === "quantity" || field === "unitPrice") {
      const qty = parseFloat(updatedRows[index].quantity) || 0;
      const price = parseFloat(updatedRows[index].unitPrice) || 0;
      const maxReturnQty = parseFloat(updatedRows[index].stock) || 0; // 'stock' is max return qty

      // 🛑 Validation: Sale ki gayi quantity se zyada return nahi kar sakte
      if (qty > maxReturnQty) {
        toast.error(
          `Max return quantity is ${maxReturnQty} units of ${
            updatedRows[index].product_name
          }!`
        );
        updatedRows[index].quantity = ""; // Limit to max return qty
      }

      // Recalculate total
      const finalQty = parseFloat(updatedRows[index].quantity) || 0;
      updatedRows[index].total = (finalQty * price);
    }

    setRows(updatedRows);
    updateGrandTotal(updatedRows);
  };

  const updateGrandTotal = (rows) => {
    const total = rows.reduce(
      (sum, row) => sum + (parseFloat(row.total) || 0),
      0
    );
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ... (rest of validation) ...

    const validRows = rows.filter((r) => r.product_master_id && Number(r.quantity) > 0);
    if (validRows.length === 0) {
      toast.error("Please add at least one product item with quantity.");
      return;
    }

    const user = JSON.parse(localStorage.getItem("user"));
    const token = localStorage.getItem("token");

    // Final data structure for backend (SaleMaster & SaleDetail)
    const saleData = {
      entity_customer_id: selectedCustomer, 
      grand_total: Number(grandTotal),
      type: "SaleReturn", // ✅ CRITICAL: Transaction type is SaleReturn
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

    console.log("Submitting FG Sale Return Data:", JSON.stringify(saleData, null, 2));

    try {
      // 🛑 API call to the combined Finished Goods Sale/Return Route
      const res = await fetch("http://localhost:5000/api/fp-sale", { 
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(saleData),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Finished Goods Sale Return Transaction Successful!");
        navigate("/fp-salereturn-list"); 
      } else {
        toast.error(data.message || "Error creating return transaction!");
      }
    } catch (err) {
      console.error("Error creating return:", err);
      toast.error("Network or Server error!");
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
                  {products.map((p, pIndex) => (
                    <option key={`${p.recipe_id}-${pIndex}`} value={p.recipe_id}>
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
                  Max Return: {Number(row.stock).toFixed(4)} {/* ✅ Max Return Qty Show */}
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