import { Link } from "react-router-dom";
import QuoteForm from "../components/QuoteForm.jsx";
import Reveal from "../components/Reveal.jsx";
import Counter from "../components/Counter.jsx";
import Faq from "../components/Faq.jsx";
import RingMark from "../components/RingMark.jsx";
import Estimator from "../components/Estimator.jsx";
import { useRef } from "react";
import { SplitText, Tilt, Magnetic, useScrollProgress } from "../components/Fx.jsx";
import { VelocityMarquee } from "../components/Parallax.jsx";
import CarrierMark from "../components/CarrierMark.jsx";
import { BRAND, telHref } from "../brand.js";

const goToQuote = () =>
  document.getElementById("quote")?.scrollIntoView({ behavior: "smooth", block: "center" });

const COVER = [
  { title: "Final expense", body: "Cover for burial, funeral and the bills a family is left with. Small policies, simple questions, often no exam.", icon: "heart" },
  { title: "Term life", body: "The most cover for the least money, for a set number of years. Right when there are children or a mortgage.", icon: "clock" },
  { title: "Whole life", body: "Cover that lasts your whole life and builds a cash value you can borrow against later.", icon: "shield" },
  { title: "Mortgage protection", body: "Pays off the balance so your family keeps the house if the earner is no longer there.", icon: "home" },
];

const STEPS = [
  { n: "01", title: "Tell us what you need", body: "About a minute of questions. No exam to book, nothing to sign, no card details." },
  { n: "02", title: "We compare the market", body: "We are independent, so we quote across multi-carriers instead of pushing one company's product." },
  { n: "03", title: "A licensed agent calls", body: "A real person talks you through what came back, in plain English, and you decide." },
];

const STATS = [
  { text: "Multi", label: "Carriers" },
  { to: 24, suffix: " hrs", label: "Typical first call" },
  { to: 0, prefix: "$", label: "Cost to get quoted" },
  { to: 50, label: "States served" },
];

/* The panel we place business with. `colour` is each carrier's own
   brand colour, so the row reads as ten distinct companies rather than
   ten identical chips. Add `src` to any of them to use a real logo file
   from client/public/carriers/ instead of the monogram. */
const CARRIERS = [
  { name: "Mutual of Omaha", initials: "MO", colour: "#0033a0", src: "/carriers/mutual-of-omaha.png" },
  { name: "Foresters",       initials: "F",  colour: "#00694e" },
  { name: "Americo",         initials: "A",  colour: "#c8102e" },
  { name: "Aetna",           initials: "Ae", colour: "#7d3f98" },
  { name: "Transamerica",    initials: "T",  colour: "#e4002b", src: "/carriers/transamerica.png" },
  { name: "Gerber Life",     initials: "G",  colour: "#0069aa", src: "/carriers/gerber-life.png" },
  { name: "Corebridge",      initials: "C",  colour: "#1b3fc4", src: "/carriers/corebridge.png" },
  { name: "Prudential",      initials: "P",  colour: "#0b4ea2" },
  { name: "Banner Life",     initials: "B",  colour: "#003da5", src: "/carriers/banner-life.png" },
  { name: "SBLI",            initials: "S",  colour: "#00457c", src: "/carriers/sbli.png" },
];

const VOICES = [
  { text: "I'd been putting it off for years because I assumed it would be complicated and expensive. It was neither. Twenty minutes on the phone and it was done.", who: "Denise R.", where: "Newark, NJ" },
  { text: "They actually told me I didn't need as much cover as I'd asked for. That's when I knew they weren't just selling me something.", who: "Marcus T.", where: "Atlanta, GA" },
  { text: "My husband passed in March. The claim was paid in under two weeks and I didn't have to chase anyone. That's what we paid for.", who: "Yolanda M.", where: "Houston, TX" },
];

const FAQS = [
  { q: "Will I need a medical exam?", a: "Often not. Plenty of the policies we place are approved on health questions alone, particularly final expense cover. Where an exam gives you a materially better rate we will tell you, and it is still your call." },
  { q: "How much does a quote cost?", a: "Nothing, and it puts you under no obligation. We are paid by the carrier when a policy is placed, not by you for advice." },
  { q: "Can I be turned down for my health?", a: "Some carriers will decline some conditions — but because we are independent we can take you to the ones that look at your situation most favourably, including guaranteed-issue cover that asks no health questions at all." },
  { q: "What happens after I submit the form?", a: "You get a reference number on screen straight away. A licensed agent reaches out, usually within a day. You can check exactly where your request stands any time using that number." },
  { q: "Do you sell my details to anyone?", a: "No. Your information is used to quote your cover and to contact you about it. We do not sell or share it with third-party marketers." },
];

export default function Home() {
  const heroRef = useRef(null);
  const p = useScrollProgress(heroRef);

  return (
    <>
      {/* ================= HERO ================= */}
      <section className="hero" ref={heroRef}>
        {/* Light in the room, not decoration on the page. */}
        <div className="aurora" aria-hidden="true">
          <span /><span /><span />
        </div>

        {/* The logo's own rings. They keep turning on their own, and the
            scroll position drives an extra turn and a slow zoom on top,
            so the mark reacts to the reader rather than ignoring them. */}
        <RingMark
          size={680}
          className="hero-rings"
          style={{ "--ring-turn": `${p * 90}deg`, "--ring-scale": 1 + p * 0.35 }}
        />

        <div className="wrap hero-grid">
          <div className="hero-anim">
            <p className="eyebrow" style={{ "--i": 0 }}>Independent insurance brokerage</p>

            <h1 style={{ "--i": 1 }}>
              <SplitText text="Coverage you can" delay={200} />{" "}
              <span className="grad"><SplitText text="count on" delay={420} /></span>
              <br />
              <SplitText text="Without the runaround." delay={560} />
            </h1>

            <p className="lede" style={{ "--i": 2 }}>{BRAND.blurb}</p>

            <ul className="hero-points" style={{ "--i": 3 }}>
              {["Multi-carriers", "No-exam options", "Plain English, always"].map((t) => (
                <li key={t}><Check /> {t}</li>
              ))}
            </ul>

            <div className="btn-row" style={{ "--i": 4, marginTop: "2.2rem" }}>
              <Magnetic>
                <a className="btn btn-primary btn-lg" href="#quote">
                  Get a free quote <span className="arrow">→</span>
                </a>
              </Magnetic>
              <Magnetic>
                <a className="btn btn-outline btn-lg" href={telHref(BRAND.phone)}>
                  <Phone /> {BRAND.phone}
                </a>
              </Magnetic>
            </div>
          </div>

          <div className="hero-card hero-anim" id="quote" style={{ "--i": 3 }}>
            <QuoteForm />
          </div>
        </div>
      </section>

      {/* ================= STATS ================= */}
      <div className="strip">
        <div className="wrap strip-in">
          {STATS.map((s, i) => (
            <Reveal className="strip-stat" key={s.label} i={i}>
              <strong>
                {/* A stat can be a word rather than a number — nothing to count up. */}
                {s.text ?? <Counter to={s.to} prefix={s.prefix || ""} suffix={s.suffix || ""} />}
              </strong>
              <span>{s.label}</span>
            </Reveal>
          ))}
        </div>
      </div>

      {/* ================= CARRIERS ================= */}
      <section style={{ padding: "clamp(2rem,4vw,3rem) 0", borderBottom: "1px solid var(--line)" }}>
        <div className="wrap">
          <p className="eyebrow" style={{ textAlign: "center", marginBottom: "1.4rem" }}>
            We shop these carriers for you
          </p>
        </div>
        <VelocityMarquee
          items={CARRIERS.map((c) => <CarrierMark key={c.name} {...c} />)}
        />
      </section>

      {/* ================= COVER ================= */}
      <section className="section" id="cover">
        <div className="wrap">
          <Reveal className="section-head">
            <p className="eyebrow">What we cover</p>
            <h2>The right policy depends on what you're protecting</h2>
            <p className="lede">
              Four kinds of cover handle almost every situation. If you aren't sure which one
              fits, that is exactly what the call is for.
            </p>
          </Reveal>

          <div className="grid grid-4">
            {COVER.map((c, i) => (
              <Reveal key={c.title} i={i}>
                <Tilt style={{ height: "100%" }}>
                  <article className="card card-hover">
                    <div className="card-icon"><Icon name={c.icon} /></div>
                    <h3>{c.title}</h3>
                    <p>{c.body}</p>
                  </article>
                </Tilt>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= ESTIMATOR ================= */}
      <section className="section section-alt">
        <div className="wrap">
          <Reveal className="section-head is-center">
            <p className="eyebrow">Try it yourself</p>
            <h2>See roughly what coverage costs</h2>
            <p className="lede">
              Move the sliders. No form, no email address, no phone call — just a sense of the
              numbers before you talk to anyone.
            </p>
          </Reveal>

          <Reveal variant="reveal-scale">
            <div className="card" style={{ padding: "clamp(1.6rem, 4vw, 2.6rem)" }}>
              <Estimator onQuote={goToQuote} />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section className="section section-alt" id="how">
        <div className="wrap">
          <Reveal className="section-head is-center">
            <p className="eyebrow">How it works</p>
            <h2>Three steps, and you can stop at any of them</h2>
          </Reveal>

          <div className="grid grid-3">
            {STEPS.map((s, i) => (
              <Reveal as="article" className="card" key={s.n} i={i}>
                <div className="step-num">{s.n}</div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </Reveal>
            ))}
          </div>

          <Reveal className="muted" style={{ textAlign: "center", marginTop: "2.2rem", fontSize: ".92rem" }}>
            Already sent a request? <Link to="/track">Check where it stands</Link> with your
            reference number.
          </Reveal>
        </div>
      </section>

      {/* ================= VOICES ================= */}
      <section className="section">
        <div className="wrap">
          <Reveal className="section-head is-center">
            <p className="eyebrow">What people say</p>
            <h2>Families who stopped putting it off</h2>
          </Reveal>

          <div className="grid grid-3">
            {VOICES.map((v, i) => (
              <Reveal as="figure" className="card quote-card" key={v.who} i={i}>
                <p>{v.text}</p>
                <figcaption className="quote-who">
                  <span className="quote-av" aria-hidden="true">{v.who.charAt(0)}</span>
                  <span>
                    <strong>{v.who}</strong>
                    <span>{v.where}</span>
                  </span>
                </figcaption>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section className="section section-alt">
        <div className="wrap" style={{ maxWidth: "52rem" }}>
          <Reveal className="section-head is-center">
            <p className="eyebrow">Questions</p>
            <h2>The things people ask before they call</h2>
          </Reveal>

          <Reveal>
            <Faq items={FAQS} />
          </Reveal>
        </div>
      </section>

      {/* ================= CLOSING CTA ================= */}
      <section className="section">
        <div className="wrap">
          <Reveal className="cta" variant="reveal-scale">
            <h2>Find out what you'd actually pay</h2>
            <p>
              A quote costs nothing and commits you to nothing. Most people are surprised how
              little good cover costs when it is bought properly.
            </p>
            <div className="btn-row">
              <a className="btn btn-white btn-lg" href="#quote">
                Get a free quote <span className="arrow">→</span>
              </a>
              <a className="btn btn-lg" href={telHref(BRAND.phone)}
                 style={{ background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,.35)" }}>
                <Phone /> {BRAND.phone}
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

/* ---- icons -------------------------------------------------------- */
const PATHS = {
  heart: <path d="M12 20s-6.5-4.2-6.5-9.2A3.7 3.7 0 0 1 12 8.3a3.7 3.7 0 0 1 6.5 2.5C18.5 15.8 12 20 12 20z" />,
  clock: <><circle cx="12" cy="12" r="8.2" /><path d="M12 7.4V12l3 1.9" /></>,
  shield: <><path d="M12 3.2l7 3v5.4c0 4.3-3 8-7 9.2-4-1.2-7-4.9-7-9.2V6.2z" /><path d="M9.4 12l1.9 1.9 3.4-3.6" /></>,
  home: <><path d="M4 10.8 12 4l8 6.8V19a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 19z" /><path d="M9.6 20.6v-6.2h4.8v6.2" /></>,
};

const Icon = ({ name }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
       strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {PATHS[name]}
  </svg>
);

const Check = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
       strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const Phone = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
       strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6.6 3.5h3l1.5 3.8-2 1.4a12.5 12.5 0 0 0 6.2 6.2l1.4-2 3.8 1.5v3a2 2 0 0 1-2.2 2A17.5 17.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z" />
  </svg>
);
