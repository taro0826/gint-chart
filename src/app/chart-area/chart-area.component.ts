import {
  Component,
  Input,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  ChangeDetectorRef,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ProjectTreeStoreService } from '@src/app/store/project-tree-store.service';
import { IssuesStoreService } from '@src/app/store/issues-store.service';
import { ProjectTree } from '@src/app/model/project-tree.model';
import {
  calendarEndDateOffset,
  calendarStartDateOffset,
} from '@src/app/chart-area/chat-area-view.const';
import { DateHandler } from '@src/app/utils/time';
import {
  CalendarDisplayService,
  CalendarVerticalLine,
} from '@src/app/chart-area/calendar-vertical-line.service';
import { CalendarPositionService } from '@src/app/chart-area/calendar-position.service';
import { CalendarRangeService } from '@src/app/chart-area/calendar-range.service';
import { CalendarWidthService } from '@src/app/chart-area/calendar-width.service';
import { Subscription } from 'rxjs';
import { Project } from '@src/app/model/project.model';
import { Milestone } from '@src/app/model/milestone.model';
import { Issue } from '@src/app/model/issue.model';
import { IssuesUpdateService } from '@src/app/update/issues-update.service';
import { Assertion } from '@src/app/utils/assertion';
import { isDebug } from '@src/app/debug';
import { ToastService } from '@src/app/utils/toast.service';
import {
  TOAST_DURATION_MEDIUM,
  TOAST_DURATION_LONG,
} from '@src/app/toast/toast.const';
import { ViewService } from '@src/app/service/view.service';
import { IssueCreateDialogExpansionService } from '@src/app/issue-create-dialog/issue-create-dialog-expansion.service';

/**
 * チャート行のアイテムを表現するインターフェース
 */
export type ChartRowItem =
  | {
      type: 'project';
      data: Project;
      isCollapsed: boolean;
    }
  | {
      type: 'milestone';
      data: Milestone;
      isCollapsed: boolean;
      parentId: string;
    }
  | {
      type: 'issue';
      data: Issue;
      parentId: string;
    };

@Component({
  selector: 'app-chart-area',
  standalone: false,
  templateUrl: './chart-area.component.html',
  styleUrls: ['./chart-area.component.scss'],
  providers: [DatePipe],
})
export class ChartAreaComponent implements OnInit, AfterViewInit {
  /**
   * プロジェクトツリー
   */
  projectTrees: ProjectTree[] = [];

  /**
   * チャート行のアイテム（プロジェクト、マイルストーン、イシューを階層的に配置）
   */
  chartRowItems: ChartRowItem[] = [];

  /**
   * 折り畳み状態を管理するMap
   */
  private collapsedStates = new Map<string, boolean>();

  /**
   * カレンダーの縦線
   */
  calendarVerticalLines: CalendarVerticalLine[] = [];

  /**
   * スクロールバーの表示状態
   */
  isScrollBarActive = false;

  @ViewChild('issueRowArea') issueRowArea!: ElementRef;

  /**
   * 非同期処理の購読まとめ
   */
  private subscription = new Subscription();

  constructor(
    private readonly projectTreeStore: ProjectTreeStoreService,
    private readonly issuesStore: IssuesStoreService,
    private readonly calendarDisplayService: CalendarDisplayService,
    private readonly calendarPositionService: CalendarPositionService,
    private readonly calendarRangeService: CalendarRangeService,
    private readonly calendarWidthService: CalendarWidthService,
    private readonly issuesUpdateService: IssuesUpdateService,
    private readonly toastService: ToastService,
    private readonly cdr: ChangeDetectorRef,
    private readonly viewService: ViewService,
    private readonly issueCreateDialogExpansionService: IssueCreateDialogExpansionService
  ) {}

  ngOnInit(): void {
    // プロジェクトツリーの更新を監視
    this.subscription.add(
      this.projectTreeStore.projectTree$.subscribe((projectTrees) => {
        this.projectTrees = projectTrees;
        this.buildChartRowItems();
      })
    );

    // カレンダーの縦線を監視
    this.subscription.add(
      this.calendarDisplayService.calendarVerticalLines$.subscribe((lines) => {
        this.calendarVerticalLines = lines;

        /**
         * カレンダーの領域が更新された時に
         * すぐに描画に更新されないことがあったため
         * 強制的にChange Detectionを実行
         */
        this.cdr.detectChanges();
      })
    );

    this.calendarRangeService.setRange(
      DateHandler.getTodayOffsetDate(calendarStartDateOffset),
      DateHandler.getTodayOffsetDate(calendarEndDateOffset)
    );
  }

  /**
   * プロジェクトツリーからチャート行アイテムを構築
   */
  private buildChartRowItems(): void {
    this.chartRowItems = [];

    this.projectTrees.forEach((projectTree) => {
      const projectId = `project-${projectTree.project.id}`;
      const isProjectCollapsed = this.collapsedStates.get(projectId) || false;

      // プロジェクト行を追加
      this.chartRowItems.push({
        type: 'project',
        data: projectTree.project,
        isCollapsed: isProjectCollapsed,
      });

      // プロジェクトが折り畳まれていない場合のみ、マイルストーンとイシューを表示
      if (!isProjectCollapsed) {
        projectTree.milestones.forEach((milestoneTree) => {
          const milestoneId = `milestone-${milestoneTree.milestone.id}`;
          const isMilestoneCollapsed =
            this.collapsedStates.get(milestoneId) || false;

          // マイルストーン行を追加
          this.chartRowItems.push({
            type: 'milestone',
            data: milestoneTree.milestone,
            isCollapsed: isMilestoneCollapsed,
            parentId: projectId,
          });

          // マイルストーンが折り畳まれていない場合のみ、イシューを表示
          if (!isMilestoneCollapsed) {
            milestoneTree.issues.forEach((issue) => {
              this.chartRowItems.push({
                type: 'issue',
                data: issue,
                parentId: milestoneId,
              });
            });
          }
        });
      }
    });
  }

  /**
   * 折り畳みボタンのクリックイベントハンドラー
   */
  onToggleCollapse(item: ChartRowItem): void {
    if (item.type === 'project') {
      const projectId = `project-${item.data.id}`;
      const currentState = this.collapsedStates.get(projectId) || false;
      this.collapsedStates.set(projectId, !currentState);
    } else if (item.type === 'milestone') {
      const milestoneId = `milestone-${item.data.id}`;
      const currentState = this.collapsedStates.get(milestoneId) || false;
      this.collapsedStates.set(milestoneId, !currentState);
    }

    // チャート行アイテムを再構築
    this.buildChartRowItems();
  }

  /**
   * アイテムが折り畳まれているかどうかを判定
   */
  isItemCollapsed(item: ChartRowItem): boolean {
    if (item.type === 'project') {
      const projectId = `project-${item.data.id}`;
      return this.collapsedStates.get(projectId) || false;
    } else if (item.type === 'milestone') {
      const milestoneId = `milestone-${item.data.id}`;
      return this.collapsedStates.get(milestoneId) || false;
    }
    return false;
  }

  /**
   * アイテムの子要素数を取得
   */
  getChildCount(item: ChartRowItem): number {
    if (item.type === 'project') {
      const projectTree = this.projectTrees.find(
        (pt) => pt.project.id === item.data.id
      );
      if (projectTree) {
        return projectTree.milestones.length;
      }
    } else if (item.type === 'milestone') {
      const projectTree = this.projectTrees.find(
        (pt) =>
          pt.project.id === parseInt(item.parentId.replace('project-', ''))
      );
      if (projectTree) {
        const milestoneTree = projectTree.milestones.find(
          (mt) => mt.milestone.id === item.data.id
        );
        if (milestoneTree) {
          return milestoneTree.issues.length;
        }
      }
    }
    return 0;
  }

  ngAfterViewInit(): void {
    const element = this.issueRowArea.nativeElement;
    const checkScroll = () => {
      this.isScrollBarActive = element.scrollHeight > element.clientHeight;
    };

    // 初期チェック
    checkScroll();

    // リサイズイベントの監視
    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(element);
  }

  /**
   * 1日あたりの幅を取得
   */
  get dayPerWidth(): number {
    return (
      this.calendarWidthService.currentWidth /
      this.calendarRangeService.totalDays
    );
  }

  /**
   * カレンダーのオフセットを取得
   */
  get calendarOffset(): number {
    return this.calendarPositionService.currentOffset;
  }

  /**
   * 今日の強調表示が有効かどうか
   */
  get isHighlightedToday(): boolean {
    return this.viewService.isHighlightedToday;
  }

  /**
   * 祝日（土日）の強調表示が有効かどうか
   */
  get isHighlightedHoliday(): boolean {
    return this.viewService.isHighlightedHoliday;
  }

  /**
   * タイトルの幅を取得
   */
  get titleWidth() {
    // ViewServiceの設定を反映
    return this.viewService.isTitleShow ? this.viewService.titleWidth : 0;
  }

  /**
   * タイトルの幅を設定
   */
  set titleWidth(value: number) {
    // ViewServiceに設定を反映
    this.viewService.titleWidth = value;
  }

  /**
   * ステータスの幅を取得
   */
  get statusWidth() {
    // ViewServiceの設定を反映
    return this.viewService.isStatusShow ? this.viewService.statusWidth : 0;
  }

  /**
   * ステータスの幅を設定
   */
  set statusWidth(value: number) {
    // ViewServiceに設定を反映
    this.viewService.statusWidth = value;
  }

  /**
   * 担当者の幅を取得
   */
  get assigneeWidth() {
    // ViewServiceの設定を反映
    return this.viewService.isAssigneeShow ? this.viewService.assigneeWidth : 0;
  }

  /**
   * 担当者の幅を設定
   */
  set assigneeWidth(value: number) {
    // ViewServiceに設定を反映
    this.viewService.assigneeWidth = value;
  }

  /**
   * issueの開始日・終了日の変更の処理
   */
  onIssueScheduleChange(
    issue: Issue,
    schedule: { startDate: Date | undefined; endDate: Date | undefined }
  ): void {
    if (
      issue.start_date === schedule.startDate &&
      issue.end_date === schedule.endDate
    ) {
      return;
    }

    issue.start_date = schedule.startDate;
    issue.end_date = schedule.endDate;

    if (isDebug) {
      return;
    }

    this.issuesUpdateService.updateIssueDescription(issue).subscribe({
      next: (updatedIssue) => {
        if (updatedIssue) {
          this.issuesStore.updateIssue(updatedIssue);
        }
        this.toastService.show(
          Assertion.no(27),
          `Issue ${issue.iid} updated`,
          'success',
          TOAST_DURATION_MEDIUM
        );
      },
      error: (error) => {
        this.toastService.show(
          Assertion.no(21),
          `Failed to update issue on server: ${error}`,
          'error',
          TOAST_DURATION_LONG
        );
      },
    });
  }

  /**
   * issueのステータスの変更の処理
   */
  onIssueStatusChange(issue: Issue, status: number): void {
    if (issue.status === status) {
      return;
    }

    issue.status = status;
    if (isDebug) {
      return;
    }
    this.issuesUpdateService.updateIssueLabels(issue).subscribe({
      next: (updatedIssue) => {
        if (updatedIssue) {
          this.issuesStore.updateIssue(updatedIssue);
        }
        this.toastService.show(
          Assertion.no(27),
          `Issue ${issue.iid} updated`,
          'success',
          TOAST_DURATION_MEDIUM
        );
      },
      error: (error) => {
        this.toastService.show(
          Assertion.no(21),
          `Failed to update issue on server: ${error}`,
          'error',
          TOAST_DURATION_LONG
        );
      },
    });
  }

  /**
   * issueの担当者の変更の処理
   */
  onIssueAssigneeChange(issue: Issue, assigneeId: number): void {
    if (issue.assignee_id === assigneeId) {
      return;
    }

    issue.assignee_id = assigneeId;
    if (isDebug) {
      return;
    }
    this.issuesUpdateService.updateIssueAssignee(issue).subscribe({
      next: (updatedIssue) => {
        if (updatedIssue) {
          this.issuesStore.updateIssue(updatedIssue);
        }
        this.toastService.show(
          Assertion.no(27),
          `Issue ${issue.iid} updated`,
          'success',
          TOAST_DURATION_MEDIUM
        );
      },
      error: (error) => {
        this.toastService.show(
          Assertion.no(21),
          `Failed to update issue on server: ${error}`,
          'error',
          TOAST_DURATION_LONG
        );
      },
    });
  }

  /**
   * マイルストーン行のクリックイベントハンドラー
   */
  onMilestoneClick(milestone: Milestone): void {
    this.issueCreateDialogExpansionService.setExpandedMilestoneId(milestone.id);
  }
}
