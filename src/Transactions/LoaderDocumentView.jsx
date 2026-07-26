import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx-js-style";
import { FaArrowLeft, FaFileExcel, FaFilePdf, FaImage } from "react-icons/fa";
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";
import api from "../../api";
import '../Invoice.css'; // Utilizing your custom invoice styles

const LoaderDocumentView = ({ docType }) => {
  const { docNo } = useParams();
  const navigate = useNavigate();
  const printRef = useRef(null);

  const [documentData, setDocumentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);

  const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL || "http://localhost:5000";
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const docTitle = docType === "GRN" ? "Goods Receive Note" : "Delivery Challan";
  const docLabel = docType === "GRN" ? "Supplier" : "Customer";
  const docHeading = docType === "GRN"
    ? "GOODS RECEIVE NOTE"
    : docType === "DC-FP"
      ? "DELIVERY CHALLAN - FINISHED PRODUCT"
      : "DELIVERY CHALLAN";

  const fetchDocument = async () => {
    try {
      setLoading(true);
      const [listRes, companiesRes] = await Promise.all([
        api.get("/loader-documents", { params: { type: docType, page: 1, limit: 500 } }),
        api.get("/companies")
      ]);

      const docs = Array.isArray(listRes.data?.data) ? listRes.data.data : [];
      const selectedDoc = docs.find((item) => item.no === docNo);

      if (!selectedDoc) {
        setDocumentData(null);
        return;
      }

      const detailRes = await api.get(`/loader-documents/${selectedDoc.id}`);
      const payload = detailRes.data?.data || detailRes.data || null;

      setCompanies(companiesRes.data || []);
      setDocumentData({ master: selectedDoc, payload });
    } catch (error) {
      console.error("Error loading document view:", error);
      toast.error("Unable to load document details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocument();
  }, [docNo, docType]);

  const getLogoUrl = () => {
    if (!user?.profile_image) return null;

    if (user.profile_image.startsWith("http")) {
      return user.profile_image;
    }

    const cleanFileName = user.profile_image.replace("uploads\\", "").replace("uploads/", "");
    return `${IMAGE_BASE_URL}/uploads/${cleanFileName}`.replace(/\\/g, "/");
  };

  const currentCompanyName =
    companies.find((company) => company.id === Number(user?.company_id))?.name ||
    "AK ELECTRICAL";

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const cleanMaterialLabel = (label = "") => String(label).replace(/\s*\(DC_FP\)$/, "").trim();

  const exportToExcel = () => {
    if (!documentData) return;

    const rows = [];
    rows.push([{ v: `${docHeading}`, s: { font: { bold: true, sz: 16 } } }, "", ""]);
    rows.push([{ v: `Document No: ${documentData.master?.no || docNo}`, s: { font: { bold: true } } }, "", ""]);
    rows.push([{ v: `Date: ${formatDate(documentData.master?.date)}`, s: { font: { italic: true } } }, "", ""]);
    rows.push([{ v: `${docLabel}: ${documentData.master?.entity?.name || "N/A"}`, s: { font: { italic: true } } }, "", ""]);
    rows.push([{ v: `Driver: ${documentData.master?.driver?.driver_name || "N/A"}` }, "", ""]);
    rows.push([{ v: `Vehicle: ${documentData.master?.vehicle_no || "N/A"}` }, "", ""]);
    rows.push([]);
    rows.push([
      { v: "Material Description", s: { fill: { fgColor: { rgb: "2C3E50" } }, font: { color: { rgb: "FFFFFF" }, bold: true }, alignment: { horizontal: "center" } } },
      { v: "Qty", s: { fill: { fgColor: { rgb: "2C3E50" } }, font: { color: { rgb: "FFFFFF" }, bold: true }, alignment: { horizontal: "center" } } },
      { v: "", s: { fill: { fgColor: { rgb: "2C3E50" } } } }
    ]);

    const detailRows = documentData.payload?.LoaderDocumentDetails || documentData.payload?.details || [];
    let excelTotalQty = 0;

    detailRows.forEach((item) => {
      const qty = parseFloat(item.quantity || 0);
      excelTotalQty += qty;
      rows.push([
        { v: cleanMaterialLabel(item.material_name || item.rm_name || item.name || "-") },
        { v: qty },
        ""
      ]);
    });

    rows.push([
      { v: "TOTAL QTY:", s: { font: { bold: true }, alignment: { horizontal: "right" } } },
      { v: excelTotalQty, s: { font: { bold: true } } },
      ""
    ]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 36 }, { wch: 16 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, docType);
    XLSX.writeFile(wb, `${docType}-${documentData.master?.no || docNo}.xlsx`);
  };

  const exportToPNG = async () => {
    if (!printRef.current) return;
    const canvas = await html2canvas(printRef.current, { useCORS: true, scale: 3, ignoreElements: (element) => element.classList.contains("no-print") });
    const link = document.createElement("a");
    link.download = `${docType}-${documentData?.master?.no || docNo}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const exportToPDF = () => {
    if (!printRef.current) return;
    html2canvas(printRef.current, { useCORS: true, scale: 2, ignoreElements: (element) => element.classList.contains("no-print") }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${docType}-${documentData?.master?.no || docNo}.pdf`);
    });
  };

  if (loading) return <p className="p-5 text-center">Loading document...</p>;
  if (!documentData) return <p className="p-5 text-center text-danger">Document not found or failed to load.</p>;

  const detailRows = documentData.payload?.LoaderDocumentDetails || documentData.payload?.details || [];
  const master = documentData.master;
  const totalQuantity = detailRows.reduce((sum, item) => sum + parseFloat(item.quantity || 0), 0);

  return (
    <div className="d-flex flex-column min-vh-100">
      <NavigationBar />
      
      <div className="invoice-container flex-grow-1" style={{ marginTop: '70px', marginBottom: '30px' }}>
        <div className="invoice-box shadow-lg" id="invoice-content" ref={printRef}> 
          
          <header className="invoice-header">
            <div className="company-info" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              {user?.profile_image ? (
                <img 
                  src={getLogoUrl()} 
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
                <p className="title text" style={{ textTransform: 'uppercase', fontWeight: 'bold', fontSize: '1.2rem', margin: 0 }}>
                  {currentCompanyName}
                </p>
                <h4 className="subtitle" style={{ margin: 0 }}>{docHeading}</h4>
              </div>
            </div>
            <div className="invoice-id">
              <h1 className="id-number" style={{ margin: 0 }}>#{master?.no || docNo}</h1>
            </div>
          </header>

          <section className="invoice-details-section my-4">
            <div className="details-row d-flex justify-content-between flex-wrap gap-3">
              <div className="billed-to" style={{ minWidth: '220px', flex: '1' }}>
                <p className="label text-muted mb-1" style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: '600' }}>Party Details</p>
                <h5 className="customer-name mb-1"><b>Name: </b>{master?.entity?.name || 'N/A'}</h5>
                <p className="customer-detail mb-1"><b>Address: </b>{master?.entity?.address || 'N/A'}</p>
                <p className="customer-detail mb-0"><b>Contact: </b>{master?.entity?.contact || 'N/A'}</p>
              </div>

              {/* Flexbox/Grid alignment fix for details */}
              <div className="invoice-dates d-flex flex-wrap gap-3 text-end" style={{ flex: '2', justifyContent: 'flex-end' }}>
                <div className="date-item" style={{ minWidth: '90px' }}>
                  <p className="label text-muted mb-1" style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '600' }}>Date Issued</p>
                  <p className="value fw-bold mb-0">{formatDate(master?.date)}</p>
                </div>
                <div className="date-item" style={{ minWidth: '90px' }}>
                  <p className="label text-muted mb-1" style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '600' }}>Driver Name</p>
                  <p className="value fw-bold mb-0">{master?.driver?.driver_name || 'N/A'}</p>
                </div>
                <div className="date-item" style={{ minWidth: '90px' }}>
                  <p className="label text-muted mb-1" style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '600' }}>Vehicle No.</p>
                  <p className="value fw-bold mb-0">{master?.vehicle_no || 'N/A'}</p>
                </div>
                <div className="date-item" style={{ minWidth: '90px' }}>
                  <p className="label text-muted mb-1" style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '600' }}>Goods Name</p>
                  <p className="value fw-bold mb-0">{master?.goods_name || 'N/A'}</p>
                </div>
                <div className="date-item" style={{ minWidth: '90px' }}>
                  <p className="label text-muted mb-1" style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '600' }}>Bilti No.</p>
                  <p className="value fw-bold mb-0">{master?.bilti_no || 'N/A'}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="item-table-section mt-4">
            <h5 className="section-title mb-3">Item Details</h5>
            <div className="table-responsive">
              <table className="item-table w-100" style={{ tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <th style={{ width: '8%', textAlign: 'left' }}>SR</th>
                    <th style={{ width: '22%', textAlign: 'left' }}>MODEL</th>
                    <th style={{ width: '55%', textAlign: 'left' }}>DESCRIPTION</th>
                    <th style={{ width: '15%', textAlign: 'right' }}>QTY</th>
                  </tr>
                </thead>
                <tbody>
                  {detailRows.length > 0 ? (
                    <>
                      {detailRows.map((item, index) => (
                        <tr key={index}>
                          <td style={{ textAlign: 'left' }}>{index + 1}</td>
                          <td style={{ textAlign: 'left' }}>{cleanMaterialLabel(item.material_name || item.rm_name || item.name || "-")}</td>
                          <td style={{ textAlign: 'left' }}>{item.description || 'N/A'}</td>
                          <td style={{ textAlign: 'right' }}>{parseFloat(item.quantity || 0)}</td>
                        </tr>
                      ))}
                      
                      <tr style={{ fontWeight: 'bold', borderTop: '2px solid #444', backgroundColor: '#f9f9f9' }}>
                        <td colSpan="3" style={{ textAlign: 'right', paddingRight: '15px' }}>TOTAL QTY:</td>
                        <td style={{ textAlign: 'right' }}>{totalQuantity}</td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td colSpan="4" className="text-center text-muted py-4">No details found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="invoice-footer mt-5">
            <div className="note-section" style={{ width: '100%' }}>
              <p className="note" style={{ textAlign: 'center' }}>
                Thank you. This is a computer-generated document.
              </p>
              
              <div className="action-buttons-group no-print d-flex justify-content-center align-items-center gap-2 mt-4">
                <button type="button" onClick={() => navigate(-1)} className="btn btn-outline-secondary d-flex align-items-center gap-1">
                  <FaArrowLeft /> Back
                </button>
                <button type="button" onClick={exportToExcel} className="download-button bg-excel">
                  <FaFileExcel />
                </button>
                <button type="button" onClick={exportToPNG} className="download-button bg-png">
                  <FaImage />
                </button>
                <button type="button" onClick={exportToPDF} className="download-button bg-pdf">
                  <FaFilePdf />
                </button>
              </div>
            </div>
          </footer>

        </div>
      </div>

      <Footer />
    </div>
  );
};

export default LoaderDocumentView;