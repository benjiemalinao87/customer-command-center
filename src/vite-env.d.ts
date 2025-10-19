/// <reference types="vite/client" />

// Markdown file module declarations
declare module '*.md' {
  const content: string;
  export default content;
}

// Support for require.context (webpack-style)
interface RequireContext {
  keys(): string[];
  (id: string): any;
  <T>(id: string): T;
  resolve(id: string): string;
  id: string;
}

declare var require: {
  context(
    directory: string,
    useSubdirectories: boolean,
    regExp: RegExp
  ): RequireContext;
};
