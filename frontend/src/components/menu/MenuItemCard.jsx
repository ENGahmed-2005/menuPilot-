/* One dish on the customer menu, in the layout the restaurant chose: grid
   (two photo cards per row, the default), compact (small horizontal card),
   photo or text. The whole card opens the details; the + button adds one
   (the menu opens the details instead when the dish has extras). Used by the
   menu and by the branding preview. */
import { useState } from "react";
import { Plus, Utensils } from "lucide-react";
import { money } from "../../utils/format";
import { t } from "../../i18n";

function Thumb({ src, alt, tint, className, iconSize = 22 }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`grid place-items-center ${className}`} style={{ background: `${tint}1f` }} aria-hidden="true">
        <Utensils size={iconSize} style={{ color: tint }} />
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} className={`object-cover ${className}`} />;
}

export default function MenuItemCard({ item, style, brand, radius, count = 0, onOpen, onAdd }) {
  const priceColor = style.price_color === "text" ? brand.text_color : brand.primary_color;
  // A dish without a photo gets no empty box: the card simply has no image.
  const showImage = style.show_images && Boolean(item.imageUrl);
  const showDescription = style.show_descriptions && item.description;
  const surface = { background: style.surface_color, borderRadius: radius };
  // Grid cards use the reference's small rounded-square button; the others a round one.
  const square = style.layout === "grid";
  const add = (
    <button type="button" onClick={() => onAdd(item)} aria-label={t("إضافة {0} إلى السلة", { 0: item.name })}
      className={`pointer-events-auto relative z-10 grid shrink-0 place-items-center text-white shadow-sm transition-transform active:scale-90 ${square ? "h-10 w-10 rounded-xl" : "h-11 w-11 rounded-full"}`}
      style={{ background: brand.button_color }}>
      <Plus size={square ? 19 : 20} strokeWidth={2.5} aria-hidden="true" />
    </button>
  );
  const open = <button type="button" onClick={() => onOpen(item)} className="absolute inset-0 z-0" style={{ borderRadius: radius }} aria-label={t("تفاصيل {0}", { 0: item.name })} />;
  const badge = count > 0 && <span className="absolute start-2 top-2 z-[1] rounded-full bg-black/70 px-2 py-1 text-xs font-black leading-none text-white">×{count}</span>;
  const price = <span className="text-[15px] font-black tabular-nums" style={{ color: priceColor }}>{money(item.price)}</span>;

  if (style.layout === "text") {
    return (
      <div className="relative flex items-center gap-3 px-3 py-3" style={{ borderRadius: radius }}>
        {open}
        <div className="pointer-events-none min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h3 className="shrink-0 text-[15px] font-black leading-6">{item.name}{count > 0 && <span className="ms-1.5 text-xs font-black opacity-60">×{count}</span>}</h3>
            <span className="mb-1 min-w-4 flex-1 border-b border-dotted opacity-40" style={{ borderColor: brand.text_color }} aria-hidden="true" />
            {price}
          </div>
          {showDescription && <p className="mt-0.5 line-clamp-2 text-[13px] leading-5 opacity-70">{item.description}</p>}
        </div>
        {add}
      </div>
    );
  }

  if (style.layout === "photo" || style.layout === "grid") {
    const grid = style.layout === "grid";
    return (
      <div className="relative flex h-full flex-col overflow-hidden shadow-sm ring-1 ring-black/5" style={surface}>
        {open}
        {style.show_images && (
          <div className="pointer-events-none relative">
            <Thumb src={item.imageUrl} alt={item.name} tint={brand.primary_color} className={`w-full ${grid ? "aspect-[4/3]" : "aspect-[16/10]"}`} iconSize={grid ? 26 : 32} />
            {badge}
          </div>
        )}
        <div className={`pointer-events-none flex flex-1 flex-col ${grid ? "p-3" : "p-3.5"}`}>
          <h3 className={`line-clamp-2 font-black ${grid ? "min-h-10 text-[15px] leading-5" : "text-base leading-6"}`}>{item.name}</h3>
          {showDescription && !grid && <p className="mt-1 line-clamp-2 text-[13px] leading-5 opacity-70">{item.description}</p>}
          <div className="mt-auto flex items-center justify-between gap-2 pt-2">{price}{add}</div>
        </div>
      </div>
    );
  }

  // compact: a small horizontal card — image, text, and the + button at the
  // side, about 100px tall with a photo and 86px without.
  return (
    <div className={`relative flex items-center gap-3 p-2.5 shadow-sm ring-1 ring-black/5 ${style.image_side === "end" ? "flex-row-reverse" : ""}`} style={surface}>
      {open}
      {showImage && (
        <div className="pointer-events-none relative shrink-0">
          <Thumb src={item.imageUrl} alt={item.name} tint={brand.primary_color} className="h-20 w-20 rounded-xl" />
          {badge}
        </div>
      )}
      <div className="pointer-events-none min-w-0 flex-1">
        <h3 className="line-clamp-1 text-[15px] font-black leading-6">{item.name}{!showImage && count > 0 && <span className="ms-1.5 text-xs font-black opacity-60">×{count}</span>}</h3>
        {showDescription && <p className="line-clamp-1 text-[13px] leading-5 opacity-70">{item.description}</p>}
        <div className="mt-0.5">{price}</div>
      </div>
      {add}
    </div>
  );
}
