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
import * as Moment from 'moment';
import * as vscgn_contracts from '../contracts';
import * as vscgn_helpers from '../helpers';
import * as vscgn_watchers from '../watchers';


interface BitbucketCommit {
    date?: string;
    hash?: string;
    links?: {
        html?: {
            href?: string;
        };
    };
    message?: string;
}

interface BitbucketRequest {
}

interface BitbucketRequestWithChanges extends BitbucketRequest {
    changes?: {
        status?: {
            'new'?: string;
        };
    };
}

interface BitbucketRequestWithRepository extends BitbucketRequest {
    repository?: {
        name?: string;
        owner?: {
            username?: string;
        };
    };
}

interface BitbucketIssues extends BitbucketRequestWithChanges, BitbucketRequestWithRepository {
    issue?: {
        id?: number;
        links?: {
            html?: {
                href?: string;
            };
        };
        title?: string;
    };
}

interface BitbucketPush extends BitbucketRequestWithRepository {
    push?: {
        changes?: {
            commits?: BitbucketCommit[];
        }
    };
}

interface BitbucketPullRequest extends BitbucketRequestWithChanges, BitbucketRequestWithRepository {
    pullrequest?: {
        id?: number;
        links?: {
            html?: {
                href?: string;
            };
        };
        title?: string;
    };
}

/**
 * Settings for a GitLab watcher.
 */
export interface BitbucketWatcherSettings extends vscgn_watchers.WebhookWatcherSettings {
}


/**
 * A Bitbucket watcher.
 */
export class BitbucketWatcher extends vscgn_watchers.GitWebhookWatcher<BitbucketWatcherSettings> {
    private async handleBitbucketIssueRequest(issues: BitbucketIssues,
                                              request: HTTP.IncomingMessage, response: HTTP.ServerResponse) {
        if (!vscgn_helpers.isObject(issues)) {
            return;
        }

        if (!vscgn_helpers.isObject(issues.issue)) {
            return;
        }

        let repository: string;
        if (vscgn_helpers.isObject(issues.repository)) {
            repository = vscgn_helpers.toStringSafe(issues.repository.name).trim();
            if (vscgn_helpers.isObject(issues.repository.owner)) {
                const USERNAME = vscgn_helpers.toStringSafe(issues.repository.owner.username).trim();
                if ('' !== USERNAME) {
                    repository = USERNAME + 
                                 ('' !== repository ? '/' : '') + 
                                 repository;
                }
            }
        }

        let nr = issues.issue.id;
        let notificationType: vscgn_contracts.GitNotificationType | false = false;
        let title = issues.issue.title;

        let url: string;
        if (vscgn_helpers.isObject(issues.issue.links)) {
            if (vscgn_helpers.isObject(issues.issue.links.html)) {
                url = vscgn_helpers.toStringSafe(issues.issue.links.html.href).trim();
            }
        }

        const EVENT = vscgn_helpers.normalizeString(request.headers['x-event-key']);
        switch (EVENT) {
            case 'issue:created':
                notificationType = vscgn_contracts.GitNotificationType.NewIssue;
                break;

            case 'issue:updated':
                if (vscgn_helpers.isObject(issues.changes)) {
                    if (vscgn_helpers.isObject(issues.changes.status)) {
                        const NEW_STATE = vscgn_helpers.normalizeString(issues.changes.status.new);
                        switch (NEW_STATE) {
                            case 'open':
                                notificationType = vscgn_contracts.GitNotificationType.ReopenedIssue;
                                break;
                            
                            case 'resolved':
                                notificationType = vscgn_contracts.GitNotificationType.ClosedIssue;
                                break;
                        }
                    }
                }
                break;
        }

        if (false === notificationType) {
            return;
        }

        this.emitGitNotification({
            repository: repository,
            nr: nr,
            title: title,
            type: notificationType,
            url: url,
        });
    }

    private async handleBitbucketPullRequest(pullRequest: BitbucketPullRequest,
                                             request: HTTP.IncomingMessage, response: HTTP.ServerResponse) {

        if (!vscgn_helpers.isObject(pullRequest)) {
            return;
        }

        if (!vscgn_helpers.isObject(pullRequest.pullrequest)) {
            return;
        }

        let repository: string;
        if (vscgn_helpers.isObject(pullRequest.repository)) {
            repository = vscgn_helpers.toStringSafe(pullRequest.repository.name).trim();
            if (vscgn_helpers.isObject(pullRequest.repository.owner)) {
                const USERNAME = vscgn_helpers.toStringSafe(pullRequest.repository.owner.username).trim();
                if ('' !== USERNAME) {
                    repository = USERNAME + 
                                 ('' !== repository ? '/' : '') + 
                                 repository;
                }
            }
        }

        let nr = pullRequest.pullrequest.id;
        let notificationType: vscgn_contracts.GitNotificationType | false = false;
        let title = pullRequest.pullrequest.title;

        let url: string;
        if (vscgn_helpers.isObject(pullRequest.pullrequest.links)) {
            if (vscgn_helpers.isObject(pullRequest.pullrequest.links.html)) {
                url = vscgn_helpers.toStringSafe(pullRequest.pullrequest.links.html.href).trim();
            }
        }

        const EVENT = vscgn_helpers.normalizeString(request.headers['x-event-key']);
        switch (EVENT) {
            case 'pullrequest:created':
                notificationType = vscgn_contracts.GitNotificationType.NewPullRequest;
                break;

            case 'pullrequest:rejected':
                notificationType = vscgn_contracts.GitNotificationType.ClosedPullRequest;
                break;
        }

        if (false === notificationType) {
            return;
        }

        this.emitGitNotification({
            repository: repository,
            nr: nr,
            title: title,
            type: notificationType,
            url: url,
        });
    }

    private async handleBitbucketPush(push: BitbucketPush,
                                      request: HTTP.IncomingMessage, response: HTTP.ServerResponse) {
        if (!vscgn_helpers.isObject(push)) {
            return;
        }

        if (!vscgn_helpers.isObject(push.push)) {
            return;
        }

        let allCommits: BitbucketCommit[] = [];

        vscgn_helpers.asArray(push.push.changes).filter(chg => {
            return vscgn_helpers.isObject(chg);
        }).forEach(chg => {
            vscgn_helpers.asArray(chg.commits).filter(c => {
                return vscgn_helpers.isObject(c);
            }).forEach(c => {
                allCommits.push(c);
            });
        });

        allCommits = allCommits.sort((x, y) => {
            return vscgn_helpers.compareValuesBy(y, x, c => {
                const DATE = vscgn_helpers.toStringSafe(c.date).trim();
                if ('' !== DATE) {
                    const TIME = Moment(DATE);
                    if (TIME.isValid()) {
                        return TIME.unix();
                    }
                }
            });
        });

        if (allCommits.length < 1) {
            return;
        }

        const HEAD_COMMIT = allCommits[0];

        let url: string;
        if (vscgn_helpers.isObject(HEAD_COMMIT.links)) {
            if (vscgn_helpers.isObject(HEAD_COMMIT.links.html)) {
                url = HEAD_COMMIT.links.html.href;
            }
        }

        let repository: string;
        if (vscgn_helpers.isObject(push.repository)) {
            repository = vscgn_helpers.toStringSafe(push.repository.name).trim();
            if (vscgn_helpers.isObject(push.repository.owner)) {
                const USERNAME = vscgn_helpers.toStringSafe(push.repository.owner.username).trim();
                if ('' !== USERNAME) {
                    repository = USERNAME + 
                                 ('' !== repository ? '/' : '') + 
                                 repository;
                }
            }
        }

        let id = vscgn_helpers.toStringSafe(HEAD_COMMIT.hash).trim();
        let title = vscgn_helpers.toStringSafe(HEAD_COMMIT.message).trim();
        if (title.length > 48) {
            title = title.substr(0, 48).trim();
            if ('' !== title) {
                title = title + '...';
            }
        }

        if (id.length >= 7) {
            id = id.substr(0, 7).trim();
        }

        if ('' !== id) {
            if ('' === title) {
                title = id;
            }
            else {
                title = `${title} (${id})`;
            }
        }

        this.emitGitNotification({
            repository: repository,
            title: title,
            type: vscgn_contracts.GitNotificationType.Push,
            url: url,
        });
    }

    private async handleBitbucketRequest(fromBitbucket: BitbucketRequest,
                                         request: HTTP.IncomingMessage, response: HTTP.ServerResponse) {
        const EVENT = vscgn_helpers.normalizeString(request.headers['x-event-key']);
        
        if (EVENT.startsWith('issue:')) {
            await this.handleBitbucketIssueRequest(
                <BitbucketIssues>fromBitbucket,
                request, response,
            );
        }
        else if (EVENT.startsWith('pullrequest:')) {
            await this.handleBitbucketPullRequest(
                <BitbucketPullRequest>fromBitbucket,
                request, response,
            );
        }
        else if ('repo:push' === EVENT) {
            await this.handleBitbucketPush(
                <BitbucketPush>fromBitbucket,
                request, response,
            );
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

        let err: any;
        let bbReq: BitbucketRequest;
        try {
            bbReq = JSON.parse(BODY);
        }
        catch (e) {
            err = e;
        }

        if (vscgn_helpers.isObject<BitbucketRequest>(bbReq)) {
            await this.handleBitbucketRequest(bbReq,
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
        return 'Bitbucket';
    }
}
