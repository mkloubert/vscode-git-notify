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
import * as HTTP from 'http';
import * as vscgn_contracts from './contracts';
import * as vscgn_controller from './controller';
import * as vscgn_helpers from './helpers';
import * as vscgn_log from './log';
import * as vscode from 'vscode';


/**
 * A git watcher.
 */
export interface GitWatcher<TSettings extends vscgn_contracts.WatcherSettings = vscgn_contracts.WatcherSettings>
    extends NodeJS.EventEmitter, vscode.Disposable
{
    /**
     * Handles a request.
     */
    readonly handleRequest: (request: HTTP.IncomingMessage, response: HTTP.ServerResponse) => void | PromiseLike<void>;
    /**
     * Gets if the watcher is running or not.
     */
    readonly isRunning: boolean;
    /**
     * The (display) name of the watcher.
     */
    readonly name: string;
    /**
     * Gets the underlying settings.
     */
    readonly settings: TSettings;
    /**
     * Promise (and safe) version of 'vscode.window.showInformationMessage()' function for that watcher.
     * 
     * @param {any} msg The message to display.
     * @param {TItem[]} [items] The optional items.
     * 
     * @return {Promise<TItem>} The promise with the selected item.
     */
    showInformationMessage<TItem extends vscode.MessageItem = vscode.MessageItem>(msg: any, items?: TItem[]): PromiseLike<TItem>;
    /**
     * Promise (and safe) version of 'vscode.window.showWarningMessage()' function for that watcher.
     * 
     * @param {any} msg The message to display.
     * @param {TItem[]} [items] The optional items.
     * 
     * @return {Promise<TItem>} The promise with the selected item.
     */
    showWarningMessage<TItem extends vscode.MessageItem = vscode.MessageItem>(msg: any, items?: TItem[]): PromiseLike<TItem>;
    /**
     * Starts the watcher.
     * 
     * @return boolean Indicates if operation was successful or not.
     */
    readonly start: () => boolean;
    /**
     * Stops the watcher.
     * 
     * @return boolean Indicates if operation was successful or not.
     */
    readonly stop: () => boolean;
}

/**
 * Settings for a webhook based watcher.
 */
export interface WebhookWatcherSettings extends vscgn_contracts.WatcherSettings {
}


/**
 * A basic git watcher.
 */
export abstract class GitWatcherBase<TSettings extends vscgn_contracts.WatcherSettings = vscgn_contracts.WatcherSettings>
    extends Events.EventEmitter
    implements GitWatcher
{
    /**
     * Initializes a new instance of that class.
     * 
     * @param {vscgn_controller.Controller} controller The underlying controller.
     * @param {TSettings} settings The underlying settings.
     */
    public constructor(public readonly controller: vscgn_controller.Controller,
                       public readonly settings: TSettings) {
        super();
    }

    /** @inheritdoc */
    public dispose() {
        this.emit(vscgn_contracts.EVENT_DISPOSING);

        let removeListeners = true;

        let lastErr: any;
        try {
            this.onDispose();
        }
        catch (e) {
            lastErr = e;
            removeListeners = false;

            throw e;
        }
        finally {
            this.emit(vscgn_contracts.EVENT_DISPOSED,
                      lastErr);

            if (removeListeners) {
                this.removeAllListeners();
            }
        }
    }

    /** @inheritdoc */
    public async handleRequest(request: HTTP.IncomingMessage, response: HTTP.ServerResponse): Promise<void> {
        try {
            await this.onHandleRequest(request, response);
        }
        catch (e) {
            if (!response.headersSent) {
                response.writeHead(500, 'Internal Server Error');
                response.write( vscgn_helpers.toStringSafe(e) );
            }
        }
    }

    /** @inheritdoc */
    public isRunning = false;

    /**
     * Sends a git notification event.
     * 
     * @param {vscgn_contracts.GitNotification} notification The notification to send.
     */
    protected emitGitNotification(notification: vscgn_contracts.GitNotification) {
        if (notification) {
            return this.emit(vscgn_contracts.EVENT_GIT_NOTIFICATION,
                             notification);
        }
    }

    /** @inheritdoc */
    public get name(): string {
        const WATCHER_NAME = vscgn_helpers.toStringSafe(this.settings.name);
        if ('' !== WATCHER_NAME) {
            return WATCHER_NAME;
        }
        
        return this.providerName;
    }

    /**
     * The logic for 'dispose()' method.
     */
    protected onDispose() {
        if (!this.isRunning) {
            this.stop();
        }
    }

    /**
     * The logic for 'handleRequest()' method.
     */
    protected abstract async onHandleRequest(request: HTTP.IncomingMessage, response: HTTP.ServerResponse): Promise<void>;

    /**
     * The logic for 'start()' method.
     */
    protected onStart(): boolean {
        if (this.isRunning) {
            return false;  // already running
        }

        this.isRunning = true;
        return true;
    }

    /**
     * The logic for 'stop()' method.
     */
    protected onStop(): boolean {
        if (!this.isRunning) {
            return false;  // not running
        }

        this.isRunning = false;
        return true;
    }

    /**
     * Gets the (display) name of the underlying provider.
     */
    public abstract get providerName(): string;
    
    /** @inheritdoc */
    public async showInformationMessage<TItem extends vscode.MessageItem = vscode.MessageItem>(msg: any, items?: TItem[]): Promise<TItem> {
        try {
            msg = vscgn_helpers.toStringSafe(msg);

            return await vscode.window.showInformationMessage
                                      .apply(null, [ <any>`[${this.name}] ${msg}`.trim() ].concat( vscgn_helpers.asArray(items) ));
        }
        catch (e) {
            vscgn_log.CONSOLE
                     .trace(e, 'watchers.GitWatcherBase.showInformationMessage()');
        }
    }

    /** @inheritdoc */
    public async showWarningMessage<TItem extends vscode.MessageItem = vscode.MessageItem>(msg: any, items?: TItem[]): Promise<TItem> {
        try {
            msg = vscgn_helpers.toStringSafe(msg);

            return await vscode.window.showWarningMessage
                                      .apply(null, [ <any>`[${this.name}] ${msg}`.trim() ].concat( vscgn_helpers.asArray(items) ));
        }
        catch (e) {
            vscgn_log.CONSOLE
                     .trace(e, 'watchers.GitWatcherBase.showWarningMessage()');
        }
    }

    /** @inheritdoc */
    public start() {
        this.emit(vscgn_contracts.EVENT_STARTING);
        
        let result: boolean;
        let lastErr: any;

        try {
            result = this.onStart();
        }
        catch (e) {
            lastErr = e;

            throw e;
        }
        finally {
            this.emit(vscgn_contracts.EVENT_STARTED,
                      lastErr, result);
        }

        return vscgn_helpers.toBooleanSafe(result, true);
    }

    /** @inheritdoc */
    public stop() {
        this.emit(vscgn_contracts.EVENT_STOPPING);
        
        let result: boolean;
        let lastErr: any;

        try {
            result = this.onStop();
        }
        catch (e) {
            lastErr = e;

            throw e;
        }
        finally {
            this.emit(vscgn_contracts.EVENT_STOPPED,
                      lastErr, result);
        }

        return vscgn_helpers.toBooleanSafe(result, true);
    }
}

/**
 * A basic git watcher based on web hooks.
 */
export abstract class GitWebhookWatcher<TSettings extends WebhookWatcherSettings = WebhookWatcherSettings>
    extends GitWatcherBase
{
    /**
     * Initializes a new instance of that class.
     * 
     * @param {vscgn_controller.Controller} controller The underlying controller.
     * @param {TSettings} settings The underlying settings.
     */
    public constructor(public readonly controller: vscgn_controller.Controller,
                       public readonly settings: TSettings) {
        super(controller, settings);
    }
}


/**
 * Creates a watcher.
 * 
 * @param {vscgn_contracts.WatcherSettings} settings The settings.
 * 
 * @return {GitWatcher} The new watcher.
 */
export function createWatcher(settings: vscgn_contracts.WatcherSettings): GitWatcher {
    const ME: vscgn_controller.Controller = this;

    if (!settings) {
        return <any>settings;
    }

    const PROVIDER = vscgn_helpers.normalizeString(settings.provider);
    switch (PROVIDER) {
        case '':
        case 'github':
            return new (require('./watchers/github').GitHubWatcher)(ME, settings);

        case 'bitbucket':
            return new (require('./watchers/bitbucket').BitbucketWatcher)(ME, settings);

        case 'gitlab':
            return new (require('./watchers/gitlab').GitLabWatcher)(ME, settings);

        case 'gitea':
            return new (require('./watchers/gitea').GiteaWatcher)(ME, settings);
    }

    throw new Error(`Git provider '${PROVIDER}' is not supported!`);
}
