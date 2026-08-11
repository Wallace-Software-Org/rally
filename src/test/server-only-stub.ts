// Test stub for the `server-only` marker package. In the app it makes a module
// fail the build if it is pulled into a client bundle; under vitest (a plain
// node/vite graph) it has no bundler condition to resolve against, so we alias
// it to this empty module. See vitest.config.ts.
export {};
