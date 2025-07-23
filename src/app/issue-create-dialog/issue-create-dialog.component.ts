import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { IssueCreateDialogExpansionService } from '@src/app/issue-create-dialog/issue-create-dialog-expansion.service';
import { MilestoneStoreService } from '@src/app/store/milestone-store.service';
import { LabelStoreService } from '@src/app/store/label-store.service';
import { MemberStoreService } from '@src/app/store/member-store.service';
import { ProjectStoreService } from '@src/app/store/project-store.service';
import { ProjectTreeStoreService } from '@src/app/store/project-tree-store.service';
import { IssueCreateService } from '../update/issue-create.service';
import { ToastService } from '@src/app/utils/toast.service';
import { isUndefined } from '@src/app/utils/utils';
import { Milestone } from '@src/app/model/milestone.model';
import { Label } from '@src/app/model/label.model';
import { Member } from '@src/app/model/member.model';
import { Project } from '@src/app/model/project.model';
import { Assertion } from '@src/app/utils/assertion';

@Component({
  selector: 'app-issue-create-dialog',
  standalone: false,
  templateUrl: './issue-create-dialog.component.html',
  styleUrl: './issue-create-dialog.component.scss',
})
export class IssueCreateDialogComponent implements OnInit {
  // フォームデータ
  title = '';
  description = '';
  category: number[] = [];
  resource: number[] = [];

  milestone: Milestone | undefined;
  project: Project | undefined;
  isSubmitting = false;

  constructor(
    private readonly issueCreateDialogExpansionService: IssueCreateDialogExpansionService,
    private readonly milestoneStore: MilestoneStoreService,
    private readonly labelStore: LabelStoreService,
    private readonly memberStore: MemberStoreService,
    private readonly projectStore: ProjectStoreService,
    private readonly projectTreeStore: ProjectTreeStoreService,
    private readonly issueCreateService: IssueCreateService,
    private readonly toastService: ToastService
  ) {}

  ngOnInit(): void {
    const milestoneId = this.issueCreateDialogExpansionService.getExpandedMilestoneId();

    if (isUndefined(milestoneId)) {
      Assertion.assert('milestoneId is undefined', Assertion.no(38));
      return;
    }

    this.milestone = this.milestoneStore.milestones.find(
      (milestone) => milestone.id === milestoneId
    );

    if (this.milestone) {
      // マイルストーンからプロジェクト情報を取得
      this.projectTreeStore.projectTree$.subscribe(projectTrees => {
        const projectTree = projectTrees.find(tree =>
          tree.milestones.some(mt => mt.milestone.id === milestoneId)
        );
        if (projectTree) {
          this.project = projectTree.project;
        }
      });
    }
  }

  /**
   * カテゴリラベルを取得
   */
  getCategoryLabels(): Label[] {
    return this.labelStore.categoryLabels;
  }

  /**
   * リソースラベルを取得
   */
  getResourceLabels(): Label[] {
    return this.labelStore.resourceLabels;
  }

  /**
   * 背景色に応じたコントラスト色を計算
   */
  getContrastColor(backgroundColor: string): string {
    // 16進数カラーコードをRGBに変換
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // 輝度を計算
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // 輝度に基づいて白または黒を返す
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }

  /**
   * カテゴリラベルの選択状態を切り替え
   */
  toggleCategoryLabel(labelId: number): void {
    const index = this.category.indexOf(labelId);
    
    if (index > -1) {
      this.category.splice(index, 1);
    } else {
      this.category.push(labelId);
    }
  }

  /**
   * リソースラベルの選択状態を切り替え
   */
  toggleResourceLabel(labelId: number): void {
    const index = this.resource.indexOf(labelId);
    
    if (index > -1) {
      this.resource.splice(index, 1);
    } else {
      this.resource.push(labelId);
    }
  }

  /**
   * ラベルが選択されているかどうかを判定
   */
  isLabelSelected(labelId: number, type: 'category' | 'resource'): boolean {
    const labels = type === 'category' ? this.category : this.resource;
    return labels.includes(labelId);
  }

  /**
   * ngForのパフォーマンス最適化のためのtrackBy関数
   */
  trackByLabel(index: number, label: Label): number {
    return label.id;
  }

  /**
   * フォームのバリデーション
   */
  isFormValid(): boolean {
    return this.title.trim().length > 0 && this.title.trim().length <= 255;
  }

  /**
   * フォームを送信
   */
  onSubmit(): void {
    if (!this.isFormValid() || !this.milestone || !this.project) {
      return;
    }

    this.isSubmitting = true;

    // ラベル配列を構築
    const labels: string[] = [];
    
    // カテゴリラベル
    this.category.forEach((categoryId: number) => {
      const categoryLabel = this.labelStore.findCategoryLabel(categoryId);
      if (categoryLabel) {
        labels.push(categoryLabel.name);
      }
    });
    
    // リソースラベル
    this.resource.forEach((resourceId: number) => {
      const resourceLabel = this.labelStore.findResourceLabel(resourceId);
      if (resourceLabel) {
        labels.push(resourceLabel.name);
      }
    });

    this.issueCreateService.createIssue({
      projectId: this.project.id.toString(),
      title: this.title.trim(),
      description: this.description || '',
      milestoneId: this.milestone.id,
      assigneeId: undefined,
      labels: labels,
    }).pipe(
      finalize(() => {
        this.isSubmitting = false;
      })
    ).subscribe({
      next: () => {
        this.toastService.show(
          Assertion.no(100),
          'Issueが正常に作成されました',
          'success',
          3000
        );

        // ダイアログを閉じる
        this.issueCreateDialogExpansionService.setExpandedMilestoneId(undefined);
      },
      error: (error) => {
        console.error('Issue作成エラー:', error);
        this.toastService.show(
          Assertion.no(101),
          'Issueの作成に失敗しました',
          'error',
          5000
        );
      }
    });
  }

  /**
   * キャンセルボタンのクリック
   */
  onCancel(): void {
    this.issueCreateDialogExpansionService.setExpandedMilestoneId(undefined);
  }
} 