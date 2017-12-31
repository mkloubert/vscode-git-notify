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
import * as vscgn_contracts from '../contracts';
import * as vscgn_helpers from '../helpers';
import * as vscgn_watchers from '../watchers';


interface GiteaRequest {
    secret?: string;
}

interface GiteaRequestWithRepository extends GiteaRequest {
    repository?: {
        full_name?: string;
    };
}

interface GiteaPullRequest {
    html_url?: string;
    number?: number;
    title?: string;
}

interface GiteaPullRequestRequest extends GiteaRequest, GiteaRequestWithRepository {
    action?: string;
    pull_request?: GiteaPullRequest;
}

/**
 * Settings for a GitHub watcher.
 */
export interface GiteaWatcherSettings extends vscgn_watchers.WebhookWatcherSettings {
}


/**
 * A GitHub watcher.
 */
export class GiteaWatcher extends vscgn_watchers.GitWebhookWatcher<GiteaWatcherSettings> {
    private async handleGitHubPullRequests(pullRequest: GiteaPullRequestRequest,
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

    private async handleGiteaRequest(fromGitea: GiteaRequest,
                                     request: HTTP.IncomingMessage, response: HTTP.ServerResponse) {
        const GITEA_EVENT = vscgn_helpers.normalizeString(request.headers['x-gitea-event']);
        
        switch (GITEA_EVENT) {
            case 'pull_request':
                await this.handleGitHubPullRequests(<GiteaPullRequestRequest>fromGitea,
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

        const KEY = Object.keys(request.headers);

        if ('application/json' !== vscgn_helpers.normalizeString(request.headers['content-type'])) {
            response.writeHead(406, 'Not Acceptable', {
                'Content-type': 'application/json',
            });
            return;
        }

        const DATA = await vscgn_helpers.readAll(request);
        const BODY = DATA.toString('utf8');

        let err: any;
        let giteaReq: GiteaRequest;
        try {
            giteaReq = JSON.parse(BODY);
        }
        catch (e) {
            err = e;
        }

        if (vscgn_helpers.isObject<GiteaRequest>(giteaReq)) {
            const MY_SECRET = vscgn_helpers.toStringSafe(this.settings.secret);
            const SECRET_FROM_GITEA = vscgn_helpers.toStringSafe(giteaReq.secret);

            if (SECRET_FROM_GITEA != MY_SECRET) {
                if (vscgn_helpers.isEmptyString(SECRET_FROM_GITEA)) {
                    response.writeHead(404, 'Not Found');
                    return;
                }
            }

            await this.handleGiteaRequest(giteaReq,
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
        return 'Gitea';
    }
}

function getPullRequestTitleSuffix(pullRequest: GiteaPullRequest) {
    if (!pullRequest) {
        return '';
    }

    let title = vscgn_helpers.toStringSafe(pullRequest.title).trim();
    if (title.length > 48) {
        title = title.substr(0, 48).trim();
        if ('' !== title) {
            title += '...';
        }
    }

    const NR = parseInt(
        vscgn_helpers.toStringSafe(pullRequest.number).trim()
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
