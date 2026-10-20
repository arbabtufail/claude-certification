// WHAT EACH MODEL ACCEPTS (plain data, safe for the browser)
// The course was recorded on Claude Sonnet 4.5. Two of its techniques only work on the 4.5-era models:
//   temperature other than 1 (lesson 6)  -> newer models: 400 "`temperature` is deprecated for this model."
//   assistant prefill (lesson 8)          -> newer models: 400 "This model does not support assistant message prefill."
// Tested against every model in lib/claude/models.ts on 2026-10-19. Stop sequences work everywhere.

export const COURSE_MODEL = "claude-sonnet-4-5"; // the course's model (deprecated, ends Nov 30 2026)

const LEGACY_45 = new Set(["claude-sonnet-4-5", "claude-haiku-4-5"]);

export const supportsTemperature = (model: string) => LEGACY_45.has(model);
export const supportsPrefill = (model: string) => LEGACY_45.has(model);
// output_config.effort errors on the 4.5 models and works on everything newer.
export const supportsEffort = (model: string) => !LEGACY_45.has(model);

export const LEGACY_MODELS = [...LEGACY_45];
