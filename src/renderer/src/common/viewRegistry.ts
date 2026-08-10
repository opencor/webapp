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
  id: string;
  category: ViewCategory;
  label: string;
  icon: string;
  component: vue.Component;
  fileTypes: readonly EFileType[];
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
    return descriptor.fileTypes.includes(file.type());
  };

  // Resolve the view to show for a file.
  // Note: the user's chosen view takes precedence and then the first applicable view for the file's type.

  function resolve(file: File, activeViewId: string | undefined): IViewDescriptor | null {
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

  function descriptors(category: ViewCategory): IViewDescriptor[] {
    return _descriptors.filter((descriptor) => descriptor.category === category);
  }

  return { descriptors, isApplicable, register, resolve };
});
