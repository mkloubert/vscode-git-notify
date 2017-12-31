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

import * as vscgn_log from './log';


/**
 * Checks if the string representation of a value is empty
 * or contains whitespaces only.
 * 
 * @param {any} val The value to check.
 * 
 * @return {boolean} Is empty or not.
 */
export function isEmptyString(val: any) {
    return '' === toStringSafe(val).trim();
}

/**
 * Checks if a value is a function or not.
 * 
 * @param {any} val The value to check.
 * 
 * @return {boolean} Is function or not. 
 */
export function isFunc<TFunc extends Function = Function>(val: any): val is TFunc {
    return 'function' === typeof val;
}

/**
 * Checks if a value is (null) or (undefined).
 * 
 * @param {any} val The value to check.
 * 
 * @return {boolean} Is (null)/(undefined) or not.
 */
export function isNullOrUndefined(val: any): boolean {
    return null === val ||
           'undefined' === typeof val;
}

/**
 * Checks if a value is an object or not.
 * 
 * @param {any} val The value to check.
 * 
 * @return {boolean} Is object or not. 
 */
export function isObject<TObj = Object>(val: any): val is TObj {
    return !isNullOrUndefined(val) &&
           !Array.isArray(val) &&
           'object' === typeof val;
}

/**
 * Normalizes a value as string so that is comparable.
 * 
 * @param {any} val The value to convert.
 * @param {(str: string) => string} [normalizer] The custom normalizer.
 * 
 * @return {string} The normalized value.
 */
export function normalizeString(val: any, normalizer?: (str: string) => string): string {
    if (!normalizer) {
        normalizer = (str) => str.toLowerCase().trim();
    }

    return normalizer(toStringSafe(val));
}

/**
 * Converts a value to a boolean.
 * 
 * @param {any} val The value to convert.
 * @param {any} defaultValue The value to return if 'val' is (null) or (undefined).
 * 
 * @return {boolean} The converted value.
 */
export function toBooleanSafe(val: any, defaultValue: any = false): boolean {
    if ('boolean' === typeof val) {
        return val;
    }

    if (isNullOrUndefined(val)) {
        return defaultValue;
    }

    return !!val;
}

 /**
 * Converts a value to a string that is NOT (null) or (undefined).
 * 
 * @param {any} str The input value.
 * @param {any} defValue The default value.
 * 
 * @return {string} The output value.
 */
export function toStringSafe(str: any, defValue: any = ''): string {
    if ('string' === typeof str) {
        return str;
    }

    if (isNullOrUndefined(str)) {
        return defValue;
    }

    try {
        if (str instanceof Error) {
            return str.message;
        }
    
        if (isFunc(str['toString'])) {
            return '' + str.toString();
        }

        try {
            if (Array.isArray(str) || isObject(str)) {
                return JSON.stringify(str);
            }
        }
        catch (e) {
            vscgn_log.CONSOLE
                     .trace(e, 'helpers.toStringSafe(2)');
        }

        return '' + str;
    }
    catch (e) {
        vscgn_log.CONSOLE
                 .trace(e, 'helpers.toStringSafe(1)');

        return typeof str;
    }
}
