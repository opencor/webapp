// Our focus ring is shown when the browser considers that it should be (see :focus-visible), unless it has been hidden
// by an instance of OpenCOR (using the FOCUS_RING_HIDDEN_CLASS class, see OpenCOR.vue), i.e. when the user last used
// their pointing device (or pressed Escape with nothing to close) rather than the keyboard.
// Note: browsers show a focus ring when an element is focused by some code after the user has pressed a key, even if
//       they first used their pointing device (e.g., to open a dialog, which then gives the keyboard focus to one of
//       its buttons, and close it using Escape, which then gives the keyboard focus back to where it was), hence we
//       also keep track of whether the user last used their pointing device or the keyboard.

export const FOCUS_RING_HIDDEN_CLASS = 'opencor-focus-ring-hidden';

// The text entries, i.e. the elements in which the user can type some text.

export const TEXT_ENTRIES =
  'textarea, input:not([type="button"], [type="checkbox"], [type="color"], [type="file"], [type="radio"], [type="range"], [type="reset"], [type="submit"])';

export const isTextEntry = (element: Element): boolean => {
  return element.matches(TEXT_ENTRIES) || (element instanceof HTMLElement && element.isContentEditable);
};

// Whether the given element has a focus ring.
// Note: a text entry always has a focus ring when it is focused (since that is when the user can type in it), which is
//       also what browsers do, so we don't hide it.

export const hasFocusRing = (element: Element): boolean => {
  return element.matches(':focus-visible') && (isTextEntry(element) || !element.closest(`.${FOCUS_RING_HIDDEN_CLASS}`));
};
