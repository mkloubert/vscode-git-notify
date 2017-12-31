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

import * as vscode from 'vscode';


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
}


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
 * The name of that extension.
 */
export const EXTENSION_NAME = 'vscode-git-notify';
