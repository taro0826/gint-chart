import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  concatMap,
  expand,
  from,
  map,
  mergeMap,
  Observable,
  of,
  tap,
  toArray,
} from 'rxjs';
import {
  convertJsonToMilestone,
  Milestone,
} from '@src/app/model/milestone.model';
import { GitLabApiService } from '@src/app/git-lab-api/git-lab-api.service';
import { GitLabConfigStoreService } from '@src/app/store/git-lab-config-store.service';
import { SAMPLE_MILESTONES } from '@src/app/model/sample-milestone';
import { GitLabApiMilestone } from '@src/app/git-lab-api/git-lab-milestone.model';
import { isDebug } from '@src/app/debug';

@Injectable({
  providedIn: 'root',
})
export class MilestoneStoreService {
  private milestonesSubject = new BehaviorSubject<Milestone[]>([]);
  public milestones$: Observable<Milestone[]> =
    this.milestonesSubject.asObservable();

  constructor(
    private readonly gitlabApi: GitLabApiService,
    private readonly gitlabConfigStore: GitLabConfigStoreService
  ) {}

  /**
   * configにある全プロジェクトの全milestonesをAPIから取得し、ストアに反映する
   * @returns Observable<Milestone[]> 取得・反映後のmilestones配列を流すObservable
   */
  syncMilestones(): Observable<Milestone[]> {
    if (isDebug) {
      this.milestonesSubject.next(SAMPLE_MILESTONES);
      return from([SAMPLE_MILESTONES]);
    }
    const config = this.gitlabConfigStore.config;
    const projectIds = config.projectId || [];
    if (projectIds.length === 0) {
      this.milestonesSubject.next([]);
      return from([[]]);
    }
    return from(projectIds).pipe(
      mergeMap((projectId) => this.fetchMilestonesForProject(projectId)),
      toArray(),
      map((milestonesArr) => milestonesArr.flat()),
      tap((allMilestones) => this.milestonesSubject.next(allMilestones))
    );
  }

  /**
   * 現在保持しているmilestonesを取得
   */
  get milestones(): Milestone[] {
    return this.milestonesSubject.getValue();
  }

  /**
   * 指定されたプロジェクトの全milestonesをGitLab APIから取得します。
   *
   * @param projectId プロジェクトID
   * @returns Observable<Milestone[]> 取得したmilestones配列を流すObservable
   */
  private fetchMilestonesForProject(
    projectId: number
  ): Observable<Milestone[]> {
    let currentPage = 1;
    return this.gitlabApi.fetch<GitLabApiMilestone, Milestone>(
      String(projectId),
      'milestones',
      convertJsonToMilestone,
      currentPage
    )
    .pipe(
      expand((result) => {
        if (result.hasNextPage == false) {
          return of();
        }
        currentPage++;
        return this.gitlabApi.fetch<GitLabApiMilestone, Milestone>(
          String(projectId),
          'milestones',
          convertJsonToMilestone,
          currentPage
        )
      }),
      concatMap(result => result.data),
      toArray(),
      tap((milestones) => {
        this.milestonesSubject.next(milestones);
      })
    )
  }
}
