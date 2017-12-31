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

interface GitHubPullRequest {
    html_url?: string;
    number?: number;
    title?: string;
}

interface GitHubPullRequestRequest extends GitHubRequest, GitHubRequestWithRepository {
    action?: string;
    pull_request?: GitHubPullRequest;
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

        let repository: string;
        if (vscgn_helpers.isObject(issueComment.repository)) {
            repository = issueComment.repository.full_name;
        }

        this.emitGitNotification({
            repository: repository,
            nr: parseInt(
                vscgn_helpers.toStringSafe(issueComment.issue.number).trim()
            ),
            title: issueComment.issue.title,
            type: vscgn_contracts.GitNotificationType.NewIssueComment,
            url: issueComment.issue.html_url,
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

        let repository: string;
        if (vscgn_helpers.isObject(issues.repository)) {
            repository = issues.repository.full_name;
        }

        let notificationType: vscgn_contracts.GitNotificationType | false = false;

        const ACTION = vscgn_helpers.normalizeString(issues.action);
        switch (ACTION) {
            case 'closed':
                notificationType = vscgn_contracts.GitNotificationType.ClosedIssue;
                break;

            case 'opened':
                notificationType = vscgn_contracts.GitNotificationType.NewIssue;
                break;

            case 'reopened':
                notificationType = vscgn_contracts.GitNotificationType.ReopenedIssue;
                break;
        }

        if (false === notificationType) {
            return;
        }

        this.emitGitNotification({
            repository: repository,
            nr: parseInt(
                vscgn_helpers.toStringSafe(issues.issue.number).trim()
            ),
            title: issues.issue.title,
            type: notificationType,
            url: issues.issue.html_url,
        });
    }

    private async handleGitHubPullRequests(pullRequest: GitHubPullRequestRequest,
                                           request: HTTP.IncomingMessage, response: HTTP.ServerResponse) {
        if (!vscgn_helpers.isObject(pullRequest)) {
            return;
        }

        if (!vscgn_helpers.isObject(pullRequest.pull_request)) {
            return;
        }

        let repository: string;
        if (vscgn_helpers.isObject(pullRequest.repository)) {
            repository = pullRequest.repository.full_name;
        }

        let notificationType: vscgn_contracts.GitNotificationType | false = false;

        const ACTION = vscgn_helpers.normalizeString(pullRequest.action);
        switch (ACTION) {
            case 'closed':
                notificationType = vscgn_contracts.GitNotificationType.ClosedPullRequest;
                break;

            case 'opened':
                notificationType = vscgn_contracts.GitNotificationType.NewPullRequest;
                break;

            case 'reopened':
                notificationType = vscgn_contracts.GitNotificationType.ReopenedPullRequest;
                break;
        }

        if (false === notificationType) {
            return;
        }

        this.emitGitNotification({
            repository: repository,
            nr: parseInt(
                vscgn_helpers.toStringSafe(pullRequest.pull_request.number).trim()
            ),
            title: pullRequest.pull_request.title,
            type: notificationType,
            url: pullRequest.pull_request.html_url,
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

            case 'pull_request':
                await this.handleGitHubPullRequests(<GitHubPullRequestRequest>fromGitHub,
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
