import Link from 'next/link';
import s from './landing.module.css';

export default function HomePage() {
  return (
    <div className={s.page}>
      {/* Beta band */}
      <div className={s.betaBand}>
        <span>● TestFlight beta · cohort 04 open</span>
        <span>·</span>
        <span>1,200 / 1,500 invites claimed</span>
        <span>·</span>
        <span>iOS 17+</span>
      </div>

      {/* Topbar */}
      <header className={s.topbar}>
        <div className={s.topbarInner}>
          <Link href="/" className={s.brand}>
            <span className={s.brandMark} /> MAXIM · FIT
          </Link>
          <nav className={s.topnav}>
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#evidence">Evidence</a>
            <a href="#faq">FAQ</a>
            <a className={`${s.btn} ${s.btnPrimary}`} href="#cta">
              Join Beta →
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className={s.hero}>
        <div className={s.heroGridBg} />
        <div className={s.heroGlow} />
        <div className={s.heroMeta}>
          <span className={s.heroMetaDot} />
          <span>v0.4.2 · TESTFLIGHT</span>
          <span>·</span>
          <span>UPDATED 28 APR 2026</span>
          <span>·</span>
          <span>1,247 PROTOCOLS RUNNING</span>
        </div>
        <div className={s.heroInner}>
          <div>
            <div className={s.tracked} style={{ color: 'var(--accent)' }}>
              Maxim · Fit
            </div>
            <h1 className={s.heroTitle}>
              Evidence-graded <em>protocols</em> for the body you&apos;re actually trying to build.
            </h1>
            <p className={s.heroLead}>
              Tell Maxim Fit your goals, your hard requirements, your schedule. It composes a
              complete daily protocol — diet, supplements, training, sleep — citing every claim.
              You ask, modify, verify. Nothing in your life happens by guesswork.
            </p>
            <div className={s.heroCta}>
              <a href="#cta" className={`${s.btn} ${s.btnPrimary} ${s.btnLg}`}>
                Join the TestFlight
              </a>
              <a href="#how" className={`${s.btn} ${s.btnLg}`}>
                See how it works
              </a>
            </div>
            <div className={s.heroTags}>
              <div className={s.heroTag}>
                <span className={s.heroTagDot} /> 34 sources avg / protocol
              </div>
              <div className={s.heroTag}>
                <span className={s.heroTagDot} /> RCT-graded supplements
              </div>
              <div className={s.heroTag}>
                <span className={s.heroTagDot} /> Modify anything in plain English
              </div>
            </div>
          </div>

          {/* Phone preview */}
          <div className={s.phoneWrap}>
            <div className={s.phone}>
              <div className={s.phoneIsland} />
              <div className={s.phoneScreen}>
                <div className={s.phStatus}>
                  <span>9:41</span>
                  <span className={s.mono} style={{ color: 'var(--accent)' }}>
                    ●
                  </span>
                </div>
                <div className={s.phContent}>
                  <div className={s.phEyebrow}>MON · APR 28 · 04 ACTIVE</div>
                  <div className={s.phTitle}>Protocols</div>
                  <div className={s.phCard}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <div>
                        <div className={s.phCardName}>Muscle Gain · Longevity</div>
                        <div className={s.phCardMeta}>V4 · 2026-03-14</div>
                      </div>
                      <div className={s.phCardBadge}>✓ 34 SRC</div>
                    </div>
                    <div className={s.phScores}>
                      <div className={s.phScore}>
                        <div className={`${s.phScoreNum} ${s.phScoreNumGood}`}>87</div>
                        <div className={s.phScoreLabel}>Goal</div>
                      </div>
                      <div className={s.phScore}>
                        <div className={`${s.phScoreNum} ${s.phScoreNumGood}`}>✓</div>
                        <div className={s.phScoreLabel}>Reqs met</div>
                      </div>
                      <div className={s.phScore}>
                        <div className={s.phScoreNum}>+14</div>
                        <div className={s.phScoreLabel}>HRV 14d</div>
                      </div>
                    </div>
                  </div>
                  <div className={s.phList}>
                    <div className={s.phListItem}>
                      <div className={s.phTime}>07:15</div>
                      <div className={s.phTask}>AM stack · D3 · K2 · Omega-3</div>
                    </div>
                    <div className={s.phListItem}>
                      <div className={s.phTime}>08:00</div>
                      <div className={s.phTask}>Meal 1 · Protein-forward</div>
                    </div>
                    <div className={s.phListItem}>
                      <div className={s.phTime}>12:30</div>
                      <div className={s.phTask}>Meal 2 · 200g chicken</div>
                    </div>
                    <div className={s.phListItem}>
                      <div className={s.phTime}>17:00</div>
                      <div className={s.phTask}>Push (chest · shoulders)</div>
                    </div>
                  </div>
                </div>
                <div className={s.phTabbar}>
                  <div className={s.phTabbarActive}>
                    ▦<br />
                    Protocols
                  </div>
                  <div>
                    ◐<br />
                    Chat
                  </div>
                  <div>
                    ⊟<br />
                    Progress
                  </div>
                  <div>
                    ⚙<br />
                    Settings
                  </div>
                </div>
              </div>
            </div>
            {/* Floating sticker */}
            <div className={s.sticker}>
              <div className={`${s.trackedSm} ${s.stickerLabel}`}>Verified by</div>
              <div className={s.stickerNum}>
                34<span className={s.stickerNumUnit}> SRC</span>
              </div>
              <div className={s.stickerDesc}>22 RCTs · 8 meta-analyses · 4 observational</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how">
        <div className={s.container}>
          <div className={s.sectionHead}>
            <div className={s.sectionNum}>01 / HOW</div>
            <div>
              <div className={s.kicker}>Three stages · ~6 seconds</div>
              <h2 className={s.sectionTitleH2}>
                From your <em>goals</em> to a complete daily protocol — with citations.
              </h2>
            </div>
          </div>

          <div className={s.working}>
            <div className={s.workingItem}>
              <div className={s.workingNum}>01 — SEARCH</div>
              <div className={s.workingTitle}>Pull literature across your weighted goals.</div>
              <div className={s.workingBody}>
                Maxim Fit queries PubMed, Cochrane, and bioRxiv for evidence relevant to your
                goals — muscle gain, longevity, fat loss, sleep, whatever you&apos;ve told it
                matters.
              </div>
              <div className={s.workingBar}>
                <span style={{ animationDelay: '0s' }} />
              </div>
            </div>
            <div className={s.workingItem}>
              <div className={s.workingNum}>02 — GENERATE</div>
              <div className={s.workingTitle}>
                Compose schedule, diet, supplements, training.
              </div>
              <div className={s.workingBody}>
                Every meal, every set, every dose is drafted to honor your hard requirements:
                sleep window, training days, work block, dietary constraints, and your weighted
                goals.
              </div>
              <div className={s.workingBar}>
                <span style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
            <div className={s.workingItem}>
              <div className={s.workingNum}>03 — EVALUATE</div>
              <div className={s.workingTitle}>Score goal fit. Check every requirement.</div>
              <div className={s.workingBody}>
                A weighted goal score tells you how well the protocol serves your priorities. A
                requirements check confirms every hard constraint — sleep window, training days,
                dietary limits — is satisfied. Critiques surface anything weak. You verify,
                accept, ship.
              </div>
              <div className={s.workingBar}>
                <span style={{ animationDelay: '0.8s' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ marginTop: 80 }}>
        <div className={s.container}>
          <div className={s.stats}>
            <div className={s.stat}>
              <div className={s.statNum}>
                34<span className={s.statUnit}>avg</span>
              </div>
              <div className={s.statLabel}>Sources per protocol</div>
            </div>
            <div className={s.stat}>
              <div className={s.statNum}>
                A–<span className={s.statUnit}>grade</span>
              </div>
              <div className={s.statLabel}>Median evidence level</div>
            </div>
            <div className={s.stat}>
              <div className={s.statNum}>
                6.2<span className={s.statUnit}>s</span>
              </div>
              <div className={s.statLabel}>P50 generation time</div>
            </div>
            <div className={s.stat}>
              <div className={s.statNum}>
                89<span className={s.statUnit}>%</span>
              </div>
              <div className={s.statLabel}>7-day adherence (cohort 03)</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features">
        <div className={s.container}>
          <div className={s.sectionHead}>
            <div className={s.sectionNum}>02 / FEATURES</div>
            <div>
              <div className={s.kicker}>Built like a clinical chart</div>
              <h2 className={s.sectionTitleH2}>
                Not <em>opinions</em> — protocols you can audit.
              </h2>
            </div>
          </div>

          <div className={s.features}>
            <div className={s.feature}>
              <div className={s.featureIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 12l5 5L20 6" />
                </svg>
              </div>
              <div className={s.featureTag}>VERIFY</div>
              <h3 className={s.featureH3}>Every claim cites its evidence.</h3>
              <p className={s.featureP}>
                Tap any line — a meal, a dose, a rep range — and see the studies behind it. RCTs,
                meta-analyses, and observational data are graded A/B/C so you know exactly what
                you&apos;re trusting.
              </p>
            </div>
            <div className={s.feature}>
              <div className={s.featureIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
              <div className={s.featureTag}>MODIFY</div>
              <h3 className={s.featureH3}>Change anything in plain English.</h3>
              <p className={s.featureP}>
                &ldquo;Move training to mornings.&rdquo; &ldquo;Add more protein to Meal 1.&rdquo;
                Maxim Fit retrieves the relevant evidence, reconciles your hard constraints, and
                shows the score delta before you commit.
              </p>
            </div>
            <div className={s.feature}>
              <div className={s.featureIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 5h16v11H9l-5 4V5z" />
                </svg>
              </div>
              <div className={s.featureTag}>ASK</div>
              <h3 className={s.featureH3}>Q&amp;A grounded in your protocol.</h3>
              <p className={s.featureP}>
                Why is Meal 1 the way it is? Why creatine at this dose? Is Zone 2 better than
                HIIT for me? Maxim Fit answers in the context of your data and your literature,
                with sources attached.
              </p>
            </div>
            <div className={s.feature}>
              <div className={s.featureIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2" />
                </svg>
              </div>
              <div className={s.featureTag}>VERSION</div>
              <h3 className={s.featureH3}>Every change tracked and revertable.</h3>
              <p className={s.featureP}>
                Protocols are versioned like code. Each iteration carries its own scores and
                notes. Revert any version, branch from any version, compare deltas at a glance.
              </p>
            </div>
            <div className={s.feature}>
              <div className={s.featureIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 20V4M4 20h16M8 16V10M12 16V6M16 16v-4M20 16v-8" />
                </svg>
              </div>
              <div className={s.featureTag}>PROGRESS</div>
              <h3 className={s.featureH3}>Watch the trend, not the day.</h3>
              <p className={s.featureP}>
                Adherence calendar, weight trajectory, sleep variance, lift PRs, HRV — pulled
                from Apple Health, Oura, and Whoop. Pattern-level insights are auto-surfaced
                when they matter.
              </p>
            </div>
            <div className={s.feature}>
              <div className={s.featureIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </div>
              <div className={s.featureTag}>CRITIQUE</div>
              <h3 className={s.featureH3}>The protocol critiques itself.</h3>
              <p className={s.featureP}>
                Maxim Fit flags its own weak points — uneven protein distribution, underdosed
                K2, missing deload week — and lets you batch-apply fixes with one tap.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Evidence rows */}
      <section id="evidence">
        <div className={s.container}>
          <div className={s.sectionHead}>
            <div className={s.sectionNum}>03 / EVIDENCE</div>
            <div>
              <div className={s.kicker}>No hand-waving</div>
              <h2 className={s.sectionTitleH2}>
                Three things that aren&apos;t optional in <em>2026</em>.
              </h2>
              <p className={s.sub}>
                Most fitness apps assume you&apos;ll just trust them. Maxim Fit assumes you
                won&apos;t — and shows its work every step of the way.
              </p>
            </div>
          </div>

          {/* Row 1 */}
          <div className={s.evidenceRow}>
            <div>
              <div className={s.tracked} style={{ color: 'var(--accent)' }}>
                CITED · NEVER PROMPTED
              </div>
              <h3 className={s.evidenceHeading}>Every recommendation has a paper trail.</h3>
              <p className={s.evidenceCopy}>
                When Maxim Fit says &ldquo;5g creatine, daily, with anything&rdquo; — it links to
                Kreider 2017 and 18 corroborating studies. When it says &ldquo;K2 100mcg&rdquo;
                it tells you why that dose is on the conservative side. The literature is the
                product.
              </p>
            </div>
            <div className={s.evidenceStage}>
              <div className={s.evidenceStageLabel}>SOURCES · 34</div>
              <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className={s.sourceItem}>
                  <span className={s.sourceIdx}>[01]</span>
                  <div>
                    <div className={s.sourceTitle}>
                      How much protein can the body use in a single meal
                    </div>
                    <div className={s.sourceMeta}>
                      SCHOENFELD BJ · 2018 · J INT SOC SPORTS NUTR
                    </div>
                  </div>
                </div>
                <div className={s.sourceItem}>
                  <span className={s.sourceIdx}>[02]</span>
                  <div>
                    <div className={s.sourceTitle}>
                      Meta-analysis: protein supplementation on RT-induced muscle gain
                    </div>
                    <div className={s.sourceMeta}>MORTON RW · 2018 · BR J SPORTS MED</div>
                  </div>
                </div>
                <div className={s.sourceItem}>
                  <span className={s.sourceIdx}>[03]</span>
                  <div>
                    <div className={s.sourceTitle}>
                      Safety and efficacy of creatine in exercise, sport, and medicine
                    </div>
                    <div className={s.sourceMeta}>KREIDER RB · 2017 · J INT SOC SPORTS NUTR</div>
                  </div>
                </div>
                <div className={s.sourceItem}>
                  <span className={s.sourceIdxMore}>+31</span>
                  <div className={s.sourceMore}>22 RCTs · 8 meta-analyses · 4 observational</div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2 */}
          <div className={`${s.evidenceRow} ${s.evidenceRowFlip}`}>
            <div>
              <div className={s.tracked} style={{ color: 'var(--accent)' }}>
                RUNS · TRANSPARENTLY
              </div>
              <h3 className={s.evidenceHeading}>You watch it think.</h3>
              <p className={s.evidenceCopy}>
                Modify anything and Maxim Fit shows the search, the reasoning, the score deltas.
                No black box. If your goal score went down, you&apos;ll see why — and you can
                reject the change.
              </p>
            </div>
            <div className={s.evidenceStage}>
              <div className={s.evidenceStageLabel}>MODIFY · APPLY</div>
              <div className={s.stageStages} style={{ marginTop: 18 }}>
                <div className={s.stageStagesDone}>
                  <div className={s.stageStagesLabel}>
                    <span className={s.stageL}>01 · Researching</span>
                    <span className={s.stageR}>DONE</span>
                  </div>
                  <div className={s.stageBar}>
                    <span style={{ width: '100%' }} />
                  </div>
                  <div className={s.stageSub}>
                    Retrieved 14 sources, leucine threshold confirmed
                  </div>
                </div>
                <div className={s.stageStagesActive}>
                  <div className={s.stageStagesLabel}>
                    <span className={s.stageL}>02 · Applying</span>
                    <span className={s.stageR} style={{ color: 'var(--accent)' }}>
                      RUNNING
                    </span>
                  </div>
                  <div className={s.stageBar}>
                    <span style={{ width: '62%' }} />
                  </div>
                  <div className={s.stageSub}>Reconciling against your hard requirements</div>
                </div>
                <div>
                  <div className={s.stageStagesLabel}>
                    <span className={s.stageL} style={{ color: 'var(--fg-3)' }}>
                      03 · Scoring
                    </span>
                    <span className={s.stageR}>WAIT</span>
                  </div>
                  <div className={s.stageBar}>
                    <span style={{ width: 0 }} />
                  </div>
                </div>
              </div>
              <div className={s.modifyDeltaGrid}>
                <div className={s.scoreCell}>
                  <div className={s.scoreCellRow}>
                    <span className={s.scoreOld}>87</span>
                    <span className={s.scoreArrow}>→</span>
                    <span className={`${s.scoreNew} ${s.scoreNewUp}`}>91</span>
                  </div>
                  <div className={s.scoreLabel}>GOAL +4</div>
                </div>
                <div className={s.scoreCell}>
                  <div className={s.scoreCellRow}>
                    <span className={`${s.scoreNew} ${s.scoreNewUp}`}>✓</span>
                    <span className={s.scoreArrow}>·</span>
                    <span className={s.scoreOld} style={{ textDecoration: 'none' }}>14/14</span>
                  </div>
                  <div className={s.scoreLabel}>REQS MET</div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3 */}
          <div className={s.evidenceRow}>
            <div>
              <div className={s.tracked} style={{ color: 'var(--accent)' }}>
                YOURS · FOREVER
              </div>
              <h3 className={s.evidenceHeading}>Versioned. Exportable. Auditable.</h3>
              <p className={s.evidenceCopy}>
                Every protocol is a versioned document. Export to PDF for your physician, share
                a snapshot with your coach, branch a &ldquo;cutting&rdquo; variant from your
                &ldquo;maintenance&rdquo; baseline. Your data, your protocols, never locked in.
              </p>
            </div>
            <div className={s.evidenceStage}>
              <div className={s.evidenceStageLabel}>VERSION HISTORY</div>
              <div className={s.versionTimeline}>
                <div className={s.versionTimelineLine} />
                <div className={s.versionItem}>
                  <div className={`${s.versionDot} ${s.versionDotCurrent}`} />
                  <div className={s.versionRow}>
                    <span className={s.versionLabel}>V4</span>
                    <span className={s.versionTag}>CURRENT</span>
                    <span className={s.versionDate}>2026-04-15</span>
                  </div>
                  <div className={s.versionDesc}>Tuned Meal 2 carbs + added glycine</div>
                  <div className={s.versionScores}>GOAL 87 · REQS ✓</div>
                </div>
                <div className={s.versionItem}>
                  <div className={`${s.versionDot} ${s.versionDotPast}`} />
                  <div className={s.versionRow}>
                    <span className={s.versionLabelPast}>V3</span>
                    <span className={s.versionDate}>2026-04-02</span>
                  </div>
                  <div className={s.versionDesc}>Added Zone 2 Wednesday · K2 dose</div>
                  <div className={s.versionScores}>GOAL 83 · REQS ✓</div>
                </div>
                <div className={s.versionItem}>
                  <div className={`${s.versionDot} ${s.versionDotPast}`} />
                  <div className={s.versionRow}>
                    <span className={s.versionLabelPast}>V2</span>
                    <span className={s.versionDate}>2026-03-24</span>
                  </div>
                  <div className={s.versionDesc}>Shifted training to 17:00</div>
                  <div className={s.versionScores}>GOAL 78 · REQS 13/14</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quotes */}
      <section style={{ marginTop: 80 }}>
        <div className={s.container}>
          <div className={s.sectionHead}>
            <div className={s.sectionNum}>04 / TESTERS</div>
            <div>
              <div className={s.kicker}>Cohort 02 + 03 testers</div>
              <h2 className={s.sectionTitleH2}>
                From the <em>first 800</em> beta users.
              </h2>
            </div>
          </div>
          <div className={s.quotes}>
            <div className={s.quote}>
              <div className={s.quoteMark}>&ldquo;</div>
              <div className={s.quoteBody}>
                First fitness app that doesn&apos;t talk to me like I&apos;m 14. Every claim has
                a citation; I&apos;ve actually read three of the studies it linked.
              </div>
              <div className={s.quoteMeta}>
                <div className={s.quoteAvatar}>DK</div>
                <div>
                  <div className={s.quoteName}>Dr. K. Lin, MD</div>
                  <div className={s.quoteTitle}>Internal Medicine · Cohort 02</div>
                </div>
              </div>
            </div>
            <div className={s.quote}>
              <div className={s.quoteMark}>&ldquo;</div>
              <div className={s.quoteBody}>
                I asked it to move training to AM and it didn&apos;t just shift the time — it
                rebalanced my pre-workout meal and flagged that my caffeine cutoff would now
                interfere. That&apos;s the level of detail.
              </div>
              <div className={s.quoteMeta}>
                <div className={s.quoteAvatar}>RP</div>
                <div>
                  <div className={s.quoteName}>Rachel P.</div>
                  <div className={s.quoteTitle}>Founder · Cohort 03</div>
                </div>
              </div>
            </div>
            <div className={s.quote}>
              <div className={s.quoteMark}>&ldquo;</div>
              <div className={s.quoteBody}>
                Hit a 105kg bench last week. The protocol predicted I&apos;d get there in 6
                weeks; it took 8. Either way — I trust the system more than my last three
                coaches combined.
              </div>
              <div className={s.quoteMeta}>
                <div className={s.quoteAvatar}>JM</div>
                <div>
                  <div className={s.quoteName}>James M.</div>
                  <div className={s.quoteTitle}>Engineer · Cohort 03</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ marginTop: 80 }}>
        <div className={s.containerTight}>
          <div className={s.sectionHead}>
            <div className={s.sectionNum}>05 / FAQ</div>
            <div>
              <div className={s.kicker}>Common questions</div>
              <h2 className={s.sectionTitleH2}>
                Things you should know <em>before</em> you join.
              </h2>
            </div>
          </div>
          <div className={s.faq}>
            <details open>
              <summary>
                What&apos;s the catch with the TestFlight beta? <span className={s.plus}>+</span>
              </summary>
              <div className={s.faqBody}>
                No catch. Cohort 04 is open through May 12 and capped at 1,500 testers. Free
                during beta; paid plans (Pro · $19/mo, Annual · $179) start at v1.0 launch in Q3
                2026. Beta testers get 12 months of Pro on the house.
              </div>
            </details>
            <details>
              <summary>
                Is this medical advice? <span className={s.plus}>+</span>
              </summary>
              <div className={s.faqBody}>
                No. Maxim Fit is a research and protocol-design tool. It cites peer-reviewed
                evidence so you can make informed decisions, but it&apos;s not a substitute for
                a physician. For anything beyond standard fitness — pre-existing conditions,
                prescribed medications, pregnancy — talk to your doctor first. Export your
                protocol as PDF and bring it to the appointment.
              </div>
            </details>
            <details>
              <summary>
                What integrations do you support? <span className={s.plus}>+</span>
              </summary>
              <div className={s.faqBody}>
                Apple Health, Oura Ring, and Whoop today. Garmin, Strava, and Levels are next.
                You can also enter data manually — adherence, weight, lifts, sleep — if you&apos;d
                rather not connect a wearable.
              </div>
            </details>
            <details>
              <summary>
                Where does the literature come from? <span className={s.plus}>+</span>
              </summary>
              <div className={s.faqBody}>
                PubMed, Cochrane Reviews, bioRxiv, and a curated set of sports-medicine and
                longevity journals. Sources are graded A/B/C based on study type, sample size,
                and effect strength. We re-ingest the corpus weekly.
              </div>
            </details>
            <details>
              <summary>
                How do you handle my data? <span className={s.plus}>+</span>
              </summary>
              <div className={s.faqBody}>
                End-to-end encrypted at rest and in transit. We never sell or share data. You
                can export everything as JSON or PDF and delete your account in two taps.
                Anonymous, opt-in usage telemetry only — no health data leaves your device
                unencrypted.
              </div>
            </details>
            <details>
              <summary>
                Android? Web? <span className={s.plus}>+</span>
              </summary>
              <div className={s.faqBody}>
                iOS only at v1.0. Android is on the roadmap for Q1 2027. A read-only web
                companion (view your protocol, export PDFs, share with your coach) ships
                alongside v1.0.
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="cta" className={s.cta}>
        <div className={s.ctaGridBg} />
        <div className={`${s.container} ${s.ctaInner}`}>
          <div className={s.tracked} style={{ color: 'var(--accent)', marginBottom: 14 }}>
            ▦ Cohort 04 · Open
          </div>
          <h2 className={s.ctaH2}>
            Stop guessing. <em>Start auditing.</em>
          </h2>
          <p className={s.ctaP}>
            1,247 testers running protocols today. 253 invites left in this cohort. Beta testers
            get 12 months of Pro free at v1.0 launch.
          </p>
          <div className={s.ctaButtons}>
            <a className={`${s.btn} ${s.btnPrimary} ${s.btnLg}`} href="#">
              Join the TestFlight →
            </a>
            <Link href="/signup" className={`${s.btn} ${s.btnLg}`}>
              Preview the app
            </Link>
          </div>
          <div className={s.ctaMeta}>iOS 17+ · TestFlight invite delivered within 24h</div>
        </div>
      </section>

      {/* Footer */}
      <footer className={s.footer}>
        <div className={s.footInner}>
          <div className={s.brand}>
            <span className={s.brandMark} /> MAXIM · FIT
          </div>
          <div className={s.footLinks}>
            <a href="#">Press</a>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <a href="#">Contact</a>
          </div>
          <div className={s.footMeta}>© 2026 Maxim Fit, Inc.</div>
        </div>
      </footer>
    </div>
  );
}
