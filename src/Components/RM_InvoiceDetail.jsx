import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import NavigationBar from "./NavigationBar"; 
import Footer from "./Footer"; 
import { FaArrowLeft } from "react-icons/fa";
import html2canvas from "html2canvas";
import jsPDF from "jspdf"; 
import api from "../../api"; 

// --- HELPER FUNCTION: Same to Same (No Changes) ---
const standardizeInvoice = (data, type) => {
    let detailArray;
    if (type === "RAW MATERIAL") {
        detailArray = data.RmDetails || [];
    } else if (type === "FINISHED PRODUCT") {
        detailArray = data.details || []; 
    } else {
        detailArray = [];
    }
    
    const items = detailArray.map(item => ({
        display_name: type === "RAW MATERIAL" 
                        ? item.rm_name 
                        : (item.product_name || item.fp_name),
        quantity: item.quantity,
        uom: item.uom,
        unit_price: item.unit_price,
        total_price: item.total_price,
    }));

    const dateSource = data.date || detailArray[0]?.date;

    return {
        ...data,
        type: type, 
        items: items, 
        date: dateSource 
    };
};

const RM_InvoiceDetail = () => {
    const [invoiceNo, setInvoiceNo] = useState("");
    const [invoice, setInvoice] = useState(null);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date Format'; 
        return date.toLocaleDateString('en-GB', { 
            year: 'numeric', month: 'short', day: 'numeric' 
        });
    };

    const generatePdf = () => {
        const input = document.getElementById("invoice-detail");
        if (!input) return;
        const option = {
            scale: 2, useCORS: true,
            ignoreElements: (element) => element.classList.contains("no-print")
        }
        html2canvas(input, option).then((canvas) => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4'); 
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Invoice-${invoice.invoice_no}.pdf`); 
        });
    }

    // --- HANDLE SEARCH (Using api.js) ---
    const handleSearch = async () => {
        setError("");
        setInvoice(null); 

        // 1. Try to fetch RM Invoice first
        try {
            // fetch ki jagah api.get
            const rmRes = await api.get(`/rm-invoice/${invoiceNo}`);
            const rmData = rmRes.data; 

            if (rmData.RmDetails && rmData.RmDetails.length > 0) {
                setInvoice(standardizeInvoice(rmData, "RAW MATERIAL")); 
                return; 
            }
        } catch (err) {
             console.log("RM Invoice not found, trying FP...");
        }

        // 2. Try to fetch FP Invoice
        try {
            const fpRes = await api.get(`/fp-invoice/${invoiceNo}`);
            const fpData = fpRes.data;

            if (fpData.details && fpData.details.length > 0) { 
                setInvoice(standardizeInvoice(fpData, "FINISHED PRODUCT"));
                return; 
            }
        } catch (err) {
            console.error("FP API call failed:", err);
        }

        setError("Invoice not found in Raw Material or Finished Product records.");
    };
    
    const invoiceDateSource = invoice?.date;


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
            <div className="rm-card">
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
                                    <h4 className="subtitle">{invoice.type} INVOICE</h4>
                                </div>
                                <div className="invoice-id">
                                    <p className="title">INVOICE NO.</p>
                                    <h1 className="id-number">#{invoice.invoice_no}</h1>
                                </div>
                            </header>

                            <section className="invoice-details-section">
                                <div className="details-row">
                                    <div className="billed-to">
                                        <p className="label">Billed To</p>
                                        <h5 className="customer-name"><b>Name: </b>{invoice.entity?.name || 'Name N/A'}</h5>
                                        <p className="customer-detail"><b>Address: </b>{invoice.entity?.address || 'Address N/A'}</p>
                                        <p className="customer-detail"><b>Contact: </b>{invoice.entity?.contact || 'Contact N/A'}</p>
                                        <p className="customer-detail"><b>Type:</b> {invoice.type}</p>
                                    </div>

                                    <div className="invoice-dates">
                                        <div className="date-item">
                                            <p className="label">Date Issued</p>
                                            <p className="value">{formatDate(invoiceDateSource)}</p> 
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
                                            {/* Rendering using standardized 'invoice.items' array */}
                                            {Array.isArray(invoice.items) && invoice.items.length > 0 ? (
                                                invoice.items.map((item, index) => (
                                                <tr key={index}>
                                                    {/* Display Name will be rm_name or product_name based on standardization */}
                                                    <td className="product-col">{item.display_name}</td> 
                                                    <td className="qty-col text-right">{item.quantity}</td>
                                                    <td className="uom-col text-right">{item.uom?.name || 'N/A'}</td> 
                                                    {/* Price and Total formatted correctly */}
                                                    <td className="price-col detail-text text-right">Rs. {Number(item.unit_price).toFixed(2)}</td> 
                                                    <td className="amount-col value-text text-right">Rs. {Number(item.total_price).toFixed(2)}</td> 
                                                </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="5" className="text-center text-muted py-4">
                                                        No product details found for this invoice.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                            <footer className="invoice-footer">
                                <div className="total-area">
                                    <div className="total-box shadow">
                                        <h5>Discount: Rs. {Number(invoice.discount)}</h5>
                                        <h4 className="total-label">GRAND TOTAL</h4>
                                        <h2 className="total-value">Rs. {Number(invoice.grand_total).toLocaleString()}</h2> 
                                    </div>
                                </div>
                                
                                <div className="note-section">
                                    <p className="note">Thank you for your business. This is a computer-generated invoice.</p>
                                    
                                    <div className="action-buttons-group no-print">
                                        <button
                                            onClick={generatePdf}
                                            className="download-pdf-button"
                                        >
                                            ↓ Download as PDF
                                        </button>
                                    </div>
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