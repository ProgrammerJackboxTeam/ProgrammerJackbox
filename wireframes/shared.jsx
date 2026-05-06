/* Shared wireframe primitives + page wrappers */

const Chrome = ({ url = "programmerjackbox.local" }) => (
  <div className="frame-chrome">
    <span className="dot"></span>
    <span className="dot"></span>
    <span className="dot"></span>
    <span className="url">{url}</span>
  </div>
);

const Frame = ({ kind = "desktop", url, children, style }) => (
  <div className={`frame ${kind} sketchy`} style={style}>
    {kind === "desktop" && <Chrome url={url} />}
    <div className="frame-body">{children}</div>
  </div>
);

const Variation = ({ letter, name, rationale, children }) => (
  <div className="variation">
    <div className="variation-label">
      <span className="variation-letter">{letter}</span>
      <span className="variation-name">{name}</span>
    </div>
    <div className="variation-rationale">{rationale}</div>
    {children}
  </div>
);

const Page = ({ id, title, desc, children, active }) => (
  <section className={`page ${active ? "active" : ""}`} id={id}>
    <div className="page-header">
      <h2 className="page-title">{title}</h2>
      <p className="page-desc">{desc}</p>
    </div>
    <div className="variations">{children}</div>
  </section>
);

const Anno = ({ text, top, left, right, bottom, width }) => (
  <div className="anno" style={{ top, left, right, bottom, width }}>
    ↳ {text}
  </div>
);

// Tiny title block at the top of a frame
const FrameLogo = ({ small }) => (
  <div className="sk-row" style={{ alignItems: "baseline", gap: 8 }}>
    <span className="sk-mono" style={{ fontSize: small ? 10 : 12 }}>{"//"}</span>
    <span style={{ fontFamily: "'Caveat', cursive", fontWeight: 700, fontSize: small ? 18 : 22 }}>
      Programmer Jackbox
    </span>
  </div>
);

// 6-char room-code box (fake)
const CodeBox = ({ code = "K3PL9X", size = "md" }) => (
  <div className={`sk-code-display ${size === "sm" ? "sm" : ""}`}>{code}</div>
);

// little dot grid for "more"
const Dots = () => (
  <span style={{ letterSpacing: 4, color: "var(--ink-faint)" }}>···</span>
);

// Avatar with initials
const Av = ({ initials = "AB", size = "md", color }) => (
  <span className={`sk-avatar ${size === "lg" ? "lg" : size === "sm" ? "sm" : ""}`}
        style={{ background: color || "var(--paper-2)" }}>
    {initials}
  </span>
);

// Player row (used in lobby variants)
const PlayerRow = ({ initials, name, ready, host, you, mic }) => (
  <li>
    <Av initials={initials} size="sm" />
    <span style={{ flex: 1, display: "flex", gap: 6, alignItems: "center" }}>
      <span style={{ fontWeight: you ? 700 : 400 }}>{name}</span>
      {host && <span className="sk-pill ghost" style={{ fontSize: 11, padding: "0 6px" }}>host</span>}
      {you && <span className="sk-pill ghost" style={{ fontSize: 11, padding: "0 6px" }}>you</span>}
    </span>
    {mic === "on" && <span className="sk-mono" style={{ fontSize: 11 }}>🎙</span>}
    {ready === true && <span className="sk-pill dot" style={{ fontSize: 11, padding: "0 8px" }}>ready</span>}
    {ready === false && <span className="sk-pill ghost" style={{ fontSize: 11, padding: "0 8px" }}>...</span>}
  </li>
);

// Hand-drawn chevron
const Chev = () => <span style={{ marginLeft: 4 }}>›</span>;

window.WF = {
  Chrome, Frame, Variation, Page, Anno, FrameLogo, CodeBox, Dots, Av, PlayerRow, Chev,
};
