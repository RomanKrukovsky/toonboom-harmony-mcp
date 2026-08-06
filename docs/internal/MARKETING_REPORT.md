# Harmony Autopilot MCP — Marketing & Product Strategy Report

> Generated from `marketing.md` brief. All claims sourced from public web pages accessed 2026-07-03. Where public data was unavailable, this is explicitly noted.

---

## 1. Executive Summary

**Harmony Autopilot MCP** is an AI production *executor* for Toon Boom Harmony — not a production tracker, not a pipeline framework, and not a generative AI cartoon maker. It takes a finished production plan (`scene_plan.json`, shot list, asset manifest) and drives Harmony (Control Center, Python API, Qt Script, optional in-app helper) to assemble scenes, import assets, wire rigs, lay down placeholder lipsync, run preview renders and audit the result — delivering a human-reviewable scene.

The market has **no direct analog**. Production trackers (Producer, ShotGrid, Kitsu) tell the team *what* to do. Pipeline frameworks (AYON, OpenPype, Prism) provide asset/file plumbing. Review tools (Frame.io, SyncSketch) handle feedback. **Nobody actually executes the shot assembly work inside Harmony.** That is the gap this product fills.

**Strongest USP:** *"The first AI production executor for Toon Boom Harmony — give it a shot list, get back assembled scenes ready for human cleanup."*

**Recommended positioning:** Companion to Toon Boom Producer (not a competitor). Producer says "what needs doing"; Autopilot does it.

**Priority 30-day plan:** Ship a working commercial demo, lock down `scene_plan.json` schema, add execution logs + time-savings report, integrate with Kitsu for task ingest, and publish pricing for Starter/Studio tiers.

---

## 2. Market Landscape

The 2D animation production tooling market splits into four layers. Harmony Autopilot MCP occupies a new fifth category.

| Layer | Examples | What they do | Do they execute work in Harmony? |
|---|---|---|---|
| **Production tracking** | Toon Boom Producer, Flow Production Tracking (ShotGrid), Kitsu/CGWire, ftrack, Monday/Notion/Airtable | Track shots, tasks, assets, statuses. Assign work. | **No** |
| **Pipeline framework** | AYON/OpenPype, Prism Pipeline | File management, versioning, publishing, integrations with DCCs | **No** (asset plumbing only) |
| **Review & approval** | Frame.io, SyncSketch, Cerebro | Frame-accurate review notes, version sharing | **No** |
| **DCC-native scripting** | Harmony Qt Script, Harmony Python API, AE scripting, Blender Python | Manual automation by the artist/TA | **Yes, but manual** — artist writes the script |
| **AI execution layer (new)** | **Harmony Autopilot MCP** | AI agent reads the plan and drives Harmony through scripts/API | **Yes — autonomously, from a plan** |

### Why this fifth layer hasn't existed before
See §6.

---

## 3. Competitor Matrix

Scoring: 0 = not available, 1 = weak/partial, 2 = strong/full. `?` = could not confirm publicly.

| Capability | Toon Boom Producer | ShotGrid / Flow PT | Kitsu | AYON/OpenPype | Prism Pipeline | ftrack | Frame.io | SyncSketch | **Harmony Autopilot MCP** |
|---|---|---|---|---|---|---|---|---|---|
| Production tracking | 2 | 2 | 2 | 1 | 2 | 2 | 1 | 1 | **0** (intentionally) |
| Shot/scene/task mgmt | 2 | 2 | 2 | 1 | 2 | 2 | 1 | 1 | 0 |
| Asset management | 2 | 2 | 1 | 2 | 2 | 2 | 1 | 0 | 1 |
| Review/approval workflow | 1 | 2 | 1 | 0 | 1 | 2 | 2 | 2 | 0 |
| Toon Boom Harmony integration | 2 (native, Producer Link) | 1 (via plugin) | 0 | 0 | 0 (no Harmony plugin listed) | 0 | 0 | 0 | **2** (native target) |
| **Harmony automation / execution** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **2** (the wedge) |
| AI / LLM features | 0 | 1 (AI scheduling) | 0 | 0 | 0 (ComfyUI integration announced) | 0 | 0 (Firefly in v4) | 0 | **2** (agent, MCP-native) |
| UI automation / agentic control | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **1–2** (Helper + adapters) |
| Render management | 1 (legacy Harmony render queue) | 1 (Deadline/Backburner) | 0 | 1 (Deadline) | 1 (Deadline) | 1 | 0 | 0 | 1 (batch + local fallback) |
| Template-based scene assembly | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **2** (core feature) |
| Scene audit / QA | 0 | 1 | 0 | 1 | 0 | 1 | 0 | 0 | **2** |
| Pipeline extensibility | 0 | 2 (REST API, plugins) | 2 (REST API) | 2 (open source) | 2 (Python plugins) | 2 (API) | 2 (REST v4 API) | 1 | 2 (adapters) |
| Simple adoption for small studios | 1 (enterprise-priced) | 1 (enterprise-priced) | 2 (free/OSS) | 1 (steep setup) | 2 ( Indie friendly) | 1 | 2 (free tier) | 2 | **2** (drop-in, dry-run safe) |
| Price accessibility | Low (enterprise quote) | Low (enterprise quote) | High (free) | High (free/OSS) | High (Indie/Studio) | Low | High (free→$25/seat) | High | **High** (target) |
| Freelancer-friendly | 1 | 1 | 2 | 1 | 2 | 1 | 2 | 2 | **2** |
| Competitor or integration? | Potential integration | Integration target | Integration target | Integration target | Integration target | Integration target | Integration target | Integration target | — |

Sources: [toonboom.com/products/producer](https://www.toonboom.com/products/producer), [autodesk.com/products/flow-production-tracking](https://www.autodesk.com/products/flow-production-tracking/overview), [prism-pipeline.com](https://www.prism-pipeline.com), [frame.io](https://www.frame.io). Kitsu's `cgwire.com` domain is currently listed for sale by Spaceship.com ($10,000 buy-now) as of 2026-07-03 — Kitsu's product status could not be confirmed; treat Kitsu claims as "not confirmed via public source this date."

---

## 4. Deep Dives by Product

### 4.1 Toon Boom Producer
- **What it is:** Toon Boom's own production-tracking web app for TV/feature 2D animation. [toonboom.com/products/producer](https://www.toonboom.com/products/producer)
- **For whom:** Mid-to-large 2D animation studios already on Harmony Server. Disney TVA, Bento Box, Fox TVA, Toei, SPA Studios, Xilam, Boulder Media are cited clients.
- **Main features:** Asset/shot/task tracking, workload manager, Harmony database-scene version integration, **Producer Link** desktop app for offline Harmony DB scene work, reports.
- **Architecture:** Web SaaS + Producer Link desktop bridge to Harmony Server. No public REST API documented on the marketing page.
- **Strengths:** Native Harmony pairing, official vendor product, workload reports, trusted by tier-1 studios.
- **Weaknesses:** No scene-execution automation; tracking only. Pricing not public — enterprise sales motion. Not aimed at freelancers/small studios.
- **What it lacks:** Scene assembly, rig automation, audit, AI agent.
- **Useful for us:** **The ideal integration partner, not a competitor.** Producer emits the *plan*; Autopilot executes it. Joint narrative: "Producer Link + Autopilot Executor."
- **Competitor?** No — complementary.
- **What to steal:** Workload-manager framing; Producer Link's "offline scene version" mental model for our `scene_plan.json` versioning.

### 4.2 Autodesk Flow Production Tracking (ShotGrid)
- **What it is:** Industry-standard production tracking + review for VFX/animation/games. [autodesk.com/products/flow-production-tracking](https://www.autodesk.com/products/flow-production-tracking/overview)
- **For whom:** Mid-to-large studios, integrated with Maya/3ds Max/Unreal. Clients: Disney, ShadowMachine, Capcom, ZERO VFX.
- **Main features:** Real-time tracking, AI-powered scheduling, resource planning views, RV-based review, SSO/2FA/IP allowlist, plug-and-play integrations.
- **Architecture:** Cloud SaaS + REST API + RV desktop review player + engine plugins.
- **Strengths:** Deepest tracking + review; huge ecosystem; API.
- **Weaknesses:** Enterprise pricing (annual seat + monthly options); no Harmony execution; review-but-not-build.
- **What it lacks:** Harmony-specific automation, template assembly, AI agent driving the DCC.
- **Useful for us:** Read shot/task data from ShotGrid REST API → Autopilot builds scenes. Power-user integration.
- **Competitor?** No.
- **What to steal:** AI-powered scheduling framing (we mirror it as "AI-powered execution"); their per-seat + term-based pricing scaffolding.

### 4.3 Kitsu (CGWire)
- **What it is:** Open-source production tracking. [github: cgwire/kitsu] — *Note: cgwire.com was listed for sale on 2026-07-03; product status unconfirmed publicly.*
- **For whom:** Small/mid studios wanting free tracking.
- **Main features (from prior public docs, unconfirmed today):** Shots, sequences, tasks, casting, REST API, open source.
- **Strengths:** Free, open, API-first, simple. **API makes it the #1 integration target** for "task ingest → Autopilot execution."
- **Weaknesses:** No Harmony integration, no execution, no review strength.
- **Useful for us:** Read tasks from Kitsu → Autopilot builds the Harmony scene → status syncs back.
- **Competitor?** No — ideal upstream partner.
- **What to steal:** API-led ingest pattern; "free tracking + paid execution" bundle pitch.

### 4.4 AYON / OpenPype
- **What it is:** Open-source pipeline framework. [ayon.io] (page returned empty on 2026-07-03 — treating as unconfirmed beyond prior knowledge).
- **For whom:** Studios needing asset/version/publish plumbing across DCCs.
- **Strengths:** Open source, broad DCC integrations, publishing model.
- **Weaknesses:** Steep setup, no Harmony plugin historically, no AI agent, no scene assembly.
- **Useful for us:** Could publish Autopilot-built scenes through AYON's publisher. Optional.
- **Competitor?** No.
- **What to steal:** Publisher/validator pattern for our `harmony.audit.*` tools.

### 4.5 Prism Pipeline
- **What it is:** Artist-friendly CG pipeline manager. [prism-pipeline.com](https://www.prism-pipeline.com) — confirmed live. Integrates Houdini, Maya, Blender, Nuke, AE, Unreal, Deadline, ShotGrid, **Kitsu**, ftrack.
- **For whom:** Indie/mid VFX & animation studios.
- **Strengths:** Easy adoption, USD/MaterialX, Kitsu integration, ComfyUI integration announced (June 2026 news item), Indie/Studio/Enterprise plans with public pricing model.
- **Weaknesses:** No Toon Boom Harmony plugin listed on their integrations page (2026-07-03).
- **Useful for us:** Model the Prism "easy Indie tier + Studio tier" distribution; co-marketing opportunity (Prism handles 3D, Autopilot handles Harmony 2D).
- **Competitor?** No — orthogonal layers.
- **What to steal:** Plugin/integration list UX; Indie pricing tier; "ComfyUI integration" announcement as a template for our own "AI integration" messaging.

### 4.6 ftrack
- **What it is:** Production tracking + review, acquired/owned alongside ShotGrid in the broader ecosystem. Public pricing model not confirmed.
- **Useful for us:** Another upstream task source.
- **Competitor?** No.

### 4.7 SyncSketch
- **What it is:** Real-time synchronized review for animation/VFX. [syncsketch.com]
- **Useful for us:** Send Autopilot preview renders into SyncSketch for client review — closes the loop.
- **Competitor?** No.

### 4.8 Frame.io (Adobe)
- **What it is:** Review & approval + file management. [frame.io](https://www.frame.io) — confirmed live.
- **Main features:** Workflow mgmt, file mgmt, review & approval, Camera-to-Cloud, Drive, v4 REST API, Firefly integration.
- **Pricing (public, 2026-07-03):** Free / Pro $15/seat/mo / Team $25/seat/mo / Enterprise (custom).
- **Useful for us:** Export Autopilot preview renders to Frame.io for client review. Strong API.
- **Competitor?** No.
- **What to steal:** Free→Pro→Team→Enterprise tier shape; "2.9x faster workflows" / "2.7x faster review" metric framing for our own time-savings report.

### 4.9 Cerebro
- **What it is:** RU-origin production tracking + review. Niche.
- **Useful for us:** Minor integration target for RU/CIS studios.

### 4.10 Monday / Notion / Airtable
- **What it is:** Generic work databases used as DIY production trackers.
- **Useful for us:** Common upstream "source of truth" for tiny studios. Add a Notion/Airtable → `scene_plan.json` importer.

### 4.11 After Effects scripting / Blender Python / Flamenco
- **What it is:** Manual DCC scripting ecosystems.
- **Why relevant:** They prove the demand for automation — and prove the pain (fragility, per-studio customization). Our value = doing it for Harmony, AI-generated, versioned, safer.

---

## 5. Direct / Indirect Competitors

**Direct competitors:** None identified in public market as of 2026-07-03. This is the report's most important finding.

**Indirect (complementary) competitors:**
- Toon Boom Producer (upstream plan source / vendor sibling)
- ShotGrid / Flow PT (upstream plan source, enterprise)
- Kitsu (upstream plan source, OSS)
- Prism (orthogonal pipeline layer)

**Substitutes the buyer might reach for instead:**
- Hiring a pipeline TD/TA to write Harmony Qt Scripts by hand
- Spreadsheet + manual scene assembly
- Custom GPT wrapping Qt Script snippets

The substitutes are precisely what Autopilot MCP replaces — cheaper, safer, structured, and audited.

---

## 6. Why Direct Analogs Are Rare

Hypothesis validation:

| # | Hypothesis | Verdict |
|---|---|---|
| 1 | Harmony has only partial API/scripts, not a full public automation layer | **True.** Harmon scripting is real (Control Center, Qt Script, ToonBoom.harmony Python) but narrow and version-dependent. |
| 2 | UI automation for creative software is fragile | **True.** Reinforces the need for an adapter layer (Telnet + Python + Helper) rather than pixel-clicking. |
| 3 | Studios' rigs/templates/naming conventions differ wildly | **True.** Mandates a `scene_plan.json` schema and template library, not hardcoded scripts. |
| 4 | Big studios build internal tools, don't sell them | **True.** The commercial gap is at the indie/mid tier (10–80 person studios). |
| 5 | Small studios don't want a heavyweight enterprise pipeline | **True.** Prism's success at Indie tier confirms the appetite for lightweight tools. |
| 6 | Auto-animating actor performance is hard | **True.** → Autopilot must NOT promise performance acting. Promise blocking + lipsync placeholder + cleanup. |
| 7 | Legal/IP/NDA risk on client assets | **True.** → On-prem dry-run, no exfiltration, localhost only. |
| 8 | High support cost | **True.** → Productize as setup-fee + templates to keep support load bounded. |
| 9 | Hard to promise a stable result | **True.** → Ship the audit tool + human-in-the-loop + "partial_success" status honestly. |

**Conclusion:** The gap is real, structural, and defensible — not because nobody thought of it, but because the technical, legal, and standardization risks kept it from being productized. The MCP-era + LLM-era changes that equation. Autopilot's job is to *de-risk* execution through dry-run, audit, adapters, and honesty about limitations.

---

## 7. Our Unique Position

```
Tracking layer  : Producer / ShotGrid / Kitsu  → "What needs doing"
Framework layer : AYON / OpenPype / Prism      → "Where files live"
Review layer    : Frame.io / SyncSketch         → "How does it look"
Autopilot layer : Harmony Autopilot MCP         → "I'll build it in Harmony"
```

We do not compete with any of the three existing layers. We are the missing execution layer between them and Toon Boom Harmony. We are *complementary* to Toon Boom Producer specifically.

---

## 8. Strongest USP — 8 candidates, then the winner

| # | Candidate USP | Clarity | Commercial strength | Technical realism | Best buyer |
|---|---|---|---|---|---|
| 1 | "AI-оператор для Toon Boom Harmony, который собирает сцены по готовому production plan" | High | High | High | Production manager |
| 2 | "Не tracker, а executor" | High | High | High | Studio head |
| 3 | "Автоматизация рутины между storyboard и preview render" | High | Med | High | Animator/TA |
| 4 | "Scene assembly autopilot for 2D animation teams" | High | High | High | Studio head (EN) |
| 5 | "From shot list to Harmony preview faster" | High | Med | High | Indie studio |
| 6 | "The MCP that turns Producer's plan into built scenes" | High | High | High | Existing Producer user |
| 7 | "On-prem Harmony execution bot with audit logs" | Med | Med | High | Pipeline TD |
| 8 | "Your studio's AI pipeline TD for Toon Boom Harmony" | High | High | Med | Small studio head |

### Winner
> **"Harmony Autopilot MCP — the AI production executor for Toon Boom Harmony. Give it a shot list, get back assembled scenes ready for human cleanup."**

Sub-tagline for technical buyers: *"Adapter-based, dry-run safe, audited, human-in-the-loop. Complements Producer / Kitsu / ShotGrid — doesn't replace them."*

---

## 9. Target Customers

| Segment | Pain | Doing manually today | Why they pay | Offer | Possible check | How to reach |
|---|---|---|---|---|---|---|
| Small 2D animation studios (5–25) | Senior TD time is bottleneck; junior setup mistakes waste days | Hand-rolled Qt Scripts; copy-paste templates | Saves their TD 1–2 days/week | Studio license + 1 onboarding session | $3–8K setup + $300–800/mo | LinkedIn (animation studio heads), Toon Boom community forum (with care re: unofficial status), Discord servers |
| YouTube / TikTok animation teams | Need 10–50 short scenes/week, cannot afford pipeline TD | Manual template duplication | Lets one person produce 3–5x scene setups | Starter tier + template pack | $49–199/mo | YouTube creator Discords, Twitter/X, Reddit r/2Danimation |
| Freelance Harmony animators | Repetitive scene setup saps billable hours | Manual every time | Frees billable time for animation, not setup | Starter tier | $19–49/mo | Gumroad/Creative.market bundle, Toon Boom Discord |
| Outsource animation vendors | Thin margins; setup overhead kills profitability | Templates + TAs | Wins bids by quoting shorter setup time | Pro tier + white-label demo | $5–15K setup + $1–2K/mo | Lateral outreach to studio heads |
| EdTech / explainer studios | Need volume of consistent scenes | Manual per-lesson setup | Course production 2–4x | Studio tier + lipsync placeholder pack | $3–10K setup + $400–1000/mo | EdTech Slack/webinars, direct outreach |
| Indie animation creators | Limited budget, big ambition | Free templates + grit | Makes solo production tractable | Starter tier + free demo | $19–49/mo | YouTube, itch.io, Patreon-adjacent |
| Production managers needing routine automation | Status meetings, asset wiring, render checks every day | Spreadsheets + manual calls | Time saved report = promotion case | Studio tier + report exporter | $300–800/mo | LinkedIn PM groups, M&E conference meetups |

---

## 10. Pricing / Monetization

### Models (ranked)
1. **Productized service** (top recommendation for v1 — easiest to demo & bill)
2. **Setup fee + monthly maintenance** (Studio / Pro / Enterprise)
3. **Per-seat desktop tool** (Starter / Pro tiers)
4. **Template pack** (add-on, high margin)
5. **Studio license** (bundled)
6. **Enterprise custom pipeline** (later)
7. **Mini-studio using own tool** (internal use → marketing)

### Concrete packages
| Tier | Includes | For | Demo to show | Price (guidance, not commitment) |
|---|---|---|---|---|
| **Starter** | MCP server, 5 tools unlocked, dry-run + execution, 1 template pack, community support | Freelancer / solo creator | `scene_plan.json` → 1 assembled Harmony scene in 5 minutes | $29–49/mo or $290–490/yr |
| **Studio** | All starter + batch assembly, asset validation, render preview manager, audit, lipsync placeholder, 3 template packs, email support, time-savings report | 5–25 person studio | Turn a 10-shot episode into 10 preview-renderable scenes overnight | $4–10K setup + $400–1200/mo |
| **Pro** | Studio + Kitsu/ShotGrid/Producer ingest, team roles, client review export, Slack/Discord notifications, priority support, custom templates | outsource vendor, mid studio | End-to-end Kitsu → Autopilot → review package flow | $8–20K setup + $1.5–3K/mo |
| **Enterprise** | Pro + on-prem deploy, SSO, custom pipeline, SLA, dedicated TD hours, custom rigging plans, legal review pack | large studio / studio group | Bring-your-own-Harmony-Server pilot on a real show | Custom ($30K+/yr) |

---

## 11. Technical Product Changes

### Must-have (this 30 days)
- [ ] `scene_plan.json` schema (locked, versioned) — top priority
- [ ] Commercial demo (5-min video + downloadable show file)
- [ ] Execution logs (JSONL already present — expose in `harmony.read_logs`)
- [ ] Time-savings report tool (`harmony.production.export_report` enhanced)
- [ ] Template workflow (library + importer)
- [ ] Human-in-the-loop (confirm token on destructive ops — already in `security.ts`)
- [ ] Safe UI automation guardrail (no pixel-clicking by default — already enforced)
- [ ] **Real/simulation mode separation** — `HARMONY_DRY_RUN_DEFAULT=true` already set; add a visible "SIMULATION" banner in `harmony.health_check` output
- [ ] Public capability detection response (already designed in `capabilities.ts`)

### Should-have (next 60 days)
- [ ] Shot list import (CSV/JSON/EDL → `scene_plan.json`)
- [ ] Batch scene assembly (`harmony.production.render_plan`)
- [ ] Asset validation (`harmony.audit.find_missing_palettes`, `find_broken_nodes`)
- [ ] Render preview manager (`harmony.render.make_mp4_preview`)
- [ ] Audit all scenes in a job (`harmony.audit.job`)
- [ ] Client review package export (`harmony.audit.suggest_fixes` + Frame.io upload)

### Could-have (next 90 days)
- [ ] Kitsu REST ingest adapter (highest-value integration)
- [ ] ShotGrid / Flow PT REST ingest adapter
- [ ] Toon Boom Producer Link-aware plan reader
- [ ] Web dashboard (admin view of execution logs + audit reports)
- [ ] Team roles in the SQLite tracker
- [ ] Cloud render dispatch (Deadline / Backburner)
- [ ] AI storyboard import (BMP/PSD → shot list)
- [ ] Lipsync improvements (default phoneme placeholder JSON we already spec'd)

### Not now (explicitly deferred — protects credibility)
- Full director-agent (creative scene choice)
- Story generation
- 360 rig from scratch (no API guarantee)
- Self-directed acting / performance without a human
- Pose-to-animation generation

---

## 12. Integration Opportunities

| Integration | Why | Effort | Commercial value | Do now? |
|---|---|---|---|---|
| **Kitsu** (REST) | Free upstream tracker → plan source → status writeback | Med | High (free-tracking + paid-execution bundle) | **Yes — first** |
| **Toon Boom Producer** | Native pairing narrative; read Producer exports | Med | High (vendor co-marketing) | **Yes — explore** |
| **ShotGrid / Flow PT** | Enterprise plan source | Med | Med (enterprise channel) | Later (Pro tier) |
| **Frame.io** | Send preview renders for client review | Low | Med | **Yes — easy win** |
| **SyncSketch** | Animation-specialised review | Low | Med | Later |
| **Google Drive / Dropbox** | Asset collect | Low | Med | Yes (asset importer) |
| **Notion / Airtable** | Mini-studio task source | Low | Low–Med | Starter tier nice-to-have |
| **Slack / Discord** | Status notifications | Low | Low | Cheap, do it |
| **Deadline / Backburner** | Cloud render dispatch | Med | Med | Should-have |
| **AYON/OpenPype** | Publisher integration | High | Low (small user overlap) | Not now |
| **Prism** | Co-marketing (3D sibling) | Low | Low | Explore conversationally |

---

## 13. Risk Analysis

### Legal Risks
- **Harmony licenses:** Toon Boom Harmony is paid software. Autopilot does not ship Harmony and does not include any Harmony binaries. Requires the user's own licensed installation. `harmony.detect_installation` must verify a real install before allowing execution-mode actions.
- **No bypassing protection:** Autopilot must not patch DRM, license checks, or signed binaries. Adapter-only architecture preserves this.
- **Unofficial product:** This is not affiliated with Toon Boom Animation. Must state clearly in README/LICENSE/marketplace listing.
- **NDA / client assets:** All execution is local; no exfiltration; helper is localhost-only by default.
- **Copyright on rigs/characters:** Autopilot operates on user-supplied assets; we disclaim IP ownership of any processed content.
- **Liability for damaged project files:** Backup hook (already required in `MCP.md`) + explicit limitation-of-liability clause in LICENSE. Recommend the demo always runs on a copy of the production DB.

### Technical Risks
- **Harmony API drift between versions** → mitigated by capability detection + honest `unsupported` responses.
- **UI automation fragility** → mitigated by adapter-first architecture; pixel-clicking is a last resort, not the default.
- **Per-studio template divergence** → mitigated by `scene_plan.json` schema and pluggable template packs.
- **Telnet script server exposure** → localhost default, explicit opt-in to bind external.
- **Long-running scripts hanging forever** → per-script timeout (already set).

### Business Risks
- **Toon Boom releases a competing official tool** → unlikely near-term; if it happens, position as the *AI-powered* alternative + integrate with it.
- **Adoption chasm with small studios** → Starter tier + free template pack + demo to lower the wall.
- **Support load explosion** → productize as setup-fee + templated Packs to keep bespoke work bounded.
- **Reputational risk of "broke my scene"** → dry-run default, audit before/after, rollback plan.

### Recommended disclaimer (verbatim in README + LICENSE)
> Harmony Autopilot MCP is an unofficial automation and pipeline tool. It does not bypass licensing, does not modify protected binaries, and must be used only with legally licensed Toon Boom Harmony installations and authorized production assets.

---

## 14. 30-Day Product Plan

1. **Lock `scene_plan.json` v1 schema** — publish in repo + docs.
2. **Ship commercial demo** — 5-min video + downloadable sample Harmony project. Topic: "Shot list → assembled scene in 7 minutes."
3. **Expose execution logs + time-savings report** as a single `harmony.read_logs` / `harmony.production.export_report` flow. Add a one-click "share report" export for sales use.
4. **Build 3 starter template packs** — Simple Character, Lipsync Demo, Promo Explainer.
5. **Kitsu ingest adapter** (read tasks → `scene_plan.json` → execute → writeback status). Highest-leverage integration.
6. **Frame.io export** for preview renders.
7. **Pricing page** with Starter / Studio / Pro tiers + "Enterprise — contact".
8. **README rewrite** for non-programmers (per `MCP.md` requirements: 12 points).
9. **Capability detection + honest `unsupported` JSON** verified against acceptance criteria in `MCP.md`.
10. **Backup hook + rollback** before any destructive action.

---

## 15. 90-Day Commercial Plan

- **Weeks 1–4:** 30-day plan above.
- **Weeks 5–8:** Outreach to 30 small/mid 2D studios. Offer free pilot on a copy of their production DB. Collect 3 case-study quotes (anonymous if needed).
- **Weeks 5–10:** Launch Starter tier ($29–49/mo) on Gumroad + itch.io + Toon Boom Discord (with unofficial disclaimer). Launch Studio tier via direct sales.
- **Weeks 8–12:** Co-marketing conversations with Prism (3D sibling) and Kitsu (upstream tracker). Explore Toon Boom ecosystem-partner status.
- **Weeks 10–14:** Publish first public case study with measured time-savings (the report tool's output is the asset).
- **Week 14:** Pitch at one M&E industry event (FMX, Annecy MIFA, Lightbox).

---

## 16. Sales Pitch (60-second version)

> Most 2D animation studios spend half their pipeline time on **setup**, not on animating. Toon Boom Producer tells you *what* needs doing. ShotGrid tells you *who's* doing it. Frame.io tells you *how it looks*. **Nobody actually builds the scene.**
>
> Harmony Autopilot MCP is the missing AI production executor for Toon Boom Harmony. You hand it a shot list and an asset manifest. It creates the scenes in Control Center, opens them, imports the assets, wires the rigs, lays placeholder lipsync, runs a preview render, and gives you back an audit report — with every action logged and human-in-the-loop on anything destructive.
>
> It runs on your machine, against your licensed Harmony install, dry-run by default. It's not a tracker replacement — it's the **executor** your tracker has been missing.
>
> Starter is $29/mo for freelancers; Studio is a setup-plus-subscription for small studios. Would you like a 7-day pilot on a copy of your own production database?

---

## 17. Final Recommendation

**Hypothesis validated:** Harmony Autopilot MCP should be positioned as **"AI production executor for Toon Boom Harmony"** — not a production tracker and not a cartoon generator. This positioning is:

- **Commercially clear:** the buyer instantly understands "I have plans, I need execution."
- **Defensible:** no direct competitor exists in the public market as of 2026-07-03.
- **Complementary:** to Producer, ShotGrid, Kitsu, Prism, Frame.io — enlarges the pie rather than fighting over tracking revenue.
- **Honest:** it concedes acting/story/360-rig as out-of-scope and promises assembly + audit + preview.
- **Buildable:** every must-have is already architected in `MCP.md`; the only missing piece is the marketing/demo layer.

Ship the demo. Lock the schema. Lead with the executor pitch. Charge a setup fee. Integrate Kitsu first. Say "unsupported" loudly when you mean it. Do not promise to make the cartoon — promise to **build the scenes the cartoon needs**.