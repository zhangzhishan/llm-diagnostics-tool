import * as vscode from 'vscode';
import { FileContentMonitoringService } from './fileContentMonitoringService';
import { HashStorageService } from './hashStorageService';
import { DiagnosticsManagementService } from './diagnosticsManagementService';
import { ConfigurationService } from './configurationService';
import { LLMIntegrationService, LLMIssue } from './llmIntegrationService';

let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
    // Create the output channel for logging
    outputChannel = vscode.window.createOutputChannel("LLM Background Diagnostics");
    outputChannel.appendLine('[INFO] LLM Background Diagnostics extension is now active!');

    // Create the configuration service
    const configurationService = new ConfigurationService();

    // Create the hash storage service
    const hashStorageService = new HashStorageService(context);

    // Create the diagnostics management service
    const diagnosticsManagementService = new DiagnosticsManagementService();

    // Create the LLM integration service
    const llmIntegrationService = new LLMIntegrationService(configurationService, outputChannel);

    // Create and start the file content monitoring service
    const analyzeDocument = async (document: vscode.TextDocument, newHash?: string) => {
        // Check if the extension is enabled before proceeding
        if (!configurationService.isEnabled()) {
            outputChannel.appendLine('[INFO] LLM Background Diagnostics is disabled. Skipping analysis.');
            return;
        }

        outputChannel.appendLine(`[INFO] Analyzing document: ${document.uri.fsPath}`);

        try {
            // Analyze document using LLM integration service
            const llmIssues = await llmIntegrationService.analyzeDocument(document);

            // Transform LLMIssue[] to the format expected by DiagnosticsManagementService
            // Convert 1-based line/column to 0-based for vscode.Position
            const diagnostics = llmIssues.map(issue => ({
                range: new vscode.Range(
                    new vscode.Position(issue.line - 1, issue.column - 1), // Convert to 0-based
                    new vscode.Position(issue.line - 1, issue.column - 1 + issue.length)
                ),
                message: issue.message
            }));

            // Update diagnostics with LLM findings
            diagnosticsManagementService.updateDiagnostics(document, diagnostics);

            // Update the stored hash after successful analysis if a new hash is provided (for on-save/on-change)
            if (newHash) {
                hashStorageService.updateStoredHash(document.uri.fsPath, newHash);
            }
        } catch (error) {
            outputChannel.appendLine(`[ERROR] Error during LLM analysis: ${error}`);
        }
    };

    const fileContentMonitoringService = new FileContentMonitoringService(analyzeDocument, hashStorageService, configurationService, outputChannel);
    fileContentMonitoringService.startMonitoring();

    // Analyze currently open documents on activation and when a new document is opened
    vscode.workspace.textDocuments.forEach(doc => analyzeDocument(doc));
    const onDidOpenTextDocumentDisposable = vscode.workspace.onDidOpenTextDocument(document => {
        // Check if the document is a file and not an untitled document or other scheme
        if (document.uri.scheme === 'file') {
            analyzeDocument(document);
        }
    });

    // Add the services and disposables to subscriptions
    context.subscriptions.push(fileContentMonitoringService);
    context.subscriptions.push(diagnosticsManagementService);
    context.subscriptions.push(onDidOpenTextDocumentDisposable);
}

export function deactivate() {
    // Dispose of the output channel
    if (outputChannel) {
        outputChannel.dispose();
    }
}