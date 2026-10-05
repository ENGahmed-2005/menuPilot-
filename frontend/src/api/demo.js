/* «Try it» demo restaurants (backend: DemoController). */
import { api, setToken } from "./client";
import { lang } from "../i18n";

const demoLang = lang === "ar" ? "ar" : "en";

/** Logs in as the demo's owner, kitchen, cashier or waiter; resolves to {token, user}. */
export async function startDemo(role) {
  const data = await api.post("/demo/session", { role, lang: demoLang });
  if (data?.token) setToken(data.token);
  return data;
}

/** The table a visitor opens as a guest: {table_code}. */
export const demoGuestTable = () => api.get(`/demo/guest?lang=${demoLang}`);
