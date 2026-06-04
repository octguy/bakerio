"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteProductImage,
  getCategories,
  getProduct,
  listProductImages,
  updateProduct,
  uploadProductImages,
} from "@repo/api-client";
import type { ProductImage } from "@repo/api-client";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  ArrowLeft,
  Image as ImageIcon,
  Loader2,
  Star,
  Upload,
} from "lucide-react";

interface ProductDetailsPageClientProps {
  productSlug: string;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export function ProductDetailsPageClient({ productSlug }: ProductDetailsPageClientProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [primaryImageIdOverride, setPrimaryImageIdOverride] = useState<string | null>(null);

  const { data: product, isLoading: loadingProduct } = useQuery({
    queryKey: ["product", productSlug],
    queryFn: () => getProduct(productSlug),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
    staleTime: Infinity,
  });

  const { data: rawImagesData, isLoading: loadingImages } = useQuery({
    queryKey: ["product-images", product?.id],
    queryFn: () => listProductImages(product!.id),
    enabled: !!product?.id,
  });
  const rawImages = rawImagesData ?? [];

  useEffect(() => {
    if (!product) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(product.name);
    setPrice(String(product.price));
    setCategoryId(product.category_id);
    setIsActive(product.is_active);
  }, [product]);

  const images: ProductImage[] = rawImages;
  const primaryOverrideIsValid =
    primaryImageIdOverride &&
    images.some((image) => image.id === primaryImageIdOverride);
  const primaryImageId =
    (primaryOverrideIsValid ? primaryImageIdOverride : null) ??
    images.find((image) => image.is_primary)?.id ??
    images[0]?.id ??
    null;

  const updateMut = useMutation({
    mutationFn: () => {
      if (!product) throw new Error("Product is not loaded yet");
      return updateProduct(product.id, {
        name,
        category_id: categoryId,
        price: Number(price),
        sort_order: product.sort_order ?? 0,
        is_active: isActive,
      });
    },
    onSuccess: (updated) => {
      qc.setQueryData(["product", productSlug], updated);
      qc.setQueryData(["product", updated.slug], updated);
      qc.invalidateQueries({ queryKey: ["products"] });
      toast("Product updated");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const uploadMut = useMutation({
    mutationFn: (files: File[]) => {
      if (!product) throw new Error("Product is not loaded yet");
      return uploadProductImages(product.id, files);
    },
    onSuccess: (data) => {
      if (product?.id) {
        qc.invalidateQueries({ queryKey: ["product-images", product.id] });
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast(`Successfully uploaded ${data.length} image(s)`);
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const deleteMut = useMutation({
    mutationFn: (imageId: string) => {
      if (!product) throw new Error("Product is not loaded yet");
      return deleteProductImage(product.id, imageId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-images", product?.id] });
      toast("Image deleted");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const handleFiles = (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) {
      toast("Please select at least one image", "error");
      return;
    }
    if (files.some((file) => !file.type.startsWith("image/"))) {
      toast("All selected files must be images", "error");
      return;
    }
    if (files.some((file) => file.size > MAX_IMAGE_SIZE)) {
      toast("Each image must be 5MB or smaller", "error");
      return;
    }
    uploadMut.mutate(files);
  };

  const isLoading = loadingProduct || (!!product && loadingImages);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/products"
          className={buttonVariants({ variant: "ghost", size: "icon" })}
          aria-label="Back to products"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <div className="mb-1 flex items-center gap-3">
            <span className="block h-px w-6 bg-golden" />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-cinnamon">
              Product Details
            </span>
          </div>
          <h1
            className="flex items-center gap-2 font-display tracking-tight"
            style={{
              fontSize: "clamp(24px,3.2vw,30px)",
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            {product ? (
              <>
                Manage <span className="font-editorial text-cinnamon">{product.name}</span>
              </>
            ) : (
              "Loading Product..."
            )}
          </h1>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <Loader2 className="h-8 w-8 animate-spin text-cinnamon" />
          <p className="font-mono text-sm text-admin-muted">
            Loading product details and images...
          </p>
        </div>
      ) : !product ? (
        <Card className="p-6 text-center text-sm text-admin-muted">
          Product not found.
        </Card>
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-4">
          <div className="space-y-4 lg:col-span-1">
            <Card className="flex flex-col gap-4 border-border bg-white p-5 shadow-sm">
              <h2 className="border-b border-admin-line pb-2 font-display text-lg font-semibold text-espresso">
                Product Information
              </h2>
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  updateMut.mutate();
                }}
              >
                <div>
                  <Label htmlFor="product-name">Name</Label>
                  <Input
                    id="product-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="product-price">Price (VND)</Label>
                  <Input
                    id="product-price"
                    type="number"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <CategoryCombobox
                    value={categoryId}
                    onChange={setCategoryId}
                    categories={categories}
                  />
                </div>
                <div>
                  <Label htmlFor="product-status">Status</Label>
                  <Select
                    id="product-status"
                    value={isActive ? "active" : "inactive"}
                    onChange={(event) => setIsActive(event.target.value === "active")}
                  >
                    <option value="active">Enabled</option>
                    <option value="inactive">Disabled</option>
                  </Select>
                </div>
                <div>
                  <Label>Slug</Label>
                  <span className="mt-0.5 block font-mono text-xs text-cinnamon">
                    {product.slug}
                  </span>
                </div>
                <Button type="submit" className="w-full" disabled={updateMut.isPending}>
                  {updateMut.isPending ? "Saving..." : "Save Product"}
                </Button>
              </form>
            </Card>
          </div>

          <div className="space-y-6 lg:col-span-3">
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                handleFiles(event.dataTransfer.files);
              }}
              className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all ${
                isDragging
                  ? "scale-[1.01] border-cinnamon bg-vanilla/60"
                  : "border-crust bg-white hover:border-cinnamon/60"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(event) => handleFiles(event.target.files)}
                className="hidden"
              />
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-vanilla text-cinnamon">
                {uploadMut.isPending ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Upload className="h-6 w-6" />
                )}
              </div>
              <p className="text-sm font-medium text-espresso">
                {uploadMut.isPending ? "Uploading your files..." : "Drag and drop your images here"}
              </p>
              {!uploadMut.isPending && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-1 cursor-pointer font-semibold text-cinnamon underline hover:text-espresso"
                >
                  browse to select files
                </button>
              )}
              <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-admin-muted">
                Images only (PNG, JPG, WEBP up to 5MB)
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="flex items-center gap-2 font-display text-lg text-espresso">
                Uploaded Images
                <span className="font-mono text-xs text-admin-muted">({images.length})</span>
              </h3>

              {images.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-white p-6 py-12 text-center">
                  <ImageIcon className="mb-2 h-8 w-8 text-admin-muted" />
                  <p className="text-sm font-medium text-espresso">No images uploaded yet</p>
                  <p className="mt-1 text-xs text-admin-muted">
                    Upload product images to showcase them in the store.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {images.map((img) => {
                    const isPrimary = img.id === primaryImageId;
                    return (
                      <div
                        key={img.id}
                        role={images.length > 1 && !isPrimary ? "button" : undefined}
                        tabIndex={images.length > 1 && !isPrimary ? 0 : undefined}
                        aria-label={images.length > 1 && !isPrimary ? "Set as primary image" : undefined}
                        onClick={() => {
                          if (images.length <= 1 || isPrimary) return;
                          setPrimaryImageIdOverride(img.id);
                          toast("Primary image updated (demo)");
                        }}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter" && event.key !== " ") return;
                          if (images.length <= 1 || isPrimary) return;
                          event.preventDefault();
                          setPrimaryImageIdOverride(img.id);
                          toast("Primary image updated (demo)");
                        }}
                        className={`group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted shadow-sm transition-all duration-300 hover:shadow-md ${
                          images.length > 1 && !isPrimary ? "cursor-pointer" : ""
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.url}
                          alt={img.alt_text || product.name || "Product image"}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        {images.length > 1 && (
                          <button
                            type="button"
                            disabled={isPrimary}
                            onClick={(event) => {
                              event.stopPropagation();
                              setPrimaryImageIdOverride(img.id);
                              toast("Primary image updated (demo)");
                            }}
                            className={`absolute top-2 left-2 z-10 rounded-full p-1.5 shadow transition-all ${
                              isPrimary
                                ? "bg-golden text-white opacity-100"
                                : "bg-black/30 text-white/75 opacity-0 hover:bg-golden/80 hover:text-white group-hover:opacity-70"
                            }`}
                            title={isPrimary ? "Primary image" : "Set as primary"}
                            aria-label={isPrimary ? "Primary image" : "Set as primary image"}
                          >
                            <Star
                              className={`h-4 w-4 ${isPrimary ? "fill-current" : ""}`}
                            />
                          </button>
                        )}
                        <div className="absolute top-0 right-0 z-20">
                          <button
                            type="button"
                            disabled={deleteMut.isPending}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (confirm("Are you sure you want to delete this image?")) {
                                deleteMut.mutate(img.id);
                              }
                            }}
                            className="group/delete relative h-10 w-10 bg-[#ff2d1f] transition-colors hover:bg-[#e1190d]"
                            style={{ clipPath: "polygon(100% 0, 100% 100%, 0 0)" }}
                            title="Delete image"
                          >
                            <span
                              aria-hidden="true"
                              className="absolute top-[11px] right-[5px] h-0.5 w-4 rotate-45 rounded-full bg-white"
                            />
                            <span
                              aria-hidden="true"
                              className="absolute top-[11px] right-[5px] h-0.5 w-4 -rotate-45 rounded-full bg-white"
                            />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface CategoryComboboxProps {
  value: string;
  onChange: (value: string) => void;
  categories: { id: string; name: string }[];
}

function CategoryCombobox({ value, onChange, categories }: CategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedCategory = categories.find((category) => category.id === value);
  const filtered = categories.filter((category) =>
    category.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div ref={containerRef} className="relative w-full">
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setOpen(!open);
          setSearch("");
        }}
        className="w-full justify-between border-input bg-background text-left font-normal text-espresso shadow-sm"
      >
        <span>{selectedCategory ? selectedCategory.name : "Select category..."}</span>
        <span className="text-xs text-admin-muted">▼</span>
      </Button>

      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-admin-line bg-white p-2 shadow-lg">
          <Input
            autoFocus
            placeholder="Search category..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="mb-2 h-8 text-sm"
          />
          <div className="space-y-1">
            {filtered.length > 0 ? (
              filtered.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    onChange(category.id);
                    setOpen(false);
                  }}
                  className={`w-full rounded px-2 py-1.5 text-left text-xs text-espresso hover:bg-vanilla ${
                    value === category.id ? "bg-vanilla font-semibold" : ""
                  }`}
                >
                  {category.name}
                </button>
              ))
            ) : (
              <p className="py-2 text-center text-xs text-admin-muted">
                No categories found.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
