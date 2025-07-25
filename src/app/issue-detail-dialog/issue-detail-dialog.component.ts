import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { IssueDetailDialogExpansionService } from '@src/app/issue-detail-dialog/issue-detail-dialog-expansion.service';
import { IssuesStoreService } from '@src/app/store/issues-store.service';
import { MilestoneStoreService } from '@src/app/store/milestone-store.service';
import { LabelStoreService } from '@src/app/store/label-store.service';
import { MemberStoreService } from '@src/app/store/member-store.service';
import { GitLabApiService } from '@src/app/git-lab-api/git-lab-api.service';
import { isUndefined } from '@src/app/utils/utils';
import { Issue } from '@src/app/model/issue.model';
import { Milestone } from '@src/app/model/milestone.model';
import { Label } from '@src/app/model/label.model';
import { Member } from '@src/app/model/member.model';
import { Note } from '@src/app/model/note.model';
import { Assertion } from '@src/app/utils/assertion';
import { catchError, of } from 'rxjs';

interface ChatMessage {
  id: number;
  author: string;
  content: string;
  timestamp: Date;
}

@Component({
  selector: 'app-issue-detail-dialog',
  standalone: false,
  templateUrl: './issue-detail-dialog.component.html',
  styleUrl: './issue-detail-dialog.component.scss',
})
export class IssueDetailDialogComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatMessagesContainer') chatMessagesElement?: ElementRef<HTMLDivElement>;

  issue: Issue | undefined;
  milestone: Milestone | undefined;
  
  // チャット機能のプロパティ
  chatMessages: ChatMessage[] = [];
  newMessage: string = '';
  private shouldScrollToBottom = false;
  isLoadingMessages = false;

  constructor(
    private readonly issueDetailDialogExpansionService: IssueDetailDialogExpansionService,
    private readonly issueStore: IssuesStoreService,
    private readonly milestoneStore: MilestoneStoreService,
    private readonly labelStore: LabelStoreService,
    private readonly memberStore: MemberStoreService,
    private readonly gitlabApi: GitLabApiService
  ) {}

  ngOnInit(): void {
    const issueId = this.issueDetailDialogExpansionService.getExpandedIssueId();

    if (isUndefined(issueId)) {
      Assertion.assert('issueId is undefined', Assertion.no(38));
      return;
    }

    this.issue = this.issueStore.issues.find((issue) => issue.id === issueId);

    // マイルストーンの情報を取得
    if (this.issue?.milestone_id) {
      this.milestone = this.milestoneStore.milestones.find(
        (milestone) => milestone.id === this.issue!.milestone_id
      );
    }

    // サーバーからチャットメッセージを取得
    this.loadChatMessages();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  /**
   * NoteをChatMessageに変換
   */
  private convertNoteToMessage(note: Note): ChatMessage {
    const author = this.memberStore.findMemberById(note.author_id);
    return {
      id: note.id,
      author: author ? author.name : '不明なユーザー',
      content: note.body,
      timestamp: note.created_at,
    };
  }

  /**
   * サーバーからチャットメッセージを読み込む
   */
  private loadChatMessages(): void {
    if (!this.issue) {
      return;
    }

    this.isLoadingMessages = true;

    // GitLab APIからNotesを取得
    this.gitlabApi.fetchIssueNotes(
      String(this.issue.project_id),
      this.issue.iid,
      0, // 最初のページ
      'asc' // 古い順にソート
    ).pipe(
      catchError((error) => {
        console.error('チャットメッセージの取得に失敗しました:', error);
        // エラー時はサンプルデータを表示
        return of({
          hasNextPage: false,
          data: []
        });
      })
    ).subscribe({
      next: (result) => {
        this.chatMessages = result.data.map(note => this.convertNoteToMessage(note));
        this.isLoadingMessages = false;
        this.shouldScrollToBottom = true;
      },
      error: (error) => {
        console.error('チャットメッセージの処理中にエラーが発生しました:', error);
        this.isLoadingMessages = false;
        // エラー時はサンプルメッセージを表示
        this.loadSampleMessages();
      }
    });
  }

  /**
   * サンプルメッセージを読み込む（エラー時のフォールバック）
   */
  private loadSampleMessages(): void {
    this.chatMessages = [
      {
        id: 1,
        author: 'サンプルユーザー',
        content: 'サーバーからのデータ取得に失敗しました。サンプルメッセージを表示中です。',
        timestamp: new Date(),
      },
    ];
  }

  /**
   * メッセージを送信
   */
  sendMessage(): void {
    if (!this.newMessage?.trim()) {
      return;
    }

    const newMessage: ChatMessage = {
      id: Date.now(), // 一時的なID
      author: '現在のユーザー', // TODO: 実際のユーザー名を取得
      content: this.newMessage.trim(),
      timestamp: new Date(),
    };

    this.chatMessages.push(newMessage);
    this.newMessage = '';
    this.shouldScrollToBottom = true;

    // TODO: GitLab APIに新しいNoteを送信
  }

  /**
   * メッセージ入力時のキーボードイベント処理
   */
  onMessageInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  /**
   * チャットエリアを最下部にスクロール
   */
  private scrollToBottom(): void {
    if (this.chatMessagesElement) {
      const element = this.chatMessagesElement.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

  /**
   * ngForのパフォーマンス最適化のためのtrackBy関数（メッセージ用）
   */
  trackByMessage(index: number, message: ChatMessage): number {
    return message.id;
  }

  /**
   * GitLabのIssue URLを取得
   */
  getIssueUrl(): string | null {
    return this.issue?.web_url || null;
  }

  /**
   * GitLabのIssue URLを新しいタブで開く
   */
  openIssueUrl(): void {
    if (isUndefined(this.issue)) {
      Assertion.assert(
        "issue' url is open before issue is defined.",
        Assertion.no(42)
      );
      return;
    }
    window.electronAPI.shell.openExternal(this.issue.web_url);
  }

  /**
   * ステータス名を取得
   */
  getStatusName(statusId: number | undefined): string {
    if (isUndefined(statusId)) {
      return '未設定';
    }
    const statusLabel = this.labelStore.findStatusLabel(statusId);
    return statusLabel ? statusLabel.name : '不明';
  }

  /**
   * 担当者名を取得
   */
  getAssigneeName(assigneeId: number | undefined): string {
    if (isUndefined(assigneeId)) {
      return '未設定';
    }
    const member = this.memberStore.findMemberById(assigneeId);
    return member ? member.name : '不明';
  }

  /**
   * カテゴリラベルを取得
   */
  getCategoryLabels(categoryIds: number[]): Label[] {
    return categoryIds
      .map((id) => this.labelStore.findCategoryLabel(id))
      .filter((label): label is Label => label !== undefined);
  }

  /**
   * リソースラベルを取得
   */
  getResourceLabels(resourceIds: number[]): Label[] {
    return resourceIds
      .map((id) => this.labelStore.findResourceLabel(id))
      .filter((label): label is Label => label !== undefined);
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
   * ngForのパフォーマンス最適化のためのtrackBy関数
   */
  trackByLabel(index: number, label: Label): number {
    return label.id;
  }
}
