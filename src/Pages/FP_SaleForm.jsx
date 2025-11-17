import React, { useState, useEffect } from "react";
import NavigationBar from "../Components/NavigationBar";
import { FaArrowLeft, FaPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Footer from "../Components/Footer";
import { toast } from "react-toastify";

const FP_SaleForm = () => {
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
  const [products, setProducts] = useState([]); // Products will be recipes
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [date, setDate] = useState("");
  const [grandTotal, setGrandTotal] = useState(0);
  const navigate = useNavigate();

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

    const validRows = rows.filter((r) => r.product_master_id);
    if (validRows.length === 0) {
      toast.error("Please add at least one product item.");
      return;
    }

    const user = JSON.parse(localStorage.getItem("user"));
    const token = localStorage.getItem("token");

    // Final data structure for backend (SaleMaster & SaleDetail)
    const saleData = {
      entity_customer_id: selectedCustomer, // Customer ID
      grand_total: Number(grandTotal),
      type: "Sale",
      date: date,
      createdby: user ? user.username : "guest",
      invoice_no: invoiceNo,
      details: validRows.map((r) => ({
        product_master_id: r.product_master_id,
        product_name: r.product_name,
        recipe_id: r.recipe_id, // Important for stock update
        quantity: Number(r.quantity),
        unit_price: Number(r.unitPrice),
        total_price: Number(r.total), // Grand total is sum of total_price
        uom_id: r.uom_id,
      })),
    };

    console.log("Submitting FG Sale Data:", JSON.stringify(saleData, null, 2));

    try {
      // 🛑 API call to the new Finished Goods Sale Route
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
        toast.success("Finished Goods Sale Transaction Successful!");
        navigate("/fp-sale-list"); // Navigate to list view
      } else {
        // Display error message from backend
        toast.error(data.message || "Error creating sale transaction!");
      }
    } catch (err) {
      console.error("Error creating sale:", err);
      toast.error("Network or Server error!");
    }
  }; // ✅ Fetch Customers

  useEffect(() => {
    fetch("http://localhost:5000/api/entities")
      .then((res) => res.json())
      .then((data) =>
        setCustomers(data.filter((ent) => ent.type === "customer"))
      )
      .catch((err) => console.error("Error fetching customers:", err));
  }, []); // ✅ Fetch Products (Recipes)

  useEffect(() => {
    // 🛑 This endpoint needs to be created on the backend
    fetch("http://localhost:5000/api/fp-sale/products-for-sale")
      .then((res) => res.json())
      .then((data) => {
        // Assuming data is an array of recipes with recipe_id, name, uom_id, current_stock
        setProducts(data);
      })
      .catch((err) => console.error("Error fetching products:", err));
  }, []); // ✅ Fetch Invoice No

  useEffect(() => {
    // 🛑 This endpoint needs to be created on the backend
    fetch("http://localhost:5000/api/fp-sale/invoice-no?type=Sale")
      .then((res) => res.json())
      .then((data) => setInvoiceNo(data.invoice_no))
      .catch((err) => console.error("Error fetching invoice number:", err));
  }, []); // ✅ Handle field changes

  const handleChange = (index, field, value) => {
    const updatedRows = [...rows];
    updatedRows[index][field] = value;

    if (field === "quantity" || field === "unitPrice") {
      const qty = parseFloat(updatedRows[index].quantity) || 0;
      const price = parseFloat(updatedRows[index].unitPrice) || 0;
      const stock = parseFloat(updatedRows[index].stock) || 0; // 🛑 Stock availability check

      if (qty > stock) {
        toast.error(
          `Only ${stock} units of ${updatedRows[index].product_name} available!`
        );
        updatedRows[index].quantity = ""; // Limit to available stock
      }

      // Recalculate total after potential quantity change
      const finalQty = parseFloat(updatedRows[index].quantity) || 0;
      updatedRows[index].total = finalQty * price;
    }

    setRows(updatedRows);
    updateGrandTotal(updatedRows);
  }; // ✅ Update Grand Total

  const updateGrandTotal = (rows) => {
    const total = rows.reduce(
      (sum, row) => sum + (parseFloat(row.total) || 0),
      0
    );
    setGrandTotal(total);
  }; // ✅ Add Row

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
  }; // ✅ Delete Row

  const deleteRow = (index) => {
    const updatedRows = rows.filter((_, i) => i !== index);
    setRows(updatedRows);
    updateGrandTotal(updatedRows);
  };

  // Note: Since we fetch all stock data initially, a separate fetchStock function isn't needed.

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
              onClick={() => navigate("/add-customers")}
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

                    // 2. Logging for Debugging
                    console.log("Selected Product Value:", selectedRecipeId);
                    console.log("Found Product Object:", selected);

                    // Agar 'Select Product' select hota hai (value === ""), toh selected 'undefined' hi aayega, jo theek hai.

                    if (!selected) {
                      // Agar 'undefined' hai (yaani 'Select Product' chuna gaya ya match nahi hua),
                      // to row ko reset kar dein.
                      handleChange(index, "product_master_id", "");
                      handleChange(index, "recipe_id", selectedRecipeId); // Value ko set karein taki dropdown select rahe
                      handleChange(index, "product_name", "");
                      handleChange(index, "uom_id", "");
                      handleChange(index, "uom_name", "");
                      handleChange(index, "stock", 0);
                      handleChange(index, "quantity", "");
                      return;
                    }
                    handleChange(
                      index,
                      "product_master_id",
                      selected.product_master_id
                    );
                    handleChange(index, "recipe_id", selected.recipe_id);
                    handleChange(index, "product_name", selected.name);
                    handleChange(index, "uom_id", selected.uom_id);
                    handleChange(index, "uom_name", selected.uom_name);
                    handleChange(
                      index,
                      "stock",
                      Number(selected.current_stock) || 0
                    );
                    handleChange(index, "quantity", "");
                    // Note: unitPrice needs to be set manually or fetched (we'll fetch later)
                  }}
                >
                                    <option value="">Select Product</option>   
                         
                  {products.map((p, index) => (
                    <option key={`${p.recipe_id}-${index}`} value={p.recipe_id}>
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
                Save Sale
              </button>
                   
            </div>
               
          </form>
           
        </div>
      </div>
            <Footer />
    </>
  );
};

export default FP_SaleForm;
