declare module "epubjs" {
  export interface NavItem {
    id: string;
    href: string;
    label: string;
    subitems?: NavItem[];
    parent?: string;
  }

  export interface Location {
    index: number;
    href: string;
    cfi: string;
    displayed: {
      page: number;
      total: number;
    };
  }

  export interface RelocatedLocation {
    start: Location;
    end: Location;
    atStart: boolean;
    atEnd: boolean;
  }

  export interface Contents {
    window: Window;
    document: Document;
    content: HTMLElement;
  }

  export interface Theme {
    [key: string]: string | { [key: string]: string };
  }

  export interface Themes {
    register(name: string, styles: Theme): void;
    select(name: string): void;
    fontSize(size: string): void;
    font(font: string): void;
    override(name: string, value: string): void;
  }

  export interface RenditionOptions {
    width?: string | number;
    height?: string | number;
    ignoreClass?: string;
    manager?: string;
    view?: string;
    flow?: "paginated" | "scrolled" | "scrolled-doc";
    layout?: "reflowable" | "pre-paginated";
    spread?: "auto" | "none";
    minSpreadWidth?: number;
    stylesheet?: string;
    script?: string;
    infinite?: boolean;
  }

  export interface Rendition {
    display(target?: string | number): Promise<void>;
    next(): Promise<void>;
    prev(): Promise<void>;
    themes: Themes;
    on(event: string, callback: (...args: any[]) => void): void;
    off(event: string, callback: (...args: any[]) => void): void;
    destroy(): void;
    currentLocation(): RelocatedLocation;
    resize(width: number, height: number): void;
  }

  export interface Navigation {
    toc: NavItem[];
    landmarks: NavItem[];
  }

  export interface Loaded {
    navigation: Promise<Navigation>;
    spine: Promise<any>;
    cover: Promise<string>;
    metadata: Promise<any>;
    resources: Promise<any>;
  }

  export interface Book {
    ready: Promise<void>;
    loaded: Loaded;
    renderTo(
      element: HTMLElement | string,
      options?: RenditionOptions
    ): Rendition;
    destroy(): void;
    coverUrl(): Promise<string | null>;
    navigation: Navigation;
    spine: any;
    locations: any;
    package: any;
  }

  function ePub(url: string, options?: any): Book;
  export default ePub;
}
