import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { mergeMap, map, toArray, tap, expand, concatMap } from 'rxjs/operators';
import { GitLabApiService } from '@src/app/git-lab-api/git-lab-api.service';
import { Issue, convertJsonToIssue } from '@src/app/model/issue.model';
import { GitLabConfigStoreService } from '@src/app/store/git-lab-config-store.service';
import { LabelStoreService } from '@src/app/store/label-store.service';
import { SAMPLE_ISSUES } from '@src/app/model/sample-issues';
import { GitLabApiIssue } from '@src/app/git-lab-api/git-lab-issue.model';
import { isDebug } from '@src/app/debug';
import { IssueLabelProcessorService } from '@src/app/service/issue-label-processor.service';

@Injectable({
  providedIn: 'root',
})
export class IssuesStoreService {
  private issuesSubject = new BehaviorSubject<Issue[]>([]);
  public issues$: Observable<Issue[]> = this.issuesSubject.asObservable();

  constructor(
    private readonly gitlabApi: GitLabApiService,
    private readonly gitlabConfigStore: GitLabConfigStoreService,
    private readonly labelStore: LabelStoreService,
    private readonly issueLabelProcessor: IssueLabelProcessorService
  ) {}

  /**
   * configにある全プロジェクトの全issuesをAPIから取得し、ストアに反映する
   * @returns Observable<Issue[]> 取得・反映後のissues配列を流すObservable
   */
  syncIssues(): Observable<Issue[]> {
    if (isDebug) {
      // デバッグモード時はサンプルデータを返す
      const processedIssues =
        this.issueLabelProcessor.processIssuesLabels(SAMPLE_ISSUES);
      this.issuesSubject.next(processedIssues);
      return from([processedIssues]);
    }
    const config = this.gitlabConfigStore.config;
    const projectIds = config.projectId || [];
    if (projectIds.length === 0) {
      this.issuesSubject.next([]);
      return from([[]]);
    }

    // 各プロジェクトごとに全ページのissuesを取得
    return from(projectIds).pipe(
      mergeMap((projectId) => this.fetchIssuesForProject(projectId)),
      toArray(), // [[Issue], [Issue], ...] の配列に
      map((issuesArr) => issuesArr.flat()), // 1次元配列に
      map((issues) => this.issueLabelProcessor.processIssuesLabels(issues)), // ラベルを解析・処理
      tap((allIssues) => this.issuesSubject.next(allIssues))
    );
  }

  /**
   * 現在保持しているissuesを取得
   */
  get issues(): Issue[] {
    return this.issuesSubject.getValue();
  }

  /**
   * 単一のissueを更新してストアに反映する
   * @param updatedIssue 更新されたissue
   */
  updateIssue(updatedIssue: Issue): void {
    const currentIssues = this.issuesSubject.getValue();
    const index = currentIssues.findIndex(
      (issue) => issue.id === updatedIssue.id
    );


    if (index === -1) {
      const newIssues = [...currentIssues, updatedIssue];
      this.issuesSubject.next(newIssues);
    } else {
      // 新しい配列を作成して更新されたissueを配置
      const newIssues = [...currentIssues];
      newIssues[index] = updatedIssue;
      this.issuesSubject.next(newIssues);
    }
  }

  /**
   * 指定されたプロジェクトの全issuesをGitLab APIから取得します。
   *
   * @param project GitLabプロジェクト情報
   * @param accessToken アクセストークン
   * @returns Observable<Issue[]> 取得したissues配列を流すObservable
   */
  private fetchIssuesForProject(projectId: number): Observable<Issue[]> {
    let currentPage = 1;
    return this.gitlabApi.fetch<GitLabApiIssue, Issue>(
      String(projectId),
      'issues',
      convertJsonToIssue,
      currentPage
    )
    .pipe(
      expand((result) => {
        if (result.hasNextPage == false) {
          return of();
        }
        currentPage++;
        return this.gitlabApi.fetch<GitLabApiIssue, Issue>(
          String(projectId),
          'issues',
          convertJsonToIssue,
          currentPage
        )
      }),
      concatMap(result => result.data),
      toArray(),
      tap((issues) => {
        console.log(issues);
        this.issuesSubject.next(issues);
      })
    )
  }
}
