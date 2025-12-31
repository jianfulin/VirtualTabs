import * as vscode from 'vscode';

/**
 * Executes an action after prompting for confirmation, based on user configuration.
 * 
 * @param message The confirmation message to display (e.g., "Are you sure?").
 * @param confirmButtonLabel The label for the confirm button (e.g., "Delete").
 * @param action The action to execute if confirmed.
 * @param configKey The configuration key to check (optional, defaults to 'virtualTabs.confirmBeforeDelete').
 */
export async function executeWithConfirmation(
    message: string,
    confirmButtonLabel: string,
    action: () => void | Promise<void>,
    configKey: string = 'virtualTabs.confirmBeforeDelete'
): Promise<void> {
    const config = vscode.workspace.getConfiguration();
    const shouldConfirm = config.get<boolean>(configKey, true);

    if (!shouldConfirm) {
        await action();
        return;
    }

    const choice = await vscode.window.showWarningMessage(
        message,
        { modal: true },
        confirmButtonLabel
    );

    if (choice === confirmButtonLabel) {
        await action();
    }
}
