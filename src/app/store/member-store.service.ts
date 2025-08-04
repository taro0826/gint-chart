import { Injectable } from '@angular/core';
import { GitLabApiService } from '@src/app/git-lab-api/git-lab-api.service';
import {
  Member,
  convertGitLabMemberToMember,
} from '@src/app/model/member.model';
import { GitLabMember } from '@src/app/git-lab-api/git-lab-member.model';
import { BehaviorSubject, concatMap, expand, from, Observable, of, tap, toArray } from 'rxjs';
import { isDebug } from '@src/app/debug';
import { GitLabConfigStoreService } from '@src/app/store/git-lab-config-store.service';
import { isNull } from '@src/app/utils/utils';
import { SAMPLE_MEMBERS } from '@src/app/model/sample-members';

@Injectable({
  providedIn: 'root',
})
export class MemberStoreService {
  private membersSubject = new BehaviorSubject<Member[]>([]);
  public members$: Observable<Member[]> = this.membersSubject.asObservable();

  constructor(
    private readonly gitlabApi: GitLabApiService,
    private readonly gitlabConfigStore: GitLabConfigStoreService
  ) {}

  /**
   * グループメンバーを同期
   * @returns メンバーリストのObservable
   */
  syncMembers(): Observable<Member[]> {
    if (isDebug) {
      this.membersSubject.next(SAMPLE_MEMBERS);
      return from([SAMPLE_MEMBERS]);
    }

    const config = this.gitlabConfigStore.config;
    const groupId = config.groupId;
    if (isNull(groupId)) {
      this.membersSubject.next([]);
      return from([[]]);
    }

    let currentPage = 0;

    // グループメンバー取得
    return this.gitlabApi
      .fetchGroup<GitLabMember, Member>(
        groupId,
        'members',
        convertGitLabMemberToMember,
        currentPage
      )
      .pipe(
        expand((result) => {
          if (result.hasNextPage == false) {
            return of();
          }
          currentPage++;
          return this.gitlabApi.fetchGroup<GitLabMember, Member>(
            groupId,
            'members',
            convertGitLabMemberToMember,
            currentPage
          )
        }),
        concatMap(result => result.data),
        toArray(),
        tap((members) => {
          this.membersSubject.next(members);
        })
      );
  }

  /**
   * メンバーをIDから取得
   * @param id メンバーID
   * @returns メンバー
   */
  findMemberById(id: number): Member | undefined {
    const current = this.membersSubject.getValue();
    return current.find((member) => member.id === id);
  }

  /**
   * メンバーをユーザー名から取得
   * @param username ユーザー名
   * @returns メンバー
   */
  findMemberByUsername(username: string): Member | undefined {
    const current = this.membersSubject.getValue();
    return current.find((member) => member.username === username);
  }

  /**
   * メンバーを名前から取得
   * @param name 名前
   * @returns メンバー
   */
  findMemberByName(name: string): Member | undefined {
    const current = this.membersSubject.getValue();
    return current.find((member) => member.name === name);
  }

  /**
   * assignee_idからメンバー名を取得
   * @param assignee_id 担当者ID
   * @returns メンバー名
   */
  getMemberNameById(assignee_id: number): string | undefined {
    const current = this.membersSubject.getValue();
    const member = current.find((member) => member.id === assignee_id);
    return member ? member.name : undefined;
  }

  get membersId(): number[] {
    return this.membersSubject.getValue().map(item => item.id);
  }

  get members(): Member[] {
    return this.membersSubject.getValue();
  }
}
