<template>
  <!--
  Note: our menubar is never turned into a hamburger menu (which PrimeVue does below its breakpoint), hence our breakpoint
        of 0px.
  -->
  <Menubar ref="menuBarRef" :id="props.id" :model="items" breakpoint="0px" :pt="MENUBAR_PT">
    <template #item="{ item, props, root }">
      <a v-bind="props.action">
        <i v-if="!root" :class="item.icon" class="menu-item-icon shrink-0" />
        <div v-hint="item.hint" class="p-menubar-item-label">{{ item.label }}</div>
        <i v-if="item.external" class="menu-item-external ml-auto pl-6 pi pi-external-link" />
        <div v-if="item.shortcut" class="shortcut ml-auto pl-6 whitespace-nowrap">
          {{ item.shortcut }}
        </div>
        <i v-if="item.items && !root" class="menu-item-chevron ml-auto pl-6 pi pi-angle-right" />
      </a>
    </template>
    <template #end>
      <button v-if="updateAvailable" class="update-link flex items-center gap-1.5 whitespace-nowrap px-2.5 py-0.5 text-xs cursor-pointer rounded-full transition-colors duration-150"
        type="button"
        @click="emit('updateAvailable')"
      >
        <i class="pi pi-arrow-circle-up text-xs" />
        New version available
      </button>
      <ThemeWidget v-if="themeCanBeChanged" :theme="theme.theme()" @switch="onThemeSwitch" />
    </template>
  </Menubar>
</template>

<script setup lang="ts">
import type Menubar from 'primevue/menubar';
import type { MenuItem, MenuItemCommandEvent } from 'primevue/menuitem';
import * as vue from 'vue';

import type { OpenCORTheme } from '../../index';

import * as common from '../common/common';
import { vHint } from '../common/hint';
import { settings } from '../common/settings';
import * as version from '../common/version';
import * as vueCommon from '../common/vueCommon';

import { useOpenCORContext, useOpenCORKeyStroke } from './OpenCORContext';

const props = defineProps<{
  id?: string;
  hasFiles: boolean;
  hasSeveralFiles: boolean;
  canSave: boolean;
  canSaveAs: boolean;
  recentFilePaths: string[];
}>();

const emit = defineEmits<{
  about: [];
  changelog: [];
  clearRecentFiles: [];
  close: [];
  closeAll: [];
  download: [];
  nextFile: [];
  open: [];
  openLocation: [];
  openSampleLorenz: [];
  previousFile: [];
  reopen: [filePath: string];
  save: [];
  saveAs: [];
  settings: [];
  updateAvailable: [];
}>();

const { themeCanBeChanged } = useOpenCORContext();

const isWindowsOrLinux = common.isWindows() || common.isLinux();
const isMacOs = common.isMacOs();
const hasSaveFilePicker = common.hasSaveFilePicker();
const updateAvailable = version.updateAvailable;

// Theme button, which allows the user to cycle through the system, light, and dark themes.

const theme = vueCommon.useTheme();

// Reopen the most recent file, if any.

const reopenMostRecentFile = (): void => {
  const filePath = props.recentFilePaths[0];

  if (filePath) {
    emit('reopen', filePath);
  }
};

const onThemeSwitch = (newTheme: OpenCORTheme) => {
  // Switch to the next theme, apply it, and save it in our settings.

  theme.applyTheme(newTheme);

  settings.general.theme = newTheme;

  settings.save();
};

// When a menu item is selected, return the keyboard focus to where it was before our main menu got it (or, if it was
// selected using the pointing device, remove it from our main menu), as a native menu does, and only then handle the
// menu item. Otherwise, our main menu would keep the keyboard focus (PrimeVue gives it to our root list once a menu
// item has been selected), and would, for instance, get it back (with its first root item highlighted) when closing a
// dialog that was opened using a menu item.
// Note #1: a menu item selected using the keyboard is "clicked" by PrimeVue, but with no click count. If our main menu
//          got the keyboard focus using the keyboard, but not using our keyboard shortcut (e.g., using Tab), then there
//          is nowhere to return the keyboard focus to, so our main menu keeps it.
// Note #2: PrimeVue gives the keyboard focus to our root list after having called the command of the selected menu
//          item, hence we call it in a microtask, i.e. once PrimeVue is done.

const returnFocusOnCommand = (menuItems: MenuItem[]): MenuItem[] => {
  return menuItems.map((menuItem: MenuItem): MenuItem => {
    const command = menuItem.command;

    return {
      ...menuItem,
      ...(menuItem.items ? { items: returnFocusOnCommand(menuItem.items as MenuItem[]) } : {}),
      ...(command
        ? {
            command: (event: MenuItemCommandEvent) => {
              if (
                (event.originalEvent instanceof MouseEvent && event.originalEvent.detail > 0) ||
                previouslyFocusedElement?.isConnected
              ) {
                queueMicrotask(() => {
                  blurMainMenu();
                  command(event);
                });
              } else {
                command(event);
              }
            }
          }
        : {})
    };
  });
};

// The label of a recent file, i.e. its path, unless it is too long (which would make our Reopen submenu too wide), in
// which case it is shortened in its middle, so that both the start of its path and its file name remain visible, with
// its full path then being shown as a hint.

const MAX_RECENT_FILE_LABEL_LENGTH = 64;
const MIN_RECENT_FILE_LABEL_START_LENGTH = 16;

const recentFileLabel = (filePath: string): string => {
  if (filePath.length <= MAX_RECENT_FILE_LABEL_LENGTH) {
    return filePath;
  }

  const fileNameIndex = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
  const maxEndLength = MAX_RECENT_FILE_LABEL_LENGTH - MIN_RECENT_FILE_LABEL_START_LENGTH - 1;
  const endLength = fileNameIndex >= 0 ? Math.min(filePath.length - fileNameIndex, maxEndLength) : maxEndLength;
  const startLength = MAX_RECENT_FILE_LABEL_LENGTH - endLength - 1;

  return `${filePath.slice(0, startLength)}…${filePath.slice(-endLength)}`;
};

// Let assistive technologies know about the keyboard shortcut of a menu item (using the ARIA key names, e.g.,
// "Control+Alt+O" or "Alt+Meta+O" rather than "Ctrl+Alt+O" or "⌥⌘O"), and about the full path of a recent file whose
// label has been shortened (see recentFileLabel()).

const ARIA_KEY_NAMES: Record<string, string> = {
  Ctrl: 'Control',
  '⌃': 'Control',
  '⌥': 'Alt',
  '⇧': 'Shift',
  '⌘': 'Meta',
  '⇥': 'Tab'
};

const ariaKeyShortcuts = (shortcut: string): string => {
  const keys = shortcut.includes('+') ? shortcut.split('+') : Array.from(shortcut);

  return keys.map((key: string) => ARIA_KEY_NAMES[key] ?? key).join('+');
};

interface MenubarItemPtOptions {
  context: {
    item?: MenuItem;
  };
}

const MENUBAR_PT = {
  item: ({ context }: MenubarItemPtOptions) => {
    const item = context.item;

    return {
      ...(item?.shortcut ? { 'aria-keyshortcuts': ariaKeyShortcuts(item.shortcut) } : {}),
      ...(item?.hint ? { 'aria-label': item.hint } : {})
    };
  }
};

// Menu items, which are computed so that they can be reactive to changes in our props, and which return the keyboard
// focus to where it was when selected (see returnFocusOnCommand() above).

const menuItems = vue.computed(() => [
  {
    label: 'File',
    items: [
      {
        label: 'Open...',
        icon: 'pi pi-folder-open',
        shortcut: isWindowsOrLinux ? 'Ctrl+Alt+O' : isMacOs ? '⌥⌘O' : undefined,
        command: () => {
          emit('open');
        }
      },
      {
        label: 'Open Location...',
        icon: 'pi pi-link',
        shortcut: isWindowsOrLinux ? 'Ctrl+Shift+Alt+O' : isMacOs ? '⌥⇧⌘O' : undefined,
        command: () => {
          emit('openLocation');
        }
      },
      {
        label: 'Open Sample',
        icon: 'pi pi-book',
        items: [
          {
            label: 'Lorenz',
            icon: 'pi pi-file',
            command: () => {
              emit('openSampleLorenz');
            }
          }
        ]
      },
      { separator: true },
      {
        label: 'Reopen',
        icon: 'pi pi-replay',
        items: [
          {
            label: 'Most Recent',
            icon: 'pi pi-clock',
            shortcut: isWindowsOrLinux ? 'Ctrl+Shift+Alt+T' : isMacOs ? '⌥⇧⌘T' : undefined,
            command: reopenMostRecentFile,
            disabled: () => !props.recentFilePaths.length
          },
          ...(props.recentFilePaths.length
            ? [
                { separator: true },
                ...props.recentFilePaths.map((filePath: string) => {
                  const label = recentFileLabel(filePath);

                  return {
                    label,
                    hint: label === filePath ? undefined : filePath,
                    icon: 'pi pi-file',
                    command: () => {
                      emit('reopen', filePath);
                    }
                  };
                })
              ]
            : []),
          { separator: true },
          {
            label: 'Clear Menu',
            icon: 'pi pi-trash',
            command: () => {
              emit('clearRecentFiles');
            },
            disabled: () => !props.recentFilePaths.length
          }
        ]
      },
      { separator: true },
      // Note: without a save file picker, saving a file means downloading it, so we only offer to download it.
      ...(hasSaveFilePicker
        ? [
            {
              label: 'Save',
              icon: 'pi pi-save',
              shortcut: isWindowsOrLinux ? 'Ctrl+Alt+S' : isMacOs ? '⌥⌘S' : undefined,
              command: () => {
                emit('save');
              },
              disabled: () => !props.canSave
            },
            {
              label: 'Save As...',
              icon: 'pi pi-file-export',
              shortcut: isWindowsOrLinux ? 'Ctrl+Shift+Alt+S' : isMacOs ? '⌥⇧⌘S' : undefined,
              command: () => {
                emit('saveAs');
              },
              disabled: () => !props.canSaveAs
            }
          ]
        : [
            {
              label: 'Download',
              icon: 'pi pi-download',
              shortcut: isWindowsOrLinux ? 'Ctrl+Alt+S' : isMacOs ? '⌥⌘S' : undefined,
              command: () => {
                emit('download');
              },
              disabled: () => !props.canSaveAs
            }
          ]),
      { separator: true },
      {
        label: 'Next File',
        icon: 'pi pi-arrow-right',
        shortcut: isWindowsOrLinux ? 'Ctrl+Alt+Tab' : isMacOs ? '⌃⌥⇥' : undefined,
        command: () => {
          emit('nextFile');
        },
        disabled: () => !props.hasSeveralFiles
      },
      {
        label: 'Previous File',
        icon: 'pi pi-arrow-left',
        shortcut: isWindowsOrLinux ? 'Ctrl+Shift+Alt+Tab' : isMacOs ? '⌃⌥⇧⇥' : undefined,
        command: () => {
          emit('previousFile');
        },
        disabled: () => !props.hasSeveralFiles
      },
      { separator: true },
      {
        label: 'Close',
        icon: 'pi pi-times',
        shortcut: isWindowsOrLinux ? 'Ctrl+Alt+W' : isMacOs ? '⌥⌘W' : undefined,
        command: () => {
          emit('close');
        },
        disabled: () => !props.hasFiles
      },
      {
        label: 'Close All',
        icon: 'pi pi-times-circle',
        command: () => {
          emit('closeAll');
        },
        disabled: () => !props.hasFiles
      }
    ]
  },
  /* TODO: enable the settings menu once we have settings for OpenCOR's Web app.
  {
    label: 'Tools',
    items: [
      {
        label: 'Settings...',
        icon: 'pi pi-cog',
        shortcut: isWindowsOrLinux ? 'Ctrl+Alt+,' : isMacOs ? '⌥⌘,' : undefined,
        command: () => {
          emit('settings');
        }
      }
    ]
  },
  */
  {
    label: 'Help',
    items: [
      {
        label: 'Home Page',
        icon: 'pi pi-home',
        external: true,
        command: () => {
          window.open('https://opencor.ws/');
        }
      },
      {
        label: 'Changelog',
        icon: 'pi pi-history',
        command: () => {
          emit('changelog');
        }
      },
      {
        label: 'Report Issue',
        icon: 'pi pi-github',
        external: true,
        command: () => {
          window.open('https://github.com/opencor/webapp/issues/new');
        }
      },
      { separator: true },
      {
        label: 'About OpenCOR',
        icon: 'pi pi-info-circle',
        command: () => {
          emit('about');
        }
      }
    ]
  }
]);

const items = vue.computed(() => returnFocusOnCommand(menuItems.value));

// Some of the internal state of PrimeVue's Menubar component, which we need to handle some keys ourselves (see
// onRootListKeyDown() below).

interface MenubarProcessedItem {
  index: number;
  level: number;
  parentKey: string;
}

interface MenubarInternals {
  activeItemPath: MenubarProcessedItem[];
  focusedItemInfo: { index: number; level?: number; parentKey: string };
}

// A few things that can only be done when the component is mounted.

const menuBarRef = vue.shallowRef<(InstanceType<typeof Menubar> & { hide: () => void; $el: HTMLElement }) | null>(null);

vue.onMounted(() => {
  if (menuBarRef.value) {
    const menuBarElement = menuBarRef.value.$el;

    // Close the menu when clicking on the menubar but outside of the main menu items.

    const onClick = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        menuBarElement.contains(target) &&
        !menuBarElement.querySelector('.p-menubar-root-list')?.contains(target) &&
        !Array.from(document.querySelectorAll('.p-menubar-submenu')).some((submenu) => submenu.contains(target))
      ) {
        menuBarRef.value?.hide();
      }
    };

    document.addEventListener('click', onClick);

    // Handle some keys ourselves, before PrimeVue gets them (hence we listen to them during the capture phase):
    //  - Escape:
    //     - with no submenu shown: return the keyboard focus to where it was before our main menu got it using our
    //       keyboard shortcut (see focusMainMenu() below). Our main menu may, however, have been given the keyboard
    //       focus otherwise (e.g., using Tab), in which case there is nowhere to return to, so we just remove the
    //       keyboard focus from it.
    //     - with a submenu of a submenu shown: only close that submenu (and select the item that opened it), as in a
    //       native menu and as recommended by the WAI-ARIA menu pattern, rather than close all our submenus (and select
    //       the root item), as PrimeVue does.
    //  - ArrowLeft, ArrowUp, and ArrowDown, with a submenu shown that has no item that can be selected (e.g., our
    //    Reopen submenu when there are no recent files, i.e. when its only item is disabled): PrimeVue doesn't handle
    //    that case (i.e. ArrowLeft does nothing while ArrowUp throws an exception), so we close that submenu (and
    //    select the item that opened it) for ArrowLeft and do nothing for ArrowUp and ArrowDown.
    // Note: with only the submenu of a root item shown, PrimeVue already does the right thing for Escape and
    //       ArrowLeft, i.e. close that submenu and select its root item, or select the previous root item.

    const rootListElement = menuBarElement.querySelector<HTMLElement>('.p-menubar-root-list');

    const closeInnermostSubmenu = (menubar: MenubarInternals): void => {
      const parentItem = menubar.activeItemPath[menubar.activeItemPath.length - 1];

      if (!parentItem) {
        return;
      }

      menubar.activeItemPath = menubar.activeItemPath.slice(0, -1);
      menubar.focusedItemInfo = { index: parentItem.index, level: parentItem.level, parentKey: parentItem.parentKey };
    };

    const onRootListKeyDown = (event: KeyboardEvent) => {
      const menubar = menuBarRef.value as unknown as MenubarInternals | null;

      if (!menubar || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }

      const handled = (): void => {
        event.preventDefault();
        event.stopImmediatePropagation();
      };
      const noSelectableItem = menubar.focusedItemInfo.index === -1 && menubar.focusedItemInfo.parentKey !== '';

      if (event.key === 'Escape') {
        if (!menubar.activeItemPath.length) {
          handled();

          blurMainMenu();
        } else if (menubar.activeItemPath.length > 1 || noSelectableItem) {
          handled();

          closeInnermostSubmenu(menubar);
        }
      } else if (noSelectableItem) {
        if (event.key === 'ArrowLeft') {
          handled();

          closeInnermostSubmenu(menubar);
        } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          handled();
        }
      }
    };

    // Forget where the keyboard focus was before our main menu got it as soon as our main menu loses it (e.g., when
    // using Tab or clicking elsewhere).

    const onRootListFocusOut = () => {
      previouslyFocusedElement = null;
    };

    // Remember where the keyboard focus was before our main menu gets it using the pointing device, so that it can be
    // returned there once a menu item has been selected (see returnFocusOnCommand() above).

    const onRootListPointerDown = () => {
      const focusedElement = document.activeElement;

      if (focusedElement instanceof HTMLElement && rootListElement?.contains(focusedElement)) {
        return;
      }

      previouslyFocusedElement =
        focusedElement instanceof HTMLElement && focusedElement !== document.body ? focusedElement : null;
    };

    // Keep a submenu open when the item that opened it (e.g., our Open Sample item) gets clicked while its submenu is
    // open (e.g., after it got opened by hovering that item), rather than close it, as PrimeVue does (i.e. it toggles
    // it), which looks broken to people who click an item to open its submenu.
    // Note: we leave our root items alone, i.e. clicking one of them still toggles its submenu, as in a native menu bar.

    const onRootListClick = (event: MouseEvent) => {
      const item = (event.target as Element | null)?.closest('.p-menubar-item');

      if (
        item &&
        item.parentElement !== rootListElement &&
        rootListElement?.contains(item) &&
        item.getAttribute('aria-expanded') === 'true'
      ) {
        event.stopPropagation();
      }
    };

    // Position the submenus of our submenus (e.g., our Reopen submenu), which PrimeVue always shows to the right of
    // their parent item, so that they don't go off the right edge of the page (e.g., on a phone). So, a submenu is
    // shown to the right of its parent item if it fits there, or to its left if it fits there instead, or otherwise as
    // far to the right as possible (i.e. over its parent submenu).
    // Note: PrimeVue shows a submenu (after updating the DOM) whenever its active item path changes, so we position our
    //       submenus once the DOM has been updated.

    const SUBMENU_GAP = 4; // I.e. 0.25rem, see the margin of a submenu of a submenu below.

    const positionSubmenus = (): void => {
      const pageWidth = document.documentElement.clientWidth;

      for (const submenu of menuBarElement.querySelectorAll<HTMLElement>('.p-menubar-submenu .p-menubar-submenu')) {
        submenu.style.left = '';
        submenu.style.marginLeft = '';

        const item = submenu.parentElement;

        if (!item || !submenu.getClientRects().length) {
          continue;
        }

        const itemRect = item.getBoundingClientRect();
        const submenuWidth = submenu.offsetWidth;

        if (itemRect.right + SUBMENU_GAP + submenuWidth <= pageWidth) {
          continue;
        }

        const left =
          itemRect.left - SUBMENU_GAP - submenuWidth >= 0
            ? -SUBMENU_GAP - submenuWidth
            : Math.max(0, pageWidth - submenuWidth) - itemRect.left;

        submenu.style.left = `${left}px`;
        submenu.style.marginLeft = '0';
      }
    };

    vue.watch(() => (menuBarRef.value as unknown as MenubarInternals | null)?.activeItemPath, positionSubmenus, {
      flush: 'post'
    });

    // Let assistive technologies know about our keyboard shortcut.

    rootListElement?.setAttribute('aria-keyshortcuts', 'Control+Alt+M');

    rootListElement?.addEventListener('keydown', onRootListKeyDown, { capture: true });
    rootListElement?.addEventListener('focusout', onRootListFocusOut);
    rootListElement?.addEventListener('pointerdown', onRootListPointerDown, { capture: true });
    rootListElement?.addEventListener('click', onRootListClick, { capture: true });

    // Clean up our event listeners when the component is unmounted.

    vue.onBeforeUnmount(() => {
      document.removeEventListener('click', onClick);

      rootListElement?.removeEventListener('keydown', onRootListKeyDown, { capture: true });
      rootListElement?.removeEventListener('focusout', onRootListFocusOut);
      rootListElement?.removeEventListener('pointerdown', onRootListPointerDown, { capture: true });
      rootListElement?.removeEventListener('click', onRootListClick, { capture: true });
    });
  }
});

// Give the keyboard focus to our main menu or return it to where it was.
// Note: desktop applications let people access their main menu using Alt or F10 (Windows and Linux) or Ctrl+F2
//       (macOS), but those shortcuts are used by Web browsers or the operating system, so we use our own shortcut (see
//       below), i.e. Ctrl+Alt+M on all platforms. On macOS, we don't use Cmd+Alt+M (as for our other shortcuts) since
//       it is used to minimise all the windows of the Web browser, but Ctrl+Alt+M, which is also in line with Ctrl+F2.

let previouslyFocusedElement: HTMLElement | null = null;

const mainMenuRootList = (): HTMLElement | null => {
  return menuBarRef.value?.$el.querySelector<HTMLElement>('.p-menubar-root-list') ?? null;
};

const focusMainMenu = (): void => {
  const rootListElement = mainMenuRootList();

  if (!rootListElement) {
    return;
  }

  const focusedElement = document.activeElement;

  rootListElement.focus();

  previouslyFocusedElement =
    focusedElement instanceof HTMLElement && focusedElement !== document.body && focusedElement !== rootListElement
      ? focusedElement
      : null;
};

const blurMainMenu = (): void => {
  const elementToFocus = previouslyFocusedElement;

  menuBarRef.value?.hide();

  if (elementToFocus?.isConnected) {
    elementToFocus.focus({ preventScroll: true });
  } else {
    mainMenuRootList()?.blur();
  }
};

// Keyboard shortcuts.
// Note: we match the letter of a shortcut rather than its physical key (see common.shortcutLetter()).

useOpenCORKeyStroke((event: KeyboardEvent) => {
  const letter = common.shortcutLetter(event);

  if (event.ctrlKey && !event.metaKey && !event.shiftKey && event.altKey && letter === 'M') {
    event.preventDefault();

    if (mainMenuRootList() === document.activeElement) {
      blurMainMenu();
    } else {
      focusMainMenu();
    }
  } else if (common.isCtrlOrCmd(event) && !event.shiftKey && event.altKey && letter === 'O') {
    event.preventDefault();

    emit('open');
  } else if (common.isCtrlOrCmd(event) && event.shiftKey && event.altKey && letter === 'O') {
    event.preventDefault();

    emit('openLocation');
  } else if (common.isCtrlOrCmd(event) && event.shiftKey && event.altKey && letter === 'T') {
    event.preventDefault();

    reopenMostRecentFile();
  } else if (
    hasSaveFilePicker &&
    props.canSave &&
    common.isCtrlOrCmd(event) &&
    !event.shiftKey &&
    event.altKey &&
    letter === 'S'
  ) {
    event.preventDefault();

    emit('save');
  } else if (
    hasSaveFilePicker &&
    props.canSaveAs &&
    common.isCtrlOrCmd(event) &&
    event.shiftKey &&
    event.altKey &&
    letter === 'S'
  ) {
    event.preventDefault();

    emit('saveAs');
  } else if (
    !hasSaveFilePicker &&
    props.canSaveAs &&
    common.isCtrlOrCmd(event) &&
    !event.shiftKey &&
    event.altKey &&
    letter === 'S'
  ) {
    event.preventDefault();

    emit('download');
  } else if (props.hasFiles && common.isCtrlOrCmd(event) && !event.shiftKey && event.altKey && letter === 'W') {
    event.preventDefault();

    emit('close');

    /* TODO: enable the settings menu once we have settings for OpenCOR's Web app.
  } else if (common.isCtrlOrCmd(event) && !event.shiftKey && event.altKey && event.code === 'Comma') {
    event.preventDefault();

    emit('settings');
    */
  }
});
</script>

<style scoped>
.p-menubar {
  --p-menubar-padding: 0.125rem 0.25rem;
  --p-menubar-base-item-padding: 0.25rem 0.5rem;
  --p-menubar-item-padding: 0.375rem 0.5rem;
  --p-menubar-submenu-padding: 0.25rem;
  --p-menubar-submenu-border-radius: 0.5rem;
  --p-menubar-submenu-shadow: var(--opencor-overlay-shadow);

  position: relative;
  border: none;
  border-radius: 0;
  border-bottom: 1px solid var(--border-color);
  font-size: 0.875rem;
  container: main-menu / inline-size;
}

:deep(.p-menubar-end) {
  display: flex;
  align-items: center;
}

:deep(.p-menubar-root-list) {
  gap: 0.125rem;
}

:deep(.p-menubar-item-link) {
  color: var(--p-menubar-item-color);
}

/**
 * Only highlight a root item when it is hovered, when its submenu is shown, or when it has the keyboard focus, i.e. not
 * when it has the focus as a result of a mouse click (which would otherwise leave it highlighted after a menu item has
 * been selected).
 * Note: the same is done when our focus ring is hidden (see app.css).
 */

:deep(
  .p-menubar-root-list:not(:focus-visible)
    > .p-menubar-item.p-focus:not(.p-menubar-item-active)
    > .p-menubar-item-content:not(:hover)
) {
  background-color: transparent;
  color: var(--p-menubar-item-color);
}

/**
 * Show our focus ring around the item (be it a root item or the item of a submenu) that has the keyboard focus, so that
 * it is clear that our main menu has the keyboard focus (and which item has it), rather than just highlighting that
 * item, which looks the same as hovering it.
 * Note #1: the keyboard focus is on our root list (which then sets the p-focus class on the item that has it), so we
 *          can't rely on our default focus ring, which is not shown for our root list anyway (see app.css).
 * Note #2: we inset our focus ring so that it doesn't get clipped by our menubar or a submenu, or overlap neighbouring
 *          items.
 * Note #3: our context menus do the same (see app.css).
 */

:deep(.p-menubar-root-list:focus-visible .p-menubar-item.p-focus > .p-menubar-item-content) {
  outline: var(--opencor-focus-ring-width) solid var(--opencor-focus-ring-color, var(--p-primary-color));
  outline-offset: calc(-1 * var(--opencor-focus-ring-width));
}

/**
 * Submenus, which are slightly detached from their parent item.
 */

:deep(.p-menubar-submenu) {
  min-width: 14rem;
  z-index: 99;
}

:deep(.p-menubar-root-list > .p-menubar-item > .p-menubar-submenu) {
  margin-top: 0.25rem;
}

:deep(.p-menubar-submenu .p-menubar-submenu) {
  margin-top: calc(-1 * var(--p-menubar-submenu-padding) - 1px);
  margin-left: 0.25rem;
}

:deep(.p-menubar-separator) {
  margin: 0.125rem 0.5rem;
}

.menu-item-icon {
  width: 1rem;
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
  text-align: center;
}

.menu-item-external {
  color: var(--p-text-muted-color);
  font-size: 0.625rem;
  opacity: 0.7;
}

.menu-item-chevron {
  color: var(--p-text-muted-color);
  font-size: 0.75rem;
}

.shortcut {
  color: var(--p-text-muted-color);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.05em;
}

:deep(.p-menubar-item.p-focus) > .p-menubar-item-content .menu-item-icon,
:deep(.p-menubar-item-active) > .p-menubar-item-content .menu-item-icon,
:deep(.p-menubar-item.p-focus) > .p-menubar-item-content .menu-item-chevron,
:deep(.p-menubar-item-active) > .p-menubar-item-content .menu-item-chevron {
  color: var(--p-text-color);
}

/**
 * Our "New version available" link, which is centred in our menubar, unless our menubar is too narrow for it not to
 * overlap our root items, in which case it is shown at the end of our menubar (before our theme widget, if any).
 */

.update-link {
  position: absolute;
  top: 50%;
  left: 50%;
  translate: -50% -50%;
  background-color: color-mix(in srgb, var(--p-primary-color) 10%, transparent);
  color: var(--p-primary-color);
  font-weight: 500;
  font-size: 0.6875rem;
}

.update-link:hover {
  background-color: color-mix(in srgb, var(--p-primary-color) 18%, transparent);
}

@container main-menu (width < 26rem) {
  .update-link {
    position: static;
    translate: none;
    margin-right: 0.5rem;
  }
}
</style>
