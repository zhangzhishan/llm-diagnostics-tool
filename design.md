Design Note: VS Code Auto Background Diagnostics Extension using LLMs

Date: May 29, 2025
Author: AI Assistant
Version: 0.2
Status: Draft
1. Introduction

This document outlines the design for a Visual Studio Code (VS Code) extension that automatically performs background diagnostics on currently open files using Large Language Models (LLMs). The extension aims to identify potential bugs and display them directly in the editor as standard VS Code errors (using the Diagnostics API). This will provide developers with real-time feedback and help improve code quality during the development process.
2. Goals

    Automatic Background Analysis: Continuously analyze the content of the currently active text editor in the background.

    LLM-Powered Bug Detection: Leverage the capabilities of LLMs to identify potential bugs, including logical errors and contextual issues that traditional linters might miss.

    In-Editor Error Display: Present detected bugs as standard VS Code errors (using vscode.Diagnostic with vscode.DiagnosticSeverity.Error), visually highlighting the problematic code with error squigglies in the editor.

    Minimal Performance Impact: Ensure the background analysis has a minimal impact on the editor's performance and responsiveness.

    Configurability: Allow users to configure aspects of the analysis, such as the LLM to use (if options become available within the VS Code API) and the analysis trigger behavior.

3. Architecture

The extension will consist of the following key components:

    File Content Monitoring Service: This service will be responsible for tracking changes to the currently active text editor's document. It will listen to the vscode.workspace.onDidChangeTextDocument event.

    LLM Integration Service: This service will handle the interaction with the LLM. [MODIFIED SECTION] Instead of directly calling external LLM APIs (like OpenAI or others), this service will be designed to interact with the native LLM API provided by VS Code (assuming its future existence). This would involve using specific VS Code API calls to send the current file content to the integrated LLM and receive diagnostic results.

    Diagnostics Management Service: This service will receive the bug information from the LLM Integration Service and use the VS Code Diagnostics API (vscode.languages.createDiagnosticCollection) to display the errors in the editor. It will map the bug locations provided by the LLM to vscode.Range objects.

    Configuration Service: This service will manage the extension's settings, allowing users to customize the LLM used (if the VS Code API allows selection), analysis frequency, and other relevant parameters.

    Local Hash Storage: A mechanism to store and retrieve file content hashes locally to determine if a file has changed.

4. LLM Integration [MODIFIED SECTION]

This extension will directly leverage the VS Code's built-in LLM API (assuming its future availability) for code analysis.

    API Calls: The LLM Integration Service will use the appropriate VS Code API functions to send the content of the currently active text editor (vscode.window.activeTextEditor?.document.getText()) to the integrated LLM.

    Prompting: A carefully crafted prompt will be sent to the LLM, instructing it to analyze the provided code for potential bugs and return the results in a structured format. This format will ideally include the bug description, the starting line number, and the starting column number of the identified issue.

    Response Handling: The service will parse the response received from the VS Code LLM API. It will extract the bug information and its location within the code.

    Error Mapping: The extracted line and column numbers will be used to create vscode.Range objects, which are necessary for displaying the errors using the Diagnostics API.

    Model Selection (Future Consideration): If the VS Code LLM API provides options for selecting different underlying models, the extension's configuration will allow users to choose their preferred model.

Rationale for Direct VS Code API Integration:

    Simplified Authentication and Management: Relies on VS Code's internal handling of LLM access, removing the need for users to manage external API keys.

    Potentially Lower Latency: Direct integration might offer lower latency compared to external API calls.

    Enhanced Privacy and Security: Data remains within the VS Code environment.

    Consistent User Experience: Aligns with the native features and capabilities of VS Code.

Assumptions:

    VS Code will provide a public API for extensions to interact with its integrated LLM capabilities in the future.

    This API will allow sending code snippets and receiving structured diagnostic information in return.

    The API will provide information about the location (line and column) of the identified issues.

5. Diagnostics Display

    The Diagnostics Management Service will use vscode.languages.createDiagnosticCollection('llm-bug-detector') to manage the diagnostics.

    For each bug identified by the LLM, a vscode.Diagnostic object will be created with:

        range: A vscode.Range object specifying the location of the bug in the code.

        message: A descriptive message explaining the potential bug.

        severity: Set to vscode.DiagnosticSeverity.Error to display as an error.

    The diagnosticCollection.set(document.uri, diagnostics) method will be used to associate the diagnostics with the corresponding document, causing VS Code to display the error squigglies in the editor.

6. Configuration

The extension will provide the following configuration options (accessible through VS Code settings):

    llmBugDetector.enabled (boolean): Enables or disables the automatic background analysis. (Default: true)

    llmBugDetector.model (string): (If VS Code API allows selection) Specifies the LLM model to use for analysis.

    llmBugDetector.analysisInterval (number): (Optional) Sets the interval (in milliseconds) between background analyses. (Default: TBD - needs performance evaluation)

    llmBugDetector.languages (array of strings): (Optional) Specifies the programming languages for which the analysis should be active. (Default: all supported languages)

7. Performance Considerations

    Throttling: To avoid excessive LLM API calls and performance degradation, the analysis will be throttled. An analysis will only be triggered after a short delay following changes to the document.

    Incremental Analysis (Future Enhancement): In future versions, we could explore performing incremental analysis, only analyzing the parts of the document that have changed.

    Resource Management: The extension will be designed to minimize its memory and CPU usage.

    Hash-Based Re-analysis Trigger [NEW]: To further optimize performance and reduce unnecessary LLM calls, the extension will implement a hash-based mechanism for triggering re-analysis.

        Hashing Mechanism: When a document's content is retrieved, a cryptographic hash (e.g., SHA-256) of its entire text content will be computed.

        Local Hash Storage: A local JSON file (or VS Code's Memento API for workspace state) will be maintained to store the last computed hash for each analyzed file. This storage will be managed within the extension's private workspace storage.

        Re-analysis Logic:

            Upon a document change event (vscode.workspace.onDidChangeTextDocument), the new hash of the document's content will be calculated.

            This new hash will be compared against the hash stored locally for that specific file.

            Only if the new hash differs from the stored hash will the LLM analysis be triggered.

            After a successful LLM analysis, the stored hash for that file will be updated with the new hash.

        Benefits: This approach ensures that the LLM is only invoked when the file content has genuinely changed, preventing redundant analyses on mere cursor movements or non-content-altering edits.

8. Future Enhancements

    Bug Fixing Suggestions: In addition to identifying bugs, the extension could potentially offer suggestions on how to fix them (if the VS Code LLM API provides such capabilities).

    Severity Levels: Allow the LLM to categorize bugs by severity (e.g., warning, error) and display them accordingly.

    User Feedback: Provide mechanisms for users to provide feedback on the accuracy of the LLM's findings.

    Customizable Prompts (Advanced): Allow advanced users to customize the prompt sent to the LLM.

9. Conclusion

This design outlines a VS Code extension that leverages the power of LLMs through a direct VS Code API integration (assuming its future existence) to provide automatic background bug diagnostics. By displaying potential issues as standard VS Code errors, this extension aims to seamlessly integrate into the developer workflow and contribute to higher code quality. The introduction of a hash-based re-analysis trigger will further enhance performance by minimizing redundant LLM calls. Further development will focus on implementing these components, optimizing performance, and exploring potential future enhancements.