// Shared by ServiceCatalogue.jsx and ProductCatalogue.jsx — single source of truth
// for catalogue item caps. Caps only apply to Answer subscription tiers; Schedule
// has no documented catalogue size limit (see CLAUDE-PRODUCTS.md), so schedule_only
// tenants and any unrecognised tier value are treated as unlimited rather than
// silently inheriting an Answer-tier number that has nothing to do with their plan.
const SERVICE_LIMIT = { free: 5, light: 20, standard: 60, professional: 200, enterprise: Infinity, bespoke: Infinity }
const PRODUCT_LIMIT = { free: 5, light: 30, standard: 100, professional: 400, enterprise: Infinity, bespoke: Infinity }

export const serviceLimit = (tier) => SERVICE_LIMIT[tier] ?? Infinity
export const productLimit = (tier) => PRODUCT_LIMIT[tier] ?? Infinity
