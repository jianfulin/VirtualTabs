#!/usr/bin/env node
/**
 * vt-entry.ts — VirtualTabs CLI entry point
 *
 * Usage:
 *   node out/vt.bundle.js <command> [options]
 *
 * Commands:
 *   list-groups                          List all groups
 *   add-group --name <name>              Add a new group
 *   remove-group --name <name>           Remove a group (by name)
 *   add-files --group <name> <file...>   Add files to a group
 */

import * as fs from 'fs';
import * as path from 'path';
import { GroupManager } from './src/core/GroupManager';

// ──────────────────────────────────────────────
// Utility functions
// ──────────────────────────────────────────────

function findWorkspaceRoot(): string {
    let dir = process.cwd();
    for (let i = 0; i < 10; i++) {
        if (fs.existsSync(path.join(dir, '.vscode'))) return dir;
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    return process.cwd();
}

function parseArgs(argv: string[]): { command: string; flags: Record<string, string>; positional: string[] } {
    const [,, command = '', ...rest] = argv;
    const flags: Record<string, string> = {};
    const positional: string[] = [];

    for (let i = 0; i < rest.length; i++) {
        if (rest[i].startsWith('--')) {
            const key = rest[i].slice(2);
            const val = rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[++i] : 'true';
            flags[key] = val;
        } else {
            positional.push(rest[i]);
        }
    }
    return { command, flags, positional };
}

// ──────────────────────────────────────────────
// Main program
// ──────────────────────────────────────────────

const { command, flags, positional } = parseArgs(process.argv);
const root = findWorkspaceRoot();
const gm = new GroupManager(root);

switch (command) {
    case 'list-groups': {
        const { groups } = gm.loadGroups();
        if (groups.length === 0) {
            console.log('(no groups)');
            break;
        }
        groups.forEach(g => {
            const count = g.files?.length ?? 0;
            console.log(`[${g.id}] ${g.name}  (${count} file(s))`);
        });
        break;
    }

    case 'add-group': {
        const name = flags['name'];
        if (!name) {
            console.error('Error: please provide --name <name>');
            process.exit(1);
        }
        const { groups, version } = gm.loadGroups();
        if (groups.find(g => g.name === name)) {
            console.error(`Error: group "${name}" already exists`);
            process.exit(1);
        }
        const newGroup = {
            id: `vt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name,
            files: [] as string[]
        };
        groups.push(newGroup);
        gm.saveGroups(groups, version);
        console.log(`Group added: ${name} (id=${newGroup.id})`);
        break;
    }

    case 'remove-group': {
        const name = flags['name'];
        if (!name) {
            console.error('Error: please provide --name <name>');
            process.exit(1);
        }
        const { groups, version } = gm.loadGroups();
        const idx = groups.findIndex(g => g.name === name);
        if (idx === -1) {
            console.error(`Error: group "${name}" not found`);
            process.exit(1);
        }
        groups.splice(idx, 1);
        gm.saveGroups(groups, version);
        console.log(`Group removed: ${name}`);
        break;
    }

    case 'add-files': {
        const groupName = flags['group'];
        if (!groupName) {
            console.error('Error: please provide --group <name>');
            process.exit(1);
        }
        if (positional.length === 0) {
            console.error('Error: please provide at least one file path');
            process.exit(1);
        }
        const { groups, version } = gm.loadGroups();
        const group = groups.find(g => g.name === groupName);
        if (!group) {
            console.error(`Error: group "${groupName}" not found`);
            process.exit(1);
        }
        if (!group.files) group.files = [];
        let added = 0;
        positional.forEach(f => {
            const abs = path.isAbsolute(f) ? f : path.resolve(process.cwd(), f);
            const uri = process.platform === 'win32'
                ? `file:///${abs.replace(/\\/g, '/')}`
                : `file://${abs}`;
            if (!group.files!.includes(uri)) {
                group.files!.push(uri);
                added++;
            }
        });
        gm.saveGroups(groups, version);
        console.log(`Added ${added} file(s) to group "${groupName}"`);
        break;
    }

    default: {
        console.log(`
VirtualTabs CLI (vt)

Usage:
  vt list-groups
  vt add-group --name <group-name>
  vt remove-group --name <group-name>
  vt add-files --group <group-name> <file1> [file2...]
        `.trim());
        break;
    }
}
