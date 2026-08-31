// The panel-wide guard against losing edits.
//
// Anything that holds unsaved work registers here; every way out of a place
// - a tab, a sub-tab, a back arrow, a cancel button - asks the guard first.
// With unsaved work in the way, the person is asked whether to save it,
// throw it away, or stay. Nothing navigates past unsaved work silently, and
// nothing saves just because focus moved.

export interface UnsavedWork {
  /** Whether leaving now would lose something. */
  isDirty(): boolean;
  /** Persist the work. False means it failed and navigation must stop so
   *  the error stays on screen. */
  save(): Promise<boolean>;
  /** Throw the work away, restoring whatever is stored. */
  discard(): void;
}

export type UnsavedChoice = "save" | "discard" | "cancel";

/** Everything currently registered; the last dirty entry wins the prompt.
    A stack, because an editor opens inside the settings page and both hold
    work of their own. */
const stack: UnsavedWork[] = [];

export function registerUnsavedWork(work: UnsavedWork): void {
  stack.push(work);
}

export function unregisterUnsavedWork(work: UnsavedWork): void {
  const index = stack.indexOf(work);
  if (index >= 0) stack.splice(index, 1);
}

export function hasUnsavedWork(): boolean {
  return stack.some((w) => w.isDirty());
}

/** How the question reaches the person; the panel provides the dialog. */
type Prompter = () => Promise<UnsavedChoice>;
let prompter: Prompter | undefined;

export function setUnsavedPrompter(p: Prompter | undefined): void {
  prompter = p;
}

/**
 * Ask whether navigation may proceed. True means go ahead.
 *
 * Without a prompter the answer is yes: a guard that cannot ask must never
 * trap the person in a place they want to leave.
 */
export async function guardNavigation(): Promise<boolean> {
  const dirty = stack.filter((w) => w.isDirty());
  if (dirty.length === 0) return true;
  if (!prompter) return true;
  const choice = await prompter();
  if (choice === "cancel") return false;
  for (const work of dirty) {
    if (choice === "save") {
      if (!(await work.save())) return false;
    } else {
      work.discard();
    }
  }
  return true;
}
