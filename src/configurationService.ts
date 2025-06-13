import * as vscode from 'vscode';

/**
 * Service for managing extension configuration settings.
 * Provides methods to retrieve configuration values with appropriate defaults.
 */
export class ConfigurationService {
    private static readonly CONFIG_SECTION = 'llmBugDetector';

    /**
     * Checks if the extension is enabled.
     * @returns true if the extension is enabled, false otherwise
     */
    public isEnabled(): boolean {
        return vscode.workspace.getConfiguration(ConfigurationService.CONFIG_SECTION).get<boolean>('enabled', true);
    }

    /**
     * Gets the configured LLM model.
     * @returns the model name or null if not configured
     */
    public getModel(): string | null {
        return vscode.workspace.getConfiguration(ConfigurationService.CONFIG_SECTION).get<string | null>('model', null);
    }

    /**
     * Gets the analysis interval in milliseconds.
     * @returns the analysis interval, defaults to 3000ms
     */
    public getAnalysisInterval(): number {
        return vscode.workspace.getConfiguration(ConfigurationService.CONFIG_SECTION).get<number>('analysisInterval', 3000);
    }

    /**
     * Gets the list of language IDs for which analysis should be active.
     * @returns array of language IDs, empty array means all languages are allowed
     */
    public getLanguageIds(): string[] {
        return vscode.workspace.getConfiguration(ConfigurationService.CONFIG_SECTION).get<string[]>('languages', []);
    }

    /**
     * Gets the configured LLM model ID.
     * @returns the model ID string, empty string if not configured
     */
    public getLlmModelId(): string {
        return vscode.workspace.getConfiguration(ConfigurationService.CONFIG_SECTION).get<string>('model', '');
    }

    /**
     * Gets the list of file extensions to exclude from analysis.
     * @returns array of file extensions (e.g., [".txt", ".md"])
     */
    public getExcludedFileExtensions(): string[] {
        return vscode.workspace.getConfiguration(ConfigurationService.CONFIG_SECTION).get<string[]>('excludedFileExtensions', [
            ".txt",
            ".md",
            ".json",
            ".xml",
            ".yaml",
            ".yml",
            ".log"
        ]);
    }
}