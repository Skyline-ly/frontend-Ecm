import { useEffect, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { apiRequest } from "../../lib/api";
import "./Categories.css";

const PAGE_SIZE = 10;

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyCategoryId, setBusyCategoryId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [name, setName] = useState("");
  const [image, setImage] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCategories() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });
        if (search) params.set("search", search);

        const response = await apiRequest(
          `/api/categories?${params.toString()}`,
          { signal: controller.signal }
        );
        const result = response.data;

        if (!Array.isArray(result?.docs)) {
          throw new Error("The server returned an invalid category list.");
        }

        if (!controller.signal.aborted) {
          setCategories(result.docs);
          setTotalDocs(Number(result.totalDocs) || 0);
          setTotalPages(Math.max(1, Number(result.totalPages) || 1));
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError.message || "Unable to load categories.");
          setCategories([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadCategories();
    return () => controller.abort();
  }, [page, search, reloadKey]);

  const resetForm = () => {
    setFormOpen(false);
    setEditingCategory(null);
    setName("");
    setImage(null);
  };

  const startCreate = () => {
    setEditingCategory(null);
    setName("");
    setImage(null);
    setError("");
    setNotice("");
    setFormOpen(true);
  };

  const startEdit = (category) => {
    setEditingCategory(category);
    setName(category.name || "");
    setImage(null);
    setError("");
    setNotice("");
    setFormOpen(true);
  };

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!name.trim()) {
      setError("Enter a category name.");
      return;
    }

    if (!editingCategory && !image) {
      setError("Choose an image for the new category.");
      return;
    }

    const body = new FormData();
    body.append("name", name.trim());
    if (image) body.append("image", image);

    setSaving(true);
    try {
      const isEditing = Boolean(editingCategory);
      const path = isEditing
        ? `/api/categories/${editingCategory._id}/update`
        : "/api/categories/create";
      const response = await apiRequest(path, {
        method: isEditing ? "PUT" : "POST",
        body,
      });

      setNotice(response.message || "Category saved successfully.");
      resetForm();
      setPage(1);
      setSearch("");
      setSearchInput("");
      setReloadKey((key) => key + 1);
    } catch (requestError) {
      setError(requestError.message || "Unable to save the category.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category) => {
    if (!window.confirm(`Delete the "${category.name}" category?`)) return;

    setError("");
    setNotice("");
    setBusyCategoryId(category._id);
    try {
      const response = await apiRequest(
        `/api/categories/${category._id}/delete`,
        { method: "DELETE" }
      );
      setNotice(response.message || "Category deleted successfully.");
      if (categories.length === 1 && page > 1) {
        setPage((currentPage) => currentPage - 1);
      } else {
        setReloadKey((key) => key + 1);
      }
    } catch (requestError) {
      setError(requestError.message || "Unable to delete the category.");
    } finally {
      setBusyCategoryId("");
    }
  };

  return (
    <div className="categories-page">
      <header className="categories-heading">
        <div>
          <h1>Categories</h1>
          <p>Organize your products with marketplace categories.</p>
        </div>
        <button className="category-primary-button" onClick={startCreate}>
          <Plus size={18} />
          Add category
        </button>
      </header>

      {error && (
        <div className="category-message error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="Dismiss error">
            <X size={16} />
          </button>
        </div>
      )}
      {notice && (
        <div className="category-message success" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")} aria-label="Dismiss message">
            <X size={16} />
          </button>
        </div>
      )}

      {formOpen && (
        <section className="category-form-panel">
          <div className="category-form-heading">
            <div>
              <h2>{editingCategory ? "Edit category" : "Add category"}</h2>
              <p>
                {editingCategory
                  ? "Change the name or upload a replacement image."
                  : "A category name and image are required."}
              </p>
            </div>
            <button
              type="button"
              className="category-icon-button"
              onClick={resetForm}
              aria-label="Close category form"
            >
              <X size={19} />
            </button>
          </div>
          <form className="category-form" onSubmit={handleSubmit}>
            <label>
              Category name
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
                placeholder="e.g. Home and Living"
                required
              />
            </label>
            <label>
              Category image {editingCategory ? "(optional)" : ""}
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setImage(event.target.files?.[0] || null)}
                required={!editingCategory}
              />
            </label>
            {editingCategory?.image?.url && !image && (
              <div className="category-current-image">
                <img src={editingCategory.image.url} alt="" />
                <span>Current image</span>
              </div>
            )}
            {image && (
              <p className="category-file-name">
                <ImagePlus size={16} />
                {image.name}
              </p>
            )}
            <div className="category-form-actions">
              <button
                type="button"
                className="category-secondary-button"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="category-primary-button"
                disabled={saving}
              >
                {saving
                  ? "Saving…"
                  : editingCategory
                    ? "Save changes"
                    : "Create category"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="category-list-panel">
        <div className="category-list-toolbar">
          <div>
            <h2>All categories</h2>
            <p>{totalDocs.toLocaleString()} active categories</p>
          </div>
          <form className="category-search" onSubmit={handleSearch}>
            <Search size={17} />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search categories"
              aria-label="Search categories"
            />
            <button type="submit">Search</button>
          </form>
        </div>

        <div className="category-table-wrap">
          <table className="category-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Created</th>
                <th className="category-actions-heading">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="3" className="category-empty">
                    Loading categories…
                  </td>
                </tr>
              ) : categories.length ? (
                categories.map((category) => (
                  <tr key={category._id}>
                    <td>
                      <div className="category-name-cell">
                        {category.image?.url ? (
                          <img
                            className="category-thumbnail"
                            src={category.image.url}
                            alt=""
                            loading="lazy"
                          />
                        ) : (
                          <div className="category-thumbnail category-image-placeholder">
                            <ImagePlus size={19} />
                          </div>
                        )}
                        <strong>{category.name}</strong>
                      </div>
                    </td>
                    <td>
                      {category.createdAt
                        ? new Date(category.createdAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td>
                      <div className="category-row-actions">
                        <button
                          type="button"
                          className="category-icon-button"
                          onClick={() => startEdit(category)}
                          aria-label={`Edit ${category.name}`}
                        >
                          <Pencil size={17} />
                        </button>
                        <button
                          type="button"
                          className="category-icon-button delete"
                          onClick={() => handleDelete(category)}
                          disabled={busyCategoryId === category._id}
                          aria-label={`Delete ${category.name}`}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="category-empty">
                    {error
                      ? "Categories could not be loaded."
                      : search
                        ? "No categories match your search."
                        : "No categories have been created yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="category-pagination">
          <span>
            Page {page} of {totalPages}
          </span>
          <div>
            <button
              type="button"
              className="category-secondary-button"
              onClick={() => setPage((currentPage) => currentPage - 1)}
              disabled={loading || page <= 1}
            >
              <ChevronLeft size={17} />
              Previous
            </button>
            <button
              type="button"
              className="category-secondary-button"
              onClick={() => setPage((currentPage) => currentPage + 1)}
              disabled={loading || page >= totalPages}
            >
              Next
              <ChevronRight size={17} />
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
