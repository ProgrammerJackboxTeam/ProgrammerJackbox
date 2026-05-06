/* Pages 5-7: Random public, Lobby, Game picker */

const { Frame, Variation, Page, Anno, FrameLogo, CodeBox, Av, PlayerRow } = window.WF;

/* ============================================================
 * 05 — JOIN RANDOM PUBLIC LOBBY (preferences)
 * ============================================================ */
const PageRandom = ({ active }) => (
  <Page id="p-random" active={active}
    title="05 — Join Random Public Lobby"
    desc="Today: a checklist of games. The job-to-be-done is 'find me a fun room fast'. Three takes: explicit checklist (current+), live browser of open rooms, and skill-based matchmaking with mood tags.">

    <Variation letter="A" name="Refined checklist"
      rationale="Same model as today, plus party-size, vibe tag, and 'spectate while waiting' so the wait isn't dead time.">
      <Frame kind="desktop">
        <div className="sk-row" style={{ justifyContent: "space-between" }}>
          <FrameLogo small/>
          <span className="sk-pill ghost">quick play</span>
        </div>
        <div className="sk-h2" style={{ marginTop: 10 }}>What sounds fun?</div>
        <div className="sk-grid-3" style={{ gap: 8, marginTop: 6 }}>
          {[["🐛","Bug Fixer",1],["🃏","Logic CAH",1],["⚔️","Code Typer",0],["🔍","Prophunt",1],["🤖","Optimizer",0],["✨","surprise",1]].map(([i,n,on],idx)=>(
            <div key={idx} className={`sk-card ${on?"tinted":"dashed"}`} style={{ textAlign: "center", padding: 8 }}>
              <div style={{ fontSize: 22 }}>{i}</div>
              <div className="sk-h3" style={{ fontSize: 13 }}>{n}</div>
              <div className="sk-mono" style={{ fontSize: 10 }}>{on?"☑":"☐"}</div>
            </div>
          ))}
        </div>
        <div className="sk-row" style={{ marginTop: 10, gap: 8 }}>
          <div className="sk-card flex1"><div className="sk-mono">party size</div>
            <div className="sk-row" style={{ gap: 4 }}><span className="sk-pill ghost">2-3</span><span className="sk-pill accent">4-6</span><span className="sk-pill ghost">7+</span></div>
          </div>
          <div className="sk-card flex1"><div className="sk-mono">vibe</div>
            <div className="sk-row" style={{ gap: 4, flexWrap: "wrap" }}><span className="sk-pill accent">chill</span><span className="sk-pill ghost">competitive</span><span className="sk-pill ghost">silly</span></div>
          </div>
        </div>
        <button className="sk-btn primary" style={{ width: "100%", marginTop: 12 }}>Find me a lobby ›</button>
      </Frame>
    </Variation>

    <Variation letter="B" name="Live room browser"
      rationale="Skip preferences — show actual open rooms with real headcounts. Power users prefer this.">
      <Frame kind="desktop">
        <div className="sk-row" style={{ justifyContent: "space-between" }}>
          <div className="sk-h2">Open public rooms</div>
          <div className="sk-row gap-sm"><span className="sk-pill ghost">filter</span><span className="sk-pill ghost">sort: filling</span><span className="sk-pill ghost">↻</span></div>
        </div>
        <ul className="sk-list" style={{ marginTop: 6 }}>
          {[
            ["🐛","Bug Fixer","5/8","mostly newbies","jstack",1],
            ["🃏","Logic CAH","6/8","🔥 filling fast","klutz",1],
            ["⚔️","Code Typer","2/4","wpm 60+","mrobot",0],
            ["🔍","Prophunt","4/8","python only","b1tBoss",1],
            ["🃏","Logic CAH","3/8","first-timers ok","sn00py",1],
          ].map(([i,n,p,t,h,on],idx)=>(
            <li key={idx}>
              <span style={{ fontSize: 22 }}>{i}</span>
              <span style={{ fontWeight: 700, width: 110 }}>{n}</span>
              <span className="sk-mono" style={{ fontSize: 12, width: 50 }}>{p}</span>
              <span className="sk-pill ghost" style={{ fontSize: 11 }}>{t}</span>
              <span className="sk-mono" style={{ marginLeft: "auto", fontSize: 11 }}>host: {h}</span>
              <button className={`sk-btn sm ${on?"primary":"ghost"}`}>{on?"join":"watch"}</button>
            </li>
          ))}
        </ul>
        <Anno text="'watch' = drop in as spectator if room is full" top={140} right={10} width={150}/>
      </Frame>
    </Variation>

    <Variation letter="C" name="Auto-match countdown"
      rationale="Pick a vibe + go. App matches in background, plays a 5-sec countdown, drops you straight in.">
      <Frame kind="desktop">
        <FrameLogo small/>
        <div className="sk-h2 center" style={{ marginTop: 30 }}>Matching you up...</div>
        <div className="center" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 64, fontWeight: 700, lineHeight: 1, marginTop: 10 }}>00:03</div>
        <div className="center sk-mono" style={{ color: "var(--ink-faint)", marginTop: 4 }}>scanning 12 public rooms · 47 players online</div>
        <div className="sk-card" style={{ marginTop: 18, padding: 10 }}>
          <div className="sk-mono">your prefs (tap to edit)</div>
          <div className="sk-row" style={{ marginTop: 4, gap: 4, flexWrap: "wrap" }}>
            <span className="sk-pill accent">Bug Fixer</span><span className="sk-pill accent">Logic CAH</span>
            <span className="sk-pill accent">chill</span><span className="sk-pill accent">4-6 players</span>
            <span className="sk-pill ghost">+ add</span>
          </div>
        </div>
        <button className="sk-btn ghost" style={{ width: "100%", marginTop: 10 }}>Cancel & host my own ›</button>
      </Frame>
    </Variation>
  </Page>
);

/* ============================================================
 * 06 — LOBBY (waiting room — most-used page)
 * ============================================================ */
const PageLobby = ({ active }) => (
  <Page id="p-lobby" active={active}
    title="06 — Lobby (waiting room)"
    desc="The most-used surface. Today's lobby crams every game's settings into one stack. Three takes: a clean two-pane (people | game), a TV+phone Jackbox layout (couch-friendly), and a queueable 'set list' for night-long sessions.">

    <Variation letter="A" name="Two-pane: people + game"
      rationale="Left: humans (avatars, ready, chat). Right: chosen game with its settings + start button. Chat surfaces lobby reactions/emotes.">
      <Frame kind="desktop">
        <div className="sk-row" style={{ justifyContent: "space-between" }}>
          <div className="sk-row gap-sm"><FrameLogo small/><span className="sk-pill ghost" style={{ marginLeft: 8 }}>private</span></div>
          <div className="sk-row gap-sm"><span className="sk-mono">code</span><b style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: 4 }}>K3PL9X</b><button className="sk-btn sm">📋</button><div className="sk-qr" style={{ width: 32, height: 32 }}></div></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 12, marginTop: 12 }}>
          <div className="sk-card" style={{ padding: 10 }}>
            <div className="sk-row"><div className="sk-h3 flex1">Players (4/8)</div><span className="sk-pill ghost">👁 1 watching</span></div>
            <ul className="sk-list">
              <PlayerRow initials="DC" name="devCat42" host you ready={true} mic="on"/>
              <PlayerRow initials="JS" name="jstack" ready={true}/>
              <PlayerRow initials="KL" name="klutz" ready={false}/>
              <PlayerRow initials="MR" name="mrobot" ready={true}/>
            </ul>
            <hr className="sk-divider"/>
            <div className="sk-mono" style={{ fontSize: 11 }}>chat</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              <div><b>jstack:</b> what is this 🐛 game</div>
              <div><b>klutz:</b> brb getting coffee ☕</div>
              <div><b>mrobot:</b> 🎉 🎉</div>
            </div>
            <div className="sk-input" style={{ marginTop: 6, fontSize: 14 }}>say something... <span className="caret"></span></div>
            <div className="sk-row" style={{ marginTop: 6, gap: 4 }}>
              {["👋","🔥","😂","🎉","💀","🤔"].map((e,i)=>(<span key={i} className="sk-pill ghost" style={{ fontSize: 16, padding: "0 8px" }}>{e}</span>))}
            </div>
          </div>
          <div className="sk-card" style={{ padding: 10 }}>
            <div className="sk-row"><span style={{ fontSize: 22 }}>🐛</span><div className="flex1"><div className="sk-h3">Bug Fixer</div><div className="sk-mono" style={{ fontSize: 11 }}>3+ players · selected by host</div></div><button className="sk-btn sm ghost">change</button></div>
            <hr className="sk-divider"/>
            <div className="sk-mono">settings</div>
            <div className="sk-stack" style={{ marginTop: 4, gap: 6, fontSize: 14 }}>
              <div className="sk-row"><span className="flex1">points to win</span><span className="sk-pill">5</span></div>
              <div className="sk-row"><span className="flex1">submit timer</span><span className="sk-pill ghost">off</span></div>
              <div className="sk-row"><span className="flex1">decider timer</span><span className="sk-pill ghost">off</span></div>
              <div className="sk-row"><span className="flex1">on timeout</span><span className="sk-pill">no point</span></div>
            </div>
            <button className="sk-btn accent" style={{ width: "100%", marginTop: 14 }}>▶ Start game (3/4 ready)</button>
            <div className="sk-mono center" style={{ fontSize: 11, marginTop: 4, color: "var(--ink-faint)" }}>klutz still 'brb'</div>
          </div>
        </div>
        <Anno text="reactions = lobby banter w/o full chat noise" top={250} left={10} width={150}/>
      </Frame>
    </Variation>

    <Variation letter="B" name="TV-style couch view"
      rationale="Optimized for sharing one screen on a TV. Big code + QR, players as cards, controls collapse into a footer.">
      <Frame kind="desktop">
        <div className="sk-row" style={{ alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div className="sk-mono">join at</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 700 }}>pjbox.live/K3PL9X</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 60, fontWeight: 700, letterSpacing: 12, marginTop: 6 }}>K3PL9X</div>
            <div className="sk-row" style={{ marginTop: 10 }}>
              <div className="sk-qr" style={{ width: 110, height: 110 }}></div>
              <div className="sk-mono" style={{ fontSize: 12, marginLeft: 10 }}>or scan →</div>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div className="sk-h3">Joined ({4})</div>
            <div className="sk-grid-2" style={{ gap: 6, marginTop: 4 }}>
              {[["DC","devCat42",true,true],["JS","jstack",true,false],["KL","klutz",false,false],["MR","mrobot",true,false],["+","",null,null],["+","",null,null]].map(([i,n,r,h],idx)=>(
                <div key={idx} className={`sk-card ${n?(r?"tinted":""):"dashed"}`} style={{ padding: 6, textAlign: "center" }}>
                  {n? <Av initials={i} size="lg"/> : <div className="sk-mono" style={{ fontSize: 20 }}>+</div>}
                  <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>{n||"empty"}</div>
                  {n && (h?<span className="sk-pill ghost" style={{ fontSize: 10 }}>host</span>:<span className="sk-pill" style={{ fontSize: 10, background: r?"#cdebd2":"var(--paper-2)" }}>{r?"ready":"..."}</span>)}
                </div>
              ))}
            </div>
          </div>
        </div>
        <hr className="sk-divider"/>
        <div className="sk-row">
          <span className="sk-pill">🐛 Bug Fixer</span>
          <span className="sk-mono" style={{ fontSize: 12, marginLeft: 8 }}>5 pts to win · timers off</span>
          <button className="sk-btn accent" style={{ marginLeft: "auto" }}>▶ Start</button>
        </div>
      </Frame>
    </Variation>

    <Variation letter="C" name="Set-list / queue"
      rationale="Pre-load 3 games as a queue. After each game, lobby returns and auto-advances. Less friction across a long session.">
      <Frame kind="desktop">
        <div className="sk-row" style={{ justifyContent: "space-between" }}><FrameLogo small/><span className="sk-pill ghost">private · K3PL9X</span></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 12, marginTop: 10 }}>
          <div className="sk-card">
            <div className="sk-h3">Players (4)</div>
            <ul className="sk-list">
              <PlayerRow initials="DC" name="devCat42" host you ready={true}/>
              <PlayerRow initials="JS" name="jstack" ready={true}/>
              <PlayerRow initials="KL" name="klutz" ready={false}/>
              <PlayerRow initials="MR" name="mrobot" ready={true}/>
            </ul>
          </div>
          <div className="sk-card">
            <div className="sk-h3">Tonight's set list</div>
            <ul className="sk-list" style={{ fontSize: 14 }}>
              <li><span className="sk-mono">1.</span><span style={{ fontSize: 20 }}>🐛</span><span className="flex1">Bug Fixer · 5 pts</span><span className="sk-pill accent">up next</span></li>
              <li><span className="sk-mono">2.</span><span style={{ fontSize: 20 }}>🃏</span><span className="flex1">Logic CAH · 7 rounds</span><span className="sk-mono">≡</span></li>
              <li><span className="sk-mono">3.</span><span style={{ fontSize: 20 }}>🔍</span><span className="flex1">Prophunt · 4 rounds</span><span className="sk-mono">≡</span></li>
              <li style={{ borderBottom: "none" }}><button className="sk-btn ghost sm">+ add a game</button></li>
            </ul>
            <button className="sk-btn accent" style={{ width: "100%", marginTop: 8 }}>▶ Start the night</button>
          </div>
        </div>
        <Anno text="auto-advance avoids the 'what next?' lull between games" bottom={10} left={10} width={170}/>
      </Frame>
    </Variation>
  </Page>
);

/* ============================================================
 * 07 — GAME PICKER / GAME HUB
 * ============================================================ */
const PageHub = ({ active }) => (
  <Page id="p-hub" active={active}
    title="07 — Game Picker / Game Hub"
    desc="Today: a card grid + a separate settings panel. Three takes: deck of cards + side detail, big hero with rotating spotlight, and a bracket-builder for sessions.">

    <Variation letter="A" name="Deck + detail panel"
      rationale="Left: scrollable game cards with availability gating. Right: focused detail with rules preview, settings, history. Scales to many games.">
      <Frame kind="desktop">
        <div className="sk-row" style={{ justifyContent: "space-between" }}><div className="sk-h2">Pick a game</div><span className="sk-mono">4 players in lobby</span></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 12, marginTop: 8 }}>
          <div className="sk-grid-2" style={{ gap: 8 }}>
            {[["🐛","Bug Fixer","3+","ready"],["🃏","Logic CAH","4+","need 1 more"],["⚔️","Code Typer","2+","ready"],["🔍","Prophunt","4+","ready"],["🤖","Optimizer","3+","ready"],["✨","Trivia","2+","beta"]].map(([i,n,p,s],idx)=>(
              <div key={idx} className={`sk-card ${idx===0?"tinted":(s.includes("need")?"dashed":"")}`} style={{ padding: 8 }}>
                <div className="sk-row"><span style={{ fontSize: 22 }}>{i}</span><div className="flex1"><div className="sk-h3" style={{ fontSize: 14 }}>{n}</div><div className="sk-mono" style={{ fontSize: 10 }}>{p} · {s}</div></div></div>
              </div>
            ))}
          </div>
          <div className="sk-card" style={{ padding: 10 }}>
            <div className="sk-row"><span style={{ fontSize: 30 }}>🐛</span><div className="flex1"><div className="sk-h2">Bug Fixer</div><div className="sk-mono" style={{ fontSize: 11 }}>3+ players · 10 min · cards-against-humanity-style</div></div></div>
            <hr className="sk-divider"/>
            <div className="sk-mono">how it works</div>
            <ol style={{ fontSize: 13, paddingLeft: 18, lineHeight: 1.5 }}>
              <li>One player is the <b>decider</b>; everyone else gets cards.</li>
              <li>Decider reads a buggy code prompt.</li>
              <li>Players play their best fix; decider picks a winner.</li>
            </ol>
            <hr className="sk-divider"/>
            <div className="sk-mono">settings</div>
            <div className="sk-stack" style={{ gap: 4, marginTop: 4, fontSize: 13 }}>
              <div className="sk-row"><span className="flex1">points to win</span><span className="sk-pill">5</span></div>
              <div className="sk-row"><span className="flex1">submit timer (s)</span><span className="sk-pill ghost">off</span></div>
              <div className="sk-row"><span className="flex1">decider timer (s)</span><span className="sk-pill ghost">off</span></div>
            </div>
            <button className="sk-btn accent" style={{ width: "100%", marginTop: 10 }}>Confirm & launch ›</button>
          </div>
        </div>
      </Frame>
    </Variation>

    <Variation letter="B" name="Hero spotlight"
      rationale="Big art for the focused game. Carousel below. Marketing-feel — best when adding new games matters.">
      <Frame kind="desktop">
        <div className="sk-card dark" style={{ padding: 18, height: "55%" }}>
          <div className="sk-row" style={{ alignItems: "flex-start" }}>
            <div className="flex1">
              <div className="sk-mono" style={{ color: "var(--accent-soft)" }}>// featured</div>
              <div style={{ fontFamily: "'Caveat', cursive", fontSize: 50, fontWeight: 700, lineHeight: 1, color: "var(--paper)" }}>Bug Fixer</div>
              <div style={{ color: "var(--paper)", fontSize: 13, opacity: 0.8, marginTop: 6, maxWidth: 320 }}>Pitch the funniest fix to the decider. Best with 4–6.</div>
              <div className="sk-row" style={{ marginTop: 10, gap: 6 }}>
                <span className="sk-pill ghost" style={{ color: "var(--paper)", borderColor: "var(--paper)" }}>3+ players</span>
                <span className="sk-pill ghost" style={{ color: "var(--paper)", borderColor: "var(--paper)" }}>10 min</span>
                <span className="sk-pill accent">play</span>
              </div>
            </div>
            <div className="sk-ph" style={{ width: 140, height: 100, color: "var(--paper)", borderColor: "var(--paper)" }}>game art</div>
          </div>
        </div>
        <div className="sk-row" style={{ gap: 8, marginTop: 10, overflow: "hidden" }}>
          {[["🃏","Logic CAH"],["⚔️","Code Typer"],["🔍","Prophunt"],["🤖","Optimizer"],["✨","Trivia"]].map(([i,n],idx)=>(
            <div key={idx} className="sk-card" style={{ minWidth: 120, padding: 8, textAlign: "center" }}>
              <div style={{ fontSize: 26 }}>{i}</div>
              <div className="sk-h3" style={{ fontSize: 13 }}>{n}</div>
            </div>
          ))}
        </div>
        <Anno text="rotates daily — drives discovery of new games" top={20} right={20} width={140}/>
      </Frame>
    </Variation>

    <Variation letter="C" name="Tournament builder"
      rationale="Pick 2-4 games and player pools — system runs a tournament with seeding. Big-group-friendly.">
      <Frame kind="desktop">
        <div className="sk-h2">Build a mini-tournament</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
          <div className="sk-card">
            <div className="sk-mono">round 1 — pick 2 games</div>
            <div className="sk-grid-3" style={{ marginTop: 4, gap: 6 }}>
              {[["🐛","Bug",1],["🃏","CAH",1],["⚔️","Typer",0],["🔍","Hunt",0]].map(([i,n,on],idx)=>(<div key={idx} className={`sk-card ${on?"tinted":"dashed"}`} style={{ padding: 6, textAlign: "center" }}><div>{i}</div><div style={{ fontSize: 11 }}>{n}</div></div>))}
            </div>
            <hr className="sk-divider"/>
            <div className="sk-mono">finals</div>
            <div className="sk-card dashed" style={{ padding: 6, textAlign: "center", marginTop: 4 }}>winners face off in <b>Code Typer Versus</b></div>
          </div>
          <div className="sk-card">
            <div className="sk-mono">bracket</div>
            <div className="sk-stack" style={{ marginTop: 4, fontSize: 13 }}>
              <div className="sk-row"><span style={{ width: 60 }} className="sk-mono">heat 1</span><span className="sk-pill">🐛 Bug</span><span className="sk-mono">→</span><span className="sk-mono">winner</span></div>
              <div className="sk-row"><span style={{ width: 60 }} className="sk-mono">heat 2</span><span className="sk-pill">🃏 CAH</span><span className="sk-mono">→</span><span className="sk-mono">winner</span></div>
              <div className="sk-row" style={{ marginLeft: 20 }}><span className="sk-mono">final</span><span className="sk-pill accent">⚔️ Typer</span></div>
            </div>
            <button className="sk-btn accent" style={{ width: "100%", marginTop: 10 }}>Start bracket ›</button>
          </div>
        </div>
      </Frame>
    </Variation>
  </Page>
);

window.WFPages = window.WFPages || {};
Object.assign(window.WFPages, { PageRandom, PageLobby, PageHub });
