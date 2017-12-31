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

import * as ChildProcess from 'child_process';
import * as FS from 'fs';
import * as Path from 'path';
import * as Stream from "stream";
import * as vscgn_log from './log';


/**
 * Options for open function.
 */
export interface OpenOptions {
    /**
     * The app (or options) to open.
     */
    readonly app?: string | string[];
    /**
     * The custom working directory.
     */
    readonly cwd?: string;
    /**
     * An optional list of environment variables
     * to submit to the new process.
     */
    readonly env?: any;
    /**
     * Wait until exit or not.
     */
    readonly wait?: boolean;
}

/**
 * Describes a simple 'completed' action.
 * 
 * @param {any} err The occurred error.
 * @param {TResult} [result] The result.
 */
export type SimpleCompletedAction<TResult> = (err: any, result?: TResult) => void;


/**
 * Applies a function for a specific object / value.
 * 
 * @param {TFunc} func The function. 
 * @param {any} [thisArgs] The object to apply to the function.
 * 
 * @return {TFunc} The wrapped function.
 */
export function applyFuncFor<TFunc extends Function = Function>(
    func: TFunc,
    thisArgs: any
): TFunc
{
    if (!func) {
        return func;
    }

    return <any>function() {
        return func.apply(thisArgs, arguments);
    };
}

/**
 * Returns a value as array.
 * 
 * @param {T|T[]} val The value.
 * @param {boolean} [removeEmpty] Remove items that are (null)/(undefined) or not.
 * 
 * @return {T[]} The value as array.
 */
export function asArray<T>(val: T | T[], removeEmpty = true): T[] {
    removeEmpty = toBooleanSafe(removeEmpty, true);

    return (Array.isArray(val) ? val : [ val ]).filter(i => {
        if (removeEmpty) {
            return !isNullOrUndefined(i);
        }

        return true;
    });
}

/**
 * Compares two values for a sort operation.
 * 
 * @param {T} x The left value.
 * @param {T} y The right value.
 * 
 * @return {number} The "sort value".
 */
export function compareValues<T>(x: T, y: T): number {
    if (x === y) {
        return 0;
    }

    if (x > y) {
        return 1;
    }

    if (x < y) {
        return -1;
    }

    return 0;
}

/**
 * Compares values by using a selector.
 * 
 * @param {T} x The left value. 
 * @param {T} y The right value.
 * @param {Function} selector The selector.
 * 
 * @return {number} The "sort value".
 */
export function compareValuesBy<T, U>(x: T, y: T,
                                      selector: (t: T) => U): number {
    if (!selector) {
        selector = (t) => <any>t;
    }

    return compareValues<U>(selector(x),
                            selector(y));
}

/**
 * Creates a simple 'completed' callback for a promise.
 * 
 * @param {Function} resolve The 'succeeded' callback.
 * @param {Function} reject The 'error' callback.
 * 
 * @return {SimpleCompletedAction<TResult>} The created action.
 */
export function createCompletedAction<TResult = any>(resolve: (value?: TResult | PromiseLike<TResult>) => void,
                                                     reject?: (reason: any) => void): SimpleCompletedAction<TResult> {
    let completedInvoked = false;

    return (err, result?) => {
        if (completedInvoked) {
            return;
        }
        completedInvoked = true;
        
        if (err) {
            if (reject) {
                reject(err);
            }
        }
        else {
            if (resolve) {
                resolve(result);
            }
        }
    };
}

/**
 * Promise version of 'FS.exists()' function.
 * 
 * @param {string|Buffer} path The path.
 * 
 * @return {Promise<boolean>} The promise that indicates if path exists or not.
 */
export function exists(path: string | Buffer) {
    return new Promise<boolean>((resolve, reject) => {
        const COMPLETED = createCompletedAction(resolve, reject);

        try {
            FS.exists(path, (doesExist) => {
                COMPLETED(null, doesExist);
            });
        }
        catch (e) {
            COMPLETED(e);
        }
    });
}

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
 * Checks if a value is a symbol or not.
 * 
 * @param {any} val The value to check.
 * 
 * @return {boolean} Is symbol or not. 
 */
export function isSymbol(val: any): val is symbol {
    return 'symbol' === typeof val;
}

/**
 * Promise version of 'FS.lstat()' function.
 * 
 * @param {string|Buffer} path The path.
 * 
 * @return {Promise<FS.Stats>} The promise with the stats.
 */
export function lstat(path: string | Buffer) {
    return new Promise<FS.Stats>((resolve, reject) => {
        const COMPLETED = createCompletedAction(resolve, reject);

        try {
            FS.lstat(path, (err, stats) => {
                if (err) {
                    COMPLETED(err);
                }
                else {
                    COMPLETED(null, stats);
                }
            });
        }
        catch (e) {
            COMPLETED(e);
        }
    });
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
 * Opens a target.
 * 
 * @param {string} target The target to open.
 * @param {OpenOptions} [opts] The custom options to set.
 * 
 * @param {Promise<ChildProcess.ChildProcess>} The promise with the child process.
 */
export function open(target: string, opts?: OpenOptions): Promise<ChildProcess.ChildProcess> {
    if (!opts) {
        opts = {};
    }

    target = toStringSafe(target);
    const WAIT = toBooleanSafe(opts.wait, true);
    
    return new Promise((resolve, reject) => {
        const COMPLETED = createCompletedAction(resolve, reject);
        
        try {
            let app = opts.app;
            let cmd: string;
            let appArgs: string[] = [];
            let args: string[] = [];
            let cpOpts: ChildProcess.SpawnOptions = {
                cwd: opts.cwd,
                env: opts.env,
            };

            if (Array.isArray(app)) {
                appArgs = app.slice(1);
                app = opts.app[0];
            }

            if (process.platform === 'darwin') {
                // Apple

                cmd = 'open';

                if (WAIT) {
                    args.push('-W');
                }

                if (app) {
                    args.push('-a', app);
                }
            }
            else if (process.platform === 'win32') {
                // Microsoft

                cmd = 'cmd';
                args.push('/c', 'start', '""');
                target = target.replace(/&/g, '^&');

                if (WAIT) {
                    args.push('/wait');
                }

                if (app) {
                    args.push(app);
                }

                if (appArgs.length > 0) {
                    args = args.concat(appArgs);
                }
            }
            else {
                // Unix / Linux

                if (app) {
                    cmd = app;
                } else {
                    cmd = Path.join(__dirname, 'xdg-open');
                }

                if (appArgs.length > 0) {
                    args = args.concat(appArgs);
                }

                if (!WAIT) {
                    // xdg-open will block the process unless
                    // stdio is ignored even if it's unref'd
                    cpOpts.stdio = 'ignore';
                }
            }

            args.push(target);

            if (process.platform === 'darwin' && appArgs.length > 0) {
                args.push('--args');
                args = args.concat(appArgs);
            }

            let cp = ChildProcess.spawn(cmd, args, cpOpts);

            if (WAIT) {
                cp.once('error', (err) => {
                    COMPLETED(err);
                });

                cp.once('close', function (code) {
                    if (code > 0) {
                        COMPLETED(new Error('Exited with code ' + code));
                        return;
                    }

                    COMPLETED(null, cp);
                });
            }
            else {
                cp.unref();

                COMPLETED(null, cp);
            }
        }
        catch (e) {
            COMPLETED(e);
        }
    });
}

/**
 * Reads the content of a stream.
 * 
 * @param {Stream.Readable} stream The stream.
 * 
 * @returns {Promise<Buffer>} The promise with the content.
 */
export function readAll(stream: Stream.Readable): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        let buff: Buffer;
    
        let dataListener: (chunk: Buffer | string) => void;

        let completedInvoked = false;
        const COMPLETED = (err: any) => {
            if (completedInvoked) {
                return;
            }
            completedInvoked = true;

            if (dataListener) {
                try {
                    stream.removeListener('data', dataListener);
                }
                catch (e) { 
                    vscgn_log.CONSOLE
                             .trace(e, 'helpers.readAll()');
                }
            }

            if (err) {
                reject(err);
            }
            else {
                resolve(buff);
            }
        };

        if (!stream) {
            COMPLETED(null);
            return;
        }

        stream.once('error', (err) => {
            if (err) {
                COMPLETED(err);
            }
        });

        dataListener = (chunk: Buffer | string) => {
            try {
                if (chunk && chunk.length > 0) {
                    if ('string' === typeof chunk) {
                        chunk = new Buffer(chunk);
                    }

                    buff = Buffer.concat([ buff, chunk ]);
                }
            }
            catch (e) {
                COMPLETED(e);
            }
        };

        try {
            buff = Buffer.alloc(0);

            stream.on('data', dataListener);

            stream.once('end', () => {
                COMPLETED(null);
            });
        }
        catch (e) {
            COMPLETED(e);
        }
    });
}

/**
 * Promise version of 'FS.readFile()' function.
 * 
 * @param {string} filename The file to read.
 * 
 * @return {Promise<FS.Stats>} The promise with the stats.
 */
export function readFile(filename: string) {
    return new Promise<Buffer>((resolve, reject) => {
        const COMPLETED = createCompletedAction(resolve, reject);

        try {
            FS.readFile(filename, (err, data) => {
                if (err) {
                    COMPLETED(err);
                }
                else {
                    COMPLETED(null, data);
                }
            });
        }
        catch (e) {
            COMPLETED(e);
        }
    });
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

/**
 * Tries to dispose an object.
 * 
 * @param {object} obj The object to dispose.
 * 
 * @return {boolean} Operation was successful or not.
 */
export function tryDispose(obj: { dispose?: () => any }): boolean {
    try {
        if (obj && obj.dispose) {
            obj.dispose();
        }

        return true;
    }
    catch (e) {
        vscgn_log.CONSOLE
                 .trace(e, 'helpers.tryDispose()');

        return false;
    }
}
