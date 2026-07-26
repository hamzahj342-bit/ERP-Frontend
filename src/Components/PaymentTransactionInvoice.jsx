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
        setInvoice(invoiceRes.data.invoice || invoiceRes.data);
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

  if (loading) return <p className="p-5 text-center">Loading payment invoice...</p>;
  if (!invoice && rows.length === 0) return <p className="p-5 text-center text-danger">Payment invoice not found.</p>;

  // Debit Row & Credit Row calculation
  const debitRow = rows.find((r) => Number(r.debit) > 0);
  const creditRow = rows.find((r) => Number(r.credit) > 0);
  const totalAmount = debitRow?.debit || creditRow?.credit || 0;

  const mainInvoiceNo = invoice?.invoice_no || invoiceNo;
  const transactionDate = invoice?.transaction_date || rows[0]?.transaction_date;
  const createdBy = invoice?.created_by || rows[0]?.created_by || "-";
  const description = invoice?.description || rows[0]?.description || "-";

  return (
    <div className="invoice-container">
      <div id="payment-invoice-detail" className="invoice-box shadow-lg">
        <header className="invoice-header">
          <div className="company-info" style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            {user?.profile_image ? (
              <img
                src={getLogoUrl()}
                alt="Logo"
                style={{ width: "80px", height: "80px", borderRadius: "8px", objectFit: "cover" }}
                crossOrigin="anonymous"
              />
            ) : (
              <div style={{ width: "80px", height: "80px", background: "#eee", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#888", border: "1px solid #ddd" }}>
                NO LOGO
              </div>
            )}
            <div>
              <p className="title text" style={{ textTransform: "uppercase", fontWeight: "bold", fontSize: "1.2rem", margin: 0 }}>
                {currentCompanyName}
              </p>
              <h4 className="subtitle">PAYMENT TRANSACTION VOUCHER</h4>
            </div>
          </div>

          <div className="invoice-id">
            <p className="title">VOUCHER NO.</p>
            <h1 className="id-number">#{mainInvoiceNo}</h1>
          </div>
        </header>

        {/* SUMMARY SECTION: TOTAL AMOUNT, DATE & CREATED BY SIDE-BY-SIDE */}
        <section className="voucher-summary" style={{ display: "flex", gap: "15px", flexWrap: "wrap", margin: "20px 0" }}>
          <div className="voucher-card amount-card" style={{ flex: 1, minWidth: "200px" }}>
            <span>Total Payment Amount</span>
            <h2>Rs. {Number(totalAmount).toLocaleString()}</h2>
          </div>

          <div className="voucher-card" style={{ flex: 1, minWidth: "150px" }}>
            <span>Transaction Date</span>
            <p style={{ fontSize: "1.1rem", fontWeight: "bold", margin: "5px 0 0" }}>{formatDate(transactionDate)}</p>
          </div>

          <div className="voucher-card" style={{ flex: 1, minWidth: "150px" }}>
            <span>Created By</span>
            <p style={{ fontSize: "1.1rem", fontWeight: "bold", margin: "5px 0 0" }}>{createdBy}</p>
          </div>
        </section>

        {/* TRANSACTION BREAKDOWN TABLE */}
        <section className="payment-detail-box">
          <h5 className="section-title">Journal Entries Breakdown</h5>

          <table className="payment-table" style={{ width: "100%", marginBottom: "15px", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8f9fa", textAlign: "left" }}>
                <th style={{ padding: "10px", borderBottom: "2px solid #dee2e6" }}>Account & Party Name</th>
                <th style={{ padding: "10px", borderBottom: "2px solid #dee2e6" }}>Description</th>
                <th style={{ padding: "10px", borderBottom: "2px solid #dee2e6", textAlign: "right" }}>Debit</th>
                <th style={{ padding: "10px", borderBottom: "2px solid #dee2e6", textAlign: "right" }}>Credit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                // Primary: Name, Fallback: Title or Cleaned ID Label
                const accName = row.account_name || row.account?.name || row.account_title || `Account ID: ${row.account_id}`;
                const partyName = row.entity_name || row.entity?.name || null;

                return (
                  <tr key={index}>
                    <td style={{ padding: "10px", borderBottom: "1px solid #eee" }}>
                      <strong style={{ fontSize: "0.95rem", color: "#2c3e50" }}>{accName}</strong>
                      {partyName && (
                        <span style={{ color: "#666", fontSize: "0.85rem", display: "block", marginTop: "2px" }}>
                          Party: {partyName}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "10px", borderBottom: "1px solid #eee" }}>{row.description || description}</td>
                    <td style={{ padding: "10px", borderBottom: "1px solid #eee", textAlign: "right" }}>
                      {Number(row.debit) > 0 ? `${Number(row.debit).toLocaleString()}` : "-"}
                    </td>
                    <td style={{ padding: "10px", borderBottom: "1px solid #eee", textAlign: "right" }}>
                      {Number(row.credit) > 0 ? `${Number(row.credit).toLocaleString()}` : "-"}
                    </td>
                  </tr>
                );
              })}
              <tr className="amount-row" style={{ fontWeight: "bold", background: "#fafafa" }}>
                <td colSpan="2" style={{ padding: "10px" }}>Total Amount</td>
                <td colSpan="2" style={{ padding: "10px", textAlign: "right" }}>
                  Rs. {Number(totalAmount).toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <footer className="invoice-footer">
          <div className="note-section">
            <p className="note">Thank you. This invoice represents the payment transaction entry.</p>
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