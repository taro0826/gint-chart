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
      labels: request.labels.join(','),
    };

    if (request.assigneeId) {
      body['assignee_id'] = request.assigneeId;
    }

    return this.gitLabApiService.post<GitLabApiIssue, any>(
      request.projectId,
      'issues' as any,
      body,
      convertJsonToIssue
    );
  }
} 