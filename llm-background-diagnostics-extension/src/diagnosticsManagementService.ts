import * as vscode from 'vscode';

export class DiagnosticsManagementService implements vscode.Disposable {
    private diagnosticCollection: vscode.DiagnosticCollection;

    constructor() {
        // Create a diagnostic collection with the identifier 'llm-bug-detector' as per design.md:70
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('llm-bug-detector');
    }

    /**
     * Updates diagnostics for a given document with the provided issues
     * @param document The text document to update diagnostics for
     * @param issues Array of issues, each containing a range and message
     */
    public updateDiagnostics(document: vscode.TextDocument, issues: Array<{ range: vscode.Range; message: string; lineContent?: string }>): void {
        // Clear previous diagnostics for the given document
        this.diagnosticCollection.delete(document.uri);

        // Create an array of vscode.Diagnostic objects from the issues
        const diagnostics: vscode.Diagnostic[] = issues.map(issue => {
            let diagnosticMessage = issue.message;
            if (issue.lineContent) {
                diagnosticMessage = `[Code]: ${issue.lineContent}\n[Issue]: ${issue.message}`;
            }
            const diagnostic = new vscode.Diagnostic(
                issue.range,
                diagnosticMessage,
                vscode.DiagnosticSeverity.Error // Set severity to Error as per design.md:78
            );
            diagnostic.source = 'LLM Bug Detector';
            return diagnostic;
        });

        // Set the new diagnostics for the document as per design.md:80
        this.diagnosticCollection.set(document.uri, diagnostics);
    }

    /**
     * Clears all diagnostics for a specific document
     * @param document The text document to clear diagnostics for
     */
    public clearDiagnostics(document: vscode.TextDocument): void {
        this.diagnosticCollection.delete(document.uri);
    }

    /**
     * Disposes of the diagnostic collection and clears all diagnostics
     */
    public dispose(): void {
        this.diagnosticCollection.clear();
        this.diagnosticCollection.dispose();
    }
}