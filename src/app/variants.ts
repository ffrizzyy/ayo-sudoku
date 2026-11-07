import type { Variant } from "../engine/types";

/** Every puzzle type the app offers, in the order the pickers show them. */
export const VARIANTS: Variant[] = ["classic", "diagonal", "windoku", "killer", "thermo"];

/** Windoku, Killer and Thermo are defined on the 9×9 grid only. */
export const NINE_ONLY: Variant[] = ["windoku", "killer", "thermo"];
