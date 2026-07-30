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
import '../Invoice.css';

const LoaderDocumentView = ({ docType }) => {
  const { docNo } = useParams();
  const navigate = useNavigate();
  const printRef = useRef(null);

  const [documentData, setDocumentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);

  const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL || "http://localhost:5000";
  const user = JSON.parse(localStorage.getItem("user") || "{}");

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
    <div className="d-flex flex-column min-vh-100 bg-light">
      <NavigationBar />
      
      <div className="invoice-container flex-grow-1" style={{ marginTop: '80px', marginBottom: '40px' }}>
        <div 
          className="invoice-box shadow-sm bg-white p-4 p-md-5 mx-auto border rounded" 
          id="invoice-content" 
          ref={printRef}
          style={{ maxWidth: '850px' }}
        > 
          
          {/* Header Section */}
          <header className="d-flex justify-content-between align-items-center border-bottom pb-4 mb-4">
            <div className="d-flex align-items-center gap-3">
              {user?.profile_image ? (
                <img 
                  src={getLogoUrl()} 
                  alt="Company Logo" 
                  style={{ width: '70px', height: '70px', borderRadius: '8px', objectFit: 'cover' }} 
                  crossOrigin="anonymous" 
                />
              ) : (
                <div style={{ width: '70px', height: '70px', background: '#f8f9fa', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#6c757d', border: '1px solid #dee2e6' }}>
                  NO LOGO
                </div>
              )}
              <div>
                <h4 className="fw-bold mb-0 text-uppercase text-dark" style={{ letterSpacing: '0.5px' }}>
                  {currentCompanyName}
                </h4>
                <p className="text-muted fw-semibold small mb-0">{docHeading}</p>
              </div>
            </div>

            {/* Document ID & Date in Top Right */}
            <div className="text-end">
              <span className="badge bg-light text-primary border border-primary fs-6 px-3 py-2 fw-bold">
                #{master?.no || docNo}
              </span>
              <div className="mt-2">
                <span className="text-muted small d-block" style={{ fontSize: '11px', fontWeight: '600' }}>DATE ISSUED</span>
                <span className="fw-bold text-dark">{formatDate(master?.date)}</span>
              </div>
            </div>
          </header>

          {/* Details Section Side-by-Side Grid */}
          {/* Details Section Side-by-Side Grid */}
<section className="mb-4">
  <div style={{ display: 'flex', gap: '15px', alignItems: 'stretch' }}>
    
    {/* Customer / Supplier Details Box */}
    <div style={{ flex: '1', width: '50%' }}>
      <div className="p-3 bg-light rounded border h-100">
        <h6 className="text-uppercase text-secondary fw-bold small mb-3" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
          {docLabel} Details
        </h6>
        <div className="d-flex flex-column gap-2 small">
          <div>
            <span className="text-muted d-block" style={{ fontSize: '11px' }}>Name:</span>
            <strong className="text-dark fs-6">{master?.entity?.name || 'N/A'}</strong>
          </div>
          <div>
            <span className="text-muted d-block" style={{ fontSize: '11px' }}>Address:</span>
            <strong className="text-dark">{master?.entity?.address || 'N/A'}</strong>
          </div>
          <div>
            <span className="text-muted d-block" style={{ fontSize: '11px' }}>Contact:</span>
            <strong className="text-dark">{master?.entity?.contact || 'N/A'}</strong>
          </div>
        </div>
      </div>
    </div>

    {/* Transport Details Box */}
    <div style={{ flex: '1', width: '50%' }}>
      <div className="p-3 bg-light rounded border h-100">
        <h6 className="text-uppercase text-secondary fw-bold small mb-3" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
          Transport Details
        </h6>
        <div className="row g-2 small">
          <div className="col-6">
            <span className="text-muted d-block" style={{ fontSize: '11px' }}>Driver Name:</span>
            <strong className="text-dark">{master?.driver?.driver_name || 'N/A'}</strong>
          </div>
          <div className="col-6">
            <span className="text-muted d-block" style={{ fontSize: '11px' }}>Vehicle No:</span>
            <strong className="text-dark">{master?.vehicle_no || 'N/A'}</strong>
          </div>
          <div className="col-6 mt-2">
            <span className="text-muted d-block" style={{ fontSize: '11px' }}>Goods Name:</span>
            <strong className="text-dark">{master?.goods_name || 'N/A'}</strong>
          </div>
          <div className="col-6 mt-2">
            <span className="text-muted d-block" style={{ fontSize: '11px' }}>Bilti No:</span>
            <strong className="text-dark">{master?.bilti_no || 'N/A'}</strong>
          </div>
        </div>
      </div>
    </div>

  </div>
</section>
          {/* Table Section */}
          <section className="mb-5">
            <div className="table-responsive">
              <table className="table table-bordered align-middle mb-0" style={{ tableLayout: 'fixed' }}>
                <thead className="table-dark">
                  <tr>
                    <th style={{ width: '8%', textAlign: 'center' }}>SR</th>
                    <th style={{ width: '27%', textAlign: 'left' }}>MODEL</th>
                    <th style={{ width: '48%', textAlign: 'left' }}>DESCRIPTION</th>
                    <th style={{ width: '17%', textAlign: 'right' }}>QTY</th>
                  </tr>
                </thead>
                <tbody>
                  {detailRows.length > 0 ? (
                    <>
                      {detailRows.map((item, index) => (
                        <tr key={index}>
                          <td className="text-center">{index + 1}</td>
                          <td className="fw-semibold">{cleanMaterialLabel(item.material_name || item.rm_name || item.name || "-")}</td>
                          <td className="text-muted">{item.description || 'N/A'}</td>
                          <td className="text-end fw-bold">{parseFloat(item.quantity || 0)}</td>
                        </tr>
                      ))}
                      
                      <tr className="table-light fw-bold border-top border-2">
                        <td colSpan="3" className="text-end pe-3">TOTAL QTY:</td>
                        <td className="text-end text-primary fs-6">{totalQuantity}</td>
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

          {/* Signature & Stamp Section (Only 2 items: Left & Right) */}
          <section className="my-5 pt-4">
            <div className="d-flex justify-content-between align-items-end px-3">
              <div className="text-center" style={{ width: '220px' }}>
                <div className="border-top border-dark pt-2">
                  <p className="fw-semibold small text-muted mb-0">Prepared / Authorized Signature</p>
                </div>
              </div>

              <div className="text-center" style={{ width: '220px' }}>
                <div className="border-top border-dark pt-2">
                  <p className="fw-semibold small text-muted mb-0">Receiver Stamp & Signature</p>
                </div>
              </div>
            </div>
          </section>

          {/* Footer & Action Buttons */}
          <footer className="border-top pt-3 mt-4">
            <div className="text-center">
              <p className="text-muted small mb-0">
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