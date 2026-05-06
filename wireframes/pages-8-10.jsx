/* Pages 8-10: Solo browser, Profile/stats, Settings */

const { Frame, Variation, Page, Anno, FrameLogo, Av } = window.WF;

/* ============================================================
 * 08 — SINGLE-PLAYER GAMES BROWSER
 * ============================================================ */
const PageSolo = ({ active }) => (
  <Page id="p-solo" active={active}
    title="08 — Single-Player Browser"
    desc="Today: a card grid that opens an iframe. Three takes: practice-arcade vibe with daily challenge, library with personal stats, and a learning path that orders games by skill.">

    <Variation letter="A" name="Arcade with daily"
      rationale="Daily challenge banner up top (drives return visits), then the games. Simple & friendly.">
      <Frame kind="desktop">
        <div className="sk-row" style={{ justifyContent: "space-between" }}>
          <div className="sk-h2">Solo arcade</div>
          <button className="sk-btn ghost sm">← back to menu</button>
        </div>
        <div className="sk-card tinted" style={{ marginTop: 8, padding: 12 }}>
          <div className="sk-row">
            <div className="flex1">
              <div className="sk-mono">📅 daily challenge · resets in 4h 12m</div>
              <div className="sk-h2" style={{ marginTop: 2 }}>Flexbox Spider — beat 00:42</div>
              <div className="sk-mono" style={{ fontSize: 11 }}>your streak: 🔥 3 days · 142 players today</div>
            </div>
            <button className="sk-btn primary">▶ Play</button>
          </div>
        </div>
        <div className="sk-grid-3" style={{ marginTop: 12, gap: 10 }}>
          {[["⌨️","Code Typer","wpm: 64"],["🕷️","Flexbox Spider","23/40 levels"],["🤖","Escape the Loop","12/30 levels"]].map(([i,n,s],idx)=>(
            <div key={idx} className="sk-card" style={{ padding: 10 }}>
              <div className="sk-ph" style={{ height: 70 }}>cover</div>
              <div className="sk-h3" style={{ marginTop: 6 }}>{i} {n}</div>
              <div className="sk-mono" style={{ fontSize: 11 }}>{s}</div>
              <button className="sk-btn sm" style={{ width: "100%", marginTop: 6 }}>Play ›</button>
            </div>
          ))}
        </div>
      </Frame>
    </Variation>

    <Variation letter="B" name="Library with stats"
      rationale="Each game shows your personal best inline. Filter by language. Good for repeat-players.">
      <Frame kind="desktop">
        <div className="sk-row" style={{ justifyContent: "space-between" }}>
          <div className="sk-h2">Solo library</div>
          <div className="sk-row gap-sm"><span className="sk-pill accent">all</span><span className="sk-pill ghost">js</span><span className="sk-pill ghost">py</span><span className="sk-pill ghost">css</span></div>
        </div>
        <ul className="sk-list" style={{ marginTop: 8 }}>
          {[
            ["⌨️","Code Typer","best 64 wpm · 2,300 lines","↑ 8 this week"],
            ["🕷️","Flexbox Spider","23/40 levels","new levels added"],
            ["🤖","Escape the Loop","12/30 levels","stuck on level 13"],
            ["🐛","Bug Hunt (solo)","beta · be the first","NEW"],
          ].map(([i,n,s,r],idx)=>(
            <li key={idx}>
              <span style={{ fontSize: 26 }}>{i}</span>
              <div className="flex1"><div className="sk-h3" style={{ fontSize: 16 }}>{n}</div><div className="sk-mono" style={{ fontSize: 11 }}>{s}</div></div>
              <span className="sk-pill ghost" style={{ fontSize: 11 }}>{r}</span>
              <button className="sk-btn sm">play</button>
            </li>
          ))}
        </ul>
        <Anno text="inline stats = no separate profile dive needed" top={130} right={10} width={150}/>
      </Frame>
    </Variation>

    <Variation letter="C" name="Skill path"
      rationale="Curriculum framing — beginner→advanced. Locks unlock as you progress. Best for onboarding.">
      <Frame kind="desktop">
        <div className="sk-h2">Sharpen your skills</div>
        <div className="sk-mono">a path through the solo games</div>
        <div style={{ marginTop: 12, position: "relative" }}>
          <div style={{ position: "absolute", left: 28, top: 24, bottom: 24, width: 2, background: "var(--ink-faint)", borderLeft: "2px dashed var(--ink-faint)" }}></div>
          {[
            ["⌨️","Warm up: Code Typer","done","get comfortable typing snippets"],
            ["🕷️","Flexbox Spider","in progress","CSS layout fluency"],
            ["🤖","Escape the Loop","locked","control flow + drag-drop logic"],
            ["🏁","Boss: Bug Hunt","locked","apply everything"],
          ].map(([i,n,s,d],idx)=>(
            <div key={idx} className="sk-row" style={{ marginBottom: 10, position: "relative", zIndex: 1 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", border: "2px solid var(--rule)", background: s==="done"?"var(--accent)":(s==="in progress"?"var(--paper)":"var(--paper-2)"), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: s==="done"?"white":"var(--ink)" }}>{i}</div>
              <div className="flex1"><div className="sk-h3">{n}</div><div className="sk-mono" style={{ fontSize: 11 }}>{d}</div></div>
              <span className={`sk-pill ${s==="done"?"accent":(s==="locked"?"ghost":"")}`}>{s}</span>
            </div>
          ))}
        </div>
      </Frame>
    </Variation>
  </Page>
);

/* ============================================================
 * 09 — PROFILE / STATS / ACHIEVEMENTS
 * ============================================================ */
const PageProfile = ({ active }) => (
  <Page id="p-profile" active={active}
    title="09 — Profile / Stats"
    desc="New surface. Three takes: a card-album scrapbook, a stats-heavy dashboard, and a social profile (friends-first).">

    <Variation letter="A" name="Scrapbook"
      rationale="Achievements as a sticker album. Empty slots tease the next thing to earn. Playful & on-brand.">
      <Frame kind="desktop">
        <div className="sk-row">
          <Av initials="DC" size="lg"/>
          <div className="flex1" style={{ marginLeft: 10 }}>
            <div className="sk-h2">devCat42</div>
            <div className="sk-mono" style={{ fontSize: 12 }}>joined Mar 2026 · level 7 · 320/500 xp</div>
            <div style={{ height: 6, background: "var(--paper-2)", border: "1.5px solid var(--rule)", borderRadius: 4, marginTop: 4, overflow: "hidden" }}>
              <div style={{ width: "64%", height: "100%", background: "var(--accent)" }}></div>
            </div>
          </div>
          <button className="sk-btn ghost sm">edit</button>
        </div>
        <hr className="sk-divider"/>
        <div className="sk-h3">Stickers earned (12 / 32)</div>
        <div className="sk-grid-4" style={{ marginTop: 6, gap: 8 }}>
          {[["🐛","first bug",1],["🃏","decider×10",1],["⚔️","100 wpm",1],["🕷️","spider master",1],["🔥","3-day streak",1],["🎙","loud one",1],["?","?",0],["?","?",0],["?","?",0],["?","?",0],["?","?",0],["?","?",0]].map(([i,n,on],idx)=>(
            <div key={idx} className={`sk-card ${on?"":"dashed"}`} style={{ padding: 6, textAlign: "center", opacity: on?1:0.5 }}>
              <div style={{ fontSize: 22 }}>{i}</div>
              <div className="sk-mono" style={{ fontSize: 10 }}>{n}</div>
            </div>
          ))}
        </div>
        <Anno text="locked stickers stay visible — gentle 'next'" top={170} right={10} width={140}/>
      </Frame>
    </Variation>

    <Variation letter="B" name="Stats dashboard"
      rationale="Per-game numbers, win rates, sparklines. Power-user-flavored.">
      <Frame kind="desktop">
        <div className="sk-row"><Av initials="DC" size="lg"/><div className="flex1" style={{ marginLeft: 10 }}><div className="sk-h2">devCat42</div><div className="sk-mono" style={{ fontSize: 11 }}>147 games · 38 wins · 26% rate</div></div></div>
        <div className="sk-grid-3" style={{ marginTop: 10, gap: 8 }}>
          {[["games","147","↑ 12 wk"],["wins","38","26%"],["best wpm","64","↑ 4"],["fav game","🐛 Bug","68 plays"],["solo levels","35","of 70"],["streak","3 days","🔥"]].map(([k,v,r],idx)=>(
            <div key={idx} className="sk-card" style={{ padding: 8 }}>
              <div className="sk-mono" style={{ fontSize: 10 }}>{k}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700 }}>{v}</div>
              <div className="sk-mono" style={{ fontSize: 10, color: "var(--ink-faint)" }}>{r}</div>
            </div>
          ))}
        </div>
        <hr className="sk-divider"/>
        <div className="sk-h3">Activity</div>
        <div className="sk-card" style={{ padding: 10 }}>
          <div className="sk-row" style={{ alignItems: "flex-end", height: 70, gap: 4 }}>
            {[40,55,30,70,90,45,60,75,50,80,65,90,55,70].map((h,i)=>(
              <div key={i} style={{ flex: 1, height: `${h}%`, background: i>10?"var(--accent)":"var(--ink)", borderRadius: 2 }}></div>
            ))}
          </div>
          <div className="sk-mono center" style={{ fontSize: 10, marginTop: 4 }}>last 14 days · games per day</div>
        </div>
      </Frame>
    </Variation>

    <Variation letter="C" name="Social-first"
      rationale="Friends + recent rooms front. Stats secondary. Encourages 'rejoin' loops.">
      <Frame kind="desktop">
        <div className="sk-row"><Av initials="DC" size="lg"/><div className="flex1" style={{ marginLeft: 10 }}><div className="sk-h2">devCat42</div><div className="sk-mono" style={{ fontSize: 11 }}>lvl 7 · 23 friends · 4 online</div></div><button className="sk-btn sm">share profile</button></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
          <div className="sk-card">
            <div className="sk-h3">Friends</div>
            <ul className="sk-list" style={{ fontSize: 13 }}>
              <li><Av initials="JS" size="sm"/>jstack <span className="sk-pill dot" style={{ marginLeft: "auto" }}>K3PL9X</span><button className="sk-btn sm primary">join</button></li>
              <li><Av initials="KL" size="sm"/>klutz <span className="sk-mono" style={{ marginLeft: "auto", fontSize: 11 }}>idle</span><button className="sk-btn sm ghost">poke</button></li>
              <li><Av initials="MR" size="sm"/>mrobot <span className="sk-mono" style={{ marginLeft: "auto", fontSize: 11 }}>offline</span><button className="sk-btn sm ghost">msg</button></li>
              <li><Av initials="++" size="sm"/>+ add by handle</li>
            </ul>
          </div>
          <div className="sk-card">
            <div className="sk-h3">Recent rooms</div>
            <ul className="sk-list" style={{ fontSize: 13 }}>
              <li><span className="sk-mono">K3PL9X</span><span style={{ flex: 1, marginLeft: 6 }}>🐛 Bug Fixer</span><span className="sk-mono" style={{ fontSize: 10 }}>2m ago</span></li>
              <li><span className="sk-mono">7M2B4D</span><span style={{ flex: 1, marginLeft: 6 }}>🃏 Logic CAH</span><span className="sk-mono" style={{ fontSize: 10 }}>yest</span></li>
              <li><span className="sk-mono">QQ41ZZ</span><span style={{ flex: 1, marginLeft: 6 }}>⚔️ Code Typer</span><span className="sk-mono" style={{ fontSize: 10 }}>3d</span></li>
            </ul>
            <hr className="sk-divider"/>
            <div className="sk-h3">Stats peek</div>
            <div className="sk-mono" style={{ fontSize: 12 }}>147 games · 38 wins · 64 wpm</div>
            <button className="sk-btn ghost sm" style={{ marginTop: 6 }}>see all stats →</button>
          </div>
        </div>
      </Frame>
    </Variation>
  </Page>
);

/* ============================================================
 * 10 — SETTINGS
 * ============================================================ */
const PageSettings = ({ active }) => (
  <Page id="p-settings" active={active}
    title="10 — Settings"
    desc="Audio, video, accessibility, account. Three takes: classic sectioned form, in-context drawer (settings overlay anywhere), and quick-toggle command palette.">

    <Variation letter="A" name="Sectioned form"
      rationale="Familiar settings page. Left nav, right panel. Easy to add categories.">
      <Frame kind="desktop">
        <div className="sk-h2">Settings</div>
        <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 12, marginTop: 8 }}>
          <ul className="sk-list" style={{ fontSize: 14 }}>
            <li><span className="sk-pill accent">audio</span></li>
            <li>display</li>
            <li>accessibility</li>
            <li>controls</li>
            <li>account</li>
            <li>about</li>
          </ul>
          <div className="sk-card">
            <div className="sk-h3">Audio</div>
            <hr className="sk-divider"/>
            {[["master","80"],["music","60"],["sfx","90"],["voices","70"]].map(([k,v],idx)=>(
              <div key={idx} className="sk-row" style={{ marginBottom: 8 }}>
                <span style={{ width: 80 }} className="sk-mono">{k}</span>
                <div style={{ flex: 1, height: 6, background: "var(--paper-2)", border: "1.5px solid var(--rule)", borderRadius: 4, position: "relative" }}>
                  <div style={{ width: v+"%", height: "100%", background: "var(--ink)", borderRadius: 4 }}></div>
                  <div style={{ position: "absolute", left: `calc(${v}% - 8px)`, top: -4, width: 14, height: 14, background: "var(--accent)", borderRadius: "50%", border: "2px solid var(--rule)" }}></div>
                </div>
                <span className="sk-mono" style={{ width: 30, textAlign: "right" }}>{v}</span>
              </div>
            ))}
            <hr className="sk-divider"/>
            <div className="sk-row"><span className="flex1">Mute when tab inactive</span><span className="sk-pill accent">on</span></div>
            <div className="sk-row" style={{ marginTop: 4 }}><span className="flex1">Push-to-talk key</span><span className="sk-pill"><span className="sk-mono">⎵ space</span></span></div>
          </div>
        </div>
      </Frame>
    </Variation>

    <Variation letter="B" name="Drawer overlay"
      rationale="Settings slide in over current page — never lose context. Better for mid-game tweaks.">
      <Frame kind="desktop">
        {/* faded background of a lobby */}
        <div style={{ opacity: 0.3 }}>
          <FrameLogo small/>
          <div className="sk-h2 center" style={{ marginTop: 60 }}>(lobby in background)</div>
        </div>
        <div style={{ position: "absolute", top: 0, right: 0, width: "55%", height: "100%", background: "var(--paper)", borderLeft: "2.5px solid var(--rule)", padding: 18, overflow: "auto" }}>
          <div className="sk-row"><div className="sk-h2 flex1">Settings</div><button className="sk-btn sm">✕</button></div>
          <div className="sk-row gap-sm" style={{ marginTop: 6, flexWrap: "wrap" }}>
            <span className="sk-pill accent">audio</span><span className="sk-pill ghost">display</span><span className="sk-pill ghost">a11y</span><span className="sk-pill ghost">account</span>
          </div>
          <hr className="sk-divider"/>
          <div className="sk-stack" style={{ gap: 10 }}>
            <div className="sk-row"><span className="flex1">Master volume</span><span className="sk-mono">80</span></div>
            <div className="sk-row"><span className="flex1">Reduced motion</span><span className="sk-pill">on</span></div>
            <div className="sk-row"><span className="flex1">Color-blind mode</span><span className="sk-pill ghost">off</span></div>
            <div className="sk-row"><span className="flex1">Font size</span><span className="sk-pill">A·</span></div>
            <div className="sk-row"><span className="flex1">Streamer mode (hide codes)</span><span className="sk-pill">on</span></div>
            <div className="sk-row"><span className="flex1">High-contrast frames</span><span className="sk-pill ghost">off</span></div>
          </div>
        </div>
        <Anno text="adjust mid-game w/o leaving the lobby" top={20} left={10} width={140}/>
      </Frame>
    </Variation>

    <Variation letter="C" name="Command palette"
      rationale="Cmd-K everywhere. Type to find a setting. Power-user, dev-flavored.">
      <Frame kind="desktop">
        <div style={{ opacity: 0.25 }}>
          <FrameLogo small/>
          <div className="sk-h2 center" style={{ marginTop: 60 }}>(any page in background)</div>
        </div>
        <div style={{ position: "absolute", top: "20%", left: "15%", width: "70%", background: "var(--paper)", border: "2.5px solid var(--rule)", borderRadius: 12, padding: 12, boxShadow: "0 8px 30px rgba(0,0,0,0.2)" }}>
          <div className="sk-row" style={{ alignItems: "center" }}>
            <span className="sk-mono" style={{ marginRight: 6 }}>⌘K</span>
            <div className="sk-input filled flex1" style={{ border: "none", padding: 4 }}>set volume to 50<span className="caret"></span></div>
            <span className="sk-mono" style={{ fontSize: 11 }}>esc to close</span>
          </div>
          <hr className="sk-divider"/>
          <ul className="sk-list" style={{ fontSize: 14 }}>
            <li className="sk-card tinted" style={{ border: "none", padding: 6 }}><span className="sk-mono">▸</span><span className="flex1">Set master volume → 50</span><span className="sk-mono">↵</span></li>
            <li><span>Set music volume → 50</span></li>
            <li><span>Toggle reduced motion</span></li>
            <li><span>Open audio settings...</span></li>
            <li><span>Sign out</span></li>
          </ul>
        </div>
      </Frame>
    </Variation>
  </Page>
);

window.WFPages = window.WFPages || {};
Object.assign(window.WFPages, { PageSolo, PageProfile, PageSettings });
