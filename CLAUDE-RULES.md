# QERXEL — LOCKED RULES
## These rules are non-negotiable. Never violate them.

---

## Code rules

- **All styles are inline.** No CSS files. No CSS variables. No exceptions.
- **PowerShell does not support `&&`** — always two separate Bash tool calls.
- **Anon key in frontend only.** Service role key in API endpoints only. Never cross.
- **HS256 anon key only.** Never use the ES256 `sb_publishable_` key.
- **`.maybeSingle()` not `.single()`** — prevents 406 errors on 0 rows.
- **Save guard on every mutation:** `if (isPreview || !tenantId) return`
- **Preview write guard:** use `previewReadOnly` not `isPreview` (edit mode exists).
- **No comments** unless the WHY is non-obvious.
- **No new API files** — at 12/12 Vercel Hobby capacity. Consolidate first.
- **`.env` and seed scripts** must never be committed to git.

## Tier check pattern (canonical — always use this exactly)

```js
const isProfessional = tier === 'professional'
const isEnterprise = ['enterprise', 'bespoke'].includes(tier)
const isProfessionalOrAbove = isProfessional || isEnterprise
```

## Schema gotchas — verify before writing any query

- `staff_profiles.colour` — British English. NOT `color`.
- `staff_availability` has **NO `tenant_id` column** — linked to tenant via `staff_profiles` FK only.
- `appointments.status` valid values: `provisional`, `confirmed`, `completed`, `cancelled`, `no_show`. NOT `scheduled`.
- `appointments.title` is NOT NULL — always set it.
- `catalogue_items` price columns: `price_from` and `price_to`. NOT `price`.
- `appointments` has no `notes` column — use `client_notes` or `description`.
- `callers` table uses `full_name`, NOT `name`.
- `vera_speeches` column is `context_key`, NOT `speech_key`.
- `cancel_token uuid DEFAULT gen_random_uuid()` exists on `appointments`.

## Visual tokens (inline only)

| Token | Value |
|-------|-------|
| Violet primary | `#5e3b87` |
| Violet dark | `#4a2d6e` |
| Violet deep | `#3a2057` |
| Amber | `#f0a500` |
| Amber text | `#1a0533` |
| Page bg | `#e9e4f3` |
| Card bg | `#ffffff` / border `0.5px solid rgba(94,59,135,0.1)` |
| Success green | `#3db87a` |
| Text primary | `#1a1a1a` |
| Text secondary | `#666` |
| Text muted | `#aaa` |

Fonts: **Syne 700** (headings, numbers) · **DM Sans 300/400/500** (body). In index.html via Google Fonts.
Primary button: `#f0a500` bg · `#1a0533` text · `borderRadius 8px`
Disabled button: `#f5d98a` bg · `#7a5c1a` text
Locked sections: `blur(3px)` + `opacity 0.45` + absolute white badge

## Q Intelligence — "not a black box" rule (non-negotiable)

Every intelligence insight Q surfaces must follow WHAT / WHY / WHAT TO DO structure.
Never surface a score, flag, or label without a plain-English explanation of the evidence behind it.
Owner reads a sentence, not a dashboard. Q makes the decision obvious — it never makes the decision.

**Correct:** "Sarah has rescheduled three times in a row. She might be drifting. Worth a personal message."
**Wrong:** "Client risk score: 87 — High churn probability."

Positioning: "The analysis tools big business uses — now working on yours." Complexity is hidden. Insight is clear.

---

## Q Mood PNGs — workflow locked

`public/qmood/smile.png` · `content.png` · `sad.png` · `crying.png`
- Philip places files in `public/qmood/` himself. Claude verifies with `ls`, then deploys.
- Never write image content via chat or Write tool.
- Code pattern: `/qmood/${mood}.png` — no SVG fallback.
- Render sizes: 124px (FloatingBubble) · 136px (HelpMascot face) · 54px (coaching panel header).

## Deploy & infrastructure

- **Deploy:** `NODE_OPTIONS=--use-system-ca npx vercel deploy --prod` (TLS fix, Node 24 Windows)
- **Vercel GitHub auto-deploy:** broken — always deploy manually.
- **SQL via management API:** Node.js only — curl fails on Windows/Node 24.
  `POST https://api.supabase.com/v1/projects/kkrsvkxkefijmtbwykzv/database/query`
  with `Authorization: Bearer <SUPABASE_PAT>` (in `.env`)
- **Supabase project ref:** `kkrsvkxkefijmtbwykzv`
- **Live URL:** https://verante-portal.vercel.app
- **GitHub:** https://github.com/philsk1/verante-portal
