'use strict';

/**
 * This file is part of the vscode-git-notify distribution.
 * Copyright (c) Marcel Joachim Kloubert.
 * 
 * vscode-git-notify is free software: you can redistribute it and/or modify  
 * it under the terms of the GNU Lesser General Public License as   
 * published by the Free Software Foundation, version 3.
 *
 * vscode-git-notify is distributed in the hope that it will be useful, but 
 * WITHOUT ANY WARRANTY; without even the implied warranty of 
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU 
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import * as vscgn_controller from './controller';
import * as vscode from 'vscode';


let controller: vscgn_controller.Controller;


export function activate(context: vscode.ExtensionContext) {
    controller = new vscgn_controller.Controller(
        context,
    );

    // onDidChangeConfiguration
    context.subscriptions.push(
        vscode.workspace
              .onDidChangeConfiguration(controller.onDidChangeConfiguration,
                                        controller)
    );
    
    controller.onActivated();
}

export function deactivate() {
    if (controller) {
        controller.onDeactivate();
    }
}
