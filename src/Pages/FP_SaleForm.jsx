import React, { useState, useEffect } from "react";
import NavigationBar from "../Components/NavigationBar";
import { FaArrowLeft, FaPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Footer from "../Components/Footer";
import { toast } from "react-toastify";
import api from "../../api";

const FP_SaleForm = () => {
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
      stock: 0,
    },
  ]);
  const [products, setProducts] = useState([]); 
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [date, setDate] = useState("");
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  
  const [subTotal, setSubTotal] = useState(0); 
  const [globalDiscount, setGlobalDiscount] = useState(""); 
  const [grandTotal, setGrandTotal] = useState(0); 

  // --- GET DATA FUNCTIONS (Using api.js) ---

  const fetchCustomers = async () => {
    try {
      const res = await api.get("/entities");
      setCustomers(res.data.filter((ent) => ent.type === "customer"));
    } catch (err) {
      console.error("Error fetching customers:", err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get("/fp-sale/products-for-sale");
      setProducts(res.data);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  const fetchInvoiceNo = async () => {
    try {
      const res = await api.get("/fp-sale/invoice-no", {
        params: { type: "Sale" }
      });
      setInvoiceNo(res.data.invoice_no);
    } catch (err) {
      console.error("Error fetching invoice number:", err);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
    fetchInvoiceNo();
  }, []);

  // --- LOGIC FUNCTIONS (No changes in logic) ---

  const calculateTotals = (currentRows, discountValue) => {
    const currentSubTotal = currentRows.reduce((sum, row) => {
        const qty = parseFloat(row.quantity) || 0;
        const price = parseFloat(row.unitPrice) || 0;
        return sum + (qty * price);
    }, 0);
    
    const discount = parseFloat(discountValue) || 0;
    let finalGrandTotal = currentSubTotal - discount;
    if (finalGrandTotal < 0) finalGrandTotal = 0;
    
    setSubTotal(currentSubTotal.toFixed(2));
    setGrandTotal(finalGrandTotal.toFixed(2));
  };

  const handleGlobalDiscountChange = (value) => {
      setGlobalDiscount(value);
      calculateTotals(rows, value);
  };

  const handleChange = (index, field, value) => {
    const updatedRows = [...rows];
    updatedRows[index][field] = value;

    if (field === "quantity" || field === "unitPrice") {
      const qty = parseFloat(updatedRows[index].quantity) || 0;
      const price = parseFloat(updatedRows[index].unitPrice) || 0;
      const stock = parseFloat(updatedRows[index].stock) || 0; 

      if (qty > stock) {
        toast.error(`Only ${stock} units available!`);
        updatedRows[index].quantity = ""; 
        updatedRows[index].total = 0;
      } else {
        const finalQty = parseFloat(updatedRows[index].quantity) || 0;
        updatedRows[index].total = (finalQty * price).toFixed(2);
      }
    }
    setRows(updatedRows);
    calculateTotals(updatedRows, globalDiscount);
  };

   // ✅ Add Row
  const addRow = () => {
    setRows([
      ...rows,
      {
        product_master_id: "",
        product_name: "",
        recipe_id: "",
        quantity: "",
        unitPrice: "",
        total: "",
        uom_id: "",
        uom_name: "",
        stock: 0,
      },
    ]);
  }; 
  
  // ✅ Delete Row
  const deleteRow = (index) => {
    const updatedRows = rows.filter((_, i) => i !== index);
    setRows(updatedRows);
    calculateTotals(updatedRows, globalDiscount); // Recalculate after delete
  };


  // --- SUBMIT FUNCTION ---

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedCustomer || !date) {
      toast.error("Please fill customer and date.");
      return;
    }

    const validRows = rows.filter((r) => r.product_master_id);
    const disc = parseFloat(globalDiscount) || 0;

    const user = JSON.parse(localStorage.getItem("user"));

    const saleData = {
      entity_customer_id: selectedCustomer,
      grand_total: Number(grandTotal),
      discount: disc,
      type: "Sale",
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
      // POST using api.js
      const res = await api.post("/fp-sale", saleData);

      toast.success(`Sale Successful! Invoice: ${res.data.invoice_no}`);
      
      // Reset States
      setRows([{ product_master_id: "", product_name: "", recipe_id: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", stock: 0 }]);
      setSelectedCustomer("");
      setDate("");
      setSubTotal(0);
      setGlobalDiscount("");
      setGrandTotal(0);
      fetchInvoiceNo(); 
      navigate("/fp-sale-list");

    } catch (err) {
      console.error("Error creating sale:", err);
      toast.error(err.response?.data?.message || "Error creating sale transaction!");
    }
  };

      const handleQuickCustomerAdd = async () => {
      const name = document.getElementById('new_cust_name').value;
      const phone = document.getElementById('new_cust_phone').value;
      const address = document.getElementById('new_cust_address').value;
  
      if (!name) return toast.error("Customer name is required");
  
      try {
          const payload = { 
              name, 
              phone, 
              address, 
              type: "customer" // Important: Entity type must be customer
          };
          
          const res = await api.post("/entities", payload);
  
          if (res.status === 201 || res.status === 200) {
              toast.success("Customer Added Successfully!");
              
              const newCustomer = res.data; 
              setCustomers(prev => [...prev, newCustomer]);
              
              setSelectedCustomer(newCustomer.id);
              
              // 3. Close Modal
              setShowCustomerModal(false);
          }
      } catch (err) {
          console.error("Error adding customer:", err);
          toast.error(err.response?.data?.message || "Failed to add customer");
      }
  };
  

  return (
    <>
      <NavigationBar />
      <div className="rm-page">
        <button
          className="back-btn"
          style={{ marginTop: "30px" }}
          onClick={() => navigate("/fp-sale-list")}
        >
          <FaArrowLeft />
        </button>

        <div className="rm-card">
          <h2>Finished Goods Sale Form</h2>
          <div className="form-group d-flex">
            <h6>
              <b>
                Sale
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
              onChange={(e) => setSelectedCustomer(e.target.value)}
            >
              <option key="default-customer" value="">
                Select Customer
              </option>
              {customers.map((ent) => (
                <option key={ent.id} value={ent.id}>
                  {ent.name}
                </option>
              ))}
            </select>

            <button
              className="add-sup-cust"
              onClick={() => setShowCustomerModal(true)}
            >
              Add Customer
            </button>

            <label>
              <b>Sale Date:</b>
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
                  // We use recipe_id as the value for dropdown selection
                  value={row.recipe_id}
                  onChange={(e) => {
                    const selectedRecipeId = e.target.value;

                    const selected = products.find(
                      (p) => String(p.recipe_id) === String(selectedRecipeId)
                    );

                    if (!selected) {
                      // Reset row if selection is invalid or 'Select Product'
                      handleChange(index, "product_master_id", "");
                      handleChange(index, "recipe_id", selectedRecipeId);
                      handleChange(index, "product_name", "");
                      handleChange(index, "uom_id", "");
                      handleChange(index, "uom_name", "");
                      handleChange(index, "stock", 0);
                      handleChange(index, "quantity", "");
                      handleChange(index, "unitPrice", "");
                      handleChange(index, "total", 0);
                      return;
                    }
                    
                    // Populate fields from selected product/recipe
                    handleChange(index, "product_master_id", selected.product_master_id);
                    handleChange(index, "recipe_id", selected.recipe_id);
                    handleChange(index, "product_name", selected.product_name);
                    handleChange(index, "uom_id", selected.uom_id);
                    handleChange(index, "uom_name", selected.uom_name);
                    handleChange(index, "stock", Number(selected.current_stock) || 0);
                    
                    // Clear Qty and Price to force re-entry or calculation
                    handleChange(index, "quantity", "");
                    handleChange(index, "unitPrice", ""); 
                    // Note: unitPrice needs to be set manually or fetched (can be added later)
                  }}
                >
                  <option value="">Select Product</option>

                  {products.map((p, index) => (
                    <option key={`${p.recipe_id}-${index}`} value={p.recipe_id}>
                      {p.display_name}
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

                <small style={{ color: "gray" }}>Available: {row.stock}</small>

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

            {/* 🛑 NEW: Totals Section (Subtotal, Discount, Grand Total) */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "20px", marginTop: "20px" }}>
                
                {/* Total Sub Amount */}
                
                    <label className="grand-total"><b>Total<br />Sub Amount:</b></label>
                    <input type="text" className="input" value={subTotal} readOnly style={{ width: 'auto', backgroundColor: '#f3f3f3' }} />
                
                
                {/* Global Discount Input */}
                
                    <label className="grand-total"><b>Global<br />Discount:</b></label>
                    <input
                        type="number"
                        className="input"
                        placeholder="Discount"
                        value={globalDiscount}
                        min="0"
                        step="0.01"
                        onChange={(e) => handleGlobalDiscountChange(e.target.value)}
                        style={{ width: 'auto' }}
                    />
                
                
                {/* Final Grand Total */}
                
                    <label className="grand-total"><b>Grand<br />Total:</b></label>
                    <input type="text" className="input" value={grandTotal} readOnly style={{ width: 'auto', backgroundColor: '#f3f3f3' }} />
                
            </div>

            <div className="form-actions">
              <button type="submit" className="save-btn">
                Save Sale
              </button>
            </div>
          </form>
        </div>
      </div>
      <Footer />

 {showCustomerModal && (
    <div className="modal-overlay" onClick={() => setShowCustomerModal(false)}>
        <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowCustomerModal(false)}>×</button>
            
            <div className="modal-form-content">
                <h3>Add New Customer</h3>
                <div className="form-group" style={{marginBottom: '15px'}}>
                    <label><b>Customer Name *</b></label>
                    <input type="text" id="new_cust_name" className="input" placeholder="Full Name" style={{width: '100%'}} />
                </div>
                <div className="form-group" style={{marginBottom: '15px'}}>
                    <label><b>Address</b></label>
                    <input type="text" id="new_cust_address" className="input" placeholder="City, Area" style={{width: '100%'}} />
                </div>
                
                <div className="form-group" style={{marginBottom: '15px'}}>
                    <label><b>Phone / Contact</b></label>
                    <input type="text" id="new_cust_phone" className="input" placeholder="03xx-xxxxxxx" style={{width: '100%'}} />
                </div>

                

                <div className="modal-actions" style={{marginTop: '25px', display: 'flex', gap: '10px'}}>
                    <button 
                        type="button" 
                        className="save-btn" 
                        onClick={handleQuickCustomerAdd}
                        // style={{flex: 1}}
                    >
                        Save Customer
                    </button>
                    <button 
                        type="button" 
                        className="del-btn" 
                        onClick={() => setShowCustomerModal(false)}
                        // style={{flex: 1}}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    </div>
)}


    </>
  );
};

export default FP_SaleForm;