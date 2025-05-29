import * as vscode from 'vscode';

/**
 * Service for storing and retrieving file content hashes using VS Code's workspaceState.
 */
export class HashStorageService {
    private context: vscode.ExtensionContext;
    private static readonly HASH_STORAGE_KEY = 'llmBackgroundDiagnostics.fileHashes';

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    /**
     * Retrieves the stored hash for a given file path.
     * @param filePath The file path to get the hash for
     * @returns The stored hash or undefined if not found
     */
    public getStoredHash(filePath: string): string | undefined {
        const hashes = this.getHashMap();
        return hashes[filePath];
    }

    /**
     * Updates/stores the hash for a given file path.
     * @param filePath The file path to store the hash for
     * @param hash The SHA-256 hash to store
     */
    public updateStoredHash(filePath: string, hash: string): void {
        const hashes = this.getHashMap();
        hashes[filePath] = hash;
        this.context.workspaceState.update(HashStorageService.HASH_STORAGE_KEY, hashes);
    }

    /**
     * Gets the current hash map from workspaceState.
     * @returns The hash map object
     */
    private getHashMap(): { [filePath: string]: string } {
        return this.context.workspaceState.get(HashStorageService.HASH_STORAGE_KEY, {});
    }
}