import { Link } from "react-router-dom";
import Logo from "./Logo.jsx";
import { BRAND, telHref } from "../brand.js";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <Logo to={null} invert />
            <p style={{ marginTop: ".9rem", fontSize: ".88rem", maxWidth: "18rem" }}>
              {BRAND.blurb}
            </p>
          </div>

          <div>
            <h4>Cover</h4>
            <ul>
              <li><Link to="/#cover">Final expense</Link></li>
              <li><Link to="/#cover">Term life</Link></li>
              <li><Link to="/#cover">Whole life</Link></li>
              <li><Link to="/#cover">Mortgage protection</Link></li>
            </ul>
          </div>

          <div>
            <h4>Company</h4>
            <ul>
              <li><Link to="/#how">How it works</Link></li>
              <li><Link to="/news">News</Link></li>
              <li><Link to="/track">Check my request</Link></li>
              <li><Link to="/admin">Agent sign-in</Link></li>
            </ul>
          </div>

          <div>
            <h4>Talk to us</h4>
            <ul>
              <li><a href={telHref(BRAND.phone)}>{BRAND.phone}</a></li>
              <li><a href={`mailto:${BRAND.email}`}>{BRAND.email}</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} {BRAND.legal}. All rights reserved.</p>
          <p style={{ marginTop: ".5rem", color: "#7f93aa", fontSize: ".78rem", maxWidth: "52rem" }}>
            This site is for information only and is not an offer of insurance. Any cover is
            subject to eligibility, underwriting, carrier approval, and the terms of the policy
            issued. Products and availability vary by state.
          </p>
        </div>
      </div>
    </footer>
  );
}
