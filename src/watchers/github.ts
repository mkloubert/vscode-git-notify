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

import * as Crypto from 'crypto';
import * as HTTP from 'http';
import * as vscgn_contracts from '../contracts';
import * as vscgn_helpers from '../helpers';
import * as vscgn_log from '../log';
import * as vscgn_watchers from '../watchers';


interface GitHubRequest {
}

interface GitHubRequestWithRepository extends GitHubRequest {
    repository?: {
        full_name?: string;
    };
}

interface GitHubIssue {
    html_url?: string;
    number?: number;
    title?: string;
}

interface GitHubIssueRequest extends GitHubRequest {
    issue?: GitHubIssue;
}

interface GitHubIssues extends GitHubIssueRequest, GitHubRequestWithRepository {
    action?: string;
}

interface GitHubIssueComment extends GitHubIssueRequest, GitHubRequestWithRepository {
}

/**
 * Settings for a GitHub watcher.
 */
export interface GitHubWatcherSettings extends vscgn_watchers.WebhookWatcherSettings {
}


/**
 * A GitHub watcher.
 */
export class GitHubWatcher extends vscgn_watchers.GitWebhookWatcher<GitHubWatcherSettings> {
    private async handleGitHubIssueComment(issueComment: GitHubIssueComment,
                                           request: HTTP.IncomingMessage, response: HTTP.ServerResponse) {
        if (!vscgn_helpers.isObject(issueComment)) {
            return;
        }

        if (!vscgn_helpers.isObject(issueComment.issue)) {
            return;
        }

        if (!this.notifyOnNewIssueComment) {
            return;
        }

        const URL = vscgn_helpers.toStringSafe(issueComment.issue.html_url)
                                 .trim();

        let repository: string;
        if (vscgn_helpers.isObject(issueComment.repository)) {
            repository = issueComment.repository.full_name;
        }
        repository = vscgn_helpers.toStringSafe(repository).trim();

        const ITEMS: vscgn_contracts.ActionMessageItem[] = [];
        
        const NR = parseInt(
            vscgn_helpers.toStringSafe(issueComment.issue.number).trim()
        );

        const ISSUE_TITLE_SUFFIX = getIssueTitleSuffix(issueComment.issue);

        let message: string;
        if ('' !== repository) {
            message = `New comment in issue${ISSUE_TITLE_SUFFIX} of '${repository}'!`;
        }
        else {
            message = `New comment in issue${ISSUE_TITLE_SUFFIX}!`;
        }

        if ('' !== URL) {
            ITEMS.push({
                action: () => {
                    vscgn_helpers.open(URL, {
                        wait: false,
                    }).then(() => {
                    }, (err) => {
                        vscgn_log.CONSOLE
                                 .trace(err, 'watchers.github.GitHubWatcher().handleGitHubIssueComment(4)');
                    });
                },
                title: 'Open ...',
            });    
        }

        ITEMS.push({
            title: 'Close',
            isCloseAffordance: true,
        });

        this.showWarningMessage(message, ITEMS).then((selectedItem) => {
            if (!selectedItem) {
                return;
            }

            try {
                if (selectedItem.action) {
                    Promise.resolve( selectedItem.action() ).then(() => {
                    }, (err) => {
                        vscgn_log.CONSOLE
                                 .trace(err, 'watchers.github.GitHubWatcher().handleGitHubIssueComment(3)');
                    });
                }
            }
            catch (e) {
                vscgn_log.CONSOLE
                         .trace(e, 'watchers.github.GitHubWatcher().handleGitHubIssueComment(2)');
            }
        }, (err) => {
            vscgn_log.CONSOLE
                     .trace(err, 'watchers.github.GitHubWatcher().handleGitHubIssueComment(1)');
        });
    }

    private async handleGitHubIssues(issues: GitHubIssues,
                                     request: HTTP.IncomingMessage, response: HTTP.ServerResponse) {
        if (!vscgn_helpers.isObject(issues)) {
            return;
        }

        if (!vscgn_helpers.isObject(issues.issue)) {
            return;
        }

        const URL = vscgn_helpers.toStringSafe(issues.issue.html_url)
                                 .trim();

        let repository: string;
        if (vscgn_helpers.isObject(issues.repository)) {
            repository = issues.repository.full_name;
        }
        repository = vscgn_helpers.toStringSafe(repository).trim();

        const NR = parseInt(
            vscgn_helpers.toStringSafe(issues.issue.number).trim()
        );

        const ISSUE_TITLE_SUFFIX = getIssueTitleSuffix(issues.issue);

        const ITEMS: vscgn_contracts.ActionMessageItem[] = [];

        let message: string;

        const ACTION = vscgn_helpers.normalizeString(issues.action);
        switch (ACTION) {
            case 'closed':
                if (this.notifyOnClosedIssue) {
                    if ('' !== repository) {
                        message = `Issue${ISSUE_TITLE_SUFFIX} closed in '${repository}'!`;
                    }
                    else {
                        message = `Issue${ISSUE_TITLE_SUFFIX} closed!`;
                    }
                }
                break;

            case 'opened':
                if (this.notifyOnNewIssue) {
                    if ('' !== repository) {
                        message = `New issue${ISSUE_TITLE_SUFFIX} opened in '${repository}'!`;
                    }
                    else {
                        message = `New issue opened${ISSUE_TITLE_SUFFIX}!`;
                    }
                }
                break;

            case 'reopened':
                if (this.notifyOnReopenedIssue) {
                    if ('' !== repository) {
                        message = `Issue${ISSUE_TITLE_SUFFIX} has been reopened in '${repository}'!`;
                    }
                    else {
                        message = `Issue${ISSUE_TITLE_SUFFIX} has been reopened!`;
                    }
                }
                break;
        }

        if (vscgn_helpers.isEmptyString(message)) {
            return;
        }

        if ('' !== URL) {
            ITEMS.push({
                action: () => {
                    vscgn_helpers.open(URL, {
                        wait: false,
                    }).then(() => {
                    }, (err) => {
                        vscgn_log.CONSOLE
                                 .trace(err, 'watchers.github.GitHubWatcher().handleGitHubIssues(4)');
                    });
                },
                title: 'Open ...',
            });    
        }

        ITEMS.push({
            title: 'Close',
            isCloseAffordance: true,
        });

        this.showWarningMessage(message, ITEMS).then((selectedItem) => {
            if (!selectedItem) {
                return;
            }

            try {
                if (selectedItem.action) {
                    Promise.resolve( selectedItem.action() ).then(() => {
                    }, (err) => {
                        vscgn_log.CONSOLE
                                 .trace(err, 'watchers.github.GitHubWatcher().handleGitHubIssues(3)');
                    });
                }
            }
            catch (e) {
                vscgn_log.CONSOLE
                         .trace(e, 'watchers.github.GitHubWatcher().handleGitHubIssues(2)');
            }
        }, (err) => {
            vscgn_log.CONSOLE
                     .trace(err, 'watchers.github.GitHubWatcher().handleGitHubIssues(1)');
        });
    }

    private async handleGitHubRequest(fromGitHub: GitHubRequest,
                                      request: HTTP.IncomingMessage, response: HTTP.ServerResponse) {
        const GITHUB_EVENT = vscgn_helpers.normalizeString(request.headers['x-github-event']);
        
        switch (GITHUB_EVENT) {
            case 'issue_comment':
                await this.handleGitHubIssueComment(<GitHubIssueComment>fromGitHub,
                                                    request, response);
                break;

            case 'issues':
                await this.handleGitHubIssues(<GitHubIssues>fromGitHub,
                                              request, response);
                break;
        }
    }

    /** @inheritdoc */
    protected async onHandleRequest(request: HTTP.IncomingMessage, response: HTTP.ServerResponse) {
        if ('post' !== vscgn_helpers.normalizeString(request.method)) {
            response.writeHead(405, 'Method Not Allowed');
            return;
        }

        if (!request.headers) {
            response.writeHead(402, 'Payment Required');
            return;
        }

        if ('application/json' !== vscgn_helpers.normalizeString(request.headers['content-type'])) {
            response.writeHead(406, 'Not Acceptable', {
                'Content-type': 'application/json',
            });
            return;
        }

        const DATA = await vscgn_helpers.readAll(request);
        const BODY = DATA.toString('utf8');

        let secret = vscgn_helpers.toStringSafe(this.settings.secret);
        if ('' !== secret) {
            const SIG = vscgn_helpers.toStringSafe(request.headers['x-hub-signature']);
            if (vscgn_helpers.isEmptyString(SIG)) {
                response.writeHead(404, 'Not Found');
                return;
            }

            let algo: string;
            let secretFromGitHub: string;

            const SEP = SIG.indexOf('=');
            if (SEP > -1) {
                algo = SIG.substr(0, SEP);
                secretFromGitHub = SIG.substr(SEP + 1);
            }
            else {
                secretFromGitHub = SIG;
            }
            secretFromGitHub = vscgn_helpers.normalizeString(secretFromGitHub);

            algo = vscgn_helpers.normalizeString(algo);
            if ('' === algo) {
                algo = 'sha1';
            }

            const MY_SIG = Crypto.createHmac(algo, secret)
                                 .update(DATA)
                                 .digest('hex');
            if (secretFromGitHub !== MY_SIG) {
                if (vscgn_helpers.isEmptyString(SIG)) {
                    response.writeHead(404, 'Not Found');
                    return;
                }
            }
        }
        
        let err: any;
        let gitHubReq: GitHubRequest;
        try {
            gitHubReq = JSON.parse(BODY);
        }
        catch (e) {
            err = e;
        }

        if (vscgn_helpers.isObject<GitHubRequest>(gitHubReq)) {
            await this.handleGitHubRequest(gitHubReq,
                                           request, response);

            if (!response.headersSent) {
                response.writeHead(204, 'No Content');
            }
        }
        else {
            response.writeHead(400, 'Bad Request');
        }
    }

    /** @inheritdoc */
    public get providerName(): string {
        return 'GitHub';
    }
}

function getIssueTitleSuffix(issue: GitHubIssue) {
    if (!issue) {
        return '';
    }

    let title = vscgn_helpers.toStringSafe(issue.title).trim();
    if (title.length > 48) {
        title = title.substr(0, 48).trim();
        if ('' !== title) {
            title += '...';
        }
    }

    const NR = parseInt(
        vscgn_helpers.toStringSafe(issue.number).trim()
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
