import Image from "next/image";

interface ProductCardProps {
  name: string;
  price: number;
  image: string;
}

export default function ProductCard({ name, price, image }: ProductCardProps) {
  return (
    <div className="rounded-[10px] overflow-hidden bg-white shadow-[0_4px_16px_rgba(44,24,16,0.08)]" aria-label={name}>
      <div className="relative h-56 w-full">
        <Image src={image} alt={name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 25vw" />
      </div>
      <div className="p-4">
        <h3 className="font-[family-name:var(--font-display)] font-semibold text-espresso">{name}</h3>
        <p className="text-golden font-medium mt-1">
          {price.toLocaleString("vi-VN")}₫
        </p>
      </div>
    </div>
  );
}
