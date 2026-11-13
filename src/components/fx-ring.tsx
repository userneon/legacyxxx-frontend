/** The visible half of the cursor effects (`lib/cursor-fx.ts`): a thin lit border and a soft light that follow the pointer, and, with `holo`, a holographic sheen.
 *  Put it as a direct child of an element that has `data-fx`; the element sets `--fx` / `--fx-c` for another colour than the brand violet. */
export function FxRing({ holo }: { holo?: boolean }) {
  return (
    <>
      <span aria-hidden="true" className="lx-fx-spot" />
      {holo && <span aria-hidden="true" className="lx-fx-holo" />}
      <span aria-hidden="true" className="lx-fx-ring" />
    </>
  )
}
