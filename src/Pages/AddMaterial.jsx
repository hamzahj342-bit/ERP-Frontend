import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaPlus } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2'; // 💡 SweetAlert2 Import
import NavigationBar from '../Components/NavigationBar';
import Footer from '../Components/Footer';
import api from "../../api"; 
import '../save-btn.css'

const AddMaterial = () => {
  const navigate = useNavigate();

  const [rawMaterial, setRawMaterial] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    uom_id: '',
    unit_quantity: '',
    material_category_id: '',
  });
  const [uoms, setUoms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showUomModal, setShowUomModal] = useState(false);
  const [newUomName, setNewUomName] = useState("");
  const [isAddingUom, setIsAddingUom] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);

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

  const fetchCategories = async () => {
    try {
      const res = await api.get('/material-categories');
      setCategories(res.data);
    } catch (err) { toast.error('Failed to fetch categories'); }
  };

  const openUomModal = () => {
    setNewUomName("");
    setShowUomModal(true);
  };

  const openCategoryModal = () => {
    setNewCategoryName("");
    setShowCategoryModal(true);
  };

  const closeUomModal = () => {
    setShowUomModal(false);
    setNewUomName("");
    setIsAddingUom(false);
  };

  const handleAddUom = async (e) => {
    e.preventDefault();
    if (!newUomName || !newUomName.trim()) return toast.error('UOM name required');
    setIsAddingUom(true);
    try {
      const payload = { name: newUomName.trim() };
      const res = await api.post('/uoms', payload);
      toast.success('UOM added');
      // refresh uoms and select the new one
      await fetchUoms();
      setFormData((f) => ({ ...f, uom_id: res.data.id }));
      closeUomModal();
    } catch (err) {
      console.error('Add UOM error', err);
      toast.error(err.response?.data?.error || 'Failed to add UOM');
      setIsAddingUom(false);
    }
  };

  const closeCategoryModal = () => {
    setShowCategoryModal(false);
    setNewCategoryName("");
    setIsAddingCategory(false);
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName || !newCategoryName.trim()) return toast.error('Category name required');
    setIsAddingCategory(true);
    try {
      const payload = { name: newCategoryName.trim() };
      const res = await api.post('/material-categories', payload);
      toast.success('Category added');
      await fetchCategories();
      setFormData((f) => ({ ...f, material_category_id: res.data.id }));
      closeCategoryModal();
    } catch (err) {
      console.error('Add Category error', err);
      toast.error(err.response?.data?.error || 'Failed to add Category');
      setIsAddingCategory(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
    fetchUoms();
    fetchCategories();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

   const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));


  // 3. Create new material (POST)
  const handleCreateMaterial = async (e) => {
    e.preventDefault();

     if (!user || !user.company_id) {
          toast.error("User session expired or Company not selected. Please login again.");
          return;
        }

    if (!formData.name || !formData.uom_id) {
      toast.error("Please fill all required fields!");
      return;
    }

    const selectedUom = uoms.find((u) => u.id == formData.uom_id)?.name;
    if (["Bag", "Drum", "Piece", "Bottle Piece", "Cap Piece"].includes(selectedUom) && !formData.unit_quantity) {
      toast.error("Please enter Unit Weight for this UOM!");
      return;
    }
       
    const payload = {
      ...formData,
      company_id: user.company_id,
      created_by: user ? user.id : null,
    };
    try {
      // api.post handles headers and JSON stringify automatically
      await api.post("/add-materials", payload);
      
      fetchMaterials(); 
      setFormData({ name: "", uom_id: "", unit_quantity: "", material_category_id: "" });
      toast.success("Raw Material Added Successfully!");
    } catch (error) {
      const msg = error.response?.data?.error || "Failed to add material!";
      toast.error(msg);
    }
  };

  
  return (
    <>
      <NavigationBar />
      <div className="page-container">
        <button
          className="back-btn"
          style={{ marginTop: '30px' }}
          onClick={() => navigate('/materials-list')}
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

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: '-30px' }}>
              <select
                className="form"
                name="uom_id"
                value={formData.uom_id}
                onChange={handleInputChange}
                required
                style={{ flex: 1 }}
              >
                <option value="">Select UOM</option>
                {uoms.map((uom) => (
                  <option key={uom.id} value={uom.id}>
                    {uom.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="add-btn"
                onClick={openUomModal}
                title="Add UOM"
                style={{
                  width: 46,
                  height: 46,
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 10,
                  marginTop: '8px'
                }}
              >
                <FaPlus />
              </button>
            </div>

            <div style={{ height: 8 }} />

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: '-50px'  }}>
              <select
                className="form"
                name="material_category_id"
                value={formData.material_category_id}
                onChange={handleInputChange}
                style={{ flex: 1 }}
              >
                <option value="">Select Material Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                type="button"
                className="add-btn"
                onClick={openCategoryModal}
                title="Add Category"
                style={{
                  width: 46,
                  height: 46,
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 10,
                  marginTop: '8px'
                }}
              >
                <FaPlus />
              </button>
            </div>

            {/* Conditional input for Bag, Drum, Piece */}
            {['Bag', 'Drum', 'Piece', 'Bottle Piece', 'Cap Piece'].includes(
              uoms.find((u) => u.id == formData.uom_id)?.name
            ) && (
              <input
                type="number"
                name="unit_quantity"
                placeholder="Enter Weight per unit"
                value={formData.unit_quantity}
                onChange={handleInputChange}
                required // Added required if conditional is true
              />
            )}

            <button className="save-btn" type="submit">
              Add Raw Material
            </button>
          </form>
          {/* UOM modal */}
          {showUomModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
              <div style={{ background: 'white', padding: 20, borderRadius: 8, width: 360 }}>
                <h4>Add UOM</h4>
                <form onSubmit={handleAddUom}>
                  <input
                    type="text"
                    value={newUomName}
                    onChange={(e) => setNewUomName(e.target.value)}
                    placeholder="e.g. kg, liter"
                    style={{ width: '100%', marginBottom: 10 }}
                    required
                  />
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary" onClick={closeUomModal}>Cancel</button>
                    <button type="submit" className="save-btn" disabled={isAddingUom}>{isAddingUom ? 'Adding...' : 'Add'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {showCategoryModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
              <div style={{ background: 'white', padding: 20, borderRadius: 8, width: 360 }}>
                <h4>Add Material Category</h4>
                <form onSubmit={handleAddCategory}>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g. Solvents, Fillers"
                    style={{ width: '100%', marginBottom: 10 }}
                    required
                  />
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary" onClick={closeCategoryModal}>Cancel</button>
                    <button type="submit" className="save-btn" disabled={isAddingCategory}>{isAddingCategory ? 'Adding...' : 'Add'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default AddMaterial;