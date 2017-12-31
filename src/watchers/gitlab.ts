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


interface GitLabPush extends GitLabRequestWithRepository {
    commits?: {
        id?: string;
        message?: string;
        timestamp?: string;
        url?: string;
    }[];
}

interface GitLabRequest {
    object_kind?: string;
}

interface GitLabRequestWithChanges extends GitLabRequest {
    changes?: {
        state?: {
            current?: string;
        };
    };
}

interface GitLabRequestWithObjectAttributes extends GitLabRequest {
    object_attributes?: { [name: string]: any };
}

interface GitLabRequestWithProject extends GitLabRequest {
    project?: {
        namespace?: string;
    };
}

interface GitLabRequestWithRepository extends GitLabRequest {
    repository?: {
        name?: string;
    };
}

interface GitLabIssue {
    iid?: number;
    title?: string;
}

interface GitLabIssues extends GitLabRequestWithChanges, GitLabRequestWithObjectAttributes, GitLabRequestWithProject, GitLabRequestWithRepository {
    issue?: GitLabIssue;
    object_kind?: string;
}

interface GitLabMergeRequests extends GitLabRequestWithChanges, GitLabRequestWithObjectAttributes, GitLabRequestWithProject, GitLabRequestWithRepository {
}

/**
 * Settings for a GitLab watcher.
 */
export interface GitLabWatcherSettings extends vscgn_watchers.WebhookWatcherSettings {
}


/**
 * A GitLab watcher.
 */
export class GitLabWatcher extends vscgn_watchers.GitWebhookWatcher<GitLabWatcherSettings> {
    private async handleGitLabIssues(issues: GitLabIssues,
                                     request: HTTP.IncomingMessage, response: HTTP.ServerResponse) {
        if (!vscgn_helpers.isObject(issues)) {
            return;
        }

        const GET_OBJ_ATTRIB = (key: string) => {
            if (issues.object_attributes) {
                return issues.object_attributes[key];
            }
        };

        let repository: string;
        if (vscgn_helpers.isObject(issues.repository)) {
            repository = issues.repository.name;
        }
        repository = vscgn_helpers.toStringSafe(repository).trim();

        if (vscgn_helpers.isObject(issues.project)) {
            const NS = vscgn_helpers.toStringSafe(issues.project.namespace).trim();
            if ('' !== NS) {
                repository = NS + 
                             ('' !== repository ? '/' : '') + 
                             repository;
            }
        }

        let nr: number = GET_OBJ_ATTRIB('iid');
        let notificationType: vscgn_contracts.GitNotificationType | false = false;
        let title: string = GET_OBJ_ATTRIB('title');
        let url: string = GET_OBJ_ATTRIB('url');

        const KIND = vscgn_helpers.normalizeString(issues.object_kind);
        switch (KIND) {
            case 'note':
                notificationType = vscgn_contracts.GitNotificationType.NewIssueComment;
                if (issues.issue) {
                    nr = issues.issue.iid;
                    title = issues.issue.title;
                }
                break;

            case 'issue':
                notificationType = vscgn_contracts.GitNotificationType.NewIssue;
                if (vscgn_helpers.isObject(issues.changes)) {
                    if (vscgn_helpers.isObject(issues.changes.state)) {
                        const CHANGE_STATE = vscgn_helpers.normalizeString(issues.changes.state.current);
                        switch (CHANGE_STATE) {
                            case 'closed':
                                notificationType = vscgn_contracts.GitNotificationType.ClosedIssue;
                                break;

                            case 'opened':
                                notificationType = vscgn_contracts.GitNotificationType.ReopenedIssue;
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

    private async handleGitLabMergeRequests(mergeRequests: GitLabMergeRequests,
                                            request: HTTP.IncomingMessage, response: HTTP.ServerResponse) {
        if (!vscgn_helpers.isObject(mergeRequests)) {
            return;
        }

        const GET_OBJ_ATTRIB = (key: string) => {
            if (mergeRequests.object_attributes) {
                return mergeRequests.object_attributes[key];
            }
        };

        let repository: string;
        if (vscgn_helpers.isObject(mergeRequests.repository)) {
            repository = mergeRequests.repository.name;
        }
        repository = vscgn_helpers.toStringSafe(repository).trim();

        if (vscgn_helpers.isObject(mergeRequests.project)) {
            const NS = vscgn_helpers.toStringSafe(mergeRequests.project.namespace).trim();
            if ('' !== NS) {
                repository = NS + 
                             ('' !== repository ? '/' : '') + 
                             repository;
            }
        }

        let nr: number = GET_OBJ_ATTRIB('iid');
        let notificationType: vscgn_contracts.GitNotificationType | false = false;
        let title: string = GET_OBJ_ATTRIB('title');
        let url: string = GET_OBJ_ATTRIB('url');

        const KIND = vscgn_helpers.normalizeString(mergeRequests.object_kind);
        switch (KIND) {
            case 'merge_request':
                notificationType = vscgn_contracts.GitNotificationType.NewPullRequest;
                if (vscgn_helpers.isObject(mergeRequests.changes)) {
                    if (vscgn_helpers.isObject(mergeRequests.changes.state)) {
                        const CHANGE_STATE = vscgn_helpers.normalizeString(mergeRequests.changes.state.current);
                        switch (CHANGE_STATE) {
                            case 'closed':
                                notificationType = vscgn_contracts.GitNotificationType.ClosedPullRequest;
                                break;

                            case 'opened':
                                notificationType = vscgn_contracts.GitNotificationType.ReopenedPullRequest;
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

    private async handleGitLabPush(push: GitLabPush,
                                   request: HTTP.IncomingMessage, response: HTTP.ServerResponse) {
        if (!vscgn_helpers.isObject(push)) {
            return;
        }

        const COMMITS = vscgn_helpers.asArray(push.commits).filter(c => {
            return vscgn_helpers.isObject(c);
        }).sort((x, y) => {
            return vscgn_helpers.compareValuesBy(y, x, c => {
                const TIMESTAMP = vscgn_helpers.toStringSafe(c.timestamp).trim();
                if ('' !== TIMESTAMP) {
                    const TIME = Moment(TIMESTAMP);
                    if (TIME.isValid()) {
                        return TIME.unix();
                    }
                }
            });
        });

        const HEAD_COMMIT = COMMITS[0];

        let repository: string;
        if (vscgn_helpers.isObject(push.repository)) {
            repository = push.repository.name;
        }

        let id = vscgn_helpers.toStringSafe(HEAD_COMMIT.id).trim();
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
            url: HEAD_COMMIT.url,
        });
    }

    private async handleGitLabRequest(fromGitLab: GitLabRequest,
                                      request: HTTP.IncomingMessage, response: HTTP.ServerResponse) {
        const GITLAB_EVENT = vscgn_helpers.normalizeString(request.headers['x-gitlab-event']);
        
        switch (GITLAB_EVENT) {
            case 'issue hook':
            case 'note hook':
                await this.handleGitLabIssues(<GitLabIssues>fromGitLab,
                                              request, response);
                break;

            case 'merge request hook':
                await this.handleGitLabMergeRequests(<GitLabMergeRequests>fromGitLab,
                                                     request, response);
                break;

            case 'push hook':
                await this.handleGitLabPush(<GitLabPush>fromGitLab,
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
            const MY_SECRET = vscgn_helpers.toStringSafe(this.settings.secret);
            const SECRET_FROM_GITEA = vscgn_helpers.toStringSafe(request.headers['x-gitlab-token']);

            if (SECRET_FROM_GITEA != MY_SECRET) {
                if (vscgn_helpers.isEmptyString(SECRET_FROM_GITEA)) {
                    response.writeHead(404, 'Not Found');
                    return;
                }
            }
        }
        
        let err: any;
        let gitLabReq: GitLabRequest;
        try {
            gitLabReq = JSON.parse(BODY);
        }
        catch (e) {
            err = e;
        }

        if (vscgn_helpers.isObject<GitLabRequest>(gitLabReq)) {
            await this.handleGitLabRequest(gitLabReq,
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
        return 'GitLab';
    }
}
