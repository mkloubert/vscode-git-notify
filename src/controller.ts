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

import * as Events from 'events';
import * as vscgn_contracts from './contracts';
import * as vscgn_helpers from './helpers';
import * as vscgn_log from './log';
import * as vscode from 'vscode';


/**
 * The app controller.
 */
export class Controller extends Events.EventEmitter {
    private _config: vscgn_contracts.Configuration;
    private readonly _CONFIG_SOURCE: vscgn_contracts.ConfigSource;

    /**
     * Initializes a new instance of that class.
     * 
     * @param {vscode.ExtensionContext} extension The context of the underlying extension instance.
     */
    constructor(public readonly extension: vscode.ExtensionContext) {
        super();

        this._CONFIG_SOURCE = {
            section: 'git.notify',
        };
    }

    /**
     * Gets the current configuration.
     */
    public get config() {
        return this._config;
    }

    /**
     * Gets the config source data.
     */
    public get configSource() {
        return this._CONFIG_SOURCE;
    }

    /**
     * Is invoked after the extension has been activated.
     */
    public onActivated() {
        this.emit(vscgn_contracts.EVENT_ACTIVATING);

        let lastErr: any;
        try {
            this.reloadConfiguration();
        }
        catch (e) {
            lastErr = e;

            throw e;
        }
        finally {
            this.emit(vscgn_contracts.EVENT_ACTIVATED,
                      lastErr);
        }
    }

    /**
     * Is invoked when the extension is going to be deactivated.
     */
    public onDeactivate() {
        this.emit(vscgn_contracts.EVENT_DEACTIVATING);

        let removeListeners = true;

        let lastErr: any;
        try {
            //TODO
        }
        catch (e) {
            lastErr = e;
            removeListeners = false;

            throw e;
        }
        finally {
            this.emit(vscgn_contracts.EVENT_DEACTIVATED,
                      lastErr);

            if (removeListeners) {
                this.removeAllListeners();
            }
        }
    }

    /**
     * Is invoked when the configuration changed.
     * 
     * @param {vscode.ConfigurationChangeEvent} e The event data.
     */
    public onDidChangeConfiguration(e: vscode.ConfigurationChangeEvent) {
        this.reloadConfiguration();
    }

    /**
     * Reloads the configuration.
     */
    public reloadConfiguration() {
        const ME = this;

        ME.emit(vscgn_contracts.EVENT_CONFIG_RELOADING);

        let lastLoadErr: any;
        let newCfg: vscgn_contracts.Configuration;
        try {
            let loadedCfg: vscgn_contracts.Configuration = 
                vscode.workspace.getConfiguration(ME.configSource.section,
                                                  ME.configSource.resource) || <any>{};

            this._config = newCfg = loadedCfg;
        }
        catch (e) {
            lastLoadErr = e;
        }
        finally {
            ME.emit(vscgn_contracts.EVENT_CONFIG_RELOADED,
                    lastLoadErr, newCfg);
        }
    }

    /**
     * Promise (and safe) version of 'vscode.window.showErrorMessage()' function.
     * 
     * @param {any} msg The message to display.
     * @param {TItem[]} [items] The optional items.
     * 
     * @return {Promise<TItem>} The promise with the selected item.
     */
    public async showErrorMessage<TItem extends vscode.MessageItem = vscode.MessageItem>(msg: any, ...items: TItem[]): Promise<TItem> {
        try {
            msg = vscgn_helpers.toStringSafe(msg);

            return await vscode.window.showErrorMessage
                                      .apply(null, [ <any>`[${vscgn_contracts.EXTENSION_NAME}] ${msg}`.trim() ].concat(items));
        }
        catch (e) {
            vscgn_log.CONSOLE
                     .trace(e, 'controller.Controller.showErrorMessage()');
        }
    }

    /**
     * Promise (and safe) version of 'vscode.window.showErrorMessage()' function.
     * 
     * @param {any} msg The message to display.
     * @param {TItem[]} [items] The optional items.
     * 
     * @return {Promise<TItem>} The promise with the selected item.
     */
    public async showInformationMessage<TItem extends vscode.MessageItem = vscode.MessageItem>(msg: any, ...items: TItem[]): Promise<TItem> {
        try {
            msg = vscgn_helpers.toStringSafe(msg);

            return await vscode.window.showInformationMessage
                                      .apply(null, [ <any>`[${vscgn_contracts.EXTENSION_NAME}] ${msg}`.trim() ].concat(items));
        }
        catch (e) {
            vscgn_log.CONSOLE
                     .trace(e, 'controller.Controller.showInformationMessage()');
        }
    }

    /**
     * Promise (and safe) version of 'vscode.window.showWarningMessage()' function.
     * 
     * @param {any} msg The message to display.
     * @param {TItem[]} [items] The optional items.
     * 
     * @return {Promise<TItem>} The promise with the selected item.
     */
    public async showWarningMessage<TItem extends vscode.MessageItem = vscode.MessageItem>(msg: any, ...items: TItem[]): Promise<TItem> {
        try {
            msg = vscgn_helpers.toStringSafe(msg);

            return await vscode.window.showWarningMessage
                                      .apply(null, [ <any>`[${vscgn_contracts.EXTENSION_NAME}] ${msg}`.trim() ].concat(items));
        }
        catch (e) {
            vscgn_log.CONSOLE
                     .trace(e, 'controller.Controller.showWarningMessage()');
        }
    }
}
