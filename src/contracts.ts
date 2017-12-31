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

import * as HTTP from 'http';
import * as HTTPs from 'https';
import * as vscode from 'vscode';



/**
 * A message item with an action and an optional state value to submit.
 */
export interface ActionMessageItem<TState = any> extends vscode.MessageItem {
    /**
     * The action.
     * 
     * @param {TState} [state] The state value (if submitted).
     */
    action?: (state?: TState) => any;
    /**
     * The state value for the action.
     */
    state?: TState;
}

 /**
 * Stores data of configuration source.
 */
export interface ConfigSource {
    /**
     * Gets the resource URI.
     */
    readonly resource?: vscode.Uri;
    /**
     * Gets the name of the section.
     */
    readonly section: string;
}

/**
 * App settings.
 */
export interface Configuration extends vscode.WorkspaceConfiguration {
    /**
     * Disable all watchers or not.
     */
    readonly disableAll?: boolean;
    /**
     * One or more TCP ports to disable (blacklist).
     */
    readonly disabledPorts?: number | number[];
    /**
     * One or more TCP ports to enable (whitelist).
     */
    readonly enabledPorts?: number | number[];
    /**
     * A list of watcher settings.
     */
    readonly watchers?: { [ port: string ]: WatcherSettingValue | WatcherSettingValue[] }
}

/**
 * A git notification.
 */
export interface GitNotification {
    /**
     * A number of the thing that notifies.
     */
    readonly nr?: number;
    /**
     * The full name of the underlying repository.
     */
    readonly repository?: string;
    /**
     * A title of the thing that notifies.
     */
    readonly title?: string;
    /**
     * The type.
     */
    readonly type: GitNotificationType;
    /**
     * A URL to open in browser.
     */
    readonly url?: string;
}

/**
 * Type of a git notification.
 */
export enum GitNotificationType {
    /**
     * Issue closed.
     */
    ClosedIssue,
    /**
     * Issue pull request.
     */
    ClosedPullRequest,
    /**
     * New issue.
     */
    NewIssue,
    /**
     * A new issue comment.
     */
    NewIssueComment,
    /**
     * New pull request.
     */
    NewPullRequest,
    /**
     * Re-Opened issue.
     */
    ReopenedIssue,
    /**
     * Re-Opened pull request.
     */
    ReopenedPullRequest,
}

/**
 * Settings for a watcher.
 */
export interface WatcherSettings {
    /**
     * The path to the SSL's ca file.
     */
    readonly ca?: string;
    /**
     * The path to the SSL's cert file.
     */
    readonly cert?: string;
    /**
     * Indicates if watcher is enabled or not.
     */
    readonly enabled?: boolean;
    /**
     * Sets up issue based events.
     */
    readonly issues?: {
        /**
         * Notify when issue has been closed.
         */
        readonly closed?: boolean;
        /**
         * Notify when a new comment has been made in an issue.
         */
        readonly newComment?: boolean;
        /**
         * Notify when new issue has been opened.
         */
        readonly opened?: boolean;
        /**
         * Notify when issue has been re-opened.
         */
        readonly reopened?: boolean;
    };
    /**
     * The path to the SSL's key file.
     */
    readonly key?: string;
    /**
     * A (display) name for that watcher.
     */
    readonly name?: string;
    /**
     * Sets up pull request based events.
     */
    readonly pullRequests?: {
        /**
         * Notify when pull request has been closed.
         */
        readonly closed?: boolean;
        /**
         * Notify when new pull request has been opened.
         */
        readonly opened?: boolean;
        /**
         * Notify when pull request has been re-opened.
         */
        readonly reopened?: boolean;
    };
    /**
     * The provider to use.
     */
    readonly provider?: string;
    /**
     * A value that should be used to verify the request.
     */
    readonly secret?: any;
    /**
     * Run on secure HTTP or not.
     */
    readonly secure?: boolean;
}

/**
 * A possible value for watcher settings.
 */
export type WatcherSettingValue = null | string | WatcherSettings;

/**
 * A possible value for a HTTP(s) server.
 */
export type HttpServer = HTTP.Server | HTTPs.Server;


/**
 * Name of the event when the object has been activated.
 */
export const EVENT_ACTIVATED = 'activated';
/**
 * Name of the event when the object is going to be activated.
 */
export const EVENT_ACTIVATING = 'activating';
/**
 * Name of the event when configuration has been reloaded.
 */
export const EVENT_CONFIG_RELOADED = 'config.reloaded';
/**
 * Name of the event when configuration is going to be reloaded.
 */
export const EVENT_CONFIG_RELOADING = 'config.reloading';
/**
 * Name of the event when the object has been de-activated.
 */
export const EVENT_DEACTIVATED = 'deactivated';
/**
 * Name of the event when the object is going to be de-activated.
 */
export const EVENT_DEACTIVATING = 'deactivating';
/**
 * Name of the event when the object has been disposed.
 */
export const EVENT_DISPOSED = 'disposed';
/**
 * Name of the event when the object is going to be disposed.
 */
export const EVENT_DISPOSING = 'disposing';
/**
 * Name of an event that receives a git notification.
 */
export const EVENT_GIT_NOTIFICATION = 'git.notification';
/**
 * Name of the event when the object has been started.
 */
export const EVENT_STARTED = 'started';
/**
 * Name of the event when the object is going to be started.
 */
export const EVENT_STARTING = 'starting';
/**
 * Name of the event when the object has been stopped.
 */
export const EVENT_STOPPED = 'stopped';
/**
 * Name of the event when the object is going to be stopped.
 */
export const EVENT_STOPPING = 'stopping';
/**
 * The name of that extension.
 */
export const EXTENSION_NAME = 'vscode-git-notify';
