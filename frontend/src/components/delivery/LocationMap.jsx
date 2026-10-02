/* LocationMap.jsx — small OpenStreetMap embed with a marker (no API key). */
import { osmEmbedUrl } from "../../utils/maps";
import { t } from "../../i18n";

export default function LocationMap({ lat, lng, height = 180, title = t("موقع الزبون على الخريطة") }) {
  return (
    <iframe title={title} src={osmEmbedUrl(lat, lng)} loading="lazy" referrerPolicy="no-referrer"
      className="w-full rounded-xl border border-line" style={{ height }} />
  );
}
