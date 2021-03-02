/**
 * @packageDocumentation
 * @module Tarkov
 */

import got, { Got } from 'got';
import * as pako from 'pako';
import { ExtendOptions, NormalOptions } from '../types/api';
import { singleton } from "tsyringe";

@singleton()
export class Api {
  public prod: Got;
  public launcherProd: Got;
  public launcher: Got;
  public trading: Got;
  public ragfair: Got;

  public launcherVersion = '10.4.4.123';
  public gameVersion = '0.12.9.10988';
  public unityVersion = '2018.4.28f1';
  public backendVersion = '6';

  private request = 0;

  public session = {
    queued: false,
    session: '',
  };

  private defaultOptions: ExtendOptions = {
    encoding: undefined,
    decompress: true,
    responseType: 'buffer',
    hooks: {
      beforeRequest: [
        (options: NormalOptions) => {
          delete options.headers['user-agent'];
          delete options.headers['content-type'];
          options.headers['Content-Type'] = 'application/json';
          options.bsgSession ? options.headers['Cookie'] = `PHPSESSID=${this.session.session}` : null;
          options.bsgAgent ? options.headers['User-Agent'] = `BSG Launcher ${this.launcherVersion}` : null;
          options.unityAgent ? options.headers['User-Agent'] = `UnityPlayer/${this.unityVersion} (UnityWebRequest/1.0, libcurl/7.52.0-DEV)` : null;
          options.unityAgent ? options.headers['X-Unity-Version'] = this.unityVersion : null;
          options.appVersion ? options.headers['App-Version'] = `EFT Client ${this.gameVersion}` : null;
          options.requestId ? options.headers['GClient-RequestId'] = `${this.request++}` : null;
        },
      ],
      afterResponse: [
        (response: any, retry: any) => {
          response = {
            ...response,
            body: JSON.parse(pako.inflate(response.body, { to: 'string' })),
          };

          if (response.body.err !== 0) {
            throw response.body;
          };

          return response;
        }
      ]
    },
    unityAgent: true,
    appVersion: true,
    requestId: true,
    bsgSession: true,
  };

  constructor() {
    this.prod = got.extend({
      prefixUrl: 'https://prod.escapefromtarkov.com',
      ...this.defaultOptions,
    });

    this.launcherProd = got.extend({
      prefixUrl: 'https://prod.escapefromtarkov.com',
      bsgAgent: true,
      unityAgent: false,
      appVersion: false,
      requestId: false,
      bsgSession: false,
      ...this.defaultOptions,
    });

    this.launcher = got.extend({
      prefixUrl: 'https://launcher.escapefromtarkov.com',
      bsgAgent: true,
      unityAgent: false,
      appVersion: false,
      requestId: false,
      bsgSession: false,
      ...this.defaultOptions,
    });

    this.trading = got.extend({
      prefixUrl: 'https://trading.escapefromtarkov.com',
      ...this.defaultOptions,
    });

    this.ragfair = got.extend({
      prefixUrl: 'https://ragfair.escapefromtarkov.com',
      ...this.defaultOptions,
    });

    // Load the latest launcher version
    this.getLauncherVersion();
    this.getGameVersion();
  }

  /**
   * Loads the latest launcher version into memory
   */
  private async getLauncherVersion() {
    this.launcher.post('launcher/GetLauncherDistrib')
      .then((result: any) => {
        const { Version } = result.body.data;

        if (this.launcherVersion !== Version) {
          console.log(`Updated launcher version from ${this.launcherVersion} to ${Version}`);
          this.launcherVersion = Version;
        }
      }, error => {
        throw error;
      });
  }

  private async getGameVersion() {
    this.launcher.post('launcher/GetPatchList', {
      searchParams: {
        launcherVersion: this.launcherVersion,
        branch: 'live',
      },
    })
      .then((result: any) => {
        const { Version } = result.body.data[0];

        if (this.gameVersion !== Version) {
          console.log(`Updated game version from ${this.gameVersion} to ${Version}`);
          this.gameVersion = Version;
        }
      }, error => {
        throw error;
      });
  }
}