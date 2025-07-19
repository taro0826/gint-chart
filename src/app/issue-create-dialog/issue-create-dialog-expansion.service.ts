import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class IssueCreateDialogExpansionService {
  private expandedMilestoneIdSubject = new BehaviorSubject<number | undefined>(
    undefined
  );
  public expandedMilestoneId$ = this.expandedMilestoneIdSubject.asObservable();

  /**
   * 展開中のマイルストーンIDを設定する
   */
  setExpandedMilestoneId(milestoneId: number | undefined) {
    this.expandedMilestoneIdSubject.next(milestoneId);
  }

  /**
   * 展開中のマイルストーンIDを取得する
   */
  getExpandedMilestoneId() {
    return this.expandedMilestoneIdSubject.getValue();
  }
} 