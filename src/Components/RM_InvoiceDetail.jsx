import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavigationBar from "./NavigationBar"; 
import Footer from "./Footer"; 
import { FaArrowLeft } from "react-icons/fa";
import html2canvas from "html2canvas";
import jsPDF from "jspdf"; 
import api from "../../api"; 

// --- HELPER FUNCTION: Standardizing Data ---
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
    const [companies, setCompanies] = useState([]);
    const navigate = useNavigate();

    // ✅ Configuration for Images & User
    const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL || "http://localhost:5000";
    const user = JSON.parse(localStorage.getItem("user"));

    // ✅ Smart Logo Logic: Cloudinary vs Local
const getLogoUrl = () => {
    if (!user?.profile_image) return null;
    console.log("Current Profile Image State:", user.profile_image);

    // Agar Cloudinary ka full URL hai
    if (user.profile_image.startsWith("http")) {
        return user.profile_image;
    }

    // Local path ke liye: Base URL + /uploads/ + filename
   // Taake agar database mein "uploads\file.png" hai toh sirf "file.png" bache
    const cleanFileName = user.profile_image.replace("uploads\\", "").replace("uploads/", "");

    // 3. Final URL build karein (Windows backslash ko forward slash se badlein)
    const finalUrl = `${IMAGE_BASE_URL}/uploads/${cleanFileName}`.replace(/\\/g, "/");

    console.log("Fixed URL:", finalUrl); 
    return finalUrl;
};

    // ✅ Fetch Companies to get dynamic name
    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                const res = await api.get('/companies');
                setCompanies(res.data);
            } catch (err) {
                console.error("Error fetching companies", err);
            }
        };
        fetchCompanies();
    }, []);

    // ✅ Current Company Name logic
    const currentCompanyName = companies.find(c => c.id === Number(user?.company_id))?.name || "CHEMICAL & DETERGENTS TRADER";

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date Format'; 
        return date.toLocaleDateString('en-GB', { 
            year: 'numeric', month: 'short', day: 'numeric' 
        });
    };

    // 📄 PDF Download
    const generatePdf = () => {
        const input = document.getElementById("invoice-detail");
        if (!input) return;
        html2canvas(input, { scale: 2, useCORS: true, ignoreElements: (el) => el.classList.contains("no-print") })
        .then((canvas) => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4'); 
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Invoice-${invoice.invoice_no}.pdf`); 
        });
    }

    // 🖼️ PNG Download
    const generateImage = () => {
        const input = document.getElementById("invoice-detail");
        if (!input) return;
        html2canvas(input, { scale: 3, useCORS: true, ignoreElements: (el) => el.classList.contains("no-print") })
        .then((canvas) => {
            const link = document.createElement('a');
            link.download = `Invoice-${invoice.invoice_no}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    }

    const handleSearch = async () => {
        setError("");
        setInvoice(null); 
        try {
            const rmRes = await api.get(`/rm-invoice/${invoiceNo}`);
            if (rmRes.data.RmDetails) {
                setInvoice(standardizeInvoice(rmRes.data, "RAW MATERIAL")); 
                return; 
            }
        } catch (err) { console.log("Searching in FP..."); }

        try {
            const fpRes = await api.get(`/fp-invoice/${invoiceNo}`);
            if (fpRes.data.details) { 
                setInvoice(standardizeInvoice(fpRes.data, "FINISHED PRODUCT"));
                return; 
            }
        } catch (err) { console.error("Not found in both."); }

        setError("Invoice not found in our records.");
    };

    return (
        <>
        <NavigationBar />
        <div className="page-container">
            <button className="back-btn" style={{ marginTop: "30px" }} onClick={() => navigate('/dashboard')}>
                <FaArrowLeft />
            </button>
            <div className="rm-card">
                <h2>🔍 Search Invoice</h2>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <input
                        className="input"
                        type="text"
                        placeholder="Enter Invoice No (e.g. INV-P-0001)"
                        value={invoiceNo}
                        onChange={(e) => setInvoiceNo(e.target.value)}
                    />
                    <button onClick={handleSearch} className="btn btn-secondary" style={{height: '46px'}}>Search</button>
                </div>

                {error && <p style={{ color: "red", textAlign: 'center' }}>{error}</p>}

                {invoice && (
                    <div className="invoice-container">
                        <div id="invoice-detail" className="invoice-box shadow-lg">
                            <header className="invoice-header">
                                <div className="company-info" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    {/* ✅ Dynamic Logo */}
                                   {user?.profile_image ? (
            <img 
                src={getLogoUrl()} 
                alt="Logo" 
                style={{ width: '70px', height: '70px', borderRadius: '5px', objectFit: 'cover' }} 
                crossOrigin="anonymous" 
            />
        ) : (
            <div style={{ width: '70px', height: '70px', background: '#eee', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#888', border: '1px solid #ddd' }}>
                NO LOGO
            </div>
        )}
                                    <div>
                                        {/* ✅ Dynamic Company Name */}
                                        <p className="title text" style={{ textTransform: 'uppercase', fontWeight: 'bold', fontSize: '1.1rem', margin: 0 }}>
                                            {currentCompanyName}
                                        </p>
                                        <h4 className="subtitle">{invoice.type} INVOICE</h4>
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
                                        <h5 className="customer-name"><b>Name: </b>{invoice.entity?.name || invoice.customer?.name || 'N/A'}</h5>
                                        <p className="customer-detail"><b>Address: </b>{invoice.entity?.address || invoice.customer?.address || 'N/A'}</p>
                                        <p className="customer-detail"><b>Contact: </b>{invoice.entity?.contact || invoice.customer?.contact || 'N/A'}</p>
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
                                <table className="item-table">
                                    <thead>
                                        <tr>
                                            <th className="product-col">Description</th>
                                            <th className="qty-col text-right">Qty</th>
                                            <th className="uom-col text-right">UOM</th>
                                            <th className="price-col text-right">Price</th>
                                            <th className="amount-col text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoice.items.map((item, index) => (
                                            <tr key={index}>
                                                <td className="product-col">{item.display_name}</td> 
                                                <td className="qty-col text-right">{item.quantity}</td>
                                                <td className="uom-col text-right">{item.uom?.name || 'N/A'}</td> 
                                                <td className="price-col text-right">{Number(item.unit_price).toLocaleString()}</td> 
                                                <td className="amount-col text-right">{Number(item.total_price).toLocaleString()}</td> 
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </section>

                            <footer className="invoice-footer">
                                <div className="total-area">
                                    <div className="total-box shadow">
                                        {/* ✅ Conditional Discount */}
                                        {Number(invoice.discount) > 0 && (
                                            <h5 style={{ marginBottom: '5px' }}>Discount: Rs. {Number(invoice.discount).toLocaleString()}</h5>
                                        )}
                                        <h4 className="total-label">GRAND TOTAL</h4>
                                        <h2 className="total-value">Rs. {Number(invoice.grand_total).toLocaleString()}</h2> 
                                    </div>
                                </div>
                                
                                <div className="note-section">
                                    <p className="note">Computer generated invoice. No signature required.</p>
                                    <div className="action-buttons-group no-print" style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '15px' }}>
                                        <button onClick={generateImage} className="download-img-button" style={{ backgroundColor: '#27ae60', color: 'white' }}>
                                            🖼️ Save Image
                                        </button>
                                        <button onClick={generatePdf} className="download-pdf-button">
                                            📄 Save PDF
                                        </button>
                                    </div>
                                </div>
                            </footer>
                        </div>
                    </div>
                )}
            </div>
        </div>
        <Footer />
        </>
    );
};

export default RM_InvoiceDetail;