import { Injectable } from '@angular/core';
import { isNull } from '@src/app/utils/utils';
import { first, Observable } from 'rxjs';
import { Assertion } from '@src/app/utils/assertion';
import { UrlChainBuilder } from '@src/app/utils/url-chain-builder';
import { GitLabConfigStoreService } from '@src/app/store/git-lab-config-store.service';
import { GitLabApiNote } from './git-lab-note.model';
import { Note, convertJsonToNote } from '@src/app/model/note.model';

/**
 * XXX miyoshi
 * labelsとmemberは一回に100件ずつしか取得できない
 * さしあたりは大丈夫だが、ラベルの数が増えてきて、一度に取得できるに限界がきたときは、
 * リクエストパラメータの扱いを工夫することによって、この障害を乗り越えたい。
 */
// GitLab APIのエンドポイント
/**             イシュー    マイルストーン  プロジェクト   ラベル      メンバー  */
type EndPoint = 'issues' | 'milestones' | '' | 'labels' | 'members';

/**
 * ページネーションのAPIでデータを取得した結果
 */
export type PagenationResult<S> = {
  hasNextPage: boolean;
  data: S[];
};

const pagenationMax = 100;

const firstPage = 0;

@Injectable({
  providedIn: 'root',
})
export class GitLabApiService {
  private urlChainBuilder: UrlChainBuilder | null = null;

  constructor(private readonly gitlabConfig: GitLabConfigStoreService) {
    this.gitlabConfig.config$.subscribe((config) => {
      if (!isNull(config)) {
        this.initialize();
      }
    });
  }

  /**
   * 初期化する
   */
  initialize(): void {
    const host = this.gitlabConfig.config.url;

    if (host === '') {
      Assertion.assert('GitLab host is not configured', Assertion.no(12));
      return;
    }

    this.urlChainBuilder = new UrlChainBuilder(host);
  }

  /**
   * 任意のGitLab APIエンドポイントからデータを取得し、アプリ用の型に変換して返すObservableを返す
   * @note
   * @template T APIから取得する生データの型
   * @template S 変換後のアプリ用データ型
   * @param projectId プロジェクトID
   * @param endpoint プロジェクト配下のAPIエンドポイント（例: 'issues', 'merge_requests' など）
   * @param mapFn APIのレスポンスTをアプリ用型Sに変換する関数
   * @param page ページ数
   * @note GitLabのAPIではデータリストをページネーションで獲得する。一度に100件までしかとることができない。
   * @returns Observable<S[]> 変換後データの配列を流すObservable
   */
  fetch<T, S>(
    projectId: string,
    endpoint: EndPoint,
    mapFn: (data: T) => S | null,
    page: number = firstPage
  ): Observable<PagenationResult<S>> {
    if (isNull(this.urlChainBuilder)) {
      return new Observable<PagenationResult<S>>((subscriber) => {
        subscriber.error(new Error('GitLab host is not configured'));
      });
    }

    return this.urlChainBuilder
      .start()
      .addPath('api')
      .addPath('v4')
      .addPath('projects')
      .addPath(encodeURIComponent(projectId))
      .addPath(endpoint)
      .addPath(`?per_page=${pagenationMax}&page=${page}`)
      .addMethod('GET')
      .addPrivateToken(this.gitlabConfig.config.accessToken)
      .end()
      .pipe((data: T) => {
        let hasNextPage = true;
        const arr = Array.isArray(data) ? data.map(mapFn) : [mapFn(data)];
        if (arr.length < 100) {
          hasNextPage = false;
        }
        return {
          hasNextPage,
          data: arr.filter((item): item is S => !isNull(item)),
        };
      });
  }

  /**
   * 任意のGitLab APIエンドポイントからデータを取得し、アプリ用の型に変換して返すObservableを返す
   * @note
   * @template T APIから取得する生データの型
   * @template S 変換後のアプリ用データ型
   * @param projectId プロジェクトID
   * @param endpoint プロジェクト配下のAPIエンドポイント（例: 'issues', 'merge_requests' など）
   * @param mapFn APIのレスポンスTをアプリ用型Sに変換する関数
   * @param page ページ数
   * @note GitLabのAPIではデータリストをページネーションで獲得する。一度に100件までしかとることができない。
   * @returns Observable<{hasNextPage: boolean, data: S[]}> [次のページの有無]と[変換後データの配列S[]]を流すObservable
   */
  fetchGroup<T, S>(
    groupId: number,
    endpoint: EndPoint,
    mapFn: (data: T) => S | null,
    page: number = firstPage
  ): Observable<PagenationResult<S>> {
    if (isNull(this.urlChainBuilder)) {
      return new Observable<PagenationResult<S>>((subscriber) => {
        subscriber.error(new Error('GitLab host is not configured'));
      });
    }

    return this.urlChainBuilder
      .start()
      .addPath('api')
      .addPath('v4')
      .addPath('groups')
      .addPath(encodeURIComponent(String(groupId)))
      .addPath(endpoint)
      .addPath(`?per_page=${pagenationMax}&page=${page}`)
      .addMethod('GET')
      .addPrivateToken(this.gitlabConfig.config.accessToken)
      .end()
      .pipe((data: T) => {
        let hasNextPage = true;
        const arr = Array.isArray(data) ? data.map(mapFn) : [mapFn(data)];
        if (arr.length < 100) {
          hasNextPage = false;
        }
        return {
          hasNextPage,
          data: arr.filter((item): item is S => !isNull(item)),
        };
      });
  }

  /**
   * 任意のGitLab APIエンドポイントにデータを送信し、アプリ用の型に変換して返すObservableを返す
   * @note
   * @template T APIから取得する生データの型
   * @template S 変換後のアプリ用データ型
   * @param projectId プロジェクトID
   * @param endpoint プロジェクト配下のAPIエンドポイント（例: 'issues/1'）
   * @param body 送信するJSONデータ
   * @param mapFn APIのレスポンスTをアプリ用型Sに変換する関数
   * @returns Observable<S[]> 変換後データの配列を流すObservable
   */
  put<T, S>(
    projectId: string,
    endpoint: EndPoint,
    iid: number,
    body: Record<string, unknown> | null,
    mapFn: (data: T) => S | null
  ): Observable<S> {
    if (isNull(this.urlChainBuilder)) {
      return new Observable<S>((subscriber) => {
        subscriber.error(new Error('GitLab host is not configured'));
      });
    }

    return this.urlChainBuilder
      .start()
      .addPath('api')
      .addPath('v4')
      .addPath('projects')
      .addPath(encodeURIComponent(projectId))
      .addPath(endpoint)
      .addPath(encodeURIComponent(String(iid)))
      .addMethod('PUT')
      .addPrivateToken(this.gitlabConfig.config.accessToken)
      .addOption(body)
      .end()
      .pipe((data: T) => {
        const convertedData = mapFn(data);
        if (isNull(convertedData)) {
          throw new Error('Failed to convert GitLab API response to Issue');
        }
        return convertedData;
      });
  }

  /**
   * 指定されたissueのコメント（Notes）を取得する
   * @param projectId プロジェクトID
   * @param issueIid issueの内部ID
   * @param page ページ数（デフォルト: 0）
   * @param sort ソート順（デフォルト: 'asc' - 古い順、'desc' - 新しい順）
   * @param orderBy ソート基準（デフォルト: 'created_at'）
   * @returns Observable<PagenationResult<Note>> コメントのページネーション結果
   */
  fetchIssueNotes(
    projectId: string,
    issueIid: number,
    page: number = firstPage,
    sort: 'asc' | 'desc' = 'asc',
    orderBy: 'created_at' | 'updated_at' = 'created_at'
  ): Observable<PagenationResult<Note>> {
    if (isNull(this.urlChainBuilder)) {
      return new Observable<PagenationResult<Note>>((subscriber) => {
        subscriber.error(new Error('GitLab host is not configured'));
      });
    }

    return this.urlChainBuilder
      .start()
      .addPath('api')
      .addPath('v4')
      .addPath('projects')
      .addPath(encodeURIComponent(projectId))
      .addPath('issues')
      .addPath(encodeURIComponent(String(issueIid)))
      .addPath('notes')
      .addPath(`?per_page=${pagenationMax}&page=${page}&sort=${sort}&order_by=${orderBy}`)
      .addMethod('GET')
      .addPrivateToken(this.gitlabConfig.config.accessToken)
      .end()
      .pipe((data: GitLabApiNote[]) => {
        let hasNextPage = true;
        const notes = Array.isArray(data) ? data.map(convertJsonToNote) : [];
        if (notes.length < pagenationMax) {
          hasNextPage = false;
        }
        return {
          hasNextPage,
          data: notes.filter((note): note is Note => !isNull(note)),
        };
      });
  }

  /**
   * 指定されたissueにコメント（Note）を投稿する
   * @param projectId プロジェクトID
   * @param issueIid issueの内部ID
   * @param body コメント本文
   * @returns Observable<Note> 追加されたNote
   */
  postIssueNote(
    projectId: string,
    issueIid: number,
    body: string
  ): Observable<Note> {
    if (isNull(this.urlChainBuilder)) {
      return new Observable<Note>((subscriber) => {
        subscriber.error(new Error('GitLab host is not configured'));
      });
    }

    return this.urlChainBuilder
      .start()
      .addPath('api')
      .addPath('v4')
      .addPath('projects')
      .addPath(encodeURIComponent(projectId))
      .addPath('issues')
      .addPath(encodeURIComponent(String(issueIid)))
      .addPath('notes')
      .addMethod('POST')
      .addPrivateToken(this.gitlabConfig.config.accessToken)
      .addOption({ body })
      .end()
      .pipe((data: GitLabApiNote) => {
        const note = convertJsonToNote(data);
        if (isNull(note)) {
          throw new Error('Failed to convert GitLab API response to Note');
        }
        return note;
      });
  }
}
