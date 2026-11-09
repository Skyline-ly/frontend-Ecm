
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
import "./Subcategories.css";

const PAGE_SIZE = 10;


function getCategoryDocs(response) {
  const candidates = [
    response?.data?.data?.docs,
    response?.data?.docs,
    response?.data?.categories,
    response?.data?.data?.categories,
    response?.data?.data,
    response?.data,
    response?.categories,
    response?.docs,
    response,
  ];

  return candidates.find(Array.isArray) || [];
}


function getCategoryTotalPages(response) {
  return Number(
    response?.pagination?.totalPages ??
    response?.data?.pagination?.totalPages ??
    response?.data?.data?.totalPages ??
    response?.data?.totalPages ??
    1
  ) || 1;
}

export default function Subcategories() {
  const [subcategories, setSubcategories] = useState([]);
  const [parentCategories, setParentCategories] = useState([]);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [categoryFilter, setCategoryFilter] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busySubcategoryId, setBusySubcategoryId] = useState("");

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState(null);

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [image, setImage] = useState(null);

  const [reloadKey, setReloadKey] = useState(0);


  useEffect(() => {
    const controller = new AbortController();

    async function loadSubcategories() {
      setLoading(true);
      setError("");

      try {
        const categoryParams = new URLSearchParams({
          page: "1",
          limit: "100",
        });

        const listParams = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });

        if (search) {
          listParams.set("search", search);
        }

        if (categoryFilter) {
          listParams.set("category", categoryFilter);
        }

        const [categoryResponse, listResponse] = await Promise.all([
          apiRequest(
            `/api/categories?${categoryParams.toString()}`,
            { signal: controller.signal }
          ),

          apiRequest(
            `/api/subcategory?${listParams.toString()}`,
            { signal: controller.signal }
          ),
        ]);

        // Read category response.
        let allCategories = getCategoryDocs(categoryResponse);

        if (!Array.isArray(allCategories)) {
          throw new Error("Invalid category response.");
        }

        // Fetch remaining category pages if necessary.
        const categoryTotalPages =
          getCategoryTotalPages(categoryResponse);

        if (categoryTotalPages > 1) {
          const remainingPages = await Promise.all(
            Array.from(
              { length: categoryTotalPages - 1 },
              (_, index) =>
                apiRequest(
                  `/api/categories?page=${index + 2}&limit=100`,
                  { signal: controller.signal }
                )
            )
          );

          allCategories = allCategories.concat(
            ...remainingPages.map(getCategoryDocs)
          );
        }

        // Your backend returns subCategory at the top level.
        const subcategoryList = listResponse.subCategory;

        if (!Array.isArray(subcategoryList)) {
          throw new Error(
            "Invalid subcategory response. Check getSubcategory controller."
          );
        }

        if (!controller.signal.aborted) {
          setParentCategories(allCategories);
          setSubcategories(subcategoryList);

          setTotalDocs(Number(listResponse.count) || 0);

          setTotalPages(
            Math.max(
              1,
              Number(listResponse.pagination?.totalPages) || 1
            )
          );
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(
            requestError.message || "Unable to load subcategories."
          );

          setSubcategories([]);
          setParentCategories([]);
          setTotalDocs(0);
          setTotalPages(1);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadSubcategories();

    return () => controller.abort();
  }, [page, search, categoryFilter, reloadKey]);

  // Reset the form.
  const resetForm = () => {
    setFormOpen(false);
    setEditingSubcategory(null);
    setName("");
    setCategoryId("");
    setImage(null);
  };

  // Open create form.
  const startCreate = () => {
    setEditingSubcategory(null);
    setName("");
    setCategoryId("");
    setImage(null);

    setError("");
    setNotice("");

    setFormOpen(true);
  };

  // Open edit form.
  const startEdit = (subcategory) => {
    const parentId =
      typeof subcategory.category === "object"
        ? subcategory.category?._id
        : subcategory.category;

    setEditingSubcategory(subcategory);
    setName(subcategory.name || "");
    setCategoryId(parentId || "");
    setImage(null);

    setError("");
    setNotice("");

    setFormOpen(true);
  };

  // Search subcategories.
  const handleSearch = (event) => {
    event.preventDefault();

    setPage(1);
    setSearch(searchInput.trim());
  };

  // Filter by parent category.
  const handleCategoryFilter = (event) => {
    setPage(1);
    setCategoryFilter(event.target.value);
  };

  // Create or update a subcategory.
  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setNotice("");

    if (!name.trim()) {
      setError("Enter a subcategory name.");
      return;
    }

    if (!categoryId) {
      setError("Choose a parent category.");
      return;
    }

    if (!editingSubcategory && !image) {
      setError("Choose an image for the new subcategory.");
      return;
    }

    const body = new FormData();

    body.append("name", name.trim());
    body.append("category", categoryId);

    if (image) {
      body.append("image", image);
    }

    setSaving(true);

    try {
      const isEditing = Boolean(editingSubcategory);

      const path = isEditing
        ? `/api/subcategory/${editingSubcategory._id}/update`
        : "/api/subcategory/create";

      const response = await apiRequest(path, {
        method: isEditing ? "PUT" : "POST",
        body,
      });

      setNotice(
        response.message || "Subcategory saved successfully."
      );

      resetForm();

      setPage(1);
      setSearch("");
      setSearchInput("");
      setCategoryFilter("");

      setReloadKey((key) => key + 1);
    } catch (requestError) {
      setError(
        requestError.message || "Unable to save the subcategory."
      );
    } finally {
      setSaving(false);
    }
  };

  // Soft-delete a subcategory.
  const handleDelete = async (subcategory) => {
    const confirmed = window.confirm(
      `Deactivate the "${subcategory.name}" subcategory?`
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    setBusySubcategoryId(subcategory._id);

    try {
      const response = await apiRequest(
        `/api/subcategory/${subcategory._id}/delete`,
        {
          method: "DELETE",
        }
      );

      setNotice(
        response.message || "Subcategory deactivated successfully."
      );

      if (subcategories.length === 1 && page > 1) {
        setPage((currentPage) => currentPage - 1);
      } else {
        setReloadKey((key) => key + 1);
      }
    } catch (requestError) {
      setError(
        requestError.message || "Unable to deactivate the subcategory."
      );
    } finally {
      setBusySubcategoryId("");
    }
  };

  return (
    <div className="categories-page subcategories-page">

      {/* PAGE HEADING */}
      <header className="categories-heading">
        <div>
          <h1>Subcategories</h1>
          <p>
            Organize products within their parent categories.
          </p>
        </div>

        <button
          type="button"
          className="category-primary-button"
          onClick={startCreate}
        >
          <Plus size={18} />
          Add subcategory
        </button>
      </header>

      {/* ERROR MESSAGE */}
      {error && (
        <div className="category-message error" role="alert">
          <AlertCircle size={18} />

          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* SUCCESS MESSAGE */}
      {notice && (
        <div className="category-message success" role="status">
          <span>{notice}</span>

          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Dismiss message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* CREATE / EDIT FORM */}
      {formOpen && (
        <section className="category-form-panel">

          <div className="category-form-heading">
            <div>
              <h2>
                {editingSubcategory
                  ? "Edit subcategory"
                  : "Add subcategory"}
              </h2>

              <p>
                {editingSubcategory
                  ? "Change its name, parent category, or image."
                  : "Name, parent category, and image are required."}
              </p>
            </div>

            <button
              type="button"
              className="category-icon-button"
              onClick={resetForm}
              aria-label="Close subcategory form"
            >
              <X size={19} />
            </button>
          </div>

          <form
            className="category-form"
            onSubmit={handleSubmit}
          >

            {/* SUBCATEGORY NAME */}
            <label>
              Subcategory name

              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                maxLength={100}
                placeholder="e.g. Sofas"
                required
              />
            </label>

            {/* PARENT CATEGORY */}
            <label>
              Parent category

              <select
                value={categoryId}
                onChange={(event) =>
                  setCategoryId(event.target.value)
                }
                required
              >
                <option value="">
                  Select a category
                </option>

                {parentCategories.map((category) => (
                  <option
                    key={category._id}
                    value={category._id}
                  >
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            {/* IMAGE UPLOAD */}
            <label>
              Subcategory image{" "}
              {editingSubcategory ? "(optional)" : ""}

              <input
                type="file"
                accept="image/*"
                onChange={(event) =>
                  setImage(event.target.files?.[0] || null)
                }
                required={!editingSubcategory}
              />
            </label>

            {/* CURRENT IMAGE */}
            {editingSubcategory?.image?.url && !image && (
              <div className="category-current-image">
                <img
                  src={editingSubcategory.image.url}
                  alt={editingSubcategory.name || "Current subcategory"}
                />

                <span>Current image</span>
              </div>
            )}

            {/* SELECTED IMAGE */}
            {image && (
              <p className="category-file-name">
                <ImagePlus size={16} />
                {image.name}
              </p>
            )}

            {/* FORM BUTTONS */}
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
                disabled={saving || parentCategories.length === 0}
              >
                {saving
                  ? "Saving…"
                  : editingSubcategory
                    ? "Save changes"
                    : "Create subcategory"}
              </button>

            </div>
          </form>

          {parentCategories.length === 0 && !loading && (
            <p className="subcategory-no-categories">
              Create an active category before adding a subcategory.
            </p>
          )}
        </section>
      )}

      {/* SUBCATEGORY LIST */}
      <section className="category-list-panel">

        {/* TOOLBAR */}
        <div className="category-list-toolbar">

          <div>
            <h2>All subcategories</h2>

            <p>
              {totalDocs.toLocaleString()} active subcategories
            </p>
          </div>

          <div className="subcategory-filters">

            {/* CATEGORY FILTER */}
            <label className="subcategory-category-filter">
              <span>Category</span>

              <select
                value={categoryFilter}
                onChange={handleCategoryFilter}
              >
                <option value="">
                  All categories
                </option>

                {parentCategories.map((category) => (
                  <option
                    key={category._id}
                    value={category._id}
                  >
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            {/* SEARCH */}
            <form
              className="category-search"
              onSubmit={handleSearch}
            >
              <Search size={17} />

              <input
                type="search"
                value={searchInput}
                onChange={(event) =>
                  setSearchInput(event.target.value)
                }
                placeholder="Search subcategories"
                aria-label="Search subcategories"
              />

              <button type="submit">
                Search
              </button>
            </form>

          </div>
        </div>

        {/* TABLE */}
        <div className="category-table-wrap">
          <table className="category-table subcategory-table">

            <thead>
              <tr>
                <th>Subcategory</th>
                <th>Parent category</th>
                <th>Created</th>
                <th className="category-actions-heading">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>

              {/* LOADING */}
              {loading ? (
                <tr>
                  <td colSpan="4" className="category-empty">
                    Loading subcategories…
                  </td>
                </tr>
              ) : subcategories.length > 0 ? (

                /* DISPLAY SUBCATEGORIES */
                subcategories.map((subcategory) => (
                  <tr key={subcategory._id}>

                    {/* IMAGE AND NAME */}
                    <td>
                      <div className="category-name-cell">

                        {subcategory.image?.url ? (
                          <img
                            className="category-thumbnail"
                            src={subcategory.image.url}
                            alt={subcategory.name || ""}
                            loading="lazy"
                          />
                        ) : (
                          <div className="category-thumbnail category-image-placeholder">
                            <ImagePlus size={19} />
                          </div>
                        )}

                        <strong>
                          {subcategory.name}
                        </strong>

                      </div>
                    </td>

                    {/* PARENT CATEGORY */}
                    <td>
                      {typeof subcategory.category === "object"
                        ? subcategory.category?.name || "Category unavailable"
                        : parentCategories.find(
                            (category) =>
                              category._id === subcategory.category
                          )?.name || "Category unavailable"}
                    </td>

                    {/* CREATED DATE */}
                    <td>
                      {subcategory.createdAt
                        ? new Date(
                            subcategory.createdAt
                          ).toLocaleDateString()
                        : "—"}
                    </td>

                    {/* ACTIONS */}
                    <td>
                      <div className="category-row-actions">

                        {/* EDIT */}
                        <button
                          type="button"
                          className="category-icon-button"
                          onClick={() => startEdit(subcategory)}
                          aria-label={`Edit ${subcategory.name}`}
                        >
                          <Pencil size={17} />
                        </button>

                        {/* DELETE */}
                        <button
                          type="button"
                          className="category-icon-button delete"
                          onClick={() => handleDelete(subcategory)}
                          disabled={
                            busySubcategoryId === subcategory._id
                          }
                          aria-label={`Deactivate ${subcategory.name}`}
                        >
                          <Trash2 size={17} />
                        </button>

                      </div>
                    </td>

                  </tr>
                ))

              ) : (

                /* EMPTY STATE */
                <tr>
                  <td colSpan="4" className="category-empty">
                    {error
                      ? "Subcategories could not be loaded."
                      : search || categoryFilter
                        ? "No subcategories match these filters."
                        : "No subcategories have been created yet."}
                  </td>
                </tr>

              )}

            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <footer className="category-pagination">

          <span>
            Page {page} of {totalPages}
          </span>

          <div>

            <button
              type="button"
              className="category-secondary-button"
              onClick={() =>
                setPage((currentPage) => currentPage - 1)
              }
              disabled={loading || page <= 1}
            >
              <ChevronLeft size={17} />
              Previous
            </button>

            <button
              type="button"
              className="category-secondary-button"
              onClick={() =>
                setPage((currentPage) => currentPage + 1)
              }
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
