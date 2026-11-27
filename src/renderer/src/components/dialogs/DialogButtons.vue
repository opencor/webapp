<script lang="ts">
import * as vue from 'vue';

import * as common from '../../common/common';

// The buttons of a dialog (e.g., OK and Cancel), which are given in the Windows order, i.e. with the primary button
// (e.g., OK) first, and which are shown in the order of the platform we are running on, i.e. with the primary button
// first on Windows, but last on macOS and Linux (as on GNOME), e.g., "OK Cancel" vs. "Cancel OK" or "Yes No Cancel" vs.
// "No Cancel Yes".
// Note: we reorder our buttons themselves (rather than only how they are laid out, e.g., using row-reverse), so that
//       the keyboard focus goes from one button to the next in the order in which they are shown.

const PRIMARY_BUTTON_LAST = !common.isWindows();

// Our buttons, i.e. the vnodes of our default slot, without the comments that Vue leaves for a v-if that is false and
// with the contents of fragments (e.g., a template with a v-if).

const buttons = (vnodes: vue.VNode[]): vue.VNode[] => {
  return vnodes.flatMap((vnode: vue.VNode): vue.VNode[] => {
    if (vnode.type === vue.Comment) {
      return [];
    }

    if (vnode.type === vue.Fragment && Array.isArray(vnode.children)) {
      return buttons(vnode.children as vue.VNode[]);
    }

    return [vnode];
  });
};

export default vue.defineComponent({
  name: 'DialogButtons',
  setup(_props, { slots }) {
    return () => {
      const orderedButtons = buttons(slots.default?.() ?? []);

      if (PRIMARY_BUTTON_LAST && orderedButtons.length > 1) {
        orderedButtons.push(orderedButtons.shift() as vue.VNode);
      }

      return vue.h('div', { class: 'flex gap-2' }, orderedButtons);
    };
  }
});
</script>
