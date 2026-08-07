import * as vueusecore from '@vueuse/core';

import type * as vue from 'vue';

import type { EFileType, File } from '../libopencor/locApi';

// View categories.

export const ViewCategory = {
  Editing: 'editing',
  Simulation: 'simulation',
  Analysis: 'analysis'
} as const;

export type ViewCategory = (typeof ViewCategory)[keyof typeof ViewCategory];

// View descriptor.

export interface IViewDescriptor {
  // Unique identifier for this view (e.g., 'issues', 'simulation-experiment-standard').

  id: string;

  // Which functional category this view belongs to.
  // Note: it is optional to allow for IssuesView which is not tied to a specific category.

  category?: ViewCategory;

  // Human-readable label for the view switcher UI.
  // Note: it is optional to allow for IssuesView which is not shown in the view switcher.

  label?: string;

  // PrimeIcons icon class for the view (e.g., 'pi pi-play').
  // Note: it is optional to allow for IssuesView which is not tied to a specific category.

  icon?: string;

  // The Vue component to render.

  component: vue.Component;

  // The file types this view is the preferred choice for.
  // Note: it is optional to allow for IssuesView which is not tied to a specific file type.

  fileTypes?: readonly EFileType[];

  // Whether this view is applicable to the given file.
  // Note: it is optional to allow for views that are always applicable to their file types.

  isAvailable?: (file: File) => boolean;
}

// View registry composable.

export const useViewRegistry = vueusecore.createGlobalState(() => {
  const _descriptors: IViewDescriptor[] = [];
  const _descriptorIndices = new Map<string, number>();

  // Register a view descriptor.
  // Note: it must be called before any resolution. Registering a descriptor which ID is already registered replaces
  //       the previous one in place (e.g., multiple OpenCOR instances mounted in the same page register the same
  //       descriptors), so the registry never grows unbounded.

  function register(descriptor: IViewDescriptor): void {
    const descriptorIndex = _descriptorIndices.get(descriptor.id);

    if (descriptorIndex === undefined) {
      _descriptors.push(descriptor);
      _descriptorIndices.set(descriptor.id, _descriptors.length);
    } else {
      _descriptors[descriptorIndex] = descriptor;
    }
  }

  // Determine whether a view descriptor is applicable to a given file.

  const isApplicable = (descriptor: IViewDescriptor, file: File): boolean => {
    if (descriptor.fileTypes && !descriptor.fileTypes.includes(file.type())) {
      return false;
    }

    return descriptor.isAvailable ? descriptor.isAvailable(file) : true;
  };

  // Resolve the view to show for a file.
  // Note: system views (no file types) take precedence, then the user's chosen view if still applicable, then the first
  //       applicable view for the file's type.

  function resolve(file: File, activeViewId: string | undefined): IViewDescriptor | null {
    const systemView = _descriptors.find((descriptor) => {
      return !descriptor.fileTypes && isApplicable(descriptor, file);
    });

    if (systemView) {
      return systemView;
    }

    if (activeViewId) {
      const activeView = _descriptors.find((descriptor) => {
        return descriptor.id === activeViewId && isApplicable(descriptor, file);
      });

      if (activeView) {
        return activeView;
      }
    }

    return (
      _descriptors.find((descriptor) => {
        return isApplicable(descriptor, file);
      }) ?? null
    );
  }

  // Return all the descriptors for a given category.
  // Note: uncategorised views are excluded.

  function descriptors(category: ViewCategory): IViewDescriptor[] {
    return _descriptors.filter((descriptor) => descriptor.category === category);
  }

  return { descriptors, isApplicable, register, resolve };
});
