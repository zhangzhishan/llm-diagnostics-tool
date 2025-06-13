import * as vscode from 'vscode';
import { computeSha256 } from './hashUtils';
import { HashStorageService } from './hashStorageService';
import { ConfigurationService } from './configurationService';

export class FileContentMonitoringService implements vscode.Disposable {
    private disposable: vscode.Disposable | undefined;
    private analysisTimeout: NodeJS.Timeout | undefined;
    private onDocumentChanged: (document: vscode.TextDocument, newHash: string) => Promise<void>;
    private hashStorageService: HashStorageService;
    private configurationService: ConfigurationService;
    private outputChannel: vscode.OutputChannel;

    constructor(onDocumentChanged: (document: vscode.TextDocument, newHash: string) => Promise<void>, hashStorageService: HashStorageService, configurationService: ConfigurationService, outputChannel: vscode.OutputChannel) {
        this.onDocumentChanged = onDocumentChanged;
        this.hashStorageService = hashStorageService;
        this.configurationService = configurationService;
        this.outputChannel = outputChannel;
    }

    public startMonitoring(): void {
        // Subscribe to document save events
        this.disposable = vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
            // Check if there's an active text editor and if the saved document is the active one
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor && activeEditor.document === document) {
                this.handleDocumentChange(document);
            }
        });
    }

    /**
     * Handles document changes by checking if the content hash has changed
     * and only triggering analysis if it has.
     */
    private handleDocumentChange(document: vscode.TextDocument): void {
        // Check if the extension is enabled
        if (!this.configurationService.isEnabled()) {
            this.outputChannel.appendLine('[INFO] LLM Background Diagnostics is disabled. Skipping analysis.');
            return;
        }

        // Check if the current document's language is enabled for analysis
        const allowedLanguages = this.configurationService.getLanguageIds();
        if (allowedLanguages.length > 0 && !allowedLanguages.includes(document.languageId)) {
            this.outputChannel.appendLine(`[INFO] Language '${document.languageId}' is not enabled for analysis. Skipping analysis for: ${document.uri.fsPath}`);
            return;
        }

        // Check if the current document's file extension is excluded
        const excludedExtensions = this.configurationService.getExcludedFileExtensions();
        const fileExtension = vscode.workspace.asRelativePath(document.uri).split('.').pop();
        if (fileExtension && excludedExtensions.includes(`.${fileExtension}`)) {
            this.outputChannel.appendLine(`[INFO] File extension '.${fileExtension}' is excluded from analysis. Skipping analysis for: ${document.uri.fsPath}`);
            return;
        }

        const filePath = document.uri.fsPath;
        const currentContent = document.getText();
        const currentHash = computeSha256(currentContent);
        
        // Get the previously stored hash for this file
        const storedHash = this.hashStorageService.getStoredHash(filePath);
        
        // Only trigger analysis if the hash has changed (or if no hash is stored)
        if (storedHash !== currentHash) {
            this.outputChannel.appendLine(`[INFO] Content changed (hash mismatch), scheduling throttled analysis for: ${filePath}`);
            
            // Clear any existing timeout
            if (this.analysisTimeout) {
                clearTimeout(this.analysisTimeout);
            }
            
            // Get the analysis interval from configuration
            const analysisInterval = this.configurationService.getAnalysisInterval();
            
            // Set a new timeout for throttled analysis
            this.analysisTimeout = setTimeout(() => {
                // Execute the analysis asynchronously
                (async () => {
                    try {
                        await this.onDocumentChanged(document, currentHash);
                    } catch (error) {
                        this.outputChannel.appendLine(`[ERROR] Error in document analysis callback: ${error}`);
                    }
                })();
            }, analysisInterval);
        } else {
            this.outputChannel.appendLine(`[INFO] Content unchanged (hash match), skipping analysis for: ${filePath}`);
        }
    }

    public dispose(): void {
        if (this.disposable) {
            this.disposable.dispose();
            this.disposable = undefined;
        }
        
        // Clear any pending analysis timeout
        if (this.analysisTimeout) {
            clearTimeout(this.analysisTimeout);
            this.analysisTimeout = undefined;
        }
    }
}