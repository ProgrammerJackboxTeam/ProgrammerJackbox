/* Pages 1-4: Landing, Main menu, Host lobby, Join by code */

const { Frame, Variation, Page, Anno, FrameLogo, CodeBox, Dots, Av, PlayerRow } = window.WF;

/* ============================================================
 * 01 — LANDING / NAME ENTRY
 * ============================================================ */
const PageLanding = ({ active }) => (
  <Page id="p-landing" active={active}
    title="01 — Landing / Name Entry"
    desc="First touchpoint. Today: a tiny centered card. Three takes: keep it minimal-but-warmer, give it party-game theatre, or fold name entry into the menu so first-time users see what they're getting into.">

    <Variation letter="A" name="Stripped & friendly"
      rationale="Closest to current. Adds a recent-name memory, randomized handle, and a one-line tagline so the page doesn't feel like a form.">
      <Frame kind="desktop">
        <div className="sk-stack" style={{ alignItems: "center", paddingTop: 30 }}>
          <FrameLogo />
          <div className="sk-mono" style={{ color: "var(--ink-faint)" }}>// party games for devs</div>
          <div style={{ width: "55%", marginTop: 18 }} className="sk-stack">
            <label className="sk-mono">enter your handle</label>
            <div className="sk-input filled">devCat42<span className="caret"></span></div>
            <div className="sk-row" style={{ justifyContent: "space-between" }}>
              <span className="sk-pill ghost">🎲 random</span>
              <span className="sk-mono" style={{ fontSize: 11 }}>last used: devCat42, sudoCorgi</span>
            </div>
            <button className="sk-btn primary" style={{ marginTop: 8 }}>Continue ›</button>
            <div className="sk-row" style={{ justifyContent: "center", marginTop: 4 }}>
              <span className="sk-mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                or <u>sign in</u> for stats &amp; friends
              </span>
            </div>
          </div>
        </div>
        <Anno text="random-handle die — solves the 'asdf' problem" top={120} right={20} width={150} />
      </Frame>
    </Variation>

    <Variation letter="B" name="Theatrical splash"
      rationale="Big animated logo, looping snippet of code that 'types in' the handle. Reads like a game title screen — sets a louder tone.">
      <Frame kind="desktop">
        <div className="sk-stack center" style={{ paddingTop: 18, gap: 14 }}>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 0.9 }}>PROGRAMMER<br/>JACKBOX</div>
          <div className="sk-mono" style={{ color: "var(--ink-faint)" }}>v0.4.1 — 6 games · 1–8 players</div>
          <div style={{ width: "60%", margin: "0 auto" }}>
            <div className="sk-card" style={{ background: "var(--ink)", color: "var(--paper)", padding: 14, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, textAlign: "left" }}>
              <span style={{ color: "#7fd1ae" }}>{">"}</span> login --as <span style={{ background: "var(--accent)", padding: "0 4px" }}>devCat42</span><span className="caret" style={{ background: "#fff" }}></span>
            </div>
            <button className="sk-btn accent" style={{ width: "100%", marginTop: 10 }}>▶ Press start</button>
          </div>
        </div>
      </Frame>
    </Variation>

    <Variation letter="C" name="No-gate combined"
      rationale="Drops the dedicated name screen — handle prompt sits inline above the menu. Removes a click for returning users.">
      <Frame kind="desktop">
        <FrameLogo />
        <div className="sk-row" style={{ marginTop: 14, gap: 10 }}>
          <div className="sk-input filled flex1" style={{ flex: 2 }}>
            <span className="sk-mono" style={{ marginRight: 6, color: "var(--ink-faint)" }}>@</span>devCat42
          </div>
          <button className="sk-btn">🎲</button>
          <button className="sk-btn ghost">avatar</button>
        </div>
        <div className="sk-grid-2" style={{ marginTop: 14, gap: 12 }}>
          <div className="sk-card"><div className="sk-h3">Host lobby</div><div className="sk-p">private room w/ code</div></div>
          <div className="sk-card"><div className="sk-h3">Quick play</div><div className="sk-p">random public room</div></div>
          <div className="sk-card dashed"><div className="sk-h3">Join by code</div><div className="sk-p">have a code?</div></div>
          <div className="sk-card dashed"><div className="sk-h3">Solo</div><div className="sk-p">single-player browser</div></div>
        </div>
        <Anno text="name + menu = 1 page, faster return" top={50} right={15} width={150} />
      </Frame>
    </Variation>
  </Page>
);

/* ============================================================
 * 02 — MAIN MENU / HUB
 * ============================================================ */
const PageMenu = ({ active }) => (
  <Page id="p-menu" active={active}
    title="02 — Main Menu / Hub"
    desc="Today: a stack of four buttons. Hub should also surface friends online, a 'rejoin last room', recent rooms, and what's hot. Three layouts ranging from minimal to dashboard.">

    <Variation letter="A" name="Big four tiles"
      rationale="Same four destinations, but as scannable tiles with mini-illustrations. Recent room banner pinned on top.">
      <Frame kind="desktop">
        <div className="sk-row" style={{ justifyContent: "space-between" }}>
          <FrameLogo small />
          <div className="sk-row" style={{ gap: 8 }}>
            <Av initials="DC" size="sm" /><span className="sk-mono">devCat42</span>
            <span className="sk-pill ghost">⚙</span>
          </div>
        </div>
        <div className="sk-card tinted" style={{ marginTop: 10, padding: 8 }}>
          <div className="sk-row">
            <span className="sk-mono">↻</span>
            <span style={{ flex: 1 }}>Rejoin <b>K3PL9X</b> — Bug Fixer in progress · 3 players</span>
            <button className="sk-btn sm primary">Rejoin</button>
          </div>
        </div>
        <div className="sk-grid-2" style={{ marginTop: 12, gap: 12 }}>
          <div className="sk-card"><div className="sk-h2">🏠 Host</div><div className="sk-p">Private lobby, share a code</div></div>
          <div className="sk-card"><div className="sk-h2">⚡ Quick play</div><div className="sk-p">Match into a public game</div></div>
          <div className="sk-card dashed"><div className="sk-h2">🔑 Join code</div><div className="sk-p">A friend gave you 6 chars</div></div>
          <div className="sk-card dashed"><div className="sk-h2">🎯 Solo</div><div className="sk-p">3 single-player titles</div></div>
        </div>
        <div className="sk-row" style={{ marginTop: 10, gap: 8, fontSize: 13 }}>
          <span className="sk-mono">friends online: </span>
          <Av initials="JS" size="sm"/><Av initials="KL" size="sm"/><Av initials="MR" size="sm"/>
          <span className="sk-mono">+2</span>
        </div>
      </Frame>
    </Variation>

    <Variation letter="B" name="Dashboard hub"
      rationale="Information-dense: hot game, friends, daily challenge, achievements peek. For users who play often.">
      <Frame kind="desktop">
        <div className="sk-row" style={{ justifyContent: "space-between" }}>
          <FrameLogo small />
          <div className="sk-row gap-sm">
            <span className="sk-pill">lvl 7</span>
            <span className="sk-pill ghost">320 xp</span>
            <Av initials="DC" size="sm"/>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10, marginTop: 10 }}>
          <div className="sk-stack">
            <div className="sk-card dark" style={{ padding: 12 }}>
              <div className="sk-mono" style={{ color: "var(--accent-soft)" }}>// hot tonight</div>
              <div className="sk-h2" style={{ color: "var(--paper)" }}>Logic CAH · 4 lobbies open</div>
              <button className="sk-btn accent sm" style={{ marginTop: 6 }}>Quick join</button>
            </div>
            <div className="sk-grid-3">
              <div className="sk-card sm"><div className="sk-h3">Host</div></div>
              <div className="sk-card sm"><div className="sk-h3">Join code</div></div>
              <div className="sk-card sm"><div className="sk-h3">Solo</div></div>
            </div>
            <div className="sk-card">
              <div className="sk-h3">📅 Daily — Flexbox Spider</div>
              <div className="sk-p">Beat 00:42. Streak: 3 days 🔥</div>
            </div>
          </div>
          <div className="sk-stack">
            <div className="sk-card">
              <div className="sk-h3">Friends</div>
              <ul className="sk-list" style={{ fontSize: 13 }}>
                <li><Av initials="JS" size="sm"/>jstack <span className="sk-pill dot" style={{ marginLeft: "auto" }}>K3PL9X</span></li>
                <li><Av initials="KL" size="sm"/>klutz <span className="sk-mono" style={{ marginLeft: "auto" }}>idle</span></li>
                <li><Av initials="MR" size="sm"/>mrobot <span className="sk-mono" style={{ marginLeft: "auto" }}>offline</span></li>
              </ul>
            </div>
            <div className="sk-card dashed">
              <div className="sk-h3">Recent rooms</div>
              <div className="sk-mono" style={{ fontSize: 11 }}>K3PL9X · 7M2B4D · QQ41ZZ</div>
            </div>
          </div>
        </div>
      </Frame>
    </Variation>

    <Variation letter="C" name="Console / terminal"
      rationale="Pure novelty — for the audience. Whole menu is a fake REPL. Risky but very on-brand.">
      <Frame kind="desktop">
        <div className="sk-card dark" style={{ height: "92%", padding: 14, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, lineHeight: 1.6 }}>
          <div style={{ color: "#9bd3a8" }}>pjbox v0.4 — type a command or pick:</div>
          <div style={{ color: "var(--paper)", marginTop: 6 }}>
            <div>[1] host          — open private lobby</div>
            <div>[2] quick         — random public lobby</div>
            <div>[3] join &lt;CODE&gt;  — join by 6-char code</div>
            <div>[4] solo          — single-player games</div>
            <div>[5] friends       — 3 online: jstack, klutz, mrobot</div>
            <div>[6] recent        — K3PL9X, 7M2B4D, QQ41ZZ</div>
            <div>[?] help          — what is this?</div>
          </div>
          <div style={{ color: "var(--accent)", marginTop: 10 }}>
            $ <span style={{ background: "rgba(255,255,255,0.15)" }}>quick</span><span className="caret" style={{ background: "#fff" }}></span>
          </div>
        </div>
        <Anno text="every action is also a button — cmd-K palette" top={60} right={15} width={150} />
      </Frame>
    </Variation>
  </Page>
);

/* ============================================================
 * 03 — HOST PRIVATE LOBBY (creation flow)
 * ============================================================ */
const PageHost = ({ active }) => (
  <Page id="p-host" active={active}
    title="03 — Host Private Lobby"
    desc="The 'I just clicked Host' state — before others have joined. Three ways to handle setup: defer everything, configure first, or pre-pick a game so the share link advertises what you're playing.">

    <Variation letter="A" name="Code-first, decide later"
      rationale="Generates code immediately. Share, then pick a game once people arrive — matches Jackbox cadence.">
      <Frame kind="desktop">
        <div className="sk-row" style={{ justifyContent: "space-between" }}>
          <FrameLogo small />
          <span className="sk-pill ghost">private lobby</span>
        </div>
        <div className="sk-row" style={{ marginTop: 14, gap: 18, alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div className="sk-mono">share code</div>
            <CodeBox code="K3PL9X" />
            <div className="sk-row" style={{ marginTop: 8, gap: 6 }}>
              <button className="sk-btn sm">📋 copy</button>
              <button className="sk-btn sm">🔗 link</button>
              <button className="sk-btn sm ghost">regenerate</button>
            </div>
          </div>
          <div style={{ width: 110, textAlign: "center" }}>
            <div className="sk-qr" style={{ margin: "0 auto" }}></div>
            <div className="sk-mono" style={{ fontSize: 10, marginTop: 4 }}>scan to join</div>
          </div>
        </div>
        <hr className="sk-divider" />
        <div className="sk-h3">Players (1/8)</div>
        <ul className="sk-list">
          <PlayerRow initials="DC" name="devCat42" host you ready={true}/>
          <li style={{ color: "var(--ink-faint)" }}>· · · waiting for players · · ·</li>
        </ul>
        <div className="sk-row" style={{ marginTop: 10, gap: 8 }}>
          <button className="sk-btn ghost">+ invite friends</button>
          <button className="sk-btn primary mt-a" style={{ marginLeft: "auto" }}>Pick a game ›</button>
        </div>
      </Frame>
    </Variation>

    <Variation letter="B" name="Configure-then-share"
      rationale="Lobby settings (privacy, max players, mic, spectators) up front. Code only appears after host confirms — fewer surprises.">
      <Frame kind="desktop">
        <FrameLogo small />
        <div className="sk-h2" style={{ marginTop: 8 }}>Set up your lobby</div>
        <div className="sk-grid-2" style={{ gap: 10, marginTop: 6 }}>
          <div className="sk-card">
            <div className="sk-mono">privacy</div>
            <div className="sk-row" style={{ gap: 6, marginTop: 4 }}>
              <span className="sk-pill accent">private</span>
              <span className="sk-pill ghost">friends-only</span>
              <span className="sk-pill ghost">public</span>
            </div>
          </div>
          <div className="sk-card">
            <div className="sk-mono">max players</div>
            <div className="sk-row" style={{ gap: 6, marginTop: 4 }}>
              <span className="sk-pill ghost">4</span><span className="sk-pill ghost">6</span>
              <span className="sk-pill accent">8</span><span className="sk-pill ghost">12</span>
            </div>
          </div>
          <div className="sk-card">
            <div className="sk-mono">spectators</div>
            <div className="sk-row" style={{ gap: 6, marginTop: 4 }}>
              <span className="sk-pill accent">allow</span>
              <span className="sk-pill ghost">block</span>
            </div>
          </div>
          <div className="sk-card">
            <div className="sk-mono">voice chat</div>
            <div className="sk-row" style={{ gap: 6, marginTop: 4 }}>
              <span className="sk-pill ghost">off</span>
              <span className="sk-pill accent">push-to-talk</span>
              <span className="sk-pill ghost">always</span>
            </div>
          </div>
        </div>
        <button className="sk-btn primary" style={{ width: "100%", marginTop: 12 }}>Create lobby ›</button>
        <Anno text="settings BEFORE code = no mid-game scrambling" top={70} right={15} width={150} />
      </Frame>
    </Variation>

    <Variation letter="C" name="Pick game first"
      rationale="Game choice frames everything else (min players, settings). Share message says 'devCat42 is hosting Bug Fixer'.">
      <Frame kind="desktop">
        <FrameLogo small />
        <div className="sk-h2" style={{ marginTop: 8 }}>What are we playing?</div>
        <div className="sk-grid-3" style={{ gap: 8, marginTop: 6 }}>
          {[["🐛","Bug Fixer","3+"],["🃏","Logic CAH","4+"],["⚔️","Code Typer","2+"],["🔍","Prophunt","4+"],["⌨️","Solo Typer","1"],["🤖","+ surprise","?"]].map(([i,n,p],idx)=>(
            <div key={idx} className={`sk-card ${idx===0?"":"dashed"}`} style={{ textAlign: "center", padding: 8 }}>
              <div style={{ fontSize: 22 }}>{i}</div>
              <div className="sk-h3" style={{ fontSize: 14 }}>{n}</div>
              <div className="sk-mono" style={{ fontSize: 10 }}>{p}</div>
            </div>
          ))}
        </div>
        <hr className="sk-divider"/>
        <div className="sk-row" style={{ alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <div className="sk-mono">share code</div>
            <CodeBox code="K3PL9X" size="sm"/>
          </div>
          <div className="sk-card tinted" style={{ flex: 1, marginLeft: 10, fontSize: 13 }}>
            "devCat42 is hosting <b>Bug Fixer</b> — join with K3PL9X"
          </div>
        </div>
      </Frame>
    </Variation>
  </Page>
);

/* ============================================================
 * 04 — JOIN BY CODE
 * ============================================================ */
const PageJoin = ({ active }) => (
  <Page id="p-join" active={active}
    title="04 — Join by Code"
    desc="Mostly used on phones — should feel as fast as Jackbox.tv. Three takes: oversized boxes optimized for thumbs, paste-friendly + QR, and inline-with-context (we tell you what game it is BEFORE you commit a name).">

    <Variation letter="A" name="6-box thumb keypad"
      rationale="Per-character boxes, autoadvance, big touch targets. Keyboard shows numbers + letters.">
      <Frame kind="phone">
        <div className="sk-h2 center">Join lobby</div>
        <div className="sk-mono center" style={{ color: "var(--ink-faint)", marginBottom: 14 }}>enter the 6-char code</div>
        <div className="sk-row" style={{ justifyContent: "center", gap: 4 }}>
          {["K","3","P","L","9","_"].map((c,i)=>(
            <div key={i} style={{ width: 36, height: 48, border: "2px solid var(--rule)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 22, background: i===5?"var(--paper-2)":"var(--paper)" }}>{c}</div>
          ))}
        </div>
        <button className="sk-btn ghost" style={{ width: "100%", marginTop: 14 }}>📷 scan QR instead</button>
        <div className="sk-mono center" style={{ marginTop: 18, color: "var(--ink-faint)", fontSize: 11 }}>recent: 7M2B4D · QQ41ZZ</div>
        <div className="sk-card dashed" style={{ marginTop: 18, padding: 6 }}>
          <div className="sk-grid-3" style={{ gap: 4, fontFamily: "'JetBrains Mono', monospace", textAlign: "center" }}>
            {["1","2","3","4","5","6","7","8","9","⌫","0","✓"].map((k,i)=>(
              <div key={i} style={{ padding: 8, border: "1.5px solid var(--ink-faint)", borderRadius: 6 }}>{k}</div>
            ))}
          </div>
        </div>
      </Frame>
    </Variation>

    <Variation letter="B" name="One field + paste/scan"
      rationale="One big field, autodetects pasted full URLs. Scan-QR primary on mobile.">
      <Frame kind="phone">
        <div className="sk-h2 center">Got a code?</div>
        <div className="sk-input filled" style={{ marginTop: 14, fontSize: 22, textAlign: "center", letterSpacing: 6, fontFamily: "'JetBrains Mono', monospace" }}>K3PL9X</div>
        <div className="sk-row" style={{ marginTop: 8, gap: 6 }}>
          <button className="sk-btn sm flex1">📋 paste</button>
          <button className="sk-btn sm flex1">📷 scan</button>
        </div>
        <button className="sk-btn primary" style={{ width: "100%", marginTop: 12 }}>Join ›</button>
        <hr className="sk-divider"/>
        <div className="sk-mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>recent rooms</div>
        <ul className="sk-list" style={{ fontSize: 14 }}>
          <li><span className="sk-mono">K3PL9X</span><span style={{ marginLeft: "auto", color: "var(--ink-faint)" }}>2 min ago · Bug Fixer</span></li>
          <li><span className="sk-mono">7M2B4D</span><span style={{ marginLeft: "auto", color: "var(--ink-faint)" }}>yesterday · Logic CAH</span></li>
        </ul>
      </Frame>
    </Variation>

    <Variation letter="C" name="Preview before commit"
      rationale="After typing the code, peek at lobby (game, host, count) BEFORE asking for name — reduces the 'wrong room?' panic.">
      <Frame kind="phone">
        <div className="sk-mono">step 2 of 2</div>
        <div className="sk-h2">Looks good?</div>
        <div className="sk-card" style={{ marginTop: 8 }}>
          <div className="sk-mono" style={{ fontSize: 11 }}>code</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, letterSpacing: 4 }}>K3PL9X</div>
          <hr className="sk-divider"/>
          <div className="sk-row"><span style={{ fontSize: 22 }}>🐛</span><div><div className="sk-h3">Bug Fixer</div><div className="sk-mono" style={{ fontSize: 11 }}>not started · 3/8 in</div></div></div>
          <div className="sk-row" style={{ marginTop: 8, gap: 4 }}>
            <Av initials="JS" size="sm"/><Av initials="KL" size="sm"/><Av initials="MR" size="sm"/>
            <span className="sk-mono" style={{ fontSize: 11 }}>jstack hosting</span>
          </div>
        </div>
        <div className="sk-mono" style={{ marginTop: 12 }}>your name</div>
        <div className="sk-input filled" style={{ marginTop: 4 }}>devCat42<span className="caret"></span></div>
        <button className="sk-btn primary" style={{ width: "100%", marginTop: 8 }}>Join as devCat42 ›</button>
        <button className="sk-btn ghost" style={{ width: "100%", marginTop: 6 }}>Spectate instead</button>
        <Anno text="spectate option: addresses 'I'm late, don't ruin the round'" bottom={-30} left={-180} width={170}/>
      </Frame>
    </Variation>
  </Page>
);

window.WFPages = window.WFPages || {};
Object.assign(window.WFPages, { PageLanding, PageMenu, PageHost, PageJoin });
