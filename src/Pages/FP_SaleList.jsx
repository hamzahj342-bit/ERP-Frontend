import React, { useState, useEffect } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import '../RMForm.css';
import Footer from '../Components/Footer';
import Pagination from '../Components/Pagination';
import api from '../../api';

const FP_SaleList = () => {
  const [sales, setSales] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const limit = 50;
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSales = async () => {
      try {
        // Query parameters ko 'params' object mein bhej rahe hain
        const res = await api.get("/fp-sale", {
          params: {
            type: "Sale",
            page: page,
            limit: limit
          }
        });

        const data = res.data;
        console.log("FG Sale API Response:", data);

        if (data.data) {
          setSales(data.data);
          setTotalPages(data.totalPages);
        } else {
          setSales([]);
        }
      } catch (error) {
        console.error("Error fetching FG sales:", error);
        setSales([]);
      }
    };

    fetchSales();
  }, [page]);

  const handleViewDetails = (invoiceNo) => {
    navigate(`/fp-invoice-detail/${invoiceNo}`);
  };
  
  return (
    <>
      <NavigationBar />

      <div className="rm-page">
        <button
          className="back-btn"
          style={{ marginTop: "30px" }}
          onClick={() => navigate('/fp-transactions')}
        >
          <FaArrowLeft />
        </button>

        <div className="card">
          <button
            className="add-sale-btn"
            onClick={() => navigate('/fp-sale-form')}
          >
            Add New
          </button>

          <h3>Finished Goods Sales List</h3>

          <table className="product-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Invoice No</th>
                <th>Transaction Date</th>
                <th>Customer</th>
                <th>Grand Total (Rs)</th>
                <th>Created By</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {sales.length > 0 ? (
                sales.map((sale) => (
                  <tr key={sale.id}>
                    <td>{sale.id}</td>
                    <td>{sale.invoice_no}</td>
                    <td>
                      {sale.createdat
                        ? new Date(sale.createdat).toLocaleDateString()
                        : ""}
                    </td>
                    <td>{sale.customer?.name || sale.entity_name || "N/A"}</td>
                    <td>{parseFloat(sale.grand_total) || "-"}</td>
                    <td>{sale.createdby || "—"}</td>
                    <td>
                      <button 
                        onClick={() => handleViewDetails(sale.invoice_no)} 
                        className="primary-btn"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center" }}>
                    No Finished Goods Sales transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* SAME PAGINATION AS RM PURCHASE */}
          <div style={{ marginTop: "25px" }}>
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={(newPage) => setPage(newPage)}
            />
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default FP_SaleList;
