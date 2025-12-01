import React from "react";
import "../Pagination.css";

const Pagination = ({ page, totalPages, onPageChange }) => {
  const pages = [];

  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }

  return (
    <div className="pagination-container">

      {/* Prev Button */}
      <button
        className="page-btn circle"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
      >
        ‹
      </button>

      {/* Page Numbers */}
      {pages.map((num) => (
        <button
          key={num}
          className={`page-btn circle ${page === num ? "active" : ""}`}
          onClick={() => onPageChange(num)}
        >
          {num}
        </button>
      ))}

      {/* Next Button */}
      <button
        className="page-btn circle"
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        ›
      </button>
    </div>
  );
};

export default Pagination;
