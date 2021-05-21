/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component, OnInit, OnDestroy, Inject } from '@angular/core';

import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';

import { clipboard, WebviewTag } from 'electron';

import * as chrome_launcher from 'chrome-launcher';

import { remote } from 'electron';
import { MenuItem } from 'primeng/api';

import { InspectablePage } from './inspectable-page.model';

// tslint:disable-next-line:max-line-length
// https://sandipchitale.github.io/gotomemberallfiles/devtools/front_end/inspector.html?experiments=true&ws=ws://localhost:9222/devtools/page/080B033BF6FC26E7270F3483FDDF5A62

const BUILTIN_URL_PREFIX = '.';

const DEVTOOLS_URL_SUFFIX = '?experiments=true&ws=';

const API_URL_PREFIX = 'https://developer.mozilla.org/en-US/search?q=';

interface Devtools {
  label: string,
  value: string,
  description?: string
}
@Component({
  selector: 'app-regexp-renamer',
  templateUrl: './devtools-app-ng.component.html',
  styleUrls: ['./devtools-app-ng.component.scss']
})
export class DevtoolsAppNGComponent implements OnInit, OnDestroy {
  version;

  tabs: MenuItem[];
  activeTab: MenuItem;
  // @ViewChild('tabsMenu') tabsMenu: MenuItem[];

  chromeHost = 'localhost';
  chromePort = 9222;

  inpsectablePages: InspectablePage[] = [];
  inpsectablePage: InspectablePage;

  devtoolsConnected = false;

  chromeLaunched = false;
  startingUrl = 'https://todomvc.com/examples/angularjs/#/';

  devtoolsURLs = [
    {
      label: 'Builtin',
      value: BUILTIN_URL_PREFIX,
      description: 'Chrome\'s builtin devtools.'
    },
    {
      label: 'Sandip\'s enhanced devtools with Go to member all files',
      value: 'https://sandipchitale.github.io/gotomemberallfiles/devtools/front_end/inspector.html',
      description: 'Devtools with ability to jump to members across all JavaScript files in Sources tab (Use: CTRL+SHIFT+8).'
    },
    {
      label: 'Sandip\'s forked Chrome devtools master branch',
      value: 'https://sandipchitale.github.io/devtools-frontend/front_end/inspector.html',
      description: 'Chrome\'s devtools from master branch.'
    }
  ];

  devtoolsURL: string | Devtools = this.devtoolsURLs[0];

  devtoolsURLArgs = DEVTOOLS_URL_SUFFIX;

  api = '';

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private http: HttpClient) {
    this.version = remote.app.getVersion();

    document.addEventListener('keydown', (e) => {
      if (e.which === 123) {
        this.toggleDevtools();
      }
    });

    this.tabs = [
      { id: 'devtools', label: 'Devtools' },
      { id: 'info', label: 'Info' },
      // { id: 'blog', label: 'Blog' },
      { id: 'github', label: 'Github'},
      { id: 'api', label: 'API'}
    ];
    this.activeTab = this.tabs[0];
  }

  ngOnInit() { }

  launchChrome() {
    chrome_launcher.launch({
      startingUrl: this.startingUrl
    }).then(chrome => {
      this.chromeLaunched = true;
      this.chromePort = chrome.port;
    });
  }

  killLaunchedChrome() {
    this.chromeLaunched = false;
    this.chromePort = 9222;
    chrome_launcher.killAll();
  }

  toggleDevtools() {
    if (remote.getCurrentWebContents().isDevToolsOpened()) {
      remote.getCurrentWebContents().closeDevTools();
    } else {
      remote.getCurrentWebContents().openDevTools({ mode: 'detach' });
    }
  }

  connect() {
    this.clear();
    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
    this.http.get<InspectablePage[]>('http://' + this.chromeHost + ':' + this.chromePort + '/json').subscribe(
      (inpsectablePages) => {
        this.inpsectablePages = inpsectablePages;
        if (this.inpsectablePages && this.inpsectablePages.length > 0) {
          this.inpsectablePage = this.inpsectablePages[0];
        }
      },
      () => {
        remote.dialog.showErrorBox('Remote Debugger Error','Cannot connecto to Chrome debugger.\n' +
                                    'Make sure to run Chrome with flags:\n' +
                                    '--remote-debugging-port=9222 --no-first-run --no-default-browser-check');
      }
    );
  }

  search() {

  }

  devttoolsTooltip(): string {
    if (!this.devtoolsURL || typeof this.devtoolsURL === 'string') {
      return '';
    } else {
      return this.devtoolsURL.description;
    }
  }

  launchDevtools(event) {
    this.devtoolsConnected = true;
    const devtoolsView: WebviewTag = document.querySelector('#devtools-view');
    let devtoolsURLPrefix: string;
    if (typeof this.devtoolsURL === 'string') {
      devtoolsURLPrefix = this.devtoolsURL;
    } else if (this.devtoolsURL.value === '.') {
      devtoolsURLPrefix = `http://${this.chromeHost}:${this.chromePort}/devtools/inspector.html`;
    } else {
      devtoolsURLPrefix = this.devtoolsURL.value;
    }
    devtoolsView.setAttribute('src',
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
                              devtoolsURLPrefix + DEVTOOLS_URL_SUFFIX + this.inpsectablePage.webSocketDebuggerUrl.substring(4));
    if (event.ctrlKey && event.shiftKey) {
      setTimeout(() => {
        devtoolsView.reloadIgnoringCache();
      }, 500);
    }
  }

  launchDevtoolsOnDevtools() {
    const devtoolsView: WebviewTag = document.querySelector('#devtools-view');
    devtoolsView.openDevTools();
  }

  copyDevtoolsURL() {
    let devtoolsURLPrefix: string;
    if (typeof this.devtoolsURL === 'string') {
      devtoolsURLPrefix = this.devtoolsURL;
    } else if (this.devtoolsURL.value === '.') {
      devtoolsURLPrefix = `http://${this.chromeHost}:${this.chromePort}/devtools/inspector.html`;
    } else {
      devtoolsURLPrefix = this.devtoolsURL.value;
    }
    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
    clipboard.writeText(devtoolsURLPrefix + DEVTOOLS_URL_SUFFIX + this.inpsectablePage.webSocketDebuggerUrl.substring(4));
  }

  undo() {
    this.devtoolsURL = BUILTIN_URL_PREFIX;
  }

  disconnect() {
    this.devtoolsConnected = false;
    document.querySelector('#devtools-view').setAttribute('src', 'about:blank');
  }

  clear() {
    this.inpsectablePages = [];
    this.inpsectablePage = undefined;
  }

  showApi() {
    if (this.api.trim().length > 0) {
      document.querySelector('#api-view').setAttribute('src', API_URL_PREFIX + this.api);
    }
  }

  isMaximized(): boolean {
    return remote.getCurrentWindow().isMaximized();
  }

  toggle() {
    if (remote.getCurrentWindow().isMaximized()) {
      remote.getCurrentWindow().restore();
    } else {
      remote.getCurrentWindow().maximize();
    }
  }

  quit() {
    remote.getCurrentWindow().close();
  }

  ngOnDestroy(): void {

  }
}
