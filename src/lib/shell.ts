/**
 * Which frame the website wears (owner request 2026-11-13, "go back to the old website but keep the current layouts"):
 * "classic" is the earlier shell, a labelled floating sidebar, a bordered top bar and a bordered page panel on the plain dark base;
 * "pill" is the 2026-11-09 shell, one solid frame with a pill rail, a pill header and the page-tab panel (kept in the code, switch it back here).
 * The pages themselves (the bento layouts) are the same in both.
 */
export const SHELL = "classic" as "classic" | "pill"
