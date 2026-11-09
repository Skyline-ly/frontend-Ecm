import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  LoaderCircle,
  PackageOpen,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { apiRequest } from "../../lib/api";
import "./SellerPages.css";

const PAGE_SIZE = 20;
const emptyForm = {
  name: "",
  description: "",
  basePrice: "",
  discountPrice: "",
  stock: "0",
  category: "",
  subCategory: "",
  condition: "new",
};

function getId(value) {
  return String(value?._id || value || "");
}

function plainObject(value) {
  return value instanceof Map
    ? Object.fromEntries(value)
    : value && typeof value === "object"
      ? value
      : {};
}

function initialAttributeValues(value, definitions) {
  const savedValues = plainObject(value);
  return Object.fromEntries(
    definitions
      .filter((attribute) => !attribute.isVariant && savedValues[attribute.key] !== undefined)
      .map((attribute) => [
        attribute.key,
        attribute.inputType === "multiselect"
          ? String(savedValues[attribute.key]).split(",").map((item) => item.trim()).filter(Boolean)
          : String(savedValues[attribute.key]),
      ])
  );
}

function initialVariantRows(variants = []) {
  return variants.map((variant) => ({
    variantId: variant._id,
    attributes: plainObject(variant.attributes),
    price: variant.price ?? "",
    discountPrice: variant.discountPrice ?? "",
    stock: variant.stock ?? 0,
    sku: variant.sku || "",
    imageUrl: variant.image || "",
    imageFile: null,
  }));
}

function AttributeField({ attribute, value, onChange, required = false, variant = false }) {
  const label = `${attribute.name}${required ? " *" : ""}`;

  if (attribute.inputType === "multiselect" && !variant) {
    const selected = Array.isArray(value) ? value : [];
    return (
      <fieldset className="seller-attribute-field">
        <legend>{label}</legend>
        <div className="seller-attribute-options">
          {attribute.options.map((option) => (
            <label key={option}>
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={(event) => {
                  const next = event.target.checked
                    ? [...selected, option]
                    : selected.filter((item) => item !== option);
                  onChange(next);
                }}
              />
              {option}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  if (attribute.inputType === "select" || attribute.inputType === "multiselect" || attribute.inputType === "boolean") {
    const options = attribute.inputType === "boolean"
      ? [["true", "Yes"], ["false", "No"]]
      : attribute.options.map((option) => [option, option]);
    return (
      <label className="seller-attribute-field">
        {label}
        <select
          required={required}
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Choose {attribute.name.toLowerCase()}</option>
          {options.map(([optionValue, optionLabel]) => (
            <option key={optionValue} value={optionValue}>{optionLabel}</option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="seller-attribute-field">
      {label}
      <input
        type={attribute.inputType === "number" ? "number" : "text"}
        step={attribute.inputType === "number" ? "any" : undefined}
        required={required}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function formatCurrency(value) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
      }).format(amount)
    : "—";
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function getStock(product) {
  if (Array.isArray(product.variants) && product.variants.length) {
    return product.variants.reduce(
      (total, variant) => total + (Number(variant.stock) || 0),
      0
    );
  }
  return Number(product.stock) || 0;
}

function getStatusClass(status = "") {
  return String(status).toLowerCase().replace(/\s+/g, "-");
}

async function loadCategories(signal) {
  const first = await apiRequest("/api/categories?page=1&limit=100", { signal });
  if (!Array.isArray(first.data)) {
    throw new Error("The server returned an invalid category list.");
  }
  const pages = Math.max(1, Number(first.pagination?.totalPages) || 1);
  if (pages === 1) return first.data;

  const remaining = await Promise.all(
    Array.from({ length: pages - 1 }, (_, index) =>
      apiRequest(`/api/categories?page=${index + 2}&limit=100`, { signal })
    )
  );
  if (remaining.some((response) => !Array.isArray(response.data))) {
    throw new Error("The server returned an invalid category list.");
  }
  return first.data.concat(...remaining.map((response) => response.data));
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [attributeDefinitions, setAttributeDefinitions] = useState([]);
  const [attributeValues, setAttributeValues] = useState({});
  const [variantRows, setVariantRows] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDateInput, setFromDateInput] = useState("");
  const [toDateInput, setToDateInput] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [taxonomyLoading, setTaxonomyLoading] = useState(false);
  const [attributesLoading, setAttributesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyProductId, setBusyProductId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [images, setImages] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadProducts() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });
        if (fromDate) params.set("fromDate", fromDate);
        if (toDate) params.set("toDate", toDate);
        const [productResponse, categoryList] = await Promise.all([
          apiRequest(
            `/api/product/mine?${params.toString()}`,
            { signal: controller.signal }
          ),
          loadCategories(controller.signal),
        ]);
        if (!Array.isArray(productResponse.data)) {
          throw new Error("The server returned an invalid product list.");
        }
        if (!controller.signal.aborted) {
          setProducts(productResponse.data);
          setCategories(categoryList);
          setTotalDocs(Number(productResponse.pagination?.totalDocs) || 0);
          setTotalPages(
            Math.max(1, Number(productResponse.pagination?.totalPages) || 1)
          );
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError.message || "Unable to load your products.");
          setProducts([]);
          setTotalDocs(0);
          setTotalPages(1);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadProducts();
    return () => controller.abort();
  }, [page, fromDate, toDate, reloadKey]);

  useEffect(() => {
    if (!modalOpen || !form.category) return undefined;
    const controller = new AbortController();
    async function loadSubcategories() {
      setTaxonomyLoading(true);
      try {
        const path = `/api/subcategory?category=${encodeURIComponent(form.category)}&limit=100`;
        const response = await apiRequest(`${path}&page=1`, {
          signal: controller.signal,
        });
        if (!Array.isArray(response.subCategory)) {
          throw new Error("The server returned an invalid subcategory list.");
        }
        const pages = Math.max(1, Number(response.pagination?.totalPages) || 1);
        const remaining = await Promise.all(
          Array.from({ length: pages - 1 }, (_, index) =>
            apiRequest(`${path}&page=${index + 2}`, {
              signal: controller.signal,
            })
          )
        );
        if (remaining.some((result) => !Array.isArray(result.subCategory))) {
          throw new Error("The server returned an invalid subcategory list.");
        }
        if (!controller.signal.aborted) {
          setSubcategories(
            response.subCategory.concat(
              ...remaining.map((result) => result.subCategory)
            )
          );
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError.message || "Unable to load subcategories.");
          setSubcategories([]);
        }
      } finally {
        if (!controller.signal.aborted) setTaxonomyLoading(false);
      }
    }
    loadSubcategories();
    return () => controller.abort();
  }, [form.category, modalOpen]);

  useEffect(() => {
    if (!modalOpen || !form.subCategory) return undefined;

    const controller = new AbortController();
    async function loadAttributes() {
      setAttributesLoading(true);
      setError("");
      try {
        const response = await apiRequest(
          `/api/attribute/seller?subCategory=${encodeURIComponent(form.subCategory)}`,
          { signal: controller.signal }
        );
        if (!Array.isArray(response.data)) {
          throw new Error("The server returned an invalid attribute list.");
        }
        if (!controller.signal.aborted) {
          setAttributeDefinitions(response.data);
          const editingSameSubcategory =
            editingProduct &&
            getId(editingProduct.subCategory) === form.subCategory;
          setAttributeValues(
            editingSameSubcategory
              ? initialAttributeValues(editingProduct.attributes, response.data)
              : {}
          );
          setVariantRows(
            editingSameSubcategory
              ? initialVariantRows(editingProduct.variants)
              : []
          );
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError.message || "Unable to load product attributes.");
          setAttributeDefinitions([]);
          setAttributeValues({});
          setVariantRows([]);
        }
      } finally {
        if (!controller.signal.aborted) setAttributesLoading(false);
      }
    }

    loadAttributes();
    return () => controller.abort();
  }, [form.subCategory, modalOpen, editingProduct]);

  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [getId(category), category.name])),
    [categories]
  );

  const visibleProducts = products.filter((product) => {
    const matchesSearch = product.name
      ?.toLowerCase()
      .includes(search.trim().toLowerCase());
    const matchesStatus =
      !statusFilter || product.approvalStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const applyDateFilter = (event) => {
    event.preventDefault();
    if (fromDateInput && toDateInput && fromDateInput > toDateInput) {
      setError("The start date must be on or before the end date.");
      return;
    }
    setError("");
    setPage(1);
    setFromDate(fromDateInput);
    setToDate(toDateInput);
  };
  const hasVariantDefinitions = attributeDefinitions.some(
    (attribute) => attribute.isVariant
  );
  const hasVariantProduct = hasVariantDefinitions || Boolean(editingProduct?.variants?.length);
  const openCreate = () => {
    setError("");
    setNotice("");
    setEditingProduct(null);
    setForm(emptyForm);
    setImages([]);
    setSubcategories([]);
    setAttributeDefinitions([]);
    setAttributeValues({});
    setVariantRows([]);
    setModalOpen(true);
  };

  const openEdit = (product) => {
    setError("");
    setNotice("");
    setEditingProduct(product);
    setForm({
      name: product.name || "",
      description: product.description || "",
      basePrice: product.basePrice ?? "",
      discountPrice: product.discountPrice ?? "",
      stock: product.stock ?? 0,
      category: getId(product.category),
      subCategory: getId(product.subCategory),
      condition: product.condition || "new",
    });
    setImages([]);
    setAttributeDefinitions([]);
    setAttributeValues({});
    setVariantRows([]);
    setModalOpen(true);
  };

  const submitProduct = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!editingProduct && images.length === 0) {
      setError("Add at least one product image.");
      return;
    }
    if (!editingProduct && images.length > 5) {
      setError("You can upload up to 5 product images.");
      return;
    }
    const body = new FormData();
    body.append("name", form.name.trim());
    body.append("description", form.description.trim());
    body.append("basePrice", form.basePrice);
    body.append("stock", form.stock || "0");
    body.append("category", form.category);
    body.append("subCategory", form.subCategory);
    body.append("condition", form.condition);
    body.append("attributes", JSON.stringify(attributeValues));
    const variantFiles = [];
    const variantsPayload = variantRows.map((row) => {
      const variant = { ...row };
      delete variant.imageFile;
      delete variant.imageUrl;
      if (row.imageFile) {
        variant.imageFileIndex = variantFiles.length;
        variantFiles.push(row.imageFile);
      }
      return variant;
    });
    body.append("variants", JSON.stringify(variantsPayload));
    if (!variantRows.length && form.discountPrice !== "") {
      body.append("discountPrice", form.discountPrice);
    }
    images.forEach((image) => body.append("images", image));
    variantFiles.forEach((image) => body.append("variantImages", image));

    setSaving(true);
    try {
      const response = await apiRequest(
        editingProduct
          ? `/api/product/${editingProduct._id}`
          : "/api/product",
        {
          method: editingProduct ? "PUT" : "POST",
          body,
        }
      );
      setNotice(
        response.message ||
          (editingProduct
            ? "Product updated and submitted for review."
            : "Product submitted for admin approval.")
      );
      setModalOpen(false);
      setReloadKey((key) => key + 1);
    } catch (requestError) {
      setError(requestError.message || "Unable to save this product.");
    } finally {
      setSaving(false);
    }
  };

  const archiveProduct = async (product) => {
    if (!window.confirm(`Remove "${product.name}" from your active listings?`)) {
      return;
    }
    setError("");
    setNotice("");
    setBusyProductId(product._id);
    try {
      const response = await apiRequest(`/api/product/${product._id}`, {
        method: "DELETE",
      });
      setNotice(response.message || "Product removed from active listings.");
      if (products.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        setReloadKey((key) => key + 1);
      }
    } catch (requestError) {
      setError(requestError.message || "Unable to remove this product.");
    } finally {
      setBusyProductId("");
    }
  };

  return (
    <section className="seller-page">
      <div className="seller-page-heading">
        <div>
          <p className="seller-eyebrow">CATALOG MANAGEMENT</p>
          <h2>Products</h2>
          <p>Create listings, update details, and check review status.</p>
        </div>
        <div className="seller-heading-actions">
          <button
            className="seller-button"
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? "seller-spinning" : ""} />
            Refresh
          </button>
          <button
            className="seller-button seller-primary-button"
            type="button"
            onClick={openCreate}
          >
            <Plus size={17} /> Add product
          </button>
        </div>
      </div>

      {error && <div className="seller-alert seller-alert-error" role="alert">{error}</div>}
      {notice && <div className="seller-alert seller-alert-success" role="status">{notice}</div>}

      <section className="seller-panel seller-list-panel">
        <div className="seller-products-toolbar">
          <label className="seller-search">
            <Search size={16} />
            <span className="seller-visually-hidden">Search products on this page</span>
            <input
              type="search"
              placeholder="Search products on this page"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className="seller-filter">
            <span>Review status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">All statuses</option>
              <option value="pending">Pending review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
          <form className="seller-date-filter" onSubmit={applyDateFilter}>
            <label>
              <span>From</span>
              <input
                type="date"
                value={fromDateInput}
                onChange={(event) => setFromDateInput(event.target.value)}
              />
            </label>
            <label>
              <span>To</span>
              <input
                type="date"
                value={toDateInput}
                onChange={(event) => setToDateInput(event.target.value)}
              />
            </label>
            <button type="submit">Apply dates</button>
          </form>
        </div>

        <div className="seller-list-heading">
          <div>
            <h3>Product catalog</h3>
            <p>{loading ? "Loading products…" : `${totalDocs} active listings`}</p>
          </div>
        </div>

        {loading ? (
          <div className="seller-table-state" role="status">
            <LoaderCircle size={23} className="seller-spinning" />
            <span>Loading products…</span>
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="seller-table-state">
            <PackageOpen size={28} />
            <strong>{products.length ? "No matching products" : "No products yet"}</strong>
            <span>
              {products.length
                ? "Try another search or review status."
                : "Add a product to start building your catalog."}
            </span>
          </div>
        ) : (
          <div className="seller-table-wrap">
            <table className="seller-data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Updated</th>
                  <th>Review status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleProducts.map((product) => (
                  <tr key={product._id}>
                    <td>
                      <div className="seller-product-cell">
                        {product.images?.[0]?.url ? (
                          <img src={product.images[0].url} alt="" loading="lazy" />
                        ) : (
                          <span className="seller-product-placeholder"><PackageOpen size={17} /></span>
                        )}
                        <span>
                          <strong>{product.name}</strong>
                          {product.reviewNote && <small>{product.reviewNote}</small>}
                        </span>
                      </div>
                    </td>
                    <td>{categoryNames.get(getId(product.category)) || "—"}</td>
                    <td>
                      {product.variants?.length
                        ? `${product.variants.length} variants`
                        : formatCurrency(product.discountPrice ?? product.basePrice)}
                    </td>
                    <td>{getStock(product)}</td>
                    <td>{formatDate(product.updatedAt || product.createdAt)}</td>
                    <td>
                      <span className={`seller-status ${getStatusClass(product.approvalStatus)}`}>
                        {product.approvalStatus || "Unknown"}
                      </span>
                    </td>
                    <td>
                      <div className="seller-product-actions">
                        <button
                          className="seller-details-button"
                          type="button"
                          onClick={() => openEdit(product)}
                        >
                          Edit
                        </button>
                        <button
                          className="seller-remove-button"
                          type="button"
                          disabled={Boolean(busyProductId)}
                          onClick={() => archiveProduct(product)}
                        >
                          {busyProductId === product._id ? "Removing…" : "Remove"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="seller-pagination">
            <span>Page {page} of {totalPages}</span>
            <div>
              <button
                type="button"
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                <ChevronLeft size={17} />
              </button>
              <button
                type="button"
                aria-label="Next page"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        )}
      </section>

      {modalOpen && (
        <div className="seller-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) setModalOpen(false);
        }}>
          <section className="seller-modal" role="dialog" aria-modal="true" aria-labelledby="seller-product-form-title">
            <div className="seller-modal-heading">
              <div>
                <p className="seller-eyebrow">{editingProduct ? "EDIT LISTING" : "NEW LISTING"}</p>
                <h3 id="seller-product-form-title">
                  {editingProduct ? "Update product" : "Add a product"}
                </h3>
              </div>
              <button
                className="seller-icon-button"
                type="button"
                aria-label="Close product form"
                onClick={() => setModalOpen(false)}
                disabled={saving}
              >
                <X size={19} />
              </button>
            </div>
            {editingProduct && editingProduct.variants?.length > 0 && (
              <p className="seller-form-note">
                Variant prices, stock, and SKUs can be changed below.
              </p>
            )}
            {taxonomyLoading && <p className="seller-form-note">Loading categories…</p>}
            {attributesLoading && <p className="seller-form-note">Loading subcategory attributes…</p>}
            <form className="seller-product-form" onSubmit={submitProduct}>
              <label>
                Product name
                <input
                  required
                  maxLength="120"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
              </label>
              <label>
                Description
                <textarea
                  required
                  rows="4"
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                />
              </label>
              <div className="seller-form-row">
                <label>
                  Category
                  <select
                    required
                    value={form.category}
                    onChange={(event) => {
                      setSubcategories([]);
                      setAttributeDefinitions([]);
                      setAttributeValues({});
                      setVariantRows([]);
                      setForm({ ...form, category: event.target.value, subCategory: "" })
                    }}
                  >
                    <option value="">Choose category</option>
                    {categories.map((category) => (
                      <option key={category._id} value={category._id}>{category.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Subcategory
                  <select
                    required
                    value={form.subCategory}
                    disabled={!form.category || taxonomyLoading}
                    onChange={(event) => {
                      setAttributeDefinitions([]);
                      setAttributeValues({});
                      setVariantRows([]);
                      setForm({ ...form, subCategory: event.target.value });
                    }}
                  >
                    <option value="">Choose subcategory</option>
                    {subcategories.map((subcategory) => (
                      <option key={subcategory._id} value={subcategory._id}>{subcategory.name}</option>
                    ))}
                  </select>
                </label>
              </div>
              {form.subCategory && !attributesLoading && (
                <>
                  {attributeDefinitions.some((attribute) => !attribute.isVariant) && (
                    <section className="seller-config-section">
                      <div>
                        <h4>Product attributes</h4>
                        <p>Fill in the details configured for this subcategory.</p>
                      </div>
                      <div className="seller-attribute-grid">
                        {attributeDefinitions
                          .filter((attribute) => !attribute.isVariant)
                          .map((attribute) => (
                            <AttributeField
                              key={attribute._id}
                              attribute={attribute}
                              required={attribute.isRequired}
                              value={attributeValues[attribute.key]}
                              onChange={(value) => setAttributeValues((current) => ({
                                ...current,
                                [attribute.key]: value,
                              }))}
                            />
                          ))}
                      </div>
                    </section>
                  )}
                  {attributeDefinitions.some((attribute) => attribute.isVariant) && (
                    <section className="seller-config-section">
                      <div className="seller-variant-heading">
                        <div>
                          <h4>Product variants</h4>
                          <p>Each variant needs its own option values, price, stock, and SKU.</p>
                        </div>
                        <button
                          className="seller-details-button"
                          type="button"
                          onClick={() => setVariantRows((current) => [
                            ...current,
                            {
                              attributes: Object.fromEntries(
                                attributeDefinitions
                                  .filter((attribute) => attribute.isVariant)
                                  .map((attribute) => [attribute.key, ""])
                              ),
                              price: form.basePrice || "",
                              discountPrice: "",
                              stock: "0",
                              sku: "",
                              imageUrl: "",
                              imageFile: null,
                            },
                          ])}
                        >
                          <Plus size={14} /> Add variant
                        </button>
                      </div>
                      {variantRows.length === 0 ? (
                        <p className="seller-form-note">Add at least one variant to continue.</p>
                      ) : (
                        <div className="seller-variant-list">
                          {variantRows.map((variant, index) => (
                            <fieldset className="seller-variant-card" key={`variant-${index}`}>
                              <legend>Variant {index + 1}</legend>
                              <button
                                className="seller-icon-button seller-variant-remove"
                                type="button"
                                aria-label={`Remove variant ${index + 1}`}
                                onClick={() => setVariantRows((current) =>
                                  current.filter((_, rowIndex) => rowIndex !== index)
                                )}
                              >
                                <X size={15} />
                              </button>
                              <div className="seller-attribute-grid">
                                {attributeDefinitions
                                  .filter((attribute) => attribute.isVariant)
                                  .map((attribute) => (
                                    <AttributeField
                                      key={attribute._id}
                                      attribute={attribute}
                                      value={variant.attributes?.[attribute.key]}
                                      required
                                      variant
                                      onChange={(value) => setVariantRows((current) =>
                                        current.map((row, rowIndex) => rowIndex === index
                                          ? {
                                              ...row,
                                              attributes: {
                                                ...row.attributes,
                                                [attribute.key]: value,
                                              },
                                            }
                                          : row
                                        )
                                      )}
                                    />
                                  ))}
                                <label className="seller-attribute-field">
                                  Variant price
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    required
                                    value={variant.price}
                                    onChange={(event) => setVariantRows((current) =>
                                      current.map((row, rowIndex) => rowIndex === index
                                        ? { ...row, price: event.target.value }
                                        : row
                                      )
                                    )}
                                  />
                                </label>
                                <label className="seller-attribute-field">
                                  Discount price <span className="seller-optional">(optional)</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={variant.discountPrice}
                                    onChange={(event) => setVariantRows((current) =>
                                      current.map((row, rowIndex) => rowIndex === index
                                        ? { ...row, discountPrice: event.target.value }
                                        : row
                                      )
                                    )}
                                  />
                                </label>
                                <label className="seller-attribute-field">
                                  Stock
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    required
                                    value={variant.stock}
                                    onChange={(event) => setVariantRows((current) =>
                                      current.map((row, rowIndex) => rowIndex === index
                                        ? { ...row, stock: event.target.value }
                                        : row
                                      )
                                    )}
                                  />
                                </label>
                                <label className="seller-attribute-field">
                                  SKU
                                  <input
                                    type="text"
                                    required
                                    value={variant.sku}
                                    onChange={(event) => setVariantRows((current) =>
                                      current.map((row, rowIndex) => rowIndex === index
                                        ? { ...row, sku: event.target.value }
                                        : row
                                      )
                                    )}
                                  />
                                </label>
                                <label className="seller-attribute-field">
                                  Variant image <span className="seller-optional">(optional)</span>
                                  {variant.imageUrl && (
                                    <img
                                      className="seller-variant-image-preview"
                                      src={variant.imageUrl}
                                      alt={`Current image for variant ${index + 1}`}
                                    />
                                  )}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(event) => setVariantRows((current) =>
                                      current.map((row, rowIndex) => rowIndex === index
                                        ? {
                                            ...row,
                                            imageFile: event.target.files?.[0] || null,
                                          }
                                        : row
                                      )
                                    )}
                                  />
                                  <small>
                                    {variant.imageFile?.name ||
                                      (variant.imageUrl
                                        ? "Choose a file to replace the current image."
                                        : "Choose the image customers should see for this option.")}
                                  </small>
                                </label>
                              </div>
                            </fieldset>
                          ))}
                        </div>
                      )}
                    </section>
                  )}
                </>
              )}
              {!hasVariantProduct && !editingProduct?.variants?.length && <div className="seller-form-row">
                  <label>
                    Base price
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={form.basePrice}
                      onChange={(event) => setForm({ ...form, basePrice: event.target.value })}
                    />
                  </label>
                  <label>
                    Discount price{" "}
                    <span className="seller-optional">
                      {editingProduct ? "(leave blank to keep current)" : "(optional)"}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.discountPrice}
                      onChange={(event) => setForm({ ...form, discountPrice: event.target.value })}
                    />
                  </label>
              </div>}
              <div className="seller-form-row">
                {!hasVariantProduct && !editingProduct?.variants?.length && (
                  <label>
                    Stock
                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={form.stock}
                      onChange={(event) => setForm({ ...form, stock: event.target.value })}
                    />
                  </label>
                )}
                <label>
                  Condition
                  <select
                    value={form.condition}
                    onChange={(event) => setForm({ ...form, condition: event.target.value })}
                  >
                    <option value="new">New</option>
                    <option value="used">Used</option>
                    <option value="refurbished">Refurbished</option>
                  </select>
                </label>
              </div>
              <label className="seller-image-input">
                <span><ImagePlus size={17} /> Product images {editingProduct ? "(optional)" : "(required)"}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  required={!editingProduct}
                  onChange={(event) => setImages(Array.from(event.target.files || []).slice(0, 5))}
                />
                <small>
                  {images.length
                    ? `${images.length} image${images.length === 1 ? "" : "s"} selected`
                    : editingProduct
                      ? "Choose new files only if you want to replace the current images."
                      : "Choose up to 5 images."}
                </small>
              </label>
              {error && <div className="seller-form-error" role="alert">{error}</div>}
              <div className="seller-modal-actions">
                <button
                  className="seller-button"
                  type="button"
                  disabled={saving}
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="seller-button seller-primary-button"
                  type="submit"
                  disabled={saving || taxonomyLoading || attributesLoading}
                >
                  {saving ? "Saving…" : editingProduct ? "Save changes" : "Submit for review"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}