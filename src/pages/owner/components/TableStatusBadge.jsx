import { Circle } from "lucide-react";

export default function TableStatusBadge({ occupied }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${occupied ? "bg-brick/10 text-brick" : "bg-herb/10 text-herb"}`}>
      <Circle size={8} fill="currentColor" />
      {occupied ? "مشغولة" : "متاحة"}
    </span>
  );
}
