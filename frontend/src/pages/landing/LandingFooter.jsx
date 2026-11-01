import { Link } from "react-router-dom";
import Logo from "../../components/brand/Logo";
import LanguageSwitch from "../../components/ui/LanguageSwitch";
import { c, landingCopy } from "./landing-data";

export default function LandingFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-container lp-footer-inner">
        <Link to="/" aria-label={c("menuPilot، الصفحة الرئيسية", "menuPilot home")}>
          <Logo on="dark" height={32} />
        </Link>
        <nav aria-label={c("روابط إضافية", "More links")}>
          <a href="#journey">{landingCopy.navigation.find((item) => item.href === "#journey")?.label}</a>
          <a href="#platform">{landingCopy.navigation.find((item) => item.href === "#platform")?.label}</a>
          <Link to="/login">{landingCopy.footer.login}</Link>
        </nav>
        <LanguageSwitch tone="dark" />
        <p>© {new Date().getFullYear()} menuPilot · {landingCopy.footer.copyright}</p>
      </div>
      <span className="lp-ghost-wordmark" aria-hidden="true">menuPilot</span>
    </footer>
  );
}
