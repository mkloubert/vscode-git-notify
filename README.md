# vscode-git-notify

[![Share via Facebook](https://raw.githubusercontent.com/mkloubert/vscode-git-notify/master/img/share/Facebook.png)](https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fmarketplace.visualstudio.com%2Fitems%3FitemName%3Dmkloubert.vscode-git-notify&quote=Git%20Notify) [![Share via Twitter](https://raw.githubusercontent.com/mkloubert/vscode-git-notify/master/img/share/Twitter.png)](https://twitter.com/intent/tweet?source=https%3A%2F%2Fmarketplace.visualstudio.com%2Fitems%3FitemName%3Dmkloubert.vscode-git-notify&text=Git%20Notify:%20https%3A%2F%2Fmarketplace.visualstudio.com%2Fitems%3FitemName%3Dmkloubert.vscode-git-notify&via=mjkloubert) [![Share via Google+](https://raw.githubusercontent.com/mkloubert/vscode-git-notify/master/img/share/Google+.png)](https://plus.google.com/share?url=https%3A%2F%2Fmarketplace.visualstudio.com%2Fitems%3FitemName%3Dmkloubert.vscode-git-notify) [![Share via Pinterest](https://raw.githubusercontent.com/mkloubert/vscode-git-notify/master/img/share/Pinterest.png)](http://pinterest.com/pin/create/button/?url=https%3A%2F%2Fmarketplace.visualstudio.com%2Fitems%3FitemName%3Dmkloubert.vscode-git-notify&description=Visual%20Studio%20Code%20extension%2C%20which%20receives%20and%20shows%20git%20events%20from%20webhooks.) [![Share via Reddit](https://raw.githubusercontent.com/mkloubert/vscode-git-notify/master/img/share/Reddit.png)](http://www.reddit.com/submit?url=https%3A%2F%2Fmarketplace.visualstudio.com%2Fitems%3FitemName%3Dmkloubert.vscode-git-notify&title=Git%20Notify) [![Share via LinkedIn](https://raw.githubusercontent.com/mkloubert/vscode-git-notify/master/img/share/LinkedIn.png)](http://www.linkedin.com/shareArticle?mini=true&url=https%3A%2F%2Fmarketplace.visualstudio.com%2Fitems%3FitemName%3Dmkloubert.vscode-git-notify&title=Git%20Notify&summary=Visual%20Studio%20Code%20extension%2C%20which%20receives%20and%20shows%20git%20events%20from%20webhooks.&source=https%3A%2F%2Fmarketplace.visualstudio.com%2Fitems%3FitemName%3Dmkloubert.vscode-git-notify) [![Share via Wordpress](https://raw.githubusercontent.com/mkloubert/vscode-git-notify/master/img/share/Wordpress.png)](http://wordpress.com/press-this.php?u=https%3A%2F%2Fmarketplace.visualstudio.com%2Fitems%3FitemName%3Dmkloubert.vscode-git-notify&quote=Git%20Notify&s=Visual%20Studio%20Code%20extension%2C%20which%20receives%20and%20shows%20git%20events%20from%20webhooks.) [![Share via Email](https://raw.githubusercontent.com/mkloubert/vscode-git-notify/master/img/share/Email.png)](mailto:?subject=Git%20Notify&body=Visual%20Studio%20Code%20extension%2C%20which%20receives%20and%20shows%20git%20events%20from%20webhooks.:%20https%3A%2F%2Fmarketplace.visualstudio.com%2Fitems%3FitemName%3Dmkloubert.vscode-git-notify)


[Visual Studio Code](https://code.visualstudio.com) extension, which receives and shows git events from webhooks.

## Table of contents

1. [Install](#install-)
2. [How to use](#how-to-use-)
   * [Settings](#settings-)
     * [GitHub](#github-)
     * [Gitea](#gitea-)
     * [GitLab](#gitlab-)
     * [Secure HTTP](#secure-http-)
3. [Support and contribute](#support-and-contribute-)

## Install [[&uarr;](#table-of-contents)]

Launch VS Code Quick Open (`Ctrl + P`), paste the following command, and press enter:

```bash
ext install vscode-git-notify
```

Or search for things like `vscode-git-notify` in your editor.

## How to use [[&uarr;](#table-of-contents)]

### Settings [[&uarr;](#how-to-use-)]

Open (or create) your `settings.json` in your `.vscode` subfolder of your workspace.

Add a `deploy.reloaded` section and one or more "watchers":

```json
{
    "git.notify": {
    }
}
```

The following providers and events are supported:

| Event | [GitHub](https://github.com) | [Gitea](https://gitea.io) | [GitLab](https://gitlab.com)
| ---- |:--:|:--:|:--:|
| Closed issues | X | | X |
| Closed pull requests | X | X | X |
| New issues | X | | X |
| New issue comments | X | | X |
| New pull requests | X | X | X |
| Re-opened issues | X | | X |
| Re-opened pull requests | X | X | X |

#### GitHub [[&uarr;](#settings-)]

First you have to create a webhook for your repository.

Click on the `Settings` tab and select `Webhooks` on the left side:

![Demo Select repo settings in Github](https://raw.githubusercontent.com/mkloubert/vscode-git-notify/master/img/github_webhooks_1.png)

Click on `Add webhook` button:

![Demo Add webhook button in Github](https://raw.githubusercontent.com/mkloubert/vscode-git-notify/master/img/github_webhooks_2.png)

Setup the URL, that should be called for an event. This URL must be able to redirect to your machine, where your VS Code instance runs. For that, you should check your firewall settings.

![Demo Create web hook in Github](https://raw.githubusercontent.com/mkloubert/vscode-git-notify/master/img/github_webhooks_3.png)

Now, you can define a watcher in your settings (it is recommended to do this globally - `CTRL + ,` / `CMD + ,`):

```json
{
    "git.notify": {
        "watchers": {
            "80": [
                {
                    "secret": "Test123"
                }
            ]
        }
    }
}
```

This will open a HTTP server instance on your machine on port `80` on startup, by using `Test123` as secret expression as defined in the webhooks settings.

#### Gitea [[&uarr;](#settings-)]

First you have to create a webhook for your repository.

Click on the `Settings` tab, select `Webhooks` sub-tab and click on `Add Webhook / Gitea`:

![Demo Select repo settings in Gitea](https://raw.githubusercontent.com/mkloubert/vscode-git-notify/master/img/gitea_webhooks_1.png)

Setup the URL, that should be called for an event. This URL must be able to redirect to your machine, where your VS Code instance runs. For that, you should check your firewall settings.

![Demo Create web hook in Gitea](https://raw.githubusercontent.com/mkloubert/vscode-git-notify/master/img/gitea_webhooks_2.png)

Now, you can define a watcher in your settings (it is recommended to do this globally - `CTRL + ,` / `CMD + ,`):

```json
{
    "git.notify": {
        "watchers": {
            "8080": [
                {
                    "provider": "gitea",

                    "secret": "Test123"
                }
            ]
        }
    }
}
```

This will open a HTTP server instance on your machine on port `8080` on startup, by using `Test123` as secret expression as defined in the webhooks settings.

#### GitLab [[&uarr;](#settings-)]

First you have to create a webhook for your repository.

Click on the `Settings` on the left side and click on `Integrations`:

![Demo Select repo settings in GitLab](https://raw.githubusercontent.com/mkloubert/vscode-git-notify/master/img/gitlab_webhooks_1.png)

Setup the URL, that should be called for an event. This URL must be able to redirect to your machine, where your VS Code instance runs. For that, you should check your firewall settings.

![Demo Create web hook in GitLab](https://raw.githubusercontent.com/mkloubert/vscode-git-notify/master/img/gitlab_webhooks_2.png)

```json
{
    "git.notify": {
        "watchers": {
            "5979": [
                {
                    "provider": "gitlab",

                    "secret": "Test123"
                }
            ]
        }
    }
}
```

This will open a HTTP server instance on your machine on port `5979` on startup, by using `Test123` as secret expression as defined in the webhooks settings.

#### Secure HTTP [[&uarr;](#settings-)]

It is highly recommended, to setup secure HTTPS instead of plain HTTP:

```json
{
    "git.notify": {
        "watchers": {
            "443": [
                {
                    "secure": true,

                    "ca": "/path/to/ssl/fullchain.pem",
                    "cert": "/path/to/ssl/cert.pem",
                    "key": "/path/to/ssl/privkey.pem",

                    "secret": "Test 1 2 3"
                }
            ]
        }
    }
}
```

You can also use relative paths for the SSL files, of course. Those paths are tried to be mapped in the following order:

* `${HOME_DIR}/.ssl`
* `${WORKSPACE}/.vscode` (works also with [multi workspaces](https://code.visualstudio.com/docs/editor/multi-root-workspaces))

If you use a self-signed certificate, you should disable SSL verification in your git provider / hoster.

In GitHub, e.g., you have to click on `Disable SSL verification` button, when adding a web hook:

![Demo Disable SSL verification in GitHub](https://raw.githubusercontent.com/mkloubert/github-webhook-test/master/img/github_webhooks_4.png)

## Support and contribute [[&uarr;](#table-of-contents)]

If you like the extension, you can support the project by sending a [donation via PayPal](https://paypal.me/MarcelKloubert) to [me](https://github.com/mkloubert).

To contribute, you can [open an issue](https://github.com/mkloubert/vscode-git-notify/issues) and/or fork this repository.

To work with the code:

* clone [this repository](https://github.com/mkloubert/vscode-git-notify)
* create and change to a new branch, like `git checkout -b my_new_feature`
* run `npm install` from your project folder
* open that project folder in Visual Studio Code
* now you can edit and debug there
* commit your changes to your new branch and sync it with your forked GitHub repo
* make a [pull request](https://github.com/mkloubert/vscode-git-notify/pulls)
