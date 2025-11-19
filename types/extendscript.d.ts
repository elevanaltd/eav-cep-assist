/**
 * Adobe ExtendScript Type Definitions
 * For use with Premiere Pro ExtendScript (ES3 environment)
 */

// ExtendScript global object
declare const $: {
  /** High-resolution timer for performance measurement */
  hiresTimer: number;
  /** Write to console (ExtendScript Toolkit) */
  writeln: (message: string) => void;
  /** ExtendScript version */
  version: string;
  /** Operating system */
  os: string;
  /** Path of currently executing script file */
  fileName: string;
  /** Evaluate another ExtendScript file */
  evalFile: (file: File | string) => any;
};

// Premiere Pro application
declare const app: {
  project: {
    rootItem: ProjectItem;
    activeSequence: any;
    name: string;
    getSelection: () => ProjectItem[];
  };
  sourceMonitor: {
    openFilePath: (path: string) => void;
    openProjectItem: (item: ProjectItem) => void;
    setPosition: (seconds: number) => void;
  };
  encoder: any;
};

// Premiere Pro Project Item
declare class ProjectItem {
  name: string;
  type: number;
  treePath: string;
  children: ProjectItem[];
  nodeId: string;

  getProjectMetadata(): string;
  setProjectMetadata(metadata: string, fields?: string[]): void;
  getXMPMetadata(): string;
  setXMPMetadata(metadata: string): void;

  getMediaPath(): string;
  isOffline(): boolean;
  getProxyPath(): string;

  // Premiere Pro specific methods
  getProjectColumnsMetadata(): string;
  getFootageInterpretation(): any;
  getOutPoint(): any;
}

// Premiere Pro Project Item Types
declare const ProjectItemType: {
  CLIP: number;
  BIN: number;
  ROOT: number;
  FILE: number;
  SEQUENCE: number;
};

// Adobe File System
declare class File {
  constructor(path: string);
  open(mode: string): boolean;
  read(): string;
  write(text: string): boolean;
  writeln(text: string): boolean;
  close(): void;
  remove(): boolean;
  rename(newName: string): boolean;
  readonly exists: boolean;
  readonly fsName: string;
  readonly name: string;
  readonly parent: Folder;
}

declare class Folder {
  constructor(path: string);
  readonly exists: boolean;
  readonly fsName: string;
  readonly parent: Folder;
  create(): boolean;
  static decode(uri: string): string;
  static userData: Folder;
  static temp: Folder;
}

// JSON support (available in ExtendScript)
declare const JSON: {
  parse(text: string): any;
  stringify(value: any, replacer?: any, space?: number | string): string;
};

// XMP support (when AdobeXMPScript is loaded)
declare class XMPMeta {
  constructor();
  constructor(packet: string);
  serialize(): string;
  dumpObject(): string;
}

declare const XMPConst: any;
declare const XMPUtils: any;

// ExternalObject for loading libraries
declare class ExternalObject {
  constructor(lib: string);
  static readonly version: string;
}

// Track A integration functions (loaded at runtime from generated/track-a-integration.jsx)
declare function readJSONMetadataWrapper(clip: ProjectItem): string;
declare function writeJSONMetadataWrapper(clip: ProjectItem, updates: any): string;
declare function readJSONMetadataByNodeIdWrapper(nodeId: string): string;
declare function writeJSONMetadataByNodeIdWrapper(nodeId: string, updatesJSON: string): string;
