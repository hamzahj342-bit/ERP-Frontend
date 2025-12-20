import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2'; // 💡 SweetAlert2 Import
import NavigationBar from '../Components/NavigationBar';
import Footer from '../Components/Footer';
import api from "../../api"; 

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

  // 1. Fetch all materials (GET)
  const fetchMaterials = async () => {
    try {
      const res = await api.get('/add-materials');
      const data = res.data;
      // Aapki original data structure logic
      const materials = Array.isArray(data) ? data : (data && data.rows) ? data.rows : [];
      setRawMaterial(materials);
    } catch (error) {
      toast.error('Failed to fetch materials');
    }
  };

  // 2. Fetch all UOMs (GET)
  const fetchUoms = async () => {
    try {
      const res = await api.get('/uoms');
      setUoms(res.data);
    } catch (error) {
      toast.error('Failed to fetch UOMs');
    }
  };

  useEffect(() => {
    fetchMaterials();
    fetchUoms();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 3. Create new material (POST)
  const handleCreateMaterial = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.uom_id) {
      toast.error("Please fill all required fields!");
      return;
    }

    const selectedUom = uoms.find((u) => u.id == formData.uom_id)?.name;
    if (["Bag", "Drum", "Piece"].includes(selectedUom) && !formData.unit_quantity) {
      toast.error("Please enter Unit Quantity for this UOM!");
      return;
    }

    try {
      // api.post handles headers and JSON stringify automatically
      await api.post("/add-materials", formData);
      
      fetchMaterials(); 
      setFormData({ name: "", uom_id: "", unit_quantity: "" });
      toast.success("Raw Material Added Successfully!");
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to add material!";
      toast.error(msg);
    }
  };

  // 4. Delete with SweetAlert2 (DELETE)
  const handleDelete = async (rm_id, name) => {
    Swal.fire({
        title: `Are you sure?`,
        text: `Do you want to delete material: ${name}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await api.delete(`/add-materials/${rm_id}`);
                Swal.fire('Deleted!', `Material ${name} has been deleted.`, 'success');
                fetchMaterials();
            } catch (error) {
                Swal.fire('Error!', 'Failed to delete material.', 'error');
            }
        }
    });
  };

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

  // 5. Update material (PUT)
  const handleUpdateMaterial = async (e) => {
    e.preventDefault();

    const selectedUom = uoms.find((u) => u.id == editData.uom_id)?.name;
    if (['Bag', 'Drum', 'Piece'].includes(selectedUom) && !editData.unit_quantity) {
      toast.error('Please fill Unit Quantity for Bag, Drum, or Piece.');
      return;
    }

    try {
      await api.put(`/add-materials/${editData.rm_id}`, editData);

      Swal.fire({
          icon: 'success',
          title: 'Updated!',
          text: `Material ${editData.name} has been updated.`,
          showConfirmButton: false,
          timer: 1500
      });
      fetchMaterials(); 
      setEditModalOpen(false);
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
                required // Added required if conditional is true
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
                <th>Unit Weight</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rawMaterial.map((m) => (
                <tr key={m.rm_id}>
                  <td>{m.rm_id}</td>
                  <td>{m.name}</td>
                  <td>{m.uom?.name}</td>
                  <td>{parseFloat(m.unit_quantity ? m.unit_quantity : '-')}</td>
                  <td>
                    <button
                      onClick={() => openEditModal(m)}
                      className="edit-btn"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(m.rm_id, m.name)} 
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
              zIndex: 1000 // Ensure modal is on top
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