import { useEffect, useState } from "react";
import {
  ArrowRight,
  SlidersHorizontal,
  Heart,
  LoaderCircle,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { apiRequest } from "../../lib/api";
import {
  formatMoney,
  productImage,
  publicRequest,
} from "./customerUtils";

const PAGE_SIZE = 12;
const PRODUCT_FILTERS = [
  "search",
  "category",
  "subCategory",
  "brand",
  "condition",
  "minPrice",
  "maxPrice",
];

function productQuery(page, filters) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
    sort: filters.get("sort") || "newest",
  });
  PRODUCT_FILTERS.forEach((key) => {
    const value = filters.get(key);
    if (value) params.set(key, value);
  });
  return params;
}

function ProductCard({ product, onWishlist, wishlistBusy }) {
  const image = productImage(product);
  const currentPrice = product.discountPrice ?? product.basePrice;
  const isDiscounted =
    product.discountPrice !== undefined &&
    product.discountPrice !== null &&
    Number(product.discountPrice) < Number(product.basePrice);

  return (
    <article className="product-card">
      <Link className="product-card-image" to={`/product/${product._id}`}>
        {image ? (
          <img src={image} alt={product.name} loading="lazy" />
        ) : (
          <span className="product-image-placeholder"><Sparkles size={28} /></span>
        )}
        {isDiscounted && <span className="product-badge">Special price</span>}
      </Link>
      <button
        className="product-heart"
        type="button"
        aria-label={`Add ${product.name} to wishlist`}
        disabled={wishlistBusy}
        onClick={() => onWishlist(product._id)}
      >
        <Heart size={18} />
      </button>
      <div className="product-card-copy">
        <span className="product-category">{product.category?.name || "Selected for you"}</span>
        <Link className="product-title" to={`/product/${product._id}`}>{product.name}</Link>
        <div className="product-card-bottom">
          <div className="product-price">
            <strong>{formatMoney(currentPrice)}</strong>
            {isDiscounted && <del>{formatMoney(product.basePrice)}</del>}
          </div>
          <Link className="product-arrow" to={`/product/${product._id}`} aria-label={`View ${product.name}`}>
            <ArrowRight size={17} />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function Store() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategoryState, setSubcategoryState] = useState({
    categoryId: "",
    data: [],
    error: "",
  });
  const [categoriesError, setCategoriesError] = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);
  const [loadedQuery, setLoadedQuery] = useState("");
  const [error, setError] = useState("");
  const [wishlistBusy, setWishlistBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [subcategoryDraft, setSubcategoryDraft] = useState("");
  const [minPriceDraft, setMinPriceDraft] = useState("");
  const [maxPriceDraft, setMaxPriceDraft] = useState("");
  const [filterError, setFilterError] = useState("");
  const categoryId = searchParams.get("category") || "";
  const subCategoryId = searchParams.get("subCategory") || "";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";
  const search = searchParams.get("search") || "";
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
  const filterQuery = searchParams.toString();
  const selectedCategory = categories.find((item) => item._id === categoryId);
  const subcategories =
    subcategoryState.categoryId === categoryId ? subcategoryState.data : [];
  const subcategoriesError =
    subcategoryState.categoryId === categoryId ? subcategoryState.error : "";
  const subcategoriesLoading = Boolean(
    categoryId && subcategoryState.categoryId !== categoryId
  );
  const selectedSubcategory = categoryId
    ? subcategories.find((item) => item._id === subCategoryId)
    : null;

  useEffect(() => {
    let active = true;
    publicRequest("/api/categories?limit=100")
      .then((result) => {
        if (!Array.isArray(result.data)) {
          throw new Error("The server returned an invalid category list.");
        }
        if (active) {
          setCategories(result.data);
          setCategoriesError("");
        }
      })
      .catch((requestError) => {
        if (active && requestError.name !== "AbortError") {
          setCategoriesError(requestError.message || "Unable to load categories.");
        }
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!categoryId) {
      return undefined;
    }

    let active = true;
    const controller = new AbortController();
    publicRequest(
      `/api/subcategory?category=${encodeURIComponent(categoryId)}&limit=100`,
      { signal: controller.signal }
    )
      .then((result) => {
        if (!Array.isArray(result.subCategory)) {
          throw new Error("The server returned an invalid subcategory list.");
        }
        if (active) {
          setSubcategoryState({
            categoryId,
            data: result.subCategory,
            error: "",
          });
        }
      })
      .catch((requestError) => {
        if (active && requestError.name !== "AbortError") {
          setSubcategoryState({
            categoryId,
            data: [],
            error: requestError.message || "Unable to load subcategories.",
          });
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [categoryId]);

  useEffect(() => {
    if (!filterOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setFilterOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [filterOpen]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const params = productQuery(page, new URLSearchParams(filterQuery));
    const queryKey = params.toString();
    publicRequest(`/api/product?${params.toString()}`, { signal: controller.signal })
      .then((result) => {
        if (!Array.isArray(result.data)) throw new Error("The server returned an invalid product list.");
        if (active) {
          setError("");
          setProducts(result.data);
          setTotalPages(Math.max(1, Number(result.pagination?.totalPages) || 1));
          setTotalDocs(Number(result.pagination?.totalDocs) || result.data.length);
        }
      })
      .catch((requestError) => {
        if (active && requestError.name !== "AbortError") {
          setProducts([]);
          setTotalPages(1);
          setTotalDocs(0);
          setError(requestError.message || "Unable to load products.");
        }
      })
      .finally(() => { if (active) setLoadedQuery(queryKey); });

    return () => {
      active = false;
      controller.abort();
    };
  }, [page, filterQuery]);
  const activeQuery = productQuery(page, new URLSearchParams(filterQuery));
  const loading = loadedQuery !== activeQuery.toString();

  const updateQuery = (updates, resetPage = true) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      value ? next.set(key, value) : next.delete(key);
    });
    if (resetPage) next.set("page", "1");
    setSearchParams(next);
  };

  const openFilters = () => {
    setSubcategoryDraft(subCategoryId);
    setMinPriceDraft(minPrice);
    setMaxPriceDraft(maxPrice);
    setFilterError("");
    setFilterOpen(true);
  };

  const applyFilters = (event) => {
    event.preventDefault();
    const min = minPriceDraft.trim();
    const max = maxPriceDraft.trim();
    if (
      (min && (!Number.isFinite(Number(min)) || Number(min) < 0)) ||
      (max && (!Number.isFinite(Number(max)) || Number(max) < 0)) ||
      (min && max && Number(min) > Number(max))
    ) {
      setFilterError("Enter valid non-negative prices, with the minimum no greater than the maximum.");
      return;
    }

    const next = new URLSearchParams(searchParams);
    const updates = {
      subCategory: subcategoryDraft,
      minPrice: min,
      maxPrice: max,
      page: "1",
    };
    Object.entries(updates).forEach(([key, value]) => {
      value ? next.set(key, value) : next.delete(key);
    });
    setSearchParams(next);
    setFilterOpen(false);
    setFilterError("");
  };

  const clearFilters = () => {
    setSubcategoryDraft("");
    setMinPriceDraft("");
    setMaxPriceDraft("");
    setFilterError("");
    const next = new URLSearchParams(searchParams);
    ["subCategory", "minPrice", "maxPrice", "page"].forEach((key) => next.delete(key));
    setSearchParams(next);
    setFilterOpen(false);
  };

  const removeActiveFilter = (key) => {
    updateQuery({ [key]: "" });
  };

  const addWishlist = async (productId) => {
    if (!sessionStorage.getItem("accessToken")) {
      setNotice("Sign in to save products to your wishlist.");
      return;
    }
    setWishlistBusy(productId);
    setNotice("");
    try {
      const result = await apiRequest("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      setNotice(result.message || "Added to your wishlist.");
    } catch (requestError) {
      setNotice(requestError.message || "Unable to update your wishlist.");
    } finally {
      setWishlistBusy("");
    }
  };

  return (
    <div className="store-page">

      <section className="discover-section" id="discover">
        <div className="store-results-toolbar">
          <div className="store-results-title">
            <span className="eyebrow">SHOP THE COLLECTION</span>
            <h1>{selectedCategory?.name || "All products"}</h1>
            <p>{totalDocs} {totalDocs === 1 ? "product" : "products"} found</p>
          </div>
          <button className="store-open-filters" type="button" onClick={openFilters}>
            <SlidersHorizontal size={17} />
            Filter
            {(subCategoryId || minPrice || maxPrice) && (
              <span className="store-filter-count" aria-label="Filters active">●</span>
            )}
          </button>
        </div>

        {(selectedSubcategory || minPrice || maxPrice) && (
          <div className="store-active-filters" aria-label="Active filters">
            {selectedSubcategory && (
              <button type="button" onClick={() => removeActiveFilter("subCategory")}>
                {selectedSubcategory.name}<X size={13} />
              </button>
            )}
            {minPrice && (
              <button type="button" onClick={() => removeActiveFilter("minPrice")}>
                From {formatMoney(minPrice)}<X size={13} />
              </button>
            )}
            {maxPrice && (
              <button type="button" onClick={() => removeActiveFilter("maxPrice")}>
                To {formatMoney(maxPrice)}<X size={13} />
              </button>
            )}
          </div>
        )}

        {categoriesError && <div className="store-alert" role="alert">{categoriesError}</div>}
        {subcategoriesError && <div className="store-alert" role="alert">{subcategoriesError}</div>}
        {notice && <p className="store-notice" role="status">{notice}</p>}
        {error && <div className="store-alert" role="alert">{error}</div>}
        {loading ? (
          <div className="store-loading"><LoaderCircle className="spin" size={25} /> Finding lovely things...</div>
        ) : products.length > 0 ? (
          <>
            <div className="product-grid">
              {products.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  onWishlist={addWishlist}
                  wishlistBusy={wishlistBusy === product._id}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="store-pagination">
                <button type="button" disabled={page <= 1} onClick={() => updateQuery({ page: String(page - 1) }, false)}>Previous</button>
                <span>Page {page} of {totalPages}</span>
                <button type="button" disabled={page >= totalPages} onClick={() => updateQuery({ page: String(page + 1) }, false)}>Next <ArrowRight size={15} /></button>
              </div>
            )}
          </>
        ) : !error ? (
          <div className="store-empty">
            <span className="empty-icon"><Search size={25} /></span>
            <h3>No products just yet</h3>
            <p>Try another search or adjust your filters. We&apos;re always finding new favorites.</p>
            {search && <Link to="/">Browse everything <ArrowRight size={15} /></Link>}
          </div>
        ) : null}
      </section>

      {filterOpen && (
        <div className="store-filter-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setFilterOpen(false);
        }}>
          <aside
            className="store-filter-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="store-filter-title"
          >
            <div className="store-filter-drawer-heading">
              <div>
                <span className="eyebrow">NARROW YOUR SEARCH</span>
                <h2 id="store-filter-title">Filter products</h2>
              </div>
              <button type="button" onClick={() => setFilterOpen(false)} aria-label="Close filters">
                <X size={20} />
              </button>
            </div>
            <form className="store-filter-form" onSubmit={applyFilters}>
              <fieldset className="store-filter-section">
                <legend>Subcategory</legend>
                {categoryId ? (
                  <select
                    value={subcategoryDraft}
                    onChange={(event) => setSubcategoryDraft(event.target.value)}
                    disabled={Boolean(subcategoriesError) || subcategoriesLoading}
                    aria-label="Filter by subcategory"
                  >
                    <option value="">
                      {subcategoriesLoading ? "Loading subcategories..." : "All subcategories"}
                    </option>
                    {subcategories.map((item) => (
                      <option key={item._id} value={item._id}>{item.name}</option>
                    ))}
                  </select>
                ) : (
                  <p className="store-filter-help">Choose a category first to filter by subcategory.</p>
                )}
              </fieldset>

              <fieldset className="store-filter-section">
                <legend>Price</legend>
                <div className="store-filter-price-inputs">
                  <label>
                    <span>Minimum</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={minPriceDraft}
                      onChange={(event) => setMinPriceDraft(event.target.value)}
                      placeholder="No minimum"
                    />
                  </label>
                  <label>
                    <span>Maximum</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={maxPriceDraft}
                      onChange={(event) => setMaxPriceDraft(event.target.value)}
                      placeholder="No maximum"
                    />
                  </label>
                </div>
              </fieldset>

              {filterError && <p className="store-filter-error" role="alert">{filterError}</p>}
              <div className="store-filter-drawer-actions">
                <button className="store-filter-clear" type="button" onClick={clearFilters}>Clear</button>
                <button className="store-filter-apply" type="submit">Apply filters</button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}
