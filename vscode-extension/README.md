# AI Test Agent - VS Code Extension

AI-powered code analysis and test generation directly in your editor.

## Features

- **Analyze File**: Right-click any `.ts`, `.tsx`, `.js`, or `.jsx` file to analyze components, functions, and event handlers
- **Generate Tests**: Automatically generate Playwright tests for your UI components
- **Context Menu Integration**: Available in both editor and file explorer

## Installation

### From Source
```bash
cd vscode-extension
npm install
npm run compile
```

Then press F5 in VS Code to launch the extension in debug mode.

### Package as VSIX
```bash
npm install -g @vscode/vsce
npm run package
```

Then install the `.vsix` file in VS Code.

## Configuration

1. Open Command Palette (Ctrl+Shift+P)
2. Run "AI Test Agent: Set API Key"
3. Enter your API key (get it from http://localhost:3000 → API Keys tab)

### Settings

- `aiTestAgent.apiKey`: Your API key
- `aiTestAgent.apiUrl`: API server URL (default: http://localhost:3001)

## Usage

1. Open a TypeScript/JavaScript file
2. Right-click in the editor
3. Select "AI Test Agent: Analyze File" or "AI Test Agent: Generate Tests"

## Requirements

- AI Test Agent backend running on localhost:3001
- Valid API key
