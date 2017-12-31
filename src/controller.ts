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
import * as FS from 'fs';
import * as HTTP from 'http';
import * as HTTPs from 'https';
import * as OS from 'os';
import * as Path from 'path';
import * as vscgn_contracts from './contracts';
import * as vscgn_helpers from './helpers';
import * as vscgn_log from './log';
import * as vscgn_watchers from './watchers';
import * as vscode from 'vscode';


type GroupedWatchers = { [ isSecure: string ]:
    { [ port: string ]: vscgn_watchers.GitWatcher[] }
};

interface HttpServerWithWatchers extends vscode.Disposable {
    readonly server: vscgn_contracts.HttpServer;
    readonly watchers: vscgn_watchers.GitWatcher[];
}

/**
 * The app controller.
 */
export class Controller extends Events.EventEmitter {
    private _config: vscgn_contracts.Configuration;
    private readonly _CONFIG_SOURCE: vscgn_contracts.ConfigSource;
    private readonly _SERVERS: HttpServerWithWatchers[] = [];

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

    private disposeAllServers() {
        while (this._SERVERS.length > 0) {
            const S = this._SERVERS.shift();

            vscgn_helpers.tryDispose(S);
        }
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

        this.disposeAllServers();

        let lastLoadErr: any;
        let newCfg: vscgn_contracts.Configuration;
        try {
            let loadedCfg: vscgn_contracts.Configuration = 
                vscode.workspace.getConfiguration(ME.configSource.section,
                                                  ME.configSource.resource) || <any>{};

            // blacklist of ports
            let disabledPorts: symbol | string[] = Symbol();
            if (!vscgn_helpers.isNullOrUndefined(loadedCfg.disabledPorts)) {
                disabledPorts = vscgn_helpers.asArray(loadedCfg.disabledPorts).map(p => {
                    return parseInt(
                        vscgn_helpers.toStringSafe(p).trim(),
                    );
                }).filter(p => !isNaN(p))
                  .map(p => '' + p);
            }

            // whitelist of ports
            let enabledPorts: symbol | string[] = Symbol();
            if (!vscgn_helpers.isNullOrUndefined(loadedCfg.enabledPorts)) {
                enabledPorts = vscgn_helpers.asArray(loadedCfg.enabledPorts).map(p => {
                    return parseInt(
                        vscgn_helpers.toStringSafe(p).trim(),
                    );
                }).filter(p => !isNaN(p))
                  .map(p => '' + p);
            }

            const ALL_WATCHER_SETTINGS = loadedCfg.watchers;
            if (!vscgn_helpers.toBooleanSafe(loadedCfg.disableAll) && ALL_WATCHER_SETTINGS) {
                const GROUPED_WATCHERS: GroupedWatchers = {
                    '0': {},
                    '1': {},
                };
                
                for (const P in ALL_WATCHER_SETTINGS) {
                    const PORT = parseInt(
                        vscgn_helpers.toStringSafe(P).trim(),
                    );

                    let index = -1;
                    for (const SETTING_VALUE of vscgn_helpers.asArray(ALL_WATCHER_SETTINGS[P], false)) {
                        ++index;

                        let settings = SETTING_VALUE;
                        if (null === settings) {
                            // default: GitHub
                            settings = {
                                provider: 'github',
                            };
                        }
                        else if (!vscgn_helpers.isObject<vscgn_contracts.WatcherSettings>(settings)) {
                            // provider
                            
                            settings = {
                                provider: vscgn_helpers.toStringSafe(settings),
                            };
                        }

                        if (!vscgn_helpers.toBooleanSafe(settings.enabled, true)) {
                            continue;  // not enabled
                        }
                        
                        try {
                            const SECURE = vscgn_helpers.toBooleanSafe(settings.secure);
                            const SECURE_KEY = SECURE ? '1' : '0';

                            const WATCHER_GROUP = GROUPED_WATCHERS[SECURE_KEY];

                            let portKey: string;
                            if (isNaN(PORT)) {
                                portKey = SECURE ? '443' : '80';
                            }
                            else {
                                portKey = '' + PORT;
                            }

                            if (!vscgn_helpers.isSymbol(disabledPorts)) {
                                if (disabledPorts.indexOf(portKey) > -1) {
                                    continue;  // disabled
                                }
                            }

                            if (!vscgn_helpers.isSymbol(enabledPorts)) {
                                if (enabledPorts.indexOf(portKey) < 0) {
                                    continue;  // not enabled
                                }
                            }

                            if (!WATCHER_GROUP[portKey]) {
                                WATCHER_GROUP[portKey] = [];
                            }

                            WATCHER_GROUP[portKey].push(
                                vscgn_watchers.createWatcher(settings)
                            );
                        }
                        catch (e) {
                            ME.showErrorMessage(
                                `Could not create watcher for entry #${index + 1} for port ${PORT}: ${vscgn_helpers.toStringSafe(e)}`
                            );
                        }
                    }
                }

                const ALL_SECURE_GROUPS = Object.keys(GROUPED_WATCHERS).sort((x, y) => {
                    return vscgn_helpers.compareValuesBy(
                        y, x,
                        k => vscgn_helpers.normalizeString(k),
                    );
                });

                // start servers
                for (const SG of ALL_SECURE_GROUPS) {
                    const WATCHERS = GROUPED_WATCHERS[SG];
                    const SECURE = '1' === SG;
                    
                    for (const PORT in WATCHERS) {
                        vscgn_helpers.applyFuncFor(
                            createHttpServerForWatchers,
                            ME
                        )( parseInt(PORT), WATCHERS[PORT], SECURE ).then((server) => {
                            if (server) {
                                ME._SERVERS
                                  .push(server);
                            }
                        }, (err) => {
                            ME.showErrorMessage(
                                `Could not start${SECURE ? ' secure' : ''} HTTP server on port ${PORT}: ${vscgn_helpers.toStringSafe(err)}`
                            );
                        });
                    }
                }
            }

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

    /**
     * Tries to detect the full path for an existing file.
     * 
     * @param {string} filePath The path of the file.
     * @param {string|string} [additionalScopes] Additional scope directories.
     * @param {boolean} [throwIfNotFound] Throw if not found (true) or return (false) instead.
     */
    public async toFullFilePath(filePath: string, additionalScopes?: string | string[], throwIfNotFound = true): Promise<string | false> {
        filePath = vscgn_helpers.toStringSafe(filePath);
        throwIfNotFound = vscgn_helpers.toBooleanSafe(throwIfNotFound, true);

        if (Path.isAbsolute(filePath)) {
            if (await vscgn_helpers.exists(filePath)) {
                if ((await vscgn_helpers.lstat(filePath)).isFile()) {
                    return Path.resolve(filePath);
                }
            }
        }
        else {
            const SCOPES = vscgn_helpers.asArray(additionalScopes).map(s => {
                return vscgn_helpers.toStringSafe(s);
            }).filter(s => {
                return !vscgn_helpers.isEmptyString(s);
            }).map(s => {
                if (!Path.isAbsolute(s)) {
                    s = OS.homedir();
                }

                return Path.resolve(s);
            });
            
            // add '.vscode' sub folders
            // inside opened workspaces
            for (const WSF of vscgn_helpers.asArray(vscode.workspace.workspaceFolders)) {
                SCOPES.push(
                    Path.join(
                        WSF.uri.fsPath,
                        '.vscode'
                    )
                );
            }

            for (const S of SCOPES) {
                const FULL_PATH = Path.join(S, filePath);

                if (await vscgn_helpers.exists(FULL_PATH)) {
                    if ((await vscgn_helpers.lstat(filePath)).isFile()) {
                        return Path.resolve(FULL_PATH);
                    }
                }
            }
        }

        if (throwIfNotFound) {
            throw new Error(`File '${filePath}' not found!`);
        }

        return false;
    }
}


function createHttpServerForWatchers(port: number,
                                     watchers: vscgn_watchers.GitWatcher[], secure: boolean): Promise<HttpServerWithWatchers>
{
    const ME: Controller = this;

    return new Promise<HttpServerWithWatchers>(async (resolve, reject) => {
        const COMPLETED = vscgn_helpers.createCompletedAction(resolve, reject);

        if (watchers.length < 1) {
            COMPLETED(null, null);
            return;
        }

        const RESULT: HttpServerWithWatchers = {
            dispose: function () {
                const SRV: vscgn_contracts.HttpServer = this.server;
                if (SRV) {
                    SRV.close((err) => {
                        if (err) {
                            vscgn_log.CONSOLE
                                    .trace(err, `controller.createHttpServerForWatchers().dispose().close(${port})`);
                        }
                    });
                }

                const WATCHERS: vscgn_watchers.GitWatcher[] = this.this.watchers;
                while (WATCHERS.length > 0) {
                    const W = WATCHERS.shift();

                    vscgn_helpers.tryDispose(W);
                }
            },
            server: undefined,
            watchers: watchers.map(w => {
                setupWatcher(w);

                return w;
            }),
        };

        const REQUEST_HANDLER = (request: HTTP.IncomingMessage, response: HTTP.ServerResponse) => {
            const CLOSE_REQUEST = (err?: any) => {
                if (err) {
                    vscgn_log.CONSOLE
                             .trace(err, 'controller.createHttpServerForWatchers().REQUEST_HANDLER()');
                }

                try {
                    response.end();
                }
                catch (e) {
                    vscgn_log.CONSOLE
                             .trace(e, 'controller.createHttpServerForWatchers().REQUEST_HANDLER().CLOSE_REQUEST()');
                }
            };
            
            try {
                const WATCHERS_TO_HANDLE = RESULT.watchers.map(w => w);

                let nextWatcher: (err?: any) => void;
                nextWatcher = (err?: any) => {
                    if (err) {
                        vscgn_log.CONSOLE
                                 .trace(err, 'controller.createHttpServerForWatchers().REQUEST_HANDLER().nextWatcher()');
                    }

                    if (WATCHERS_TO_HANDLE.length < 1) {
                        CLOSE_REQUEST();  // done
                        return;
                    }

                    try {
                        const W = WATCHERS_TO_HANDLE.shift();

                        try {
                            Promise.resolve( W.handleRequest(request, response) ).then(() => {
                                nextWatcher();
                            }, (err) => {
                                nextWatcher(err);
                            });
                        }
                        catch (e) {
                            nextWatcher(e);
                        }
                    }
                    catch (e) {
                        CLOSE_REQUEST(e);
                    }
                };

                nextWatcher();
            }
            catch (e) {
                CLOSE_REQUEST(e);
            }
        };

        try {
            let factory: () => Promise<vscgn_contracts.HttpServer>;

            if (secure) {
                factory = async () => {
                    const LOAD_SSL_FILE = async (f: string) => {
                        f = vscgn_helpers.toStringSafe(f);

                        if (vscgn_helpers.isEmptyString(f)) {
                            return undefined;
                        }

                        return await vscgn_helpers.readFile(
                            <string>(await ME.toFullFilePath(f, [
                                Path.join(
                                    OS.homedir(), '.ssl'
                                )
                            ]))
                        );
                    };

                    let ca: Buffer;
                    let cert: Buffer;
                    let key: Buffer;
                    for (const W of RESULT.watchers) {
                        const NEW_CA = await LOAD_SSL_FILE(W.settings.ca);
                        if (NEW_CA) {
                            ca = NEW_CA;
                        }

                        const NEW_CERT = await LOAD_SSL_FILE(W.settings.cert);
                        if (NEW_CERT) {
                            cert = NEW_CERT;
                        }

                        const NEW_KEY = await LOAD_SSL_FILE(W.settings.key);
                        if (NEW_KEY) {
                            key = NEW_KEY;
                        }
                    }

                    const OPTS: HTTPs.ServerOptions = {
                        ca: ca,
                        cert: cert,
                        key: key,
                    };

                    return HTTPs.createServer(OPTS,
                                              REQUEST_HANDLER);
                }
            }
            else {
                factory = async () => {
                    return HTTP.createServer(REQUEST_HANDLER);
                };
            }

            const NEW_SERVER = await factory();

            NEW_SERVER.listen(port, (err) => {
                if (err) {
                    COMPLETED(err);
                }
                else {
                    (<any>RESULT).server = NEW_SERVER;

                    COMPLETED(null, RESULT);
                }
            });
        }
        catch (e) {
            COMPLETED(e);
        }
    });
}


function getTitleSuffixForNotification(notification: vscgn_contracts.GitNotification) {
    if (!notification) {
        return '';
    }

    let title = vscgn_helpers.toStringSafe(notification.title).trim();
    if (title.length > 48) {
        title = title.substr(0, 48).trim();
        if ('' !== title) {
            title += '...';
        }
    }

    const NR = parseInt(
        vscgn_helpers.toStringSafe(notification.nr).trim()
    );

    let issueTitleSuffix = '' === title ? ''
                                        : `'${title}'`;
    if (!isNaN(NR)) {
        issueTitleSuffix = `#${NR} ` + issueTitleSuffix;
    }
    issueTitleSuffix = issueTitleSuffix.trim();
    if ('' !== issueTitleSuffix) {
        issueTitleSuffix = ' ' + issueTitleSuffix;
    }

    return issueTitleSuffix;
}

function setupWatcher(watcher: vscgn_watchers.GitWatcher) {
    if (!watcher) {
        return;
    }

    watcher.on(vscgn_contracts.EVENT_GIT_NOTIFICATION, (notification: vscgn_contracts.GitNotification) => {
        try {
            const REPOSITORY = vscgn_helpers.toStringSafe(notification.repository).trim();
            const TITLE_SUFFIX = getTitleSuffixForNotification(notification);
            const URL = vscgn_helpers.toStringSafe(notification.url).trim();

            let message: string;
            switch (notification.type) {
                case vscgn_contracts.GitNotificationType.ClosedIssue:
                    {
                        let notify: boolean;
                        if (vscgn_helpers.isObject(watcher.settings.issues)) {
                            notify = watcher.settings.issues.closed;   
                        }

                        if (vscgn_helpers.toBooleanSafe(notify, true)) {
                            if ('' !== REPOSITORY) {
                                message = `Issue${TITLE_SUFFIX} closed in '${REPOSITORY}'!`;
                            }
                            else {
                                message = `Issue${TITLE_SUFFIX} closed!`;
                            }
                        }
                    }
                    break;

                case vscgn_contracts.GitNotificationType.ClosedPullRequest:
                    {
                        let notify: boolean;
                        if (vscgn_helpers.isObject(watcher.settings.pullRequests)) {
                            notify = watcher.settings.pullRequests.closed;   
                        }

                        if (vscgn_helpers.toBooleanSafe(notify, true)) {
                            if ('' !== REPOSITORY) {
                                message = `Pull request${TITLE_SUFFIX} closed in '${REPOSITORY}'!`;
                            }
                            else {
                                message = `Pull request${TITLE_SUFFIX} closed!`;
                            }
                        }
                    }
                    break;

                case vscgn_contracts.GitNotificationType.NewIssue:
                    {
                        let notify: boolean;
                        if (vscgn_helpers.isObject(watcher.settings.issues)) {
                            notify = watcher.settings.issues.opened;   
                        }

                        if (vscgn_helpers.toBooleanSafe(notify, true)) {
                            if ('' !== REPOSITORY) {
                                message = `New issue${TITLE_SUFFIX} opened in '${REPOSITORY}'!`;
                            }
                            else {
                                message = `New issue opened${TITLE_SUFFIX}!`;
                            }
                        }
                    }
                    break;

                case vscgn_contracts.GitNotificationType.NewPullRequest:
                    {
                        let notify: boolean;
                        if (vscgn_helpers.isObject(watcher.settings.pullRequests)) {
                            notify = watcher.settings.pullRequests.opened;   
                        }

                        if (vscgn_helpers.toBooleanSafe(notify, true)) {
                            if ('' !== REPOSITORY) {
                                message = `New pull request${TITLE_SUFFIX} in '${REPOSITORY}'!`;
                            }
                            else {
                                message = `New pull request opened${TITLE_SUFFIX}!`;
                            }
                        }
                    }
                    break;

                case vscgn_contracts.GitNotificationType.NewIssueComment:
                    {
                        let notify: boolean;
                        if (vscgn_helpers.isObject(watcher.settings.issues)) {
                            notify = watcher.settings.issues.newComment;   
                        }

                        if (vscgn_helpers.toBooleanSafe(notify, true)) {
                            if ('' !== REPOSITORY) {
                                message = `New comment in issue${TITLE_SUFFIX} of '${REPOSITORY}'!`;
                            }
                            else {
                                message = `New comment in issue${TITLE_SUFFIX}!`;
                            }
                        }
                    }
                    break;

                case vscgn_contracts.GitNotificationType.ReopenedIssue:
                    {
                        let notify: boolean;
                        if (vscgn_helpers.isObject(watcher.settings.issues)) {
                            notify = watcher.settings.issues.reopened;   
                        }

                        if (vscgn_helpers.toBooleanSafe(notify, true)) {
                            if ('' !== REPOSITORY) {
                                message = `Issue${TITLE_SUFFIX} has been re-opened in '${REPOSITORY}'!`;
                            }
                            else {
                                message = `Issue${TITLE_SUFFIX} has been re-opened!`;
                            }
                        }
                    }
                    break;

                case vscgn_contracts.GitNotificationType.ReopenedPullRequest:
                    {
                        let notify: boolean;
                        if (vscgn_helpers.isObject(watcher.settings.pullRequests)) {
                            notify = watcher.settings.pullRequests.reopened;   
                        }

                        if (vscgn_helpers.toBooleanSafe(notify, true)) {
                            if ('' !== REPOSITORY) {
                                message = `Pull request${TITLE_SUFFIX} has been re-opened in '${REPOSITORY}'!`;
                            }
                            else {
                                message = `Pull request${TITLE_SUFFIX} has been re-opened!`;
                            }
                        }
                    }
                    break;
            }

            if (vscgn_helpers.isEmptyString(message)) {
                return;
            }

            const ITEMS: vscgn_contracts.ActionMessageItem[] = [];

            if ('' !== URL) {
                ITEMS.push({
                    action: () => {
                        vscgn_helpers.open(URL, {
                            wait: false,
                        }).then(() => {
                        }, (err) => {
                            vscgn_log.CONSOLE
                                     .trace(err, `controller.setupWatcher(4::${vscgn_contracts.EVENT_GIT_NOTIFICATION})`);
                        });
                    },
                    title: 'Open',
                }); 

                ITEMS.push({
                    action: () => {
                        watcher.showInformationMessage(URL);
                    },
                    title: 'Show URL',
                }); 
            }

            ITEMS.push({
                title: 'Close',
                isCloseAffordance: true,
            });

            watcher.showWarningMessage(message, ITEMS).then((selectedItem) => {
                if (!selectedItem) {
                    return;
                }
    
                try {
                    if (selectedItem.action) {
                        Promise.resolve( selectedItem.action() ).then(() => {
                        }, (err) => {
                            vscgn_log.CONSOLE
                                     .trace(err, `controller.setupWatcher(3::${vscgn_contracts.EVENT_GIT_NOTIFICATION})`);
                        });
                    }
                }
                catch (e) {
                    vscgn_log.CONSOLE
                             .trace(e, `controller.setupWatcher(2::${vscgn_contracts.EVENT_GIT_NOTIFICATION})`);
                }
            });
        }
        catch (e) {
            vscgn_log.CONSOLE
                     .trace(e, `controller.setupWatcher(1::${vscgn_contracts.EVENT_GIT_NOTIFICATION})`);
        }
    });
}
