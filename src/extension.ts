// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from "fs";
import * as path from "path";

import { spawnSync } from "child_process";
import { TextDecoder } from "util";

function decrypt(context: vscode.ExtensionContext, data: string, secretFile: string): string | null {
	return processDatabagItem("decrypt", context, data, secretFile, true);
}

function encrypt(context: vscode.ExtensionContext, data: string, secretFile: string): string | null {
	return processDatabagItem("encrypt", context, data, secretFile, false);
}

function processDatabagItem(subcommand: string, context: vscode.ExtensionContext, data: string, secretFile: string, prettyPrint: boolean): string | null {
	const script: string = context.asAbsolutePath(path.join("resources", "chef_process_databag_item.rb"));
	return sh(
		"ruby",
		[
			script,
			`--secret-file=${secretFile}`,
			prettyPrint ? "--pretty-print" : "--no-pretty-print",
			subcommand,
		],
		data,
	);
}

function sh(cmd: string, args: Array<string>, stdin: string): string | null {
	const r = spawnSync(cmd, args, { cwd: vscode.workspace.rootPath, input: Buffer.from(stdin), encoding: "buffer" });
	if (r.status !== 0) {
		const s = new TextDecoder().decode(r.stderr);
		vscode.window.showErrorMessage(s);
		return null;
	}

	return new TextDecoder().decode(r.stdout);
}

function replaceDatabagItemContent(context: vscode.ExtensionContext, func: (context: vscode.ExtensionContext, data: string, secretFile: string) => string | null, message: string) {
	const root = vscode.workspace.rootPath;
	if (root === undefined) { return; }

	const secretFile = root + "/data_bag_key";
	if (!fs.existsSync(secretFile)) {
		vscode.window.showErrorMessage(`data_bag_key not found in: ${secretFile}`);
		return;
	}

	const editor = vscode.window.activeTextEditor;
	if (editor === undefined) { return; }

	const data = editor.document.getText();
	const decrypted = func(context, data, secretFile);
	if (decrypted === null) { return; }

	editor.edit((edit) => {
		edit.replace(
			new vscode.Range(editor.document.positionAt(0), editor.document.positionAt(data.length)),
			decrypted,
		);
		vscode.window.setStatusBarMessage(message, 2000);
	});
}

export function activate(context: vscode.ExtensionContext) {
	let decryptCommand = vscode.commands.registerCommand('extension.decryptChefEncryptedDataBagItem', () => {
		replaceDatabagItemContent(context, decrypt, "Decrypted");
	});

	context.subscriptions.push(decryptCommand);

	let encryptCommand = vscode.commands.registerCommand('extension.encryptChefEncryptedDataBagItem', () => {
		replaceDatabagItemContent(context, encrypt, "Encrypted");
	});

	context.subscriptions.push(encryptCommand);
}

export function deactivate() {}
