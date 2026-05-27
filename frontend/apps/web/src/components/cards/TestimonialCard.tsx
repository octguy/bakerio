import { Star } from "lucide-react";

interface TestimonialCardProps {
  name: string;
  date: string;
  rating: number;
  text: string;
  initials: string;
}

export default function TestimonialCard({
  name,
  date,
  rating,
  text,
  initials,
}: TestimonialCardProps) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm" aria-label={name}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-golden/20 text-sm font-bold text-golden">
          {initials}
        </div>
        <div>
          <p className="font-semibold text-espresso">{name}</p>
          <p className="text-xs text-warm-gray">{date}</p>
        </div>
      </div>
      <div className="mt-3 flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={14}
            className={i < rating ? "fill-golden text-golden" : "text-crust"}
          />
        ))}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-warm-gray">{text}</p>
    </div>
  );
}
