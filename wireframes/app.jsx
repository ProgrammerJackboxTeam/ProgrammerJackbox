/* Main app — tabs, state, tweaks panel */

const { useState, useEffect } = React;
const { useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakToggle, TweakSelect } = window;

const PAGES = [
  { id: "p-landing",  label: "Landing",         num: "01" },
  { id: "p-menu",     label: "Main menu",       num: "02" },
  { id: "p-host",     label: "Host lobby",      num: "03" },
  { id: "p-join",     label: "Join by code",    num: "04" },
  { id: "p-random",   label: "Random public",   num: "05" },
  { id: "p-lobby",    label: "Lobby",           num: "06" },
  { id: "p-hub",      label: "Game picker",     num: "07" },
  { id: "p-solo",     label: "Solo browser",    num: "08" },
  { id: "p-profile",  label: "Profile / stats", num: "09" },
  { id: "p-settings", label: "Settings",        num: "10" },
];

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "sketchy": "on",
  "annotations": "on",
  "theme": "paper",
  "frameMode": "auto"
}/*EDITMODE-END*/;

function App() {
  const [active, setActive] = useState("p-landing");
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  useEffect(() => {
    document.body.dataset.sketchy = tweaks.sketchy;
    document.body.dataset.annos = tweaks.annotations;
    document.body.dataset.theme = tweaks.theme;
    document.body.dataset.frame = tweaks.frameMode;
  }, [tweaks]);

  const P = window.WFPages;

  return (
    <>
      <div className="topnav">
        <div className="topnav-title">
          <span>Programmer Jackbox — wireframes</span>
          <span className="sub">// 10 pages × 3 variations · low-fi explore</span>
        </div>
        <div className="tabs" role="tablist">
          {PAGES.map(p => (
            <button
              key={p.id}
              className={`tab ${active === p.id ? "active" : ""}`}
              onClick={() => setActive(p.id)}
              data-screen-label={`${p.num} ${p.label}`}>
              <span className="num">{p.num}</span>{p.label}
            </button>
          ))}
        </div>
      </div>

      <main>
        <P.PageLanding  active={active === "p-landing"}/>
        <P.PageMenu     active={active === "p-menu"}/>
        <P.PageHost     active={active === "p-host"}/>
        <P.PageJoin     active={active === "p-join"}/>
        <P.PageRandom   active={active === "p-random"}/>
        <P.PageLobby    active={active === "p-lobby"}/>
        <P.PageHub      active={active === "p-hub"}/>
        <P.PageSolo     active={active === "p-solo"}/>
        <P.PageProfile  active={active === "p-profile"}/>
        <P.PageSettings active={active === "p-settings"}/>
      </main>

      <TweaksPanel title="Tweaks">
        <TweakSection title="Look">
          <TweakRadio
            label="Sketchy lines"
            value={tweaks.sketchy}
            onChange={v => setTweak("sketchy", v)}
            options={[{value: "on", label: "wobbly"}, {value: "off", label: "clean"}]}
          />
          <TweakRadio
            label="Theme"
            value={tweaks.theme}
            onChange={v => setTweak("theme", v)}
            options={[{value: "paper", label: "paper"}, {value: "light", label: "white"}, {value: "dark", label: "dark"}]}
          />
        </TweakSection>
        <TweakSection title="Notes">
          <TweakToggle
            label="Show annotations"
            value={tweaks.annotations === "on"}
            onChange={v => setTweak("annotations", v ? "on" : "off")}
          />
        </TweakSection>
        <TweakSection title="Frames">
          <TweakSelect
            label="Frame mode"
            value={tweaks.frameMode}
            onChange={v => setTweak("frameMode", v)}
            options={[
              {value: "auto", label: "auto (per page)"},
              {value: "desktop", label: "force desktop"},
              {value: "phone", label: "force phone"},
            ]}
          />
          <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 4, fontFamily: "'Inter', sans-serif" }}>
            Pages 04 (Join code) is mobile-first. Force phone to preview controller views.
          </div>
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
