import { useEffect, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { apiRequest } from "../../lib/api";
import DateRangeFilter from "../../Component/shared/DateRangeFilter";
import "./Categories.css";
import "./Brands.css";

const PAGE_SIZE = 20;


async function fetchAllCategories(signal) {
  const firstResponse = await apiRequest(
    "/api/categories?page=1&limit=100",
    { signal }
  );

 
  const firstPage = firstResponse.data;

  const categories = Array.isArray(firstPage)
    ? firstPage
    : firstPage?.docs;

  if (!Array.isArray(categories)) {
    console.error("Category API response:", firstResponse);
    throw new Error("Invalid category API response. Check your category controller.");
  }

  const totalPages = Math.max(
    1,
    Number(
      firstResponse.pagination?.totalPages ??
      firstPage?.totalPages
    ) || 1
  );

  if (totalPages === 1) return categories;

  const otherPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      apiRequest(
        `/api/categories?page=${index + 2}&limit=100`,
        { signal }
      )
    )
  );

  return categories.concat(
    ...otherPages.map((response) => {
      const data = response.data;

      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.docs)) return data.docs;

      return [];
    })
  );
}


export default function Brands() {
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [filterSubcategories, setFilterSubcategories] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [subcategoryFilter, setSubcategoryFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyBrandId, setBusyBrandId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [image, setImage] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadBrands() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });
        if (search) params.set("search", search);
        if (categoryFilter) params.set("category", categoryFilter);
        if (subcategoryFilter) params.set("subCategory", subcategoryFilter);
        if (fromDate) params.set("fromDate", fromDate);
        if (toDate) params.set("toDate", toDate);

        const [brandResponse, allCategories] = await Promise.all([
          apiRequest(`/api/brand/admin/all?${params.toString()}`, {
            signal: controller.signal,
          }),
          fetchAllCategories(controller.signal),
        ]);
        // getAdminBrands returns: { data: [...brands], pagination: {...} }
        const brandData = brandResponse.data;

        if (!Array.isArray(brandData)) {
          throw new Error("The server returned an invalid brand list.");
        }

        if (!controller.signal.aborted) {
          setBrands(brandData);
          setCategories(allCategories);
          setTotalDocs(Number(brandResponse.pagination?.totalDocs) || 0);
          setTotalPages(
            Math.max(1, Number(brandResponse.pagination?.totalPages) || 1)
          );
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError.message || "Unable to load brands.");
          setBrands([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadBrands();
    return () => controller.abort();
  }, [page, search, categoryFilter, subcategoryFilter, fromDate, toDate, reloadKey]);

  const handleDateFilter = (startDate, endDate) => {
    setPage(1);
    setFromDate(startDate);
    setToDate(endDate);
  };

  useEffect(() => {
    if (!categoryId) {
      setSubcategories([]);
      return undefined;
    }

    const controller = new AbortController();
    async function loadSubcategories() {
      try {
        const params = new URLSearchParams({
          category: categoryId,
          page: "1",
          limit: "100",
        });
        const response = await apiRequest(
          `/api/subcategory?${params.toString()}`,
          { signal: controller.signal }
        );
        if (!Array.isArray(response.subCategory)) {
          throw new Error("The server returned an invalid subcategory list.");
        }

        let allSubcategories = response.subCategory;
        const totalSubcategoryPages = Number(response.pagination?.totalPages) || 1;
        if (totalSubcategoryPages > 1) {
          const otherPages = await Promise.all(
            Array.from({ length: totalSubcategoryPages - 1 }, (_, index) =>
              apiRequest(
                `/api/subcategory?category=${encodeURIComponent(categoryId)}&page=${index + 2}&limit=100`,
                { signal: controller.signal }
              )
            )
          );
          allSubcategories = allSubcategories.concat(
            ...otherPages.map((item) => item.subCategory || [])
          );
        }
        if (!controller.signal.aborted) setSubcategories(allSubcategories);
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setSubcategories([]);
          setError(requestError.message || "Unable to load subcategories.");
        }
      }
    }

    loadSubcategories();
    return () => controller.abort();
  }, [categoryId]);

  useEffect(() => {
    if (!categoryFilter) {
      setFilterSubcategories([]);
      return undefined;
    }

    const controller = new AbortController();
    async function loadFilterSubcategories() {
      try {
        const params = new URLSearchParams({
          category: categoryFilter,
          page: "1",
          limit: "100",
        });
        const response = await apiRequest(
          `/api/subcategory?${params.toString()}`,
          { signal: controller.signal }
        );
        if (!Array.isArray(response.subCategory)) {
          throw new Error("The server returned an invalid subcategory list.");
        }

        let allSubcategories = response.subCategory;
        const totalSubcategoryPages = Number(response.pagination?.totalPages) || 1;
        if (totalSubcategoryPages > 1) {
          const otherPages = await Promise.all(
            Array.from({ length: totalSubcategoryPages - 1 }, (_, index) =>
              apiRequest(
                `/api/subcategory?category=${encodeURIComponent(categoryFilter)}&page=${index + 2}&limit=100`,
                { signal: controller.signal }
              )
            )
          );
          allSubcategories = allSubcategories.concat(
            ...otherPages.map((item) => item.subCategory || [])
          );
        }
        if (!controller.signal.aborted) {
          setFilterSubcategories(allSubcategories);
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setFilterSubcategories([]);
          setError(requestError.message || "Unable to load subcategories.");
        }
      }
    }

    loadFilterSubcategories();
    return () => controller.abort();
  }, [categoryFilter]);

  const resetForm = () => {
    setFormOpen(false);
    setEditingBrand(null);
    setName("");
    setCategoryId("");
    setSubcategoryId("");
    setImage(null);
  };

  const startCreate = () => {
    setEditingBrand(null);
    setName("");
    setCategoryId("");
    setSubcategoryId("");
    setImage(null);
    setError("");
    setNotice("");
    setFormOpen(true);
  };

  const startEdit = (brand) => {
    setEditingBrand(brand);
    setName(brand.name || "");
    setCategoryId(brand.category?._id || "");
    setSubcategoryId(brand.subCategory?._id || "");
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

  const handleCategoryFilter = (event) => {
    setPage(1);
    setCategoryFilter(event.target.value);
    setSubcategoryFilter("");
  };

  const handleFormCategoryChange = (event) => {
    setCategoryId(event.target.value);
    setSubcategoryId("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!name.trim()) {
      setError("Enter a brand name.");
      return;
    }
    if (!categoryId || !subcategoryId) {
      setError("Choose both a category and subcategory.");
      return;
    }
    if (!editingBrand && !image) {
      setError("Choose an image for the new brand.");
      return;
    }

    const body = new FormData();
    body.append("name", name.trim());
    body.append("category", categoryId);
    body.append("subCategory", subcategoryId);
    if (image) body.append("image", image);

    setSaving(true);
    try {
      const isEditing = Boolean(editingBrand);
      const path = isEditing
        ? `/api/brand/${editingBrand._id}/update`
        : "/api/brand/create";
      const response = await apiRequest(path, {
        method: isEditing ? "PUT" : "POST",
        body,
      });

      setNotice(response.message || "Brand saved successfully.");
      resetForm();
      setPage(1);
      setSearch("");
      setSearchInput("");
      setCategoryFilter("");
      setSubcategoryFilter("");
      setReloadKey((key) => key + 1);
    } catch (requestError) {
      setError(requestError.message || "Unable to save the brand.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (brand) => {
    if (!window.confirm(`Deactivate the "${brand.name}" brand?`)) return;

    setError("");
    setNotice("");
    setBusyBrandId(brand._id);
    try {
      const response = await apiRequest(`/api/brand/${brand._id}/delete`, {
        method: "DELETE",
      });
      setNotice(response.message || "Brand deactivated successfully.");
      if (brands.length === 1 && page > 1) {
        setPage((currentPage) => currentPage - 1);
      } else {
        setReloadKey((key) => key + 1);
      }
    } catch (requestError) {
      setError(requestError.message || "Unable to deactivate the brand.");
    } finally {
      setBusyBrandId("");
    }
  };

  const handleRestore = async (brand) => {
    setError("");
    setNotice("");
    setBusyBrandId(brand._id);
    try {
      const response = await apiRequest(`/api/brand/${brand._id}/restore`, {
        method: "PATCH",
      });
      setNotice(response.message || "Brand restored successfully.");
      setReloadKey((key) => key + 1);
    } catch (requestError) {
      setError(requestError.message || "Unable to restore the brand.");
    } finally {
      setBusyBrandId("");
    }
  };

  const filteredSubcategories = subcategories.filter((subcategory) => {
    const parentId =
      typeof subcategory.category === "object"
        ? subcategory.category?._id
        : subcategory.category;
    return parentId === categoryId;
  });

  return (
    <div className="categories-page brands-page">
      <header className="categories-heading">
        <div>
          <h1>Brands</h1>
          <p>Manage brands and their category assignments.</p>
        </div>
        <button className="category-primary-button" onClick={startCreate}>
          <Plus size={18} />
          Add brand
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
              <h2>{editingBrand ? "Edit brand" : "Add brand"}</h2>
              <p>
                {editingBrand
                  ? "Change brand details or upload a replacement image."
                  : "Name, category, subcategory, and image are required."}
              </p>
            </div>
            <button
              type="button"
              className="category-icon-button"
              onClick={resetForm}
              aria-label="Close brand form"
            >
              <X size={19} />
            </button>
          </div>
          <form className="category-form" onSubmit={handleSubmit}>
            <label>
              Brand name
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
                placeholder="e.g. Northstar"
                required
              />
            </label>
            <label>
              Category
              <select
                value={categoryId}
                onChange={handleFormCategoryChange}
                required
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Subcategory
              <select
                value={subcategoryId}
                onChange={(event) => setSubcategoryId(event.target.value)}
                required
                disabled={!categoryId || filteredSubcategories.length === 0}
              >
                <option value="">
                  {categoryId
                    ? "Select a subcategory"
                    : "Select a category first"}
                </option>
                {filteredSubcategories.map((subcategory) => (
                  <option key={subcategory._id} value={subcategory._id}>
                    {subcategory.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Brand image {editingBrand ? "(optional)" : ""}
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setImage(event.target.files?.[0] || null)}
                required={!editingBrand}
              />
            </label>
            {editingBrand?.image?.url && !image && (
              <div className="category-current-image">
                <img src={editingBrand.image.url} alt="" />
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
                disabled={saving || categories.length === 0}
              >
                {saving
                  ? "Saving…"
                  : editingBrand
                    ? "Save changes"
                    : "Create brand"}
              </button>
            </div>
          </form>
          {categories.length === 0 && !loading && (
            <p className="brand-no-categories">
              Create an active category and subcategory before adding a brand.
            </p>
          )}
        </section>
      )}

      <section className="category-list-panel">
        <DateRangeFilter
          fromDate={fromDate}
          toDate={toDate}
          onApply={handleDateFilter}
        />
        <div className="category-list-toolbar">
          <div>
            <h2>All brands</h2>
            <p>{totalDocs.toLocaleString()} brands</p>
          </div>
          <div className="brand-filters">
            <label>
              <span>Category</span>
              <select value={categoryFilter} onChange={handleCategoryFilter}>
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            {categoryFilter && (
              <label>
                <span>Subcategory</span>
                <select
                  value={subcategoryFilter}
                  onChange={(event) => {
                    setPage(1);
                    setSubcategoryFilter(event.target.value);
                  }}
                >
                  <option value="">All subcategories</option>
                  {filterSubcategories
                    .filter((subcategory) => {
                      const parentId =
                        typeof subcategory.category === "object"
                          ? subcategory.category?._id
                          : subcategory.category;
                      return parentId === categoryFilter;
                    })
                    .map((subcategory) => (
                      <option key={subcategory._id} value={subcategory._id}>
                        {subcategory.name}
                      </option>
                    ))}
                </select>
              </label>
            )}
            <form className="category-search" onSubmit={handleSearch}>
              <Search size={17} />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search brands"
                aria-label="Search brands"
              />
              <button type="submit">Search</button>
            </form>
          </div>
        </div>

        <div className="category-table-wrap">
          <table className="category-table brand-table">
            <thead>
              <tr>
                <th>Brand</th>
                <th>Category</th>
                <th>Subcategory</th>
                <th>Status</th>
                <th>Created</th>
                <th className="category-actions-heading">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="category-empty">
                    Loading brands…
                  </td>
                </tr>
              ) : brands.length ? (
                brands.map((brand) => (
                  <tr key={brand._id}>
                    <td>
                      <div className="category-name-cell">
                        {brand.image?.url ? (
                          <img
                            className="category-thumbnail"
                            src={brand.image.url}
                            alt=""
                            loading="lazy"
                          />
                        ) : (
                          <div className="category-thumbnail category-image-placeholder">
                            <ImagePlus size={19} />
                          </div>
                        )}
                        <strong>{brand.name}</strong>
                      </div>
                    </td>
                    <td>{brand.category?.name || "Category unavailable"}</td>
                    <td>
                      {brand.subCategory?.name || "Subcategory unavailable"}
                    </td>
                    <td>
                      <span
                        className={`brand-status ${
                          brand.isActive ? "active" : "inactive"
                        }`}
                      >
                        {brand.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      {brand.createdAt
                        ? new Date(brand.createdAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td>
                      <div className="category-row-actions">
                        {brand.isActive && (
                          <>
                            <button
                              type="button"
                              className="category-icon-button"
                              onClick={() => startEdit(brand)}
                              aria-label={`Edit ${brand.name}`}
                            >
                              <Pencil size={17} />
                            </button>
                            <button
                              type="button"
                              className="category-icon-button delete"
                              onClick={() => handleDelete(brand)}
                              disabled={busyBrandId === brand._id}
                              aria-label={`Deactivate ${brand.name}`}
                            >
                              <Trash2 size={17} />
                            </button>
                          </>
                        )}
                        {!brand.isActive && (
                          <button
                            type="button"
                            className="category-icon-button"
                            onClick={() => handleRestore(brand)}
                            disabled={busyBrandId === brand._id}
                            aria-label={`Restore ${brand.name}`}
                          >
                            <RotateCcw size={17} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="category-empty">
                    {error
                      ? "Brands could not be loaded."
                      : search || categoryFilter || subcategoryFilter
                        ? "No brands match these filters."
                        : "No brands have been created yet."}
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
