import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "../Invoice.css";
import api from "../../api";

const PaymentTransactionInvoice = () => {
  const { invoiceNo } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [rows, setRows] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem("user"));

  const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL || "http://localhost:5000";

  const getLogoUrl = () => {
    if (!user?.profile_image) return null;
    if (user.profile_image.startsWith("http")) return user.profile_image;
    const cleanFileName = user.profile_image.replace("uploads\\", "").replace("uploads/", "");
    return `${IMAGE_BASE_URL}/uploads/${cleanFileName}`.replace(/\\/g, "/");
  };

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const [companyRes, invoiceRes] = await Promise.all([
          api.get("/companies"),
          api.get(`/payment-transactions/${invoiceNo}`),
        ]);

        setCompanies(companyRes.data || []);
        setInvoice(invoiceRes.data.invoice);
        setRows(invoiceRes.data.rows || []);
      } catch (err) {
        console.error("Error fetching payment invoice:", err);
        setInvoice(null);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [invoiceNo]);

  const currentCompanyName = companies.find((c) => c.id === Number(user?.company_id))?.name || "CHEMICAL & DETERGENTS TRADER";

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleDownloadPDF = () => {
    const input = document.getElementById("payment-invoice-detail");
    if (!input) return;

    html2canvas(input, {
      useCORS: true,
      scale: 2,
      ignoreElements: (element) => element.classList.contains("no-print"),
    }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Payment-Invoice-${invoice?.invoice_no || invoiceNo}.pdf`);
    });
  };

  const handleDownloadImage = () => {
    const input = document.getElementById("payment-invoice-detail");
    if (!input) return;

    html2canvas(input, {
      useCORS: true,
      scale: 3,
      ignoreElements: (element) => element.classList.contains("no-print"),
    }).then((canvas) => {
      const link = document.createElement("a");
      link.download = `Payment-Invoice-${invoice?.invoice_no || invoiceNo}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    });
  };

  const totalDebit = rows.reduce((sum, item) => sum + Number(item.debit || 0), 0);
  const totalCredit = rows.reduce((sum, item) => sum + Number(item.credit || 0), 0);
  const paymentAmount = totalDebit || totalCredit;
  const fromAccount = rows.find((row) => row.from_account_name)?.from_account_name || "-";
  const toAccount = rows.find((row) => row.to_account_name)?.to_account_name || "-";

  if (loading) return <p className="p-5 text-center">Loading payment invoice...</p>;
  if (!invoice) return <p className="p-5 text-center text-danger">Payment invoice not found.</p>

  const entityName = invoice?.entity?.name || "N/A";
  const entityContact = invoice?.entity?.contact || "N/A";
  const entityAddress = invoice?.entity?.address || "N/A";

  return (
    <div className="invoice-container">
      <div id="payment-invoice-detail" className="invoice-box shadow-lg">
        <header className="invoice-header">
          <div className="company-info" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {user?.profile_image ? (
              <img
                src={getLogoUrl()}
                alt="Logo"
                style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover' }}
                crossOrigin="anonymous"
              />
            ) : (
              <div style={{ width: '80px', height: '80px', background: '#eee', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#888', border: '1px solid #ddd' }}>
                NO LOGO
              </div>
            )}
            <div>
              <p className="title text" style={{ textTransform: 'uppercase', fontWeight: 'bold', fontSize: '1.2rem', margin: 0 }}>
                {currentCompanyName}
              </p>
              <h4 className="subtitle">PAYMENT TRANSACTION INVOICE</h4>
            </div>
          </div>

          <div className="invoice-id">
            <p className="title">INVOICE NO.</p>
            <h1 className="id-number">#{invoice.invoice_no}</h1>
          </div>
        </header>

{/* PAYMENT SUMMARY */}
<section className="voucher-summary">

  <div className="voucher-card amount-card">
    <span>Total Payment Amount</span>
    <h2>
      Rs. {Number(paymentAmount).toLocaleString()}
    </h2>
  </div>

  <div className="voucher-card">
    <span>Paid From</span>
    <p>{fromAccount}</p>
  </div>

  <div className="voucher-card">
    <span>Paid To</span>
    <p>{toAccount}</p>
  </div>

</section>

{/* BENEFICIARY */}
<section className="invoice-details-section">
  <div className="details-row">

    <div className="billed-to">
      <p className="label">Beneficiary Details</p>

      <h5 className="customer-name">
        {entityName}
      </h5>

      <p className="customer-detail">
        {entityContact}
      </p>

      <p className="customer-detail">
        {entityAddress}
      </p>
    </div>

    <div className="invoice-dates">

      <div className="date-item">
        <p className="label">Transaction Date</p>
        <p className="value">
          {formatDate(invoice.transaction_date)}
        </p>
      </div>

      <div className="date-item">
        <p className="label">Created By</p>
        <p className="value">
          {invoice.created_by || "-"}
        </p>
      </div>

    </div>

  </div>
</section>

{/* PAYMENT DETAILS */}
<section className="payment-detail-box">

  <h5 className="section-title">
    Payment Details
  </h5>

  <table className="payment-table">
    <tbody>

      <tr>
        <td>Description</td>
        <td>{invoice.description || "-"}</td>
      </tr>

      {/* <tr>
        <td>Transaction Type</td>
        <td>{invoice.type || "-"}</td>
      </tr> */}

      <tr>
        <td>From Account</td>
        <td>{fromAccount}</td>
      </tr>

      <tr>
        <td>To Account</td>
        <td>{toAccount}</td>
      </tr>

      <tr className="amount-row">
        <td>Total Amount</td>
        <td>
          Rs. {Number(paymentAmount).toLocaleString()}
        </td>
      </tr>

    </tbody>
  </table>

</section>

        <footer className="invoice-footer">
         

          <div className="note-section">
            <p className="note">Thank you. This invoice represents the payment transaction</p>
            <div className="action-buttons-group no-print" style={{ display: "flex", gap: "10px", marginTop: "20px", justifyContent: "center" }}>
              <button onClick={() => navigate(-1)} className="back-button" style={{ padding: "10px 20px", cursor: "pointer" }}>
                ← Back
              </button>
              <button onClick={handleDownloadImage} className="download-img-button" style={{ padding: "10px 20px", backgroundColor: "#27ae60", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>
                🖼️ Save as Image
              </button>
              <button onClick={handleDownloadPDF} className="download-pdf-button" style={{ padding: "10px 20px", backgroundColor: "#2980b9", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>
                📄 Save as PDF
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default PaymentTransactionInvoice;
