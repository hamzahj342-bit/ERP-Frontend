import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import NavigationBar from '../Components/NavigationBar';
import Footer from '../Components/Footer';

const AddMaterial = () => {
  const navigate = useNavigate();

  const [rawMaterial, setRawMaterial] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    uom_id: '',
    unit_quantity: '',
  });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editData, setEditData] = useState({
    rm_id: null,
    name: '',
    uom_id: '',
    unit_quantity: '',
  });
  const [uoms, setUoms] = useState([]);

  // Fetch all materials
  const fetchMaterials = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/add-materials');
      const data = await res.json();
      if (Array.isArray(data)) setRawMaterial(data);
      else if (data && data.rows) setRawMaterial(data.rows);
      else setRawMaterial([]);
    } catch (error) {
      toast.error('Failed to fetch materials');
    }
  };

  // Fetch all UOMs
  const fetchUoms = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/uoms');
      const data = await res.json();
      setUoms(data);
    } catch (error) {
      toast.error('Failed to fetch UOMs');
    }
  };

  useEffect(() => {
    fetchMaterials();
    fetchUoms();
  }, []);

  // Handle input change
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle create new material
  const handleCreateMaterial = async (e) => {
  e.preventDefault();

  // Validation check before submitting
  if (!formData.name || !formData.uom_id) {
    toast.error("Please fill all required fields!");
    return;
  }

  // Check if UOM requires unit_quantity
  const selectedUom = uoms.find((u) => u.id == formData.uom_id)?.name;
  if (["Bag", "Drum", "Piece"].includes(selectedUom) && !formData.unit_quantity) {
    toast.error("Please enter Unit Quantity for this UOM!");
    return;
  }

  try {
    const res = await fetch("http://localhost:5000/api/add-materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      const newMaterial = await res.json();
      setRawMaterial([...rawMaterial, newMaterial]);
      setFormData({ name: "", uom_id: "", unit_quantity: "" });
      toast.success("Raw Material Added Successfully!");
    } else {
      toast.error("Failed to add material!");
    }
  } catch (error) {
    toast.error("Server error, please try again!");
    console.error(error);
  }
};

  // Handle delete
  const handleDelete = async (rm_id) => {
    try {
      await fetch(`http://localhost:5000/api/add-materials/${rm_id}`, {
        method: 'DELETE',
      });
      fetchMaterials();
      toast.success('Material deleted successfully!');
    } catch (error) {
      toast.error('Error deleting material');
    }
  };

  // Open edit modal
  const openEditModal = (material) => {
    setEditData({
      rm_id: material.rm_id,
      name: material.name,
      uom_id: material.uom_id,
      unit_quantity: material.unit_quantity || '',
    });
    setEditModalOpen(true);
  };

  const handleEditChange = (e) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  // Handle update
  const handleUpdateMaterial = async (e) => {
    e.preventDefault();

    const selectedUom = uoms.find((u) => u.id == editData.uom_id)?.name;

    // Validation
    if (['Bag', 'Drum', 'Piece'].includes(selectedUom) && !editData.unit_quantity) {
      toast.error('Please fill Unit Quantity for Bag, Drum, or Piece.');
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/add-materials/${editData.rm_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });

      if (res.ok) {
        const updatedMaterial = await res.json();
        setRawMaterial(
          rawMaterial.map((m) =>
            m.rm_id === updatedMaterial.rm_id ? updatedMaterial : m
          )
        );
        toast.success('Material updated successfully!');
        setEditModalOpen(false);
      } else {
        toast.error('Failed to update material');
      }
    } catch (error) {
      toast.error('Error updating material');
    }
  };

  return (
    <>
      <NavigationBar />
      <div className="page-container">
        <button
          className="back-btn"
          style={{ marginTop: '30px' }}
          onClick={() => navigate('/dashboard')}
        >
          <FaArrowLeft />
        </button>

        {/* Create Material */}
        <div className="card">
          <h2>Create Raw Material</h2>
          <form onSubmit={handleCreateMaterial} className="form">
            <input
              type="text"
              name="name"
              placeholder="Material Name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />

            <select
              className="form"
              name="uom_id"
              value={formData.uom_id}
              onChange={handleInputChange}
              required
            >
              <option value="">Select UOM</option>
              {uoms.map((uom) => (
                <option key={uom.id} value={uom.id}>
                  {uom.name}
                </option>
              ))}
            </select>

            {/* Conditional input for Bag, Drum, Piece */}
            {['Bag', 'Drum', 'Piece'].includes(
              uoms.find((u) => u.id == formData.uom_id)?.name
            ) && (
              <input
                type="number"
                name="unit_quantity"
                placeholder="Enter quantity per unit (e.g. 25 kg)"
                value={formData.unit_quantity}
                onChange={handleInputChange}
                
              />
            )}

            <button className="primary-btn" type="submit">
              Add Raw Material
            </button>
          </form>
        </div>

        {/* List */}
        <div className="card">
          <h2>Raw Material List</h2>
          <table className="product-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>UOM</th>
                <th>Unit Quantity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rawMaterial.map((m) => (
                <tr key={m.rm_id}>
                  <td>{m.rm_id}</td>
                  <td>{m.name}</td>
                  <td>{m.uom?.name}</td>
                  <td>{m.unit_quantity ? m.unit_quantity : '-'}</td>
                  <td>
                    <button
                      onClick={() => openEditModal(m)}
                      className="edit-btn"
                    >
                      Edit
                    </button>{' '}
                    <button
                      onClick={() => handleDelete(m.rm_id)}
                      className="delete-btn"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Edit Modal */}
        {editModalOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '10px',
                width: '300px',
              }}
            >
              <h3>Edit Raw Material</h3>
              <form
                onSubmit={handleUpdateMaterial}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <input
                className='input'
                  type="text"
                  name="name"
                  value={editData.name}
                  onChange={handleEditChange}
                  required
                />

                <select
                className='form'
                  name="uom_id"
                  value={editData.uom_id}
                  onChange={handleEditChange}
                  required
                >
                  <option value="">Select UOM</option>
                  {uoms.map((uom) => (
                    <option key={uom.id} value={uom.id}>
                      {uom.name}
                    </option>
                  ))}
                </select>

                {/* Conditional for edit modal */}
                {['Bag', 'Drum', 'Piece'].includes(
                  uoms.find((u) => u.id == editData.uom_id)?.name
                ) && (
                  <input
                  className='input'
                    type="number"
                    name="unit_quantity"
                    placeholder="Enter quantity per unit (e.g. 25 kg)"
                    value={editData.unit_quantity}
                    onChange={handleEditChange}
                    required
                  />
                )}

                <button type="submit" className="primary-btn">
                  Update
                </button>
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="primary-btn"
                >
                  Cancel
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
};

export default AddMaterial;
