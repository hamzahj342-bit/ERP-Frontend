import React, { useState, useEffect } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import '../RMForm.css';
import Footer from '../Components/Footer';
import Pagination from '../Components/Pagination';
import api from '../../api'

const RM_Return = () => {
  const [returns, setReturns] = useState([]); // master records
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // ✅ Fetch Return Master Data using standardized api.js
  useEffect(() => {
    const fetchReturns = async () => {
      setLoading(true);
      try {
        // Query parameters ko params object mein pass kiya gaya hai
        const res = await api.get("/rm-transactions", {
          params: {
            type: "Return",
            page: page,
            limit: 50
          }
        });
        
        const data = res.data;
        console.log("Return API Response:", data);

        if (data && Array.isArray(data.data)) {
          setReturns(data.data);
          setTotalPages(data.totalPages || 1); 
        } else {
          setReturns([]);
          setTotalPages(1);
        }
      } catch (error) {
        console.error("Error fetching RM Returns:", error);
        setReturns([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };
    
    fetchReturns();
  }, [page]);

  const handleViewDetails = (invoiceNo) => {
    navigate(`/rm-invoice/${invoiceNo}`); 
  };
    
  return (
    <>
      <NavigationBar />
      <div className="rm-page">
        <button
          className="back-btn"
          style={{ marginTop: "30px" }}
          onClick={() => navigate('/rm-transactions')}
        >
          <FaArrowLeft />
        </button>

        {/* Table */}
        <div className="card">
          <button
            className="add-cust-sup"
            onClick={() => navigate('/rm-return-form')}
          >
            Add New
          </button>
          <h3>Raw Material Returns</h3>
          
          {loading ? (
            <p>Loading returns data...</p>
          ) : returns.length === 0 ? (
            <p>No Raw Material Return records found.</p>
          ) : (
             <table className="product-table">
               <thead>
                 <tr>
                   <th>ID</th>
                   <th>Invoice No</th>
                   <th>Transaction Date</th>
                   <th>Created By</th>
                   <th>Supplier</th>
                   <th>Grand Total</th>
                   <th>Action</th>
                 </tr>
               </thead>
               <tbody>
                 {returns.map((ret) => (
                   <tr key={ret.master_id}>
                     <td>{ret.master_id}</td>
                     <td>{ret.invoice_no}</td>
                     {/* Display Date safely */}
                     <td>{ret.createdat ? new Date(ret.createdat).toLocaleDateString() : "N/A"}</td>
                     <td>{ret.createdby}</td>
                     <td>{ret.entity_name}</td>
                     {/* Display Grand Total formatted */}
                     <td>{parseFloat(ret.grand_total)?.toFixed(2) ?? "-"}</td>
                     <td>
                         <button 
                             onClick={() => handleViewDetails(ret.invoice_no)} 
                             className="primary-btn"
                         >
                             View Details
                         </button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          )}
         
          <div>
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

export default RM_Return;