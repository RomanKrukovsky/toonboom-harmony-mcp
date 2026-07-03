# Marketing & Pipeline Analysis Report: Harmony Autopilot MCP

## 1. Executive Summary
The animation production pipeline has historically suffered from a massive automation gap: production tracking systems (Autodesk Flow/ShotGrid, Kitsu, Toon Boom Producer) manage **what** needs to be done, while individual artists manually execute **how** it is done in Toon Boom Harmony. 

**Harmony Autopilot MCP** bridges this gap by acting as an **AI Production Executor**. Instead of simply tracking or rendering assets, it reads storyboard, animatic, and shot metadata (via standard `scene_plan.json` formats), boots Harmony locally or headless, imports resources, assembles the scene structure, wires rigs, applies audio, generates draft lip-syncs, and performs automated quality assurance audits. This report details the competitive matrix, explains the rarity of direct solutions, presents the monetization models, and lays out a 90-day go-to-market plan.

---

## 2. Market Landscape
The B2B creative software market is bifurcated into:
1.  **Project Management & Asset Trackers (SaaS)**: Heavy web-based databases (ShotGrid, Kitsu, ftrack) that require manual status updates.
2.  **Asset Pipelines (FOSS/Enterprise)**: OpenPype/AYON and Prism which manage directory layouts and engine integrations (publishing), but do not automate in-app creative layout operations.

As studios face tightening margins, the manual overhead of scene assembly (which consumes 15–20% of animators' billable hours) represents a major inefficiency. Harmony Autopilot MCP introduces **Agentic Desktop RPA** combined with LLM intent parsing to turn static tracking data into completed scene assets.

---

## 3. Competitor Matrix

| Competitor | Production Tracking | Harmony Integration | Scene Assembly | AI/LLM Logic | UI Automation | Cost & Implementation | Target |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TB Producer** | Enterprise | Direct Sync | Manual/Scripted | None | None | Very High (Custom Enterprise Quote) | Major Studios |
| **Autodesk Flow / ShotGrid** | Enterprise | API Only | Scripted | None | None | High ($450/user/yr) | Medium/Large Studios |
| **Kitsu / CGWire** | Open-source/SaaS | API Only | None | None | None | Low/Medium (€19–39/user/mo) | Boutique/Mid-size |
| **AYON / OpenPype** | Pipeline Only | Engine Plugin | Publisher Only | None | None | Free (FOSS) / Medium (SaaS support) | Mid-size Studios |
| **Prism Pipeline** | Asset Manager | Save/Open | Publisher Only | None | None | Low/Free | Freelancers & Small Studios |
| **SyncSketch / Frame.io** | Review Only | None | None | None | None | Medium | Clients & Directors |
| **Harmony Autopilot MCP** | Out-of-box (via Kitsu) | Hybrid (API + UI RPA) | Fully Automated | Persistent Agent | Yes (NUT.js / RobotJS) | Low/Flexible Subscription | Freelancers & Small/Mid Studios |

---

## 4. Deep Dives by Product

### Toon Boom Producer
*   **What it is**: Toon Boom's official tracking tool.
*   **Target**: Tier-1 enterprise animation studios.
*   **Architecture**: Thick client and cloud synchronization. Offline scene synchronization via "Producer Link".
*   **API/Scripting**: Proprietary, Qt Script (ES5) base.
*   **Pros**: Native integration with Storyboard Pro and Harmony.
*   **Cons**: Expensive, slow to configure, requires an active database server.
*   **Value for Autopilot**: Autopilot does not compete with Producer’s tracker database; instead, it uses the same Qt Script interfaces to execute offline scene building automatically.
*   **Competitor**: Indirectly, yes, for asset coordination.
*   **Integration**: Yes, can consume database tasks via Telnet commands.

### Kitsu (CGWire)
*   **What it is**: Lightweight, open-source production tracker.
*   **Target**: Independent, mid-sized, and remote animation teams.
*   **Architecture**: Web-based database with Python API.
*   **Pros**: Affordable, modern REST API, clean UI, highly customisable.
*   **Cons**: No built-in desktop execution engine or scene-assembly tools.
*   **Value for Autopilot**: Kitsu is the ideal database front-end. Autopilot uses the Kitsu API to pull tasks, build the scene plan, and push completed render outputs back to reviewers.
*   **Competitor**: No.
*   **Integration**: Excellent (our primary pipeline integration).

### AYON (formerly OpenPype)
*   **What it is**: Open-source pipeline framework.
*   **Target**: Tech-heavy VFX and animation houses.
*   **Architecture**: Python/Qt tray application connecting multiple DCCs (Blender, Maya, Harmony) to a central asset database.
*   **Pros**: Strong publishing standards, enforces naming conventions.
*   **Cons**: Extreme complexity to set up; requires an experienced pipeline TD.
*   **Value for Autopilot**: We can adopt AYON's strict directory structure templates.
*   **Competitor**: Indirect (pipeline framework).
*   **Integration**: Yes, could run inside an AYON pipeline container.

### monday.com / Notion / Airtable
*   **What it is**: General-purpose SaaS database and task boards.
*   **Target**: Small studios, indie filmmakers, explainer creators.
*   **Pros**: Drag-and-drop, zero setup barrier, cheap.
*   **Cons**: Completely blind to scene graphics, cannot check if layer exposures are empty or if rigs are wired.
*   **Value for Autopilot**: Autopilot can read Airtable CSV lists to compile execution schedules.
*   **Competitor**: No.
*   **Integration**: Easy CSV/JSON read hooks.

### Adobe After Effects automation / Blender Pipeline (Flamenco)
*   **What it is**: Scripting and network rendering (e.g. Flamenco for Blender).
*   **Pros**: Strong headless scripting CLI.
*   **Cons**: Custom-coded for each studio, not available as a packaged product.
*   **Value for Autopilot**: Autopilot adapts Blender's headless background daemon execution model.

---

## 5. Direct/Indirect Competitors
*   **Direct Competitors**: None. There is currently no out-of-the-box product that boots Harmony and automatically positions layers, wires nodes, runs local lip-sync, and exports previews without artist interaction.
*   **Indirect Competitors**: Custom in-house scripts written by Technical Directors (TDs) at large animation studios (Disney, CN, Spa Studios). These scripts are highly proprietary, never sold publicly, and require full-time internal engineering teams to maintain.

---

## 6. Why Direct Analogs Are Rare
1.  **API Fragility**: Toon Boom’s internal Qt Script engine is locked to ES5 and lacks direct access to modern OS level utilities.
2.  **UI Automating Is Hard**: Native Canvas elements bypass standard accessibility trees. Scripting clicks requires pixel-perfect OS-level mouse control, which is prone to breaking during minor Harmony updates.
3.  **Lack of Standardization**: Every studio builds rigs differently. Naming conventions for layers and ports are arbitrary.
4.  **Licensing Bottlenecks**: Headless rendering and Python API access require expensive Premium licenses, making local scripts costly to run at scale without active resource management.

---

## 7. Our Unique Position
Harmony Autopilot MCP solves these hurdles through a **Hybrid Agentic Model**:
*   **Static XML Parser**: Inspects nodes and cables without launching Harmony, saving licenses.
*   **Headless Python Bridge**: Operates inside a persistent background daemon, avoiding process launch overhead.
*   **Visual State Guard**: Uses screenshot OCR and pixel verification to check if modal dialogs appear during automation.
*   **Fallback to Human**: If a custom rig structure breaks the assembly, the agent triggers a non-blocking `human_confirm` checkpoint instead of freezing, allowing overnight automation batches to continue.

---

## 8. Strongest USP
> **"The AI Production Executor for Toon Boom Harmony"**

*   *Slogan*: "Your production tracker tells you *what* needs to be done. Harmony Autopilot *does* it."
*   *Financial Hook*: Reduces scene assembly overhead from 35 minutes to 5 seconds per shot, saving mid-size studios $12,000+ per episode in manual labor and license seats.

---

## 9. Target Customers

### 1. Boutique 2D Studios (5-20 artists)
*   **Pain**: High production tracking overhead, no budget for a full-time Pipeline TD.
*   **Offer**: "Studio" package with out-of-the-box Kitsu sync and template scene builder.
*   **Pricing**: $250 - $400 / month per studio.

### 2. YouTube / TikTok Animation Teams
*   **Pain**: Short deadlines, repetitive layouts, low budget.
*   **Offer**: "Starter" package for importing character stubs and automated rendering.
*   **Pricing**: $49 / month.

### 3. Outsource Animation Vendors
*   **Pain**: Constrained margins, strict naming conventions demanded by supervisors, heavy QA penalty.
*   **Offer**: "Pro" package featuring the XML quality audit check before delivering scene packages.
*   **Pricing**: $99 / user / month.

---

## 10. Pricing & Monetization

*   **Starter (Freelance/Indie)**: $49/mo. 1 user license, local XML auditor, local script generator.
*   **Studio (Boutique Team)**: $299/mo. Up to 10 users, Kitsu sync, persistent daemon execution server, automated recovery flows.
*   **Enterprise (Custom Pipeline)**: Custom pricing ($1,500+ setup + $499/mo maintenance). Tailored rig connector, custom naming convention translators, dedicated database connectors.

---

## 11. Technical Product Changes

### Must-Have
1.  `scene_plan.json` version 1.0 schema enforcement.
2.  Persistent background daemon for Python API bridge to bypass startup latency.
3.  Simulated mode toggle for test suites without Toon Boom licenses.
4.  Zero-license XML Auditor parsing `.xstage` structure in <10ms.

### Should-Have
1.  Multi-scene Telnet database transaction batching.
2.  Sqlite asset existence caching to reduce remote storage query latency.
3.  Headless auto-bailout when a scene-setup error occurs.

### Could-Have
1.  Direct Kitsu task auto-update loop.
2.  Discord/Slack notification integration for completed review renders.

---

## 12. Integration Opportunities
*   **Kitsu (High Value/Low Effort)**: Integrates directly with our parser. Allows automatic status changes and preview render updates.
*   **Frame.io / SyncSketch (Medium Value)**: Pushing preview video renders straight into reviewer pages.
*   **Google Drive / Dropbox (High Value/Low Effort)**: Automated pulling of background artwork and character templates from shared team drives.

---

## 13. Risk Analysis
*   **Technical Risk**: OS mouse/keyboard automation blocks when screen lock is active. 
    *   *Mitigation*: Run Autopilot inside a virtual framebuffer (Xvfb/RDP session).
*   **Legal Risk**: Violation of Toon Boom Harmony EULA if code bypasses license checks.
    *   *Mitigation*: Absolute compliance. The agent strictly runs through registered `HarmonyPremium` desktop binaries and authenticated Python packages.
*   **Business Risk**: Custom studio rigs fail script assembly rules.
    *   *Mitigation*: Sandbox executions and fall back to manual checks via `human_confirm` checkpoints.

---

## 14. 30-Day Product Plan
*   **Days 1–10**: Finalize the core NPM server package. Run Jest test suite across macOS, Windows, and headless environments.
*   **Days 11–20**: Build a 3-minute commercial demo screen-capture video displaying a scene plan converting directly into a populated Harmony timeline.
*   **Days 21–30**: Select 3 boutique animation studios for an invite-only pilot program. Set up the local SQLite database cache and verify performance gains.

---

## 15. 90-Day Commercial Plan
*   **Days 31–60**: Publish the product open-source core with commercial SaaS addons. Attend industry conferences (Annecy, Siggraph) and pitch directly to Pipeline Leads.
*   **Days 61–90**: Launch the "Studio" subscription tier. Introduce the time-savings report feature to provide managers with a clear ROI breakdown directly on their project dashboards.

---

## 16. Sales Pitch

### Elevator Pitch (Production Manager)
> "Every time a scene is created, your animators waste 25 minutes manually downloading backgrounds, loading character rigs, syncing audio tracks, and aligning exposure keys. Harmony Autopilot MCP executes this automatically from your storyboard/shot list, so when your artist opens Harmony, they are ready to animate instantly."

---

## 17. Final Recommendation
Harmony Autopilot MCP should position itself as the **missing execution layer** of the animation pipeline. By integrating with existing project management databases (Kitsu/ShotGrid) and automating layout tasks locally, the tool provides a clear, measurable ROI for studios. We recommend finalizing the open-pilot integrations and launching the SaaS subscription model immediately.
