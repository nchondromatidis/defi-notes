// source: https://coss.com/origin/tree
'use client';

import {
  expandAllFeature,
  hotkeysCoreFeature,
  searchFeature,
  selectionFeature,
  syncDataLoaderFeature,
  type TreeState,
} from '@headless-tree/core';
import { useTree } from '@headless-tree/react';
import { FileIcon, FolderIcon, FolderOpenIcon, SearchIcon } from 'lucide-react';
import React, { useState } from 'react';

import { Input } from '@/components/ui/input.tsx';
import { Tree, TreeItem, TreeItemLabel } from '@/components/ui/tree.tsx';

export const DEFAULT_INDENT = 20;

export interface Item {
  name: string;
  children?: string[];
}

export interface ProjectFilesViewerProps {
  items: Record<string, Item>;
  rootItemId: string;
  initialExpandedItems: string[];
  indent?: number;
}

export const ProjectFilesViewer: React.FC<ProjectFilesViewerProps> = ({
  items,
  rootItemId,
  initialExpandedItems,
  indent = DEFAULT_INDENT,
}: ProjectFilesViewerProps) => {
  const [state, setState] = useState<Partial<TreeState<Item>>>({});

  const tree = useTree<Item>({
    dataLoader: {
      getChildren: (itemId) => items[itemId]?.children ?? [],
      getItem: (itemId) => items[itemId],
    },
    features: [syncDataLoaderFeature, hotkeysCoreFeature, selectionFeature, searchFeature, expandAllFeature],
    getItemName: (item) => item.getItemData().name,
    indent,
    initialState: {
      expandedItems: initialExpandedItems,
    },
    isItemFolder: (item) => (item.getItemData()?.children?.length ?? 0) > 0,
    rootItemId,
    setState,
    state,
  });

  return (
    <div className="flex h-full flex-col gap-2 *:nth-2:grow">
      <div className="relative">
        <Input
          className="peer ps-9"
          {...{
            ...tree.getSearchInputElementProps(),
            onChange: (e) => {
              // First call the original onChange handler from getSearchInputElementProps
              const originalProps = tree.getSearchInputElementProps();
              if (originalProps.onChange) {
                originalProps.onChange(e);
              }

              // Then handle our custom logic
              const value = e.target.value;

              if (value.length > 0) {
                // If input has at least one character, expand all items
                tree.expandAll();
              } else {
                // If input is cleared, reset to initial expanded state
                setState((prevState) => {
                  return {
                    ...prevState,
                    expandedItems: initialExpandedItems,
                  };
                });
              }
            },
          }}
          placeholder="Quick search..."
          type="search"
        />
        <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground/80 peer-disabled:opacity-50">
          <SearchIcon aria-hidden="true" className="size-4" />
        </div>
      </div>

      <Tree indent={indent} tree={tree}>
        {tree.getItems().map((item) => {
          return (
            <TreeItem item={item} key={item.getId()}>
              <TreeItemLabel className="py-1">
                <span className="flex items-center gap-2">
                  {item.isFolder() ? (
                    item.isExpanded() ? (
                      <FolderOpenIcon className="pointer-events-none size-4 text-muted-foreground" />
                    ) : (
                      <FolderIcon className="pointer-events-none size-4 text-muted-foreground" />
                    )
                  ) : (
                    <FileIcon className="pointer-events-none size-4 text-muted-foreground" />
                  )}
                  {item.getItemName()}
                </span>
              </TreeItemLabel>
            </TreeItem>
          );
        })}
      </Tree>
    </div>
  );
};
