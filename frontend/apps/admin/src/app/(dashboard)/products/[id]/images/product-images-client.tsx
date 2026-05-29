"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProduct,
  listProductImages,
  uploadProductImages,
  deleteProductImage,
} from "@repo/api-client";
import type { ProductImage } from "@repo/api-client";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import {
  ArrowLeft,
  Upload,
  Trash2,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";

interface ProductImagesPageClientProps {
  productId: string;
}

export function ProductImagesPageClient({ productId }: ProductImagesPageClientProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Load product details
  const { data: product, isLoading: loadingProduct } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => getProduct(productId),
  });

  // Load images
  const { data: rawImages = [], isLoading: loadingImages } = useQuery({
    queryKey: ["product-images", productId],
    queryFn: () => listProductImages(productId),
  });

  const images: ProductImage[] = rawImages || [];
  const primaryImageId = images.reduce<string | null>((primaryId, img) => {
    if (!primaryId) return img.id;
    const primary = images.find((candidate) => candidate.id === primaryId);
    return !primary || img.sort_order < primary.sort_order ? img.id : primaryId;
  }, null);

  // Mutations
  const uploadMut = useMutation({
    mutationFn: (files: File[]) => uploadProductImages(productId, files),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["product-images", productId] });
      toast(`Successfully uploaded ${data.length} image(s)`);
    },
    onError: (e: Error) => {
      toast(e.message, "error");
    },
  });

  const deleteMut = useMutation({
    mutationFn: (imageId: string) => deleteProductImage(productId, imageId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-images", productId] });
      toast("Image deleted");
    },
    onError: (e: Error) => {
      toast(e.message, "error");
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files).filter((file) =>
        file.type.startsWith("image/")
      );
      if (files.length === 0) {
        toast("Please select image files only", "error");
        return;
      }
      uploadMut.mutate(files);
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith("image/")
      );
      if (files.length === 0) {
        toast("Please drop image files only", "error");
        return;
      }
      uploadMut.mutate(files);
    }
  };

  const triggerBrowse = () => {
    fileInputRef.current?.click();
  };

  const isLoading = loadingProduct || loadingImages;

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
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
              Images Catalogue
            </span>
          </div>
          <h1
            className="font-display tracking-tight flex items-center gap-2"
            style={{
              fontSize: "clamp(24px,3.2vw,30px)",
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            {product ? (
              <>
                Manage Images for{" "}
                <span className="font-editorial text-cinnamon">{product.name}</span>
              </>
            ) : (
              "Loading Product..."
            )}
          </h1>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-cinnamon" />
          <p className="text-sm font-mono text-admin-muted">Loading product details and images...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Product Overview Card */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-5 border-border bg-white shadow-sm flex flex-col gap-4">
              <h2 className="font-display text-lg text-espresso border-b border-admin-line pb-2 font-semibold">
                Product Details
              </h2>
              {product && (
                <div className="space-y-3 text-sm">
                  <div>
                    <label className="text-xs font-mono text-admin-muted uppercase tracking-wider block">Name</label>
                    <span className="font-medium text-espresso block mt-0.5">{product.name}</span>
                  </div>
                  <div>
                    <label className="text-xs font-mono text-admin-muted uppercase tracking-wider block">Slug</label>
                    <span className="font-mono text-xs text-cinnamon block mt-0.5">{product.slug}</span>
                  </div>
                  <div>
                    <label className="text-xs font-mono text-admin-muted uppercase tracking-wider block">Price</label>
                    <span className="font-medium text-espresso block mt-0.5">
                      {new Intl.NumberFormat("vi-VN", {
                        style: "currency",
                        currency: "VND",
                      }).format(product.price)}
                    </span>
                  </div>
                  <div>
                    <label className="text-xs font-mono text-admin-muted uppercase tracking-wider block">Category ID</label>
                    <span className="font-medium text-espresso block mt-0.5">
                      {product.category_id || "—"}
                    </span>
                  </div>
                  <div>
                    <label className="text-xs font-mono text-admin-muted uppercase tracking-wider block">Status</label>
                    <span
                      className={`inline-block px-2 py-0.5 text-xs rounded-full font-semibold mt-1 ${
                        product.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {product.is_active ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Image Management Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                isDragging
                  ? "border-cinnamon bg-vanilla/60 scale-[1.01]"
                  : "border-crust bg-white hover:border-cinnamon/60"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-vanilla text-cinnamon mb-4">
                {uploadMut.isPending ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Upload className="h-6 w-6" />
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-espresso">
                  {uploadMut.isPending ? "Uploading your files..." : "Drag and drop your images here"}
                </p>
                <p className="text-xs text-admin-muted">
                  {!uploadMut.isPending && (
                    <>
                      or{" "}
                      <button
                        type="button"
                        onClick={triggerBrowse}
                        className="text-cinnamon font-semibold underline hover:text-espresso cursor-pointer focus:outline-none"
                      >
                        browse
                      </button>{" "}
                      to select files
                    </>
                  )}
                </p>
              </div>
              <p className="text-[11px] font-mono text-admin-muted mt-3 uppercase tracking-wider">
                Images only (PNG, JPG, WEBP up to 5MB)
              </p>
            </div>

            {/* Images Grid */}
            <div className="space-y-4">
              <h3 className="font-display text-lg text-espresso flex items-center gap-2">
                Uploaded Images{" "}
                <span className="font-mono text-xs text-admin-muted">
                  ({images.length})
                </span>
              </h3>

              {images.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-border text-center p-6">
                  <ImageIcon className="h-8 w-8 text-admin-muted mb-2" />
                  <p className="text-sm font-medium text-espresso">No images uploaded yet</p>
                  <p className="text-xs text-admin-muted mt-1">
                    Upload product images to showcase them in the store.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {images.map((img) => {
                    const isPrimary = img.id === primaryImageId;
                    return (
                    <div
                      key={img.id}
                      className="group relative aspect-square rounded-lg border border-border bg-muted overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
                    >
                      {/* Image element */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={img.alt_text || product?.name || "Product image"}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />

                      {/* Primary Badge */}
                      {isPrimary && (
                        <div className="absolute top-2 left-2 z-10 bg-golden text-white font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
                          Primary
                        </div>
                      )}

                      {/* Hover Actions Bar (Delete button on bottom right) */}
                      <div className="absolute bottom-2 right-2 z-10 transition-opacity duration-300 opacity-0 group-hover:opacity-100">
                        <button
                          type="button"
                          disabled={deleteMut.isPending}
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this image?")) {
                              deleteMut.mutate(img.id);
                            }
                          }}
                          className="p-1.5 rounded-full bg-black/40 hover:bg-sienna text-white transition-all shadow"
                          title="Delete image"
                        >
                          <Trash2 className="h-4 w-4" />
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
