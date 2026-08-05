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
    rows.push([{ v: `${docHeading}`, s: { font: { bold: true, sz: 14 } } }, "", ""]);
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

  // 🔥 Single Page Fit PDF Export Logic
  const exportToPDF = async () => {
    if (!printRef.current) return;
    
    const canvas = await html2canvas(printRef.current, { 
      useCORS: true, 
      scale: 2, 
      ignoreElements: (element) => element.classList.contains("no-print") 
    });
    
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    
    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
    
    let renderedWidth = pdfWidth;
    let renderedHeight = (canvas.height * pdfWidth) / canvas.width;

    // Direct Scaling down if total height exceeds single page limit (297mm)
    if (renderedHeight > pdfHeight) {
      renderedHeight = pdfHeight;
      renderedWidth = (canvas.width * pdfHeight) / canvas.height;
    }

    const xOffset = (pdfWidth - renderedWidth) / 2; // Horizontally center align if scaled

    pdf.addImage(imgData, "PNG", xOffset, 0, renderedWidth, renderedHeight);
    pdf.save(`${docType}-${documentData?.master?.no || docNo}.pdf`);
  };

  if (loading) return <p className="p-4 text-center small">Loading document...</p>;
  if (!documentData) return <p className="p-4 text-center text-danger small">Document not found or failed to load.</p>;

  const detailRows = documentData.payload?.LoaderDocumentDetails || documentData.payload?.details || [];
  const master = documentData.master;
  const totalQuantity = detailRows.reduce((sum, item) => sum + parseFloat(item.quantity || 0), 0);

  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      <NavigationBar />
      
      <div className="invoice-container flex-grow-1" style={{ marginTop: '20px', marginBottom: '20px' }}>
        <div 
          className="invoice-box shadow-sm bg-white p-3 mx-auto border rounded" 
          id="invoice-content" 
          ref={printRef}
          style={{ 
            width: '100%',
            maxWidth: '680px', 
            minHeight: '850px',
            fontSize: '9px', 
            color: '#2b2b2b',
            boxSizing: 'border-box'
          }}
        > 
          
          {/* Header Section */}
          <header className="d-flex justify-content-between align-items-center border-bottom pb-1 mb-2">
            <div className="d-flex align-items-center gap-2">
              {user?.profile_image ? (
                <img 
                  src={getLogoUrl()} 
                  alt="Company Logo" 
                  style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover' }} 
                  crossOrigin="anonymous" 
                />
              ) : (
                <div style={{ width: '32px', height: '32px', background: '#f8f9fa', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '6px', color: '#6c757d', border: '1px solid #dee2e6' }}>
                  NO LOGO
                </div>
              )}
              <div>
                <h6 className="fw-bold mb-0 text-uppercase text-dark" style={{ letterSpacing: '0.3px', fontSize: '11px', lineHeight: '1.1' }}>
                  {currentCompanyName}
                </h6>
                <p className="text-muted fw-semibold mb-0" style={{ fontSize: '8px', letterSpacing: '0.2px' }}>{docHeading}</p>
              </div>
            </div>

            {/* Document ID & Date in Top Right */}
            <div className="text-end">
              <span className="badge bg-light text-primary border border-primary px-2 py-0 fw-bold" style={{ fontSize: '9px' }}>
                #{master?.no || docNo}
              </span>
              <div className="mt-0">
                <span className="text-muted" style={{ fontSize: '7px', fontWeight: '600' }}>DATE: </span>
                <span className="fw-bold text-dark" style={{ fontSize: '8px' }}>{formatDate(master?.date)}</span>
              </div>
            </div>
          </header>

          {/* Details Section Side-by-Side Grid */}
          <section className="mb-2">
            <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
              
              {/* Customer / Supplier Details Box */}
              <div style={{ flex: '1', width: '50%' }}>
                <div className="p-1 px-2 bg-light rounded border h-100">
                  <div className="text-uppercase text-secondary fw-bold mb-1" style={{ fontSize: '7px', borderBottom: '1px solid #e0e0e0', paddingBottom: '1px' }}>
                    {docLabel} Details
                  </div>
                  <div className="d-flex flex-column gap-0">
                    <div className="d-flex gap-1 align-items-center">
                      <span className="text-muted" style={{ fontSize: '8px', width: '45px' }}>Name:</span>
                      <strong className="text-dark text-truncate" style={{ fontSize: '8px' }}>{master?.entity?.name || 'N/A'}</strong>
                    </div>
                    <div className="d-flex gap-1 align-items-center">
                      <span className="text-muted" style={{ fontSize: '8px', width: '45px' }}>Address:</span>
                      <span className="text-dark text-truncate" style={{ fontSize: '8px' }}>{master?.entity?.address || 'N/A'}</span>
                    </div>
                    <div className="d-flex gap-1 align-items-center">
                      <span className="text-muted" style={{ fontSize: '8px', width: '45px' }}>Contact:</span>
                      <span className="text-dark text-truncate" style={{ fontSize: '8px' }}>{master?.entity?.contact || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transport Details Box */}
              <div style={{ flex: '1', width: '50%' }}>
                <div className="p-1 px-2 bg-light rounded border h-100">
                  <div className="text-uppercase text-secondary fw-bold mb-1" style={{ fontSize: '7px', borderBottom: '1px solid #e0e0e0', paddingBottom: '1px' }}>
                    Transport Details
                  </div>
                  <div className="row g-0">
                    <div className="col-6 d-flex gap-1">
                      <span className="text-muted" style={{ fontSize: '8px' }}>Driver:</span>
                      <strong className="text-dark text-truncate" style={{ fontSize: '8px' }}>{master?.driver?.driver_name || 'N/A'}</strong>
                    </div>
                    <div className="col-6 d-flex gap-1">
                      <span className="text-muted" style={{ fontSize: '8px' }}>Vehicle:</span>
                      <strong className="text-dark text-truncate" style={{ fontSize: '8px' }}>{master?.vehicle_no || 'N/A'}</strong>
                    </div>
                    <div className="col-6 d-flex gap-1 mt-0">
                      <span className="text-muted" style={{ fontSize: '8px' }}>Goods:</span>
                      <span className="text-dark text-truncate" style={{ fontSize: '8px' }}>{master?.goods_name || 'N/A'}</span>
                    </div>
                    <div className="col-6 d-flex gap-1 mt-0">
                      <span className="text-muted" style={{ fontSize: '8px' }}>Bilti:</span>
                      <span className="text-dark text-truncate" style={{ fontSize: '8px' }}>{master?.bilti_no || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* Table Section */}
          <section className="mb-2">
            <div className="table-responsive">
              <table className="table table-bordered align-middle mb-0" style={{ tableLayout: 'fixed', fontSize: '8px' }}>
                <thead className="table-dark">
                  <tr>
                    <th style={{ width: '6%', textAlign: 'center', padding: '2px 4px' }}>SR</th>
                    <th style={{ width: '28%', textAlign: 'left', padding: '2px 4px' }}>MODEL</th>
                    <th style={{ width: '52%', textAlign: 'left', padding: '2px 4px' }}>DESCRIPTION</th>
                    <th style={{ width: '14%', textAlign: 'right', padding: '2px 4px' }}>QTY</th>
                  </tr>
                </thead>
                <tbody>
                  {detailRows.length > 0 ? (
                    <>
                      {detailRows.map((item, index) => (
                        <tr key={index} style={{ height: '18px' }}>
                          <td className="text-center" style={{ padding: '1px 4px' }}>{index + 1}</td>
                          <td className="fw-semibold text-truncate" style={{ padding: '1px 4px' }}>{cleanMaterialLabel(item.material_name || item.rm_name || item.name || "-")}</td>
                          <td className="text-muted text-truncate" style={{ padding: '1px 4px' }}>{item.description || 'N/A'}</td>
                          <td className="text-end fw-bold" style={{ padding: '1px 4px' }}>{parseFloat(item.quantity || 0)}</td>
                        </tr>
                      ))}
                      
                      <tr className="table-light fw-bold border-top border-2">
                        <td colSpan="3" className="text-end pe-2" style={{ padding: '2px 4px' }}>TOTAL QTY:</td>
                        <td className="text-end text-primary" style={{ padding: '2px 4px', fontSize: '9px' }}>{totalQuantity}</td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td colSpan="4" className="text-center text-muted py-2">No details found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Signature & Stamp Section */}
          <section className="mt-3 pt-1" style={{ pageBreakInside: 'avoid' }}>
            <div className="d-flex justify-content-between align-items-end px-2">
              <div className="text-center" style={{ width: '130px' }}>
                <div className="border-top border-dark pt-0">
                  <p className="fw-semibold text-muted mb-0" style={{ fontSize: '7px' }}>Prepared / Authorized Sign</p>
                </div>
              </div>

              <div className="text-center" style={{ width: '130px' }}>
                <div className="border-top border-dark pt-0">
                  <p className="fw-semibold text-muted mb-0" style={{ fontSize: '7px' }}>Receiver Stamp & Sign</p>
                </div>
              </div>
            </div>
          </section>

          {/* Footer & Action Buttons */}
          <footer className="border-top pt-1 mt-2" style={{ pageBreakInside: 'avoid' }}>
            <div className="text-center">
              <p className="text-muted mb-0" style={{ fontSize: '7px' }}>
                Thank you. This is a computer-generated document.
              </p>
              
              <div className="action-buttons-group no-print d-flex justify-content-center align-items-center gap-2 mt-2">
                <button type="button" onClick={() => navigate(-1)} className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1" style={{ fontSize: '8px', padding: '2px 6px' }}>
                  <FaArrowLeft /> Back
                </button>
                <button type="button" onClick={exportToExcel} className="download-btn bg-excel">
                  <FaFileExcel size={9} />
                </button>
                <button type="button" onClick={exportToPNG} className="download-btn bg-png">
                  <FaImage size={9} /> 
                </button>
                <button type="button" onClick={exportToPDF} className="download-btn bg-pdf">
                  <FaFilePdf size={9} />
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