import React, { useEffect, useState } from "react";
import "./List.css";
import axios from "axios";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";

const List = ({ url }) => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  // Edit Modal State
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    category: "",
    price: "",
    description: "",
    isAvailable: true
  });

  const categories = [
    "All",
    "Salad",
    "Rolls",
    "Deserts",
    "Sandwich",
    "Cake",
    "Pure Veg",
    "Pasta",
    "Noodles"
  ];

  const getImageUrl = (image) => {
    if (!image) return "";
    return (image.startsWith("http") || image.startsWith("data:") || image.startsWith("/src/"))
      ? image
      : `${url}/images/${image}`;
  };

  const fetchList = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${url}/api/menu`);
      if (response.data.success) {
        setList(response.data.data);
      } else {
        toast.error("Error fetching menu items");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  // Toggle item availability
  const toggleAvailability = async (item) => {
    try {
      const response = await axios.patch(`${url}/api/menu/${item._id}/availability`);
      if (response.data.success) {
        toast.success(response.data.message);
        setList((prev) =>
          prev.map((i) =>
            i._id === item._id ? { ...i, isAvailable: response.data.isAvailable } : i
          )
        );
      } else {
        toast.error("Failed to update availability");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating availability");
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setEditForm({
      name: item.name,
      category: item.category,
      price: item.price,
      description: item.description || "",
      isAvailable: item.isAvailable !== false
    });
  };

  // Save Edit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const payload = {
        name: editForm.name,
        category: editForm.category,
        price: Number(editForm.price),
        description: editForm.description,
        isAvailable: editForm.isAvailable
      };

      const res = await axios.put(`${url}/api/menu/${editingItem._id}`, payload);
      if (res.data.success) {
        toast.success("Dish updated successfully!");
        setEditingItem(null);
        fetchList();
      } else {
        toast.error(res.data.message || "Failed to update item");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update menu item");
    }
  };

  // Remove Food Item
  const removeFood = async (foodId) => {
    if (!window.confirm("Are you sure you want to remove this menu item?")) {
      return;
    }
    try {
      const response = await axios.delete(`${url}/api/menu/${foodId}`);
      if (response.data.success) {
        toast.success(response.data.message || "Food Removed");
        await fetchList();
      } else {
        toast.error("Error while removing food item");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error removing food item");
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  // Filter list
  const filteredList = list.filter((item) => {
    const matchesCat = categoryFilter === "All" || item.category === categoryFilter;
    const matchesSearch =
      !search.trim() ||
      item.name.toLowerCase().includes(search.trim().toLowerCase()) ||
      item.category.toLowerCase().includes(search.trim().toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="list add flex-col">
      <div className="menu-mgmt-top">
        <div>
          <h2>Menu Management</h2>
          <p style={{ margin: "2px 0", fontSize: "12px", color: "#64748b" }}>
            Manage dishes, pricing, and live availability for POS & online store
          </p>
        </div>
        <div className="menu-controls">
          <input
            type="text"
            className="menu-search-input"
            placeholder="Search menu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="menu-cat-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <Link to="/add" className="menu-add-nav-btn">
            + Add New Dish
          </Link>
        </div>
      </div>

      <div className="list-table">
        <div className="list-table-format title">
          <b>Image</b>
          <b>Name</b>
          <b>Category</b>
          <b>Price</b>
          <b>Availability</b>
          <b>Actions</b>
        </div>

        {loading ? (
          <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>
            Loading menu items...
          </div>
        ) : filteredList.length === 0 ? (
          <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>
            No matching items found.
          </div>
        ) : (
          filteredList.map((item, index) => {
            const isAvail = item.isAvailable !== false;
            return (
              <div key={item._id || index} className="list-table-format">
                <img src={getImageUrl(item.image)} alt={item.name} loading="lazy" />
                <div>
                  <b>{item.name}</b>
                  {item.description && (
                    <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0 0" }}>
                      {item.description.slice(0, 50)}...
                    </p>
                  )}
                </div>
                <p>{item.category}</p>
                <p>₹{item.price}</p>
                <div>
                  <button
                    type="button"
                    className={`switch-btn ${isAvail ? "available" : "out-of-stock"}`}
                    onClick={() => toggleAvailability(item)}
                    title="Click to toggle availability"
                  >
                    {isAvail ? "● Available" : "○ Out of Stock"}
                  </button>
                </div>
                <div className="action-buttons">
                  <button
                    type="button"
                    className="edit-btn"
                    onClick={() => handleOpenEdit(item)}
                    title="Edit dish details"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="delete-btn"
                    onClick={() => removeFood(item._id)}
                    title="Delete dish"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* EDIT MODAL */}
      {editingItem && (
        <div className="edit-modal-backdrop" onClick={() => setEditingItem(null)}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Menu Item</h3>
            <form onSubmit={handleSaveEdit}>
              <div className="edit-form-group">
                <label>Dish Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>

              <div className="edit-form-group">
                <label>Category</label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                >
                  {categories.filter((c) => c !== "All").map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="edit-form-group">
                <label>Price (₹)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={editForm.price}
                  onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                />
              </div>

              <div className="edit-form-group">
                <label>Description</label>
                <textarea
                  rows="3"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>

              <div className="edit-form-group" style={{ flexDirection: "row", alignItems: "center", gap: "8px" }}>
                <input
                  type="checkbox"
                  id="modal-avail"
                  checked={editForm.isAvailable}
                  onChange={(e) => setEditForm({ ...editForm, isAvailable: e.target.checked })}
                />
                <label htmlFor="modal-avail" style={{ margin: 0, cursor: "pointer" }}>
                  Item is Available (In Stock)
                </label>
              </div>

              <div className="edit-modal-actions">
                <button
                  type="button"
                  className="cancel-edit-btn"
                  onClick={() => setEditingItem(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="save-edit-btn">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default List;
