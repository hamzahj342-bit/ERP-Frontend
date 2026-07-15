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
    const [companies, setCompanies] = useState([]);

    const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL || "http://localhost:5000";
    
   
    const user = JSON.parse(localStorage.getItem("user"));

   
const getCompanyLogo = () => {
    if (!user?.profile_image) return null;
    console.log("Current Profile Image State:", user.profile_image);

  
    if (user.profile_image.startsWith("http")) {
        return user.profile_image;
    }

  
    const cleanFileName = user.profile_image.replace("uploads\\", "").replace("uploads/", "");

   
    const finalUrl = `${IMAGE_BASE_URL}/uploads/${cleanFileName}`.replace(/\\/g, "/");

    console.log("Fixed URL:", finalUrl); 
    return finalUrl;
};

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
             
                const compRes = await api.get('/companies');
                setCompanies(compRes.data);

   
                if (invoiceNo) {
                    const res = await api.get(`/fp-invoice/${invoiceNo}`);
                    setInvoice(res.data);
                }
            } catch (err) {
                console.error("Error fetching invoice details:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, [invoiceNo]);

    const currentCompanyName = companies.find(c => c.id === Number(user?.company_id))?.name || "CHEMICAL & DETERGENTS TRADER";

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    // 📄 PDF Download Handler
    const handleDownloadPDF = () => {
        const input = document.getElementById("invoice-content"); 
        if (!input) return;
        
        html2canvas(input, { scale: 2, useCORS: true, ignoreElements: (el) => el.classList.contains("no-print") })
        .then((canvas) => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight); 
            pdf.save(`Sales-Invoice-${invoice.invoice_no}.pdf`); 
        });
    };

    // 🖼️ PNG Image Download Handler
    const handleDownloadImage = () => {
        const input = document.getElementById("invoice-content");
        if (!input) return;

        html2canvas(input, { useCORS: true, scale: 3, ignoreElements: (el) => el.classList.contains("no-print") })
        .then((canvas) => {
            const link = document.createElement('a');
            link.download = `Sales-Invoice-${invoice.invoice_no}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    };

    if (loading) return <p className="p-5 text-center">Loading invoice...</p>;
    if (!invoice) return <p className="p-5 text-center text-danger">Invoice not found or failed to load.</p>;

    return (
        <div className="invoice-container">
            <div className="invoice-box shadow-lg" id="invoice-content"> 
                
                <header className="invoice-header">
                    <div className="company-info" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        {/* ✅ Dynamic Logo */}
                        {user?.profile_image ? (
            <img 
                src={getCompanyLogo()} 
                alt="Company Logo" 
                style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover' }} 
                crossOrigin="anonymous" 
            />
        ) : (
            <div style={{ width: '80px', height: '80px', background: '#eee', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#888', border: '1px solid #ddd' }}>
                NO LOGO
            </div>
        )}
                        <div>
                            {/* ✅ Dynamic Company Name */}
                            <p className="title text" style={{ textTransform: 'uppercase', fontWeight: 'bold', fontSize: '1.2rem', margin: 0 }}>
                                {currentCompanyName}
                            </p>
                            <h4 className="subtitle">SALES INVOICE</h4>
                        </div>
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
                            <h5 className="customer-name"><b>Name: </b>{invoice.customer?.name || 'Customer Name N/A'}</h5>
                            <p className="customer-detail"><b>Address: </b>{invoice.customer?.address || 'Address N/A'}</p>
                            <p className="customer-detail"><b>Contact: </b>{invoice.customer?.contact || 'Contact N/A'}</p>
                            <p className="customer-detail"><b>Type:</b> {invoice.type}</p>
                        </div>

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
                                            <td className="price-col text-right">Rs. {Number(item.unit_price).toLocaleString()}</td>
                                            <td className="amount-col text-right">Rs. {Number(item.total_price).toLocaleString()}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="text-center text-muted py-4">No product details found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <footer className="invoice-footer">
                    <div className="total-area">
                        <div className="total-box shadow">
                            <div style={{ marginBottom: '10px' }}>
                                
                                {invoice.is_taxable ? (
                                    <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <span>Sub Total</span>
                                    <span>Rs. {Number(invoice.subtotal || 0).toLocaleString()}</span>
                                </div>
                                        {Number(invoice.discount) > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                <span>Discount</span>
                                                <span>Rs. {Number(invoice.discount).toLocaleString()}</span>
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                            <span>Taxable Amount</span>
                                            <span>Rs. {Number(invoice.taxable_amount || (invoice.subtotal - (invoice.discount||0))).toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                            <span>Tax ({Number(invoice.tax_rate || 0).toFixed(2)}%)</span>
                                            <span>Rs. {Number(invoice.tax_amount || 0).toLocaleString()}</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {Number(invoice.discount) > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                <span>Discount</span>
                                                <span>Rs. {Number(invoice.discount).toLocaleString()}</span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                            <h4 className="total-label">GRAND TOTAL</h4>
                            <h2 className="total-value">Rs. {Number(invoice.grand_total).toLocaleString()}</h2> 
                        </div>
                    </div>
                    
                    <div className="note-section">
                        <p className="note">Thank you for your business. This is a computer-generated invoice.</p>
                        
                        <div className="action-buttons-group no-print" style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'center' }}>
                            <button onClick={() => navigate(-1)} className="back-button" style={{ padding: '10px 20px', cursor: 'pointer' }}>
                                ← Back
                            </button>
                            {/* ✅ PNG Save Button */}
                            <button onClick={handleDownloadImage} className="download-img-button" style={{ padding: '10px 20px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                                🖼️ Save as Image
                            </button>
                            {/* ✅ PDF Save Button */}
                            <button onClick={handleDownloadPDF} className="download-pdf-button" style={{ padding: '10px 20px', backgroundColor: '#2980b9', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                                📄 Save as PDF
                            </button>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default FP_InvoiceDetail;