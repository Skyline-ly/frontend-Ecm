import { useEffect, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { apiRequest } from "../../lib/api";
import DateRangeFilter from "../../Component/shared/DateRangeFilter";
import "./Attributes.css";

const PAGE_SIZE = 20;

const inputTypes = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "select", label: "Select" },
  { value: "multiselect", label: "Multi-select" },
  { value: "boolean", label: "Yes / No" },
];

const activeFilters = [
  { value: "", label: "All statuses" },
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

function getSubcategoryId(value) {
  return typeof value === "object" ? value?._id : value;
}

async function fetchAllSubcategories(signal) {
  const firstResponse = await apiRequest(
    "/api/subcategory?page=1&limit=100",
    { signal }
  );
  if (!Array.isArray(firstResponse.subCategory)) {
    throw new Error("The server returned an invalid subcategory list.");
  }

  const totalPages = Math.max(
    1,
    Number(firstResponse.pagination?.totalPages) || 1
  );
  if (totalPages === 1) return firstResponse.subCategory;

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      apiRequest(`/api/subcategory?page=${index + 2}&limit=100`, { signal })
    )
  );

  for (const response of remainingPages) {
    if (!Array.isArray(response.subCategory)) {
      throw new Error("The server returned an invalid subcategory list.");
    }
  }

  return firstResponse.subCategory.concat(
    ...remainingPages.map((response) => response.subCategory)
  );
}

export default function Attributes() {
  const [attributes, setAttributes] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(true);
  const [subcategoryFilter, setSubcategoryFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyAttributeId, setBusyAttributeId] = useState("");
  const [error, setError] = useState("");
  const [subcategoryError, setSubcategoryError] = useState("");
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState(null);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [inputType, setInputType] = useState("text");
  const [optionsText, setOptionsText] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [isFilterable, setIsFilterable] = useState(false);
  const [isVariant, setIsVariant] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchAllSubcategories(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setSubcategories(result);
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) {
          setSubcategoryError(
            requestError.message || "Unable to load subcategories."
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setSubcategoriesLoading(false);
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAttributes() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });
        if (subcategoryFilter) params.set("subCategory", subcategoryFilter);
        if (activeFilter) params.set("isActive", activeFilter);
        if (fromDate) params.set("fromDate", fromDate);
        if (toDate) params.set("toDate", toDate);

        const response = await apiRequest(
          `/api/attribute?${params.toString()}`,
          { signal: controller.signal }
        );
        if (!Array.isArray(response.data)) {
          throw new Error("The server returned an invalid attribute list.");
        }

        if (!controller.signal.aborted) {
          setAttributes(response.data);
          setTotalDocs(Number(response.pagination?.totalDocs) || 0);
          setTotalPages(
            Math.max(1, Number(response.pagination?.totalPages) || 1)
          );
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError.message || "Unable to load attributes.");
          setAttributes([]);
          setTotalDocs(0);
          setTotalPages(1);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadAttributes();
    return () => controller.abort();
  }, [page, subcategoryFilter, activeFilter, fromDate, toDate, reloadKey]);

  const handleDateFilter = (startDate, endDate) => {
    setPage(1);
    setFromDate(startDate);
    setToDate(endDate);
  };

  const resetForm = () => {
    setFormOpen(false);
    setEditingAttribute(null);
    setName("");
    setKey("");
    setSubCategory("");
    setInputType("text");
    setOptionsText("");
    setIsRequired(false);
    setIsFilterable(false);
    setIsVariant(false);
  };

  const startCreate = () => {
    resetForm();
    setError("");
    setNotice("");
    setFormOpen(true);
  };

  const startEdit = (attribute) => {
    setEditingAttribute(attribute);
    setName(attribute.name || "");
    setKey(attribute.key || "");
    setSubCategory(getSubcategoryId(attribute.subCategory) || "");
    setInputType(attribute.inputType || "text");
    setOptionsText(Array.isArray(attribute.options) ? attribute.options.join("\n") : "");
    setIsRequired(Boolean(attribute.isRequired));
    setIsFilterable(Boolean(attribute.isFilterable));
    setIsVariant(Boolean(attribute.isVariant));
    setError("");
    setNotice("");
    setFormOpen(true);
  };

  const handleFilterChange = (setter) => (event) => {
    setPage(1);
    setter(event.target.value);
    setNotice("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    const normalizedName = name.trim();
    const normalizedKey = key.trim().toLowerCase();
    const options = optionsText
      .split("\n")
      .map((option) => option.trim())
      .filter(Boolean);

    if (!normalizedName) {
      setError("Enter an attribute name.");
      return;
    }
    if (!/^[a-z][a-z0-9_]*$/.test(normalizedKey)) {
      setError("Key must start with a letter and contain only letters, numbers, or underscores.");
      return;
    }
    if (!subCategory) {
      setError("Choose a subcategory.");
      return;
    }
    if (["select", "multiselect"].includes(inputType) && options.length === 0) {
      setError("Add at least one option for select attributes.");
      return;
    }

    const body = {
      name: normalizedName,
      key: normalizedKey,
      subCategory,
      inputType,
      options,
      isRequired,
      isFilterable,
      isVariant,
    };

    setSaving(true);
    try {
      const isEditing = Boolean(editingAttribute);
      const response = await apiRequest(
        isEditing ? `/api/attribute/${editingAttribute._id}` : "/api/attribute",
        {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      setNotice(response.message || "Attribute saved successfully.");
      resetForm();
      setPage(1);
      setReloadKey((currentKey) => currentKey + 1);
    } catch (requestError) {
      setError(requestError.message || "Unable to save the attribute.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (attribute) => {
    if (!window.confirm(`Deactivate the "${attribute.name}" attribute?`)) return;

    setError("");
    setNotice("");
    setBusyAttributeId(attribute._id);
    try {
      const response = await apiRequest(`/api/attribute/${attribute._id}`, {
        method: "DELETE",
      });
      setNotice(response.message || "Attribute deactivated successfully.");
      if (attributes.length === 1 && page > 1) {
        setPage((currentPage) => currentPage - 1);
      } else {
        setReloadKey((currentKey) => currentKey + 1);
      }
    } catch (requestError) {
      setError(requestError.message || "Unable to deactivate this attribute.");
    } finally {
      setBusyAttributeId("");
    }
  };

  const supportsOptions = ["select", "multiselect"].includes(inputType);

  return (
    <section className="attributes-admin">
      <header className="attributes-heading">
        <div>
          <h1>Attributes</h1>
          <p>Define product details and filters for each subcategory.</p>
          {!subcategoriesLoading && !subcategoryError && subcategories.length === 0 && (
            <p className="attributes-subcategory-hint">
              Create an active subcategory before adding attributes.
            </p>
          )}
        </div>
        <button
          className="attributes-primary-button"
          type="button"
          onClick={startCreate}
          disabled={subcategoriesLoading || subcategories.length === 0}
        >
          <Plus size={18} />
          Add attribute
        </button>
      </header>

      {error && (
        <div className="attributes-message error" role="alert">
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
      {subcategoryError && (
        <div className="attributes-message error" role="alert">
          <AlertCircle size={18} />
          <span>{subcategoryError}</span>
          <button
            type="button"
            onClick={() => setSubcategoryError("")}
            aria-label="Dismiss subcategory error"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {notice && (
        <div className="attributes-message success" role="status">
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

      {formOpen && (
        <section className="attributes-form-panel">
          <div className="attributes-form-heading">
            <div>
              <h2>{editingAttribute ? "Edit attribute" : "Add attribute"}</h2>
              <p>
                Set the product field, its input type, and how it is used.
              </p>
            </div>
            <button
              type="button"
              className="attributes-icon-button"
              onClick={resetForm}
              disabled={saving}
              aria-label="Close attribute form"
            >
              <X size={19} />
            </button>
          </div>

          <form className="attributes-form" onSubmit={handleSubmit}>
            <label>
              Attribute name
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
                placeholder="e.g. Screen size"
                required
              />
            </label>
            <label>
              Key
              <input
                type="text"
                value={key}
                onChange={(event) => setKey(event.target.value)}
                maxLength={100}
                placeholder="e.g. screen_size"
                required
              />
              <small>Lowercase letters, numbers, and underscores only.</small>
            </label>
            <label>
              Subcategory
              <select
                value={subCategory}
                onChange={(event) => setSubCategory(event.target.value)}
                required
              >
                <option value="">Choose a subcategory</option>
                {subcategories.map((subcategory) => (
                  <option key={subcategory._id} value={subcategory._id}>
                    {subcategory.category?.name
                      ? `${subcategory.category.name} / `
                      : ""}
                    {subcategory.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Input type
              <select
                value={inputType}
                onChange={(event) => setInputType(event.target.value)}
              >
                {inputTypes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {supportsOptions && (
              <label className="attributes-options-field">
                Options
                <textarea
                  rows="4"
                  value={optionsText}
                  onChange={(event) => setOptionsText(event.target.value)}
                  placeholder={"Small\nMedium\nLarge"}
                />
                <small>Enter one option per line.</small>
              </label>
            )}

            <fieldset className="attributes-flags">
              <legend>Attribute behavior</legend>
              <label>
                <input
                  type="checkbox"
                  checked={isRequired}
                  onChange={(event) => setIsRequired(event.target.checked)}
                />
                Required
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={isFilterable}
                  onChange={(event) => setIsFilterable(event.target.checked)}
                />
                Filterable
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={isVariant}
                  onChange={(event) => setIsVariant(event.target.checked)}
                />
                Used for variants
              </label>
            </fieldset>

            <div className="attributes-form-actions">
              <button
                className="attributes-secondary-button"
                type="button"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="attributes-primary-button"
                type="submit"
                disabled={saving}
              >
                {saving ? "Saving…" : editingAttribute ? "Save changes" : "Create attribute"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="attributes-list-panel">
        <DateRangeFilter
          fromDate={fromDate}
          toDate={toDate}
          onApply={handleDateFilter}
        />
        <div className="attributes-list-toolbar">
          <div>
            <h2>Attribute list</h2>
            <p>
              {loading
                ? "Loading attributes…"
                : `${totalDocs} ${totalDocs === 1 ? "attribute" : "attributes"}`}
            </p>
          </div>
          <div className="attributes-filters">
            <label>
              <span>Subcategory</span>
              <select
                value={subcategoryFilter}
                onChange={handleFilterChange(setSubcategoryFilter)}
              >
                <option value="">All subcategories</option>
                {subcategories.map((subcategory) => (
                  <option key={subcategory._id} value={subcategory._id}>
                    {subcategory.category?.name
                      ? `${subcategory.category.name} / `
                      : ""}
                    {subcategory.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Status</span>
              <select
                value={activeFilter}
                onChange={handleFilterChange(setActiveFilter)}
              >
                {activeFilters.map((filter) => (
                  <option key={filter.value || "all"} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="attributes-refresh"
              onClick={() => setReloadKey((currentKey) => currentKey + 1)}
              disabled={loading}
              aria-label="Refresh attributes"
              title="Refresh"
            >
              <RefreshCw size={17} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="attributes-empty">
            <RefreshCw size={22} className="attributes-spinning" />
            <span>Loading attributes…</span>
          </div>
        ) : attributes.length === 0 ? (
          <div className="attributes-empty">
            <SlidersHorizontal size={28} />
            <strong>No attributes found</strong>
            <span>Try another filter or create an attribute.</span>
          </div>
        ) : (
          <div className="attributes-table-wrap">
            <table className="attributes-table">
              <thead>
                <tr>
                  <th scope="col">Attribute</th>
                  <th scope="col">Subcategory</th>
                  <th scope="col">Input type</th>
                  <th scope="col">Behavior</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="attributes-actions-heading">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {attributes.map((attribute) => {
                  const busy = busyAttributeId === attribute._id;
                  return (
                    <tr key={attribute._id}>
                      <td>
                        <div className="attributes-name-cell">
                          <strong>{attribute.name}</strong>
                          <code>{attribute.key}</code>
                        </div>
                      </td>
                      <td>
                        {attribute.subCategory?.name || "Unknown subcategory"}
                      </td>
                      <td>
                        <span className="attributes-type">
                          {inputTypes.find(
                            (option) => option.value === attribute.inputType
                          )?.label || attribute.inputType}
                        </span>
                        {Array.isArray(attribute.options) &&
                          attribute.options.length > 0 && (
                            <small className="attributes-option-count">
                              {attribute.options.length} options
                            </small>
                          )}
                      </td>
                      <td>
                        <div className="attributes-flags-list">
                          {attribute.isRequired && <span>Required</span>}
                          {attribute.isFilterable && <span>Filter</span>}
                          {attribute.isVariant && <span>Variant</span>}
                          {!attribute.isRequired &&
                            !attribute.isFilterable &&
                            !attribute.isVariant && <span>—</span>}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`attributes-status ${
                            attribute.isActive ? "active" : "inactive"
                          }`}
                        >
                          {attribute.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <div className="attributes-row-actions">
                          <button
                            type="button"
                            className="attributes-icon-button"
                            onClick={() => startEdit(attribute)}
                            disabled={Boolean(busyAttributeId)}
                            aria-label={`Edit ${attribute.name}`}
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          {attribute.isActive && (
                            <button
                              type="button"
                              className="attributes-icon-button delete"
                              onClick={() => handleDeactivate(attribute)}
                              disabled={Boolean(busyAttributeId)}
                              aria-label={`Deactivate ${attribute.name}`}
                              title="Deactivate"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                          {busy && (
                            <span className="attributes-busy" role="status">
                              Updating…
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="attributes-pagination">
          <span>
            Page {page} of {totalPages}
          </span>
          <div>
            <button
              className="attributes-secondary-button"
              type="button"
              onClick={() => setPage((currentPage) => currentPage - 1)}
              disabled={loading || page <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft size={17} />
              Previous
            </button>
            <button
              className="attributes-secondary-button"
              type="button"
              onClick={() => setPage((currentPage) => currentPage + 1)}
              disabled={loading || page >= totalPages}
              aria-label="Next page"
            >
              Next
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </section>
    </section>
  );
}
