/* Real screenshots of the app for the landing page, in the visitor's language. */
import { lang } from "../../../i18n";

export const shot = (name) => `/landing/${lang === "en" ? "en" : "ar"}-${name}.webp`;
