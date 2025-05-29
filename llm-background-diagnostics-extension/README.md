# LLM Background Diagnostics Extension

This VS Code extension automatically performs background diagnostics on currently open files using Large Language Models (LLMs).

## Prerequisites

- Node.js and npm installed
- VS Code Extension Development tools: Install `vsce` globally with:
  ```bash
  npm install -g @vscode/vsce
  ```

## Building the Extension

1. Navigate to the `llm-background-diagnostics-extension` directory:
   ```bash
   cd llm-background-diagnostics-extension
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Compile TypeScript:
   ```bash
   npm run compile
   ```

4. Package the extension:
   ```bash
   vsce package
   ```
   This will create a `.vsix` file in the current directory.

## Installing the Extension (Sideloading)

1. Open VS Code
2. Go to the Extensions view (Ctrl+Shift+X or Cmd+Shift+X on Mac)
3. Click the "..." (More Actions) menu in the Extensions view sidebar
4. Select "Install from VSIX..."
5. Choose the `.vsix` file generated in the previous step
6. Reload VS Code when prompted

## Using the Extension

Once installed and enabled, the extension will:

- Automatically analyze open files in the background if they match the configured languages (or all languages if `llmBugDetector.languages` is empty)
- After making changes to a supported file, wait for the configured delay (`llmBugDetector.analysisInterval`)
- Display mock diagnostics on lines 2 and 5 (if the file has enough lines) with messages like:
  - "Mock LLM: Potential null pointer..."
  - "Mock LLM: Unused variable..."

**Note:** These diagnostics are currently placeholders, as the actual LLM integration is pending a future VS Code API.

## Configuration

You can adjust the extension settings in VS Code User or Workspace settings under "LLM Bug Detector":

### Available Settings

- **`llmBugDetector.enabled`** (boolean, default: `true`)
  - Enables or disables the automatic background analysis

- **`llmBugDetector.model`** (string or null, default: `null`)
  - Specifies the LLM model to use for analysis (when VS Code API allows selection)

- **`llmBugDetector.analysisInterval`** (number, default: `3000`)
  - Sets the interval (in milliseconds) between background analyses after a document change

- **`llmBugDetector.languages`** (array of strings, default: `[]`)
  - Specifies the programming languages for which the analysis should be active
  - Example: `["typescript", "python", "javascript"]`
  - An empty array means all languages where the extension is activated

### Accessing Settings

1. Open VS Code Settings (Ctrl+, or Cmd+, on Mac)
2. Search for "LLM Bug Detector"
3. Modify the settings as needed

## Development

For development purposes, you can also:

- **Watch mode:** Run `npm run watch` to automatically recompile TypeScript files on changes
- **Debug:** Use F5 in VS Code to launch a new Extension Development Host window for testing

## Troubleshooting

- If diagnostics don't appear, check that the extension is enabled in the Extensions view
- Verify that your file type is included in the `llmBugDetector.languages` setting (or leave it empty for all languages)
- Check the Developer Console (Help > Toggle Developer Tools) for any error messages