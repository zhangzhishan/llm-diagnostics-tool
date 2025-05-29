import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigurationService } from './configurationService';

/**
 * Interface representing a bug or issue found by the LLM
 */
export interface LLMIssue {
    fileName: string; // Filename from LLM (expected to be basename)
    line: number; // 1-based line number
    column: number; // 1-based column number
    length: number; // length of the text to highlight
    message: string;
    lineContent: string; // Content of the line from LLM response
}

/**
 * Service for integrating with LLM APIs to analyze code documents.
 * Uses the configured LLM model ID from ConfigurationService.
 */
export class LLMIntegrationService {
    private configService: ConfigurationService;
    private outputChannel: vscode.OutputChannel;

    constructor(configService: ConfigurationService, outputChannel: vscode.OutputChannel) {
        this.configService = configService;
        this.outputChannel = outputChannel;
    }
    /**
     * Reads the prompt template from the prompt-template.md file
     * @returns Promise resolving to the prompt template string
     */
    private async getPromptTemplate(): Promise<string> {
        try {
            const extensionPath = path.dirname(__filename);
            const templatePath = path.join(extensionPath, 'prompt-template.md');
            const templateContent = await fs.promises.readFile(templatePath, 'utf8');
            return templateContent;
        } catch (error) {
            this.outputChannel.appendLine(`[ERROR] Error reading prompt template: ${error}`);
            throw new Error('Failed to read prompt template file');
        }
    }

    /**
     * Analyzes a document using LLM API to find potential issues.
     * @param document The VS Code text document to analyze
     * @returns Promise resolving to an array of LLM issues found
     */
    public async analyzeDocument(document: vscode.TextDocument): Promise<LLMIssue[]> {
        try {
            // Get the configured model ID
            const configuredModelId = this.configService.getLlmModelId();
            
            // Get available LLM models
            const availableModels = await vscode.lm.selectChatModels();
            if (availableModels.length === 0) {
                this.outputChannel.appendLine('[ERROR] No LLM models available. Skipping analysis.');
                return [];
            }

            let model: vscode.LanguageModelChat | undefined;

            if (configuredModelId && configuredModelId.trim().length > 0) {
                model = availableModels.find(m => m.id === configuredModelId);
                if (!model) {
                    this.outputChannel.appendLine(`[WARN] Configured LLM model ID '${configuredModelId}' not found. Using the first available model: '${availableModels[0].id}'.`);
                    model = availableModels[0];
                } else {
                    this.outputChannel.appendLine(`[INFO] Using configured LLM model ID: '${configuredModelId}'.`);
                }
            } else {
                this.outputChannel.appendLine(`[WARN] No LLM model ID configured. Using the first available model: '${availableModels[0].id}'.`);
                this.outputChannel.appendLine('[INFO] All available models:');
                availableModels.forEach(m => this.outputChannel.appendLine(` , ${m.name} : ${m.id}`));
                model = availableModels[0];
            }

            // Ensure a model is selected
            if (!model) {
                 // This case should ideally not be reached if availableModels.length > 0
                 this.outputChannel.appendLine('[ERROR] Critical: Could not select an LLM model despite available models. Skipping analysis.');
                 return [];
            }

            // Get the prompt template
            const promptTemplate = await this.getPromptTemplate();
            
            // Get document content and filename
            const documentText = document.getText();
            const fileName = path.basename(document.fileName);
            
            // Construct the full prompt by replacing placeholders
            let fullPrompt = promptTemplate.replace('{CODE_PLACEHOLDER}', documentText);
            fullPrompt = fullPrompt.replace(/{FILE_NAME_PLACEHOLDER}/g, fileName); // Use regex for global replace
            
            // Create the chat request
            const messages = [
                vscode.LanguageModelChatMessage.User(fullPrompt)
            ];

            // Use CancellationTokenSource from vscode explicitly
            const { CancellationTokenSource } = vscode;
            const cancellationTokenSource = new CancellationTokenSource();

            // Send the chat request to the LLM
            const request = await model.sendRequest(messages, {}, cancellationTokenSource.token);
            
            // Collect the response
            let response = '';
            for await (const fragment of request.text) {
                response += fragment;
            }
            
            // Log the raw response for debugging
            this.outputChannel.appendLine(`[INFO] LLM Response for file: ${fileName}`);
            this.outputChannel.appendLine(`[INFO] Raw response: ${response}`);
            
            // Parse the LLM response (issues will include fileName and lineContent from LLM)
            const parsedIssues = this.parseLLMResponse(response, fileName);
            
            const finalIssues: LLMIssue[] = [];
            const currentDocumentBaseName = path.basename(document.fileName);

            for (const issue of parsedIssues) {
                let verifiedLine = issue.line; // 1-based, original from LLM
                const llmReportedBaseName = issue.fileName;

                // Ensure issue.lineContent is defined and not empty before trimming
                const llmProvidedLineContentTrimmed = issue.lineContent?.trim();

                if (llmReportedBaseName !== currentDocumentBaseName) {
                    this.outputChannel.appendLine(`[WARN] LLM issue for file basename '${llmReportedBaseName}' but currently analyzing '${currentDocumentBaseName}'. Using original line ${issue.line} for diagnostic as content source is ambiguous.`);
                    // Add the issue as is, DiagnosticsManagementService uses document.uri for the actual file.
                    // The fileName in LLMIssue is for this verification step.
                    finalIssues.push({ ...issue });
                    continue;
                }

                if (llmProvidedLineContentTrimmed && llmProvidedLineContentTrimmed.length > 0) {
                    try {
                        // Validate issue.line is within document bounds before accessing
                        if (issue.line > 0 && issue.line <= document.lineCount) {
                            const actualLineText = document.lineAt(issue.line - 1).text.trim();

                            if (actualLineText !== llmProvidedLineContentTrimmed) {
                                this.outputChannel.appendLine(`[INFO] Line content mismatch for ${currentDocumentBaseName}:${issue.line}. LLM: "${llmProvidedLineContentTrimmed}", Actual: "${actualLineText}". Attempting to find new line.`);
                                const fileContent = document.getText();
                                const lines = fileContent.split(/\r?\n/);
                                let foundNewLineNumber = -1;
                                for (let i = 0; i < lines.length; i++) {
                                    if (lines[i].trim() === llmProvidedLineContentTrimmed) {
                                        foundNewLineNumber = i + 1; // 1-based
                                        this.outputChannel.appendLine(`[INFO] Found matching content for ${currentDocumentBaseName} at line ${foundNewLineNumber}.`);
                                        break;
                                    }
                                }
                                if (foundNewLineNumber !== -1) {
                                    verifiedLine = foundNewLineNumber;
                                } else {
                                    this.outputChannel.appendLine(`[INFO] Could not find matching content for ${currentDocumentBaseName}. Using original LLM line ${issue.line}.`);
                                }
                            }
                        } else {
                             this.outputChannel.appendLine(`[WARN] LLM reported line ${issue.line} for ${currentDocumentBaseName} is out of bounds (doc lines: ${document.lineCount}). Using original LLM line.`);
                        }
                    } catch (e: any) {
                        this.outputChannel.appendLine(`[WARN] Error during line verification for ${currentDocumentBaseName}:${issue.line}: ${e.message}. Using original LLM line.`);
                    }
                } else {
                    this.outputChannel.appendLine(`[WARN] LLM issue for ${currentDocumentBaseName}:${issue.line} has empty or missing lineContent. Skipping line verification, using original LLM line.`);
                }

                finalIssues.push({
                    ...issue, // This includes original LLM fileName, column, length, message, lineContent
                    line: verifiedLine, // Use the verified (or original) line number
                });
            }
            return finalIssues;
            
        } catch (error) {
            this.outputChannel.appendLine(`[ERROR] Error in LLM analysis: ${error}`);
            return [];
        }
    }

    /**
     * Parses the LLM response and validates the JSON structure
     * @param response The raw response string from the LLM
     * @param fileName The name of the file being analyzed (for logging)
     * @returns Array of validated LLMIssue objects
     */
    private parseLLMResponse(response: string, fileName: string): LLMIssue[] {
        const issues: LLMIssue[] = [];
        
        try {
            // Remove markdown code block fences if present
            let cleanedResponse = response.trim();
            if (cleanedResponse.startsWith('```json')) {
                cleanedResponse = cleanedResponse.substring(7); // Remove ```json\n
            }
            if (cleanedResponse.endsWith('```')) {
                cleanedResponse = cleanedResponse.substring(0, cleanedResponse.length - 3);
            }
            cleanedResponse = cleanedResponse.trim(); // Trim again after stripping fences

            // Try to parse the response as JSON
            const parsedResponse = JSON.parse(cleanedResponse);
            
            // Validate that the parsed response is an array
            if (!Array.isArray(parsedResponse)) {
                this.outputChannel.appendLine(`[ERROR] LLM response for ${fileName} is not an array: ${typeof parsedResponse}`);
                return [];
            }
            
            // Process each item in the array
            for (let i = 0; i < parsedResponse.length; i++) {
                const item = parsedResponse[i];
                
                // Validate that the item is an object
                if (typeof item !== 'object' || item === null) {
                    this.outputChannel.appendLine(`[ERROR] LLM response item ${i} for ${fileName} is not an object: ${item}`);
                    continue;
                }
                
                // Validate required fields and their types
                const validationResult = this.validateIssueItem(item, i, fileName);
                if (validationResult.isValid) {
                    // Transform to LLMIssue object (excluding fileName from LLM response)
                    const llmIssue: LLMIssue = {
                        fileName: validationResult.validatedItem!.fileName,
                        line: validationResult.validatedItem!.line,
                        column: validationResult.validatedItem!.column,
                        length: validationResult.validatedItem!.length,
                        message: validationResult.validatedItem!.message,
                        lineContent: validationResult.validatedItem!.lineContent
                    };
                    issues.push(llmIssue);
                }
            }
            
            this.outputChannel.appendLine(`[INFO] Successfully parsed ${issues.length} valid issues from LLM response for ${fileName}`);
            return issues;
            
        } catch (parseError) {
            this.outputChannel.appendLine(`[ERROR] Failed to parse LLM response for ${fileName} as JSON: ${parseError}`);
            this.outputChannel.appendLine(`[ERROR] Raw response was: ${response}`);
            return [];
        }
    }

    /**
     * Validates a single issue item from the LLM response
     * @param item The item to validate
     * @param index The index of the item in the array (for logging)
     * @param fileName The file name (for logging)
     * @returns Validation result with isValid flag and validated item if valid
     */
    private validateIssueItem(item: any, index: number, fileName: string): { 
        isValid: boolean;
        validatedItem?: { fileName: string; line: number; column: number; length: number; message: string; lineContent: string; }
    } {
        const requiredFields = ['fileName', 'line', 'column', 'length', 'message', 'lineContent'];
        
        // Check for missing required fields
        for (const field of requiredFields) {
            if (!(field in item)) {
                this.outputChannel.appendLine(`[ERROR] LLM response item ${index} for ${fileName} missing required field '${field}': ${JSON.stringify(item)}`);
                return { isValid: false };
            }
        }
        
        // Validate fileName is a string
        if (typeof item.fileName !== 'string') {
            this.outputChannel.appendLine(`[ERROR] LLM response item ${index} for ${fileName} has invalid fileName type (expected string): ${typeof item.fileName}`);
            return { isValid: false };
        }
        
        // Validate line is a positive number
        if (typeof item.line !== 'number' || !Number.isInteger(item.line) || item.line < 1) {
            this.outputChannel.appendLine(`[ERROR] LLM response item ${index} for ${fileName} has invalid line number (expected positive integer): ${item.line}`);
            return { isValid: false };
        }
        
        // Validate column is a positive number
        if (typeof item.column !== 'number' || !Number.isInteger(item.column) || item.column < 1) {
            this.outputChannel.appendLine(`[ERROR] LLM response item ${index} for ${fileName} has invalid column number (expected positive integer): ${item.column}`);
            return { isValid: false };
        }
        
        // Validate length is a positive number
        if (typeof item.length !== 'number' || !Number.isInteger(item.length) || item.length < 1) {
            this.outputChannel.appendLine(`[ERROR] LLM response item ${index} for ${fileName} has invalid length (expected positive integer): ${item.length}`);
            return { isValid: false };
        }
        
        // Validate message is a non-empty string
        if (typeof item.message !== 'string' || item.message.trim().length === 0) {
            this.outputChannel.appendLine(`[ERROR] LLM response item ${index} for ${fileName} has invalid message (expected non-empty string): ${item.message}`);
            return { isValid: false };
        }

        // Validate lineContent is a string
        if (typeof item.lineContent !== 'string') {
            this.outputChannel.appendLine(`[ERROR] LLM response item ${index} for ${fileName} has invalid lineContent type (expected string): ${typeof item.lineContent}`);
            return { isValid: false };
        }
        
        return {
            isValid: true,
            validatedItem: {
                fileName: item.fileName,
                line: item.line,
                column: item.column,
                length: item.length,
                message: item.message.trim(),
                lineContent: item.lineContent // Not trimming here, will trim during comparison
            }
        };
    }
}