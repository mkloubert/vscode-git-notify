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
     * Gets the underlying settings.
     */
    readonly settings: TSettings;
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
     * Notify when issue has been closed.
     */
    public get notifyOnClosedIssue(): boolean {
        let result: boolean;

        if (vscgn_helpers.isObject(this.settings.issues)) {
            result = this.settings.issues.closed;
        }

        return vscgn_helpers.toBooleanSafe(result, true);
    }

    /**
     * Notify when new issue has been created.
     */
    public get notifyOnNewIssue(): boolean {
        let result: boolean;

        if (vscgn_helpers.isObject(this.settings.issues)) {
            result = this.settings.issues.created;
        }

        return vscgn_helpers.toBooleanSafe(result, true);
    }

    /**
     * Notify when a new comment has been made in an issue.
     */
    public get notifyOnNewIssueComment(): boolean {
        let result: boolean;

        if (vscgn_helpers.isObject(this.settings.issues)) {
            result = this.settings.issues.newComment;
        }

        return vscgn_helpers.toBooleanSafe(result, true);
    }

    /**
     * Notify when issue has been re-opened.
     */
    public get notifyOnReopenedIssue(): boolean {
        let result: boolean;

        if (vscgn_helpers.isObject(this.settings.issues)) {
            result = this.settings.issues.reopened;
        }

        return vscgn_helpers.toBooleanSafe(result, true);
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
    
    /**
     * Promise (and safe) version of 'vscode.window.showWarningMessage()' function.
     * 
     * @param {any} msg The message to display.
     * @param {TItem[]} [items] The optional items.
     * 
     * @return {Promise<TItem>} The promise with the selected item.
     */
    public async showWarningMessage<TItem extends vscode.MessageItem = vscode.MessageItem>(msg: any, items?: TItem[]): Promise<TItem> {
        try {
            msg = vscgn_helpers.toStringSafe(msg);

            return await vscode.window.showWarningMessage
                                      .apply(null, [ <any>`[${this.providerName}] ${msg}`.trim() ].concat( vscgn_helpers.asArray(items) ));
        }
        catch (e) {
            vscgn_log.CONSOLE
                     .trace(e, 'controller.Controller.showWarningMessage()');
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
    }

    throw new Error(`Git provider '${PROVIDER}' is not supported!`);
}
