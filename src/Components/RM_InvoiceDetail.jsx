import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import NavigationBar from "./NavigationBar";
import Footer from "./Footer";
import { FaArrowLeft } from "react-icons/fa";
import html2canvas from "html2canvas";
import jsPDF from "jspdf"; 

const RM_InvoiceDetail = () => {
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const formatDate = (dateString) => {
    // 💡 Debugging: Check the raw date value from the API
    if (!dateString) {
        console.warn("Date field (invoice.date) is missing or empty.");
        return 'N/A';
    }

    const date = new Date(dateString);

    // Check if the date object is valid
    if (isNaN(date.getTime())) {
        console.error("Invalid date string received:", dateString);
        // Ismein aapko 'Invalid Date' dikhega agar format galat hai
        return 'Invalid Date Format'; 
    }

    // Date is valid, proceed with formatting
    return date.toLocaleDateString('en-GB', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
};

  const generatePdf = () => {
    const input = document.getElementById("invoice-detail");
    if (!input) {
            console.error("Invoice content element not found.");
            return;
        }
        const option = {
            scale: 2,
            useCORS: true,
            // Buttons ko PDF mein aane se rokne ke liye
            ignoreElements: (element) => element.classList.contains("no-print")
        }

        html2canvas(input, option)
        .then((canvas) => {
            const imgData = canvas.toDataURL('image/png');
                
                // PDF Document Setup (A4 size)
                const pdf = new jsPDF('p', 'mm', 'a4'); // 'p' = portrait
                
                // Calculate dimensions to fit the content on the A4 page
                const imgProps = pdf.getImageProperties(imgData);
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save(`Invoice-${invoice.invoice_no}.pdf`); // Save the file
            })
            .catch(err => {
                console.error("PDF generation failed:", err);
                // Optionally show a toast error to the user
            });
  }

  const handleSearch = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/rm-invoice/${invoiceNo}`);
      const data = await res.json();

      if (res.ok) {
        console.log("Full Invoice Data Received:", data);
        setInvoice(data);
        setError("");
      } else {
        setInvoice(null);
        setError(data.message || "Invoice not found");
      }
    } catch (err) {
      setError("Server error");
    }
  };

  return (
    <>
    <NavigationBar />
    <div className="page-container">
         <button
          className="back-btn"
          style={{ marginTop: "30px" }}
          onClick={() => navigate('/dashboard')}
          >
         <FaArrowLeft />
        </button>
        <div  className="rm-card">
      <h2>🔍 Search Invoice</h2>
      <input
      className="input"
        type="text"
        placeholder="Enter Invoice No (e.g. INV-00123)"
        value={invoiceNo}
        onChange={(e) => setInvoiceNo(e.target.value)}
      />
      <button onClick={handleSearch}>Search</button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {invoice && (
        <>
        <div className="invoice-container">
        <div id="invoice-detail" className="invoice-box shadow-lg">
          <header className="invoice-header">
                    <div className="company-info">
                        <p className="title text">CHEMICAL & DETERGENTS TRADER</p>
                        <h4 className="subtitle">RAW MATERIAL  INVOICE</h4>
                    </div>
                    <div className="invoice-id">
                        <p className="title">INVOICE NO.</p>
                        <h1 className="id-number">#{invoice.invoice_no}</h1>
                    </div>
                </header>

                        <section className="invoice-details-section">
                    <div className="details-row">
                        {/* Billed To (Left Aligned) - Uses invoice.customer (fixed) */}
                        <div className="billed-to">
                            <p className="label">Billed To</p>
                            <h5 className="customer-name"><b>Name: </b>{invoice.entity?.name || 'Customer Name N/A'}</h5>
                            <p className="customer-detail"><b>Address: </b>{invoice.entity?.address || 'Address N/A'}</p>
                            <p className="customer-detail"><b>Contact: </b>{invoice.entity?.contact || 'Contact N/A'}</p>
                            <p className="customer-detail"><b>Type:</b> {invoice.type}</p>
                        </div>

                        {/* Invoice Dates (Right Aligned) */}
                        <div className="invoice-dates">
                            <div className="date-item">
                                <p className="label">Date Issued</p>
                                <p className="value">{formatDate(invoice.RmDetails?.[0]?.date)}</p>
                            </div>
                            <div className="date-item">
                                <p className="label">Created By</p>
                                <p className="value">{invoice.createdby}</p>
                            </div>
                        </div>
                    </div>
                </section>

  {/* 3. Item Details Table */}
                <section className="item-table-section">
                    <h5 className="section-title">Item Details</h5>
                    <div className="table-responsive">
                        <table className="item-table">
                            <thead>
                                <tr>
                                    <th className="product-col">Material Description</th>
                                    <th className="qty-col text-right">Qty</th>
                                    <th className="uom-col text-right">UOM</th>
                                    <th className="price-col text-right">Unit Price</th>
                                    <th className="amount-col text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                              {invoice.RmDetails?.map((item, i) => (
                              <tr key={i}>
                  <td className="product-col">{item.rm_name}</td>
                  <td className="qty-col text-right">{item.quantity}</td>
                  <td className="uom-col text-right">{item.uom?.name}</td>
                  <td className="price-col detail-text text-right">{item.unit_price}</td>
                  <td className="amount-col value-text text-right">{item.total_price}</td>
                            </tr>
                              ))}
                            </tbody>
                        </table>
                    </div>
                </section>
                <footer className="invoice-footer">
                <div className="total-area">
                        {/* Total Box: High Contrast Primary Color Block */}
                        <div className="total-box shadow">
                            <h4 className="total-label">GRAND TOTAL</h4>
                            <h2 className="total-value">Rs. {Number(invoice.grand_total)}</h2> 
                        </div>
                    </div>
                    
                    <div className="note-section">
                        <p className="note">Thank you for your business. This is a computer-generated invoice.</p>
                        
                        {/* --- Action Button Group: Added 'no-print' class to hide in PDF --- */}
                        <div className="action-buttons-group no-print">
                            {/* <button
                                onClick={() => navigate(-1)}
                                className="back-button"
                            >
                                ← Return to Sales List
                            </button> */}
                            {/* New Primary Action Button */}
                            <button
                                onClick={generatePdf}
                                className="download-pdf-button"
                            >
                                ↓ Download as PDF
                            </button>
                        </div>
                        {/* --------------------------- */}
                    </div>
                    </footer>

                </div>
              </div>
        </>
      )}
      </div>
    </div>
    <Footer />
    </>
  );
};

export default RM_InvoiceDetail;
