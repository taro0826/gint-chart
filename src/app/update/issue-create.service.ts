import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GitLabApiService } from '@src/app/git-lab-api/git-lab-api.service';
import { convertJsonToIssue } from '@src/app/model/issue.model';
import { GitLabApiIssue } from '@src/app/git-lab-api/git-lab-issue.model';

export interface CreateIssueRequest {
  projectId: string;
  title: string;
  description: string;
  milestoneId: number;
  assigneeId?: number;
  labels: string[];
}

@Injectable({
  providedIn: 'root',
})
export class IssueCreateService {
  constructor(private readonly gitLabApiService: GitLabApiService) {}

  /**
   * 新しいIssueを作成する
   */
  createIssue(request: CreateIssueRequest): Observable<any> {
    const body: Record<string, unknown> = {
      title: request.title,
      description: request.description,
      milestone_id: request.milestoneId,
    };

    // ラベルが存在する場合のみ追加
    if (request.labels && request.labels.length > 0) {
      body['labels'] = request.labels.join(',');
    }

    // 担当者が指定されている場合、assignee_idsとして配列で送信
    if (request.assigneeId) {
      body['assignee_ids'] = [request.assigneeId];
    }

    return this.gitLabApiService.post<GitLabApiIssue, any>(
      request.projectId,
      'issues' as any,
      body,
      convertJsonToIssue
    );
  }
} 