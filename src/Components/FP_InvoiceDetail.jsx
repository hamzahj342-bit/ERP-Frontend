import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import '../Invoice.css'; 
import api from '../../api'; 

const FP_InvoiceDetail = () => {
    const { invoiceNo } = useParams();
    const navigate = useNavigate();

    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInvoice = async () => {
            if (!invoiceNo) {
                setLoading(false);
                return;
            }
            
            try {
                // Axios GET request - URL base automatically handled by api.js
                const res = await api.get(`/fp-invoice/${invoiceNo}`);
                
                // Axios mein data direct 'res.data' mein hota hai
                setInvoice(res.data);
            } catch (err) {
                console.error("Error fetching invoice details:", err);
                
                // Backend se aane wala error message dikhane ke liye
                const errorMsg = err.response?.data || "Failed to fetch invoice";
                console.error(`Status: ${err.response?.status}. ${errorMsg}`);
                
                setInvoice(null);
            } finally {
                setLoading(false);
            }
        };

        fetchInvoice();
    }, [invoiceNo]);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        // 'en-GB' format: Day/Month/Year
        return new Date(dateString).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    // 💡 PDF Download Handler (FIXED)
    const handleDownloadPDF = () => {
        // ✅ FIX 1: Element ID corrected to "invoice-content" to match the JSX below.
        const input = document.getElementById("invoice-content"); 
        
        if (!input) {
            console.error("Invoice content element not found.");
            return;
        }
        
        const options = {
            scale: 2, // Higher scale for better resolution in PDF
            useCORS: true,
            // ✅ Buttons ko PDF mein aane se rokne ke liye hum 'no-print' class use kar rahe hain.
            ignoreElements: (element) => element.classList.contains("no-print")
        }

        html2canvas(input, options)
        .then((canvas) => {
            const imgData = canvas.toDataURL('image/png');
            
            // PDF Document Setup (A4 size)
            const pdf = new jsPDF('p', 'mm', 'a4'); // 'p' = portrait, 'mm' = units
            
            // Calculate dimensions to fit the content on the A4 page
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            // Add image to PDF. 10 is margin (optional)
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight); 
            
            // Save the file with a clean name
            pdf.save(`Invoice-${invoice.invoice_no}.pdf`); 
            
            console.log(`Invoice #${invoice.invoice_no} downloaded successfully.`);
        })
        .catch(err => {
            console.error("P  DF generation failed:", err);
            // Show a user-friendly error if needed
        });
        
        // Removed redundant console.log and alert outside the promise chain.
    }

    if (loading) return <p className="p-5 text-center">Loading invoice...</p>;
    if (!invoice) return <p className="p-5 text-center text-danger">Invoice not found or failed to load.</p>;

    return (
        <div className="invoice-container">
            {/* ✅ Element targeted by handleDownloadPDF function */}
            <div className="invoice-box shadow-lg" id="invoice-content"> 
                
                {/* 1. Header: Dark Block with Primary Accent */}
                <header className="invoice-header">
                    <div className="company-info">
                        <p className="title text">CHEMICAL & DETERGENTS TRADER</p>
                        <h4 className="subtitle">SALES INVOICE</h4>
                    </div>
                    <div className="invoice-id">
                        <p className="title">INVOICE NO.</p>
                        <h1 className="id-number">#{invoice.invoice_no}</h1>
                    </div>
                </header>

                {/* 2. Customer & Invoice Details Section */}
                <section className="invoice-details-section">
                    <div className="details-row">
                        {/* Billed To (Left Aligned) - Uses invoice.customer (fixed) */}
                        <div className="billed-to">
                            <p className="label">Billed To</p>
                            <h5 className="customer-name"><b>Name: </b>{invoice.customer?.name || 'Customer Name N/A'}</h5>
                            <p className="customer-detail"><b>Address: </b>{invoice.customer?.address || 'Address N/A'}</p>
                            <p className="customer-detail"><b>Contact: </b>{invoice.customer?.contact || 'Contact N/A'}</p>
                            <p className="customer-detail"><b>Type:</b> {invoice.type}</p>
                        </div>

                        {/* Invoice Dates (Right Aligned) */}
                        <div className="invoice-dates">
                            <div className="date-item">
                                <p className="label">Date Issued</p>
                                <p className="value">{formatDate(invoice.date)}</p>
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
                                    <th className="product-col">Product Description</th>
                                    <th className="qty-col text-right">Qty</th>
                                    <th className="uom-col text-right">UOM</th>
                                    <th className="price-col text-right">Unit Price</th>
                                    <th className="amount-col text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Array.isArray(invoice.details) && invoice.details.length > 0 ? (
                                    invoice.details.map((item, index) => (
                                        <tr key={index}>
                                            <td className="product-col">{item.product_name}</td>
                                            <td className="qty-col text-right">{item.quantity}</td>
                                            <td className="uom-col text-right">{item.uom?.name || 'N/A'}</td> 
                                            <td className="price-col detail-text text-right">Rs. {Number(item.unit_price).toFixed(2)}</td> {/* Added .toFixed(2) */}
                                            <td className="amount-col value-text text-right">Rs. {Number(item.total_price).toFixed(2)}</td> {/* Added .toFixed(2) */}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="text-center text-muted py-4">No product details found for this invoice.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* 4. Grand Total and Footer */}
                <footer className="invoice-footer">
                    <div className="total-area">
                        {/* Total Box: High Contrast Primary Color Block */}
                        <div className="total-box shadow">
                            <h5>Discount: Rs. {Number(invoice.discount)}</h5>
                            <h4 className="total-label">GRAND TOTAL</h4>
                            <h2 className="total-value">Rs. {Number(invoice.grand_total)}</h2> 
                        </div>
                    </div>
                    
                    <div className="note-section">
                        <p className="note">Thank you for your business. This is a computer-generated invoice.</p>
                        
                        {/* --- Action Button Group: Added 'no-print' class to hide in PDF --- */}
                        <div className="action-buttons-group no-print">
                            <button
                                onClick={() => navigate(-1)}
                                className="back-button"
                            >
                                ← Return to Sales List
                            </button>
                            {/* New Primary Action Button */}
                            <button
                                onClick={handleDownloadPDF}
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
    );
};

export default FP_InvoiceDetail;