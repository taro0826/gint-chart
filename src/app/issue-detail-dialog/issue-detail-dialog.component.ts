import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, AfterViewInit } from '@angular/core';
import { IssueDetailDialogExpansionService } from '@src/app/issue-detail-dialog/issue-detail-dialog-expansion.service';
import { IssuesStoreService } from '@src/app/store/issues-store.service';
import { MilestoneStoreService } from '@src/app/store/milestone-store.service';
import { LabelStoreService } from '@src/app/store/label-store.service';
import { MemberStoreService } from '@src/app/store/member-store.service';
import { GitLabApiService } from '@src/app/git-lab-api/git-lab-api.service';
import { ToastService } from '@src/app/utils/toast.service';
import { isUndefined, isNull } from '@src/app/utils/utils';
import { Issue } from '@src/app/model/issue.model';
import { Milestone } from '@src/app/model/milestone.model';
import { Label } from '@src/app/model/label.model';
import { Note } from '@src/app/model/note.model';
import { Assertion } from '@src/app/utils/assertion';
import { catchError, of } from 'rxjs';
import { isDebug } from '../debug';
import { GoogleChatConfigService } from '../service/google-chat-config.service';

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
export class IssueDetailDialogComponent implements OnInit, OnDestroy, AfterViewChecked, AfterViewInit {
  @ViewChild('chatMessagesContainer') chatMessagesElement?: ElementRef<HTMLDivElement>;
  @ViewChild('messageInput') messageInputElement?: ElementRef<HTMLTextAreaElement>;

  issue: Issue | undefined;
  milestone: Milestone | undefined;
  
  // チャット機能のプロパティ
  chatMessages: ChatMessage[] = [];
  newMessage = '';
  private shouldScrollToBottom = false;
  private shouldResetTextarea = false;
  private initialTextareaHeight: string = '';
  isLoadingMessages = false;

  // ポーリング機能のプロパティ
  private commentPollingIntervalId: number | null = null;
  private readonly COMMENT_POLLING_INTERVAL = 60 * 1000; // 60秒間隔

  constructor(
    private readonly issueDetailDialogExpansionService: IssueDetailDialogExpansionService,
    private readonly issueStore: IssuesStoreService,
    private readonly milestoneStore: MilestoneStoreService,
    private readonly labelStore: LabelStoreService,
    private readonly memberStore: MemberStoreService,
    private readonly gitlabApi: GitLabApiService,
    private readonly toastService: ToastService,
    private readonly googleChatConfigService: GoogleChatConfigService,
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

    // コメントのポーリングを開始
    this.startCommentPolling();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
    
    if (this.shouldResetTextarea) {
      this.performTextareaReset();
      this.shouldResetTextarea = false;
    }
  }

  ngOnDestroy(): void {
    // コメントのポーリングを停止
    this.stopCommentPolling();
  }

  ngAfterViewInit(): void {
    // 初期状態のテキストエリアの高さを保存
    this.captureInitialTextareaHeight();
    this.onMessageInput();
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
   * サーバーからチャットメッセージを読み込む（全てのページから）
   */
  private loadChatMessages(): void {
    if (isDebug) {
      return;
    }

    if (isUndefined(this.issue)) {
      return;
    }

    this.isLoadingMessages = true;
    this.chatMessages = []; // 既存のメッセージをクリア

    // 全ページからNotesを再帰的に取得
    this.loadAllNotesRecursively(String(this.issue.project_id), this.issue.iid, 0);
  }

  /**
   * 全ページのNotesを再帰的に取得する
   * @param projectId プロジェクトID
   * @param issueIid IssueのIID
   * @param page 現在のページ番号
   */
  private loadAllNotesRecursively(projectId: string, issueIid: number, page: number): void {
    this.gitlabApi.fetchIssueNotes(
      projectId,
      issueIid,
      page,
      'asc' // 古い順にソート
    ).pipe(
      catchError((error) => {
        
        // API通信エラーのトーストを表示
        this.toastService.show(
          Assertion.no(101),
          `コメント取得でネットワークエラーが発生しました (ページ ${page})`,
          'error',
          5000
        );
        
        // エラー時は空のデータを返す
        return of({
          hasNextPage: false,
          data: []
        });
      })
    ).subscribe({
      next: (result) => {
        // 現在のページのメッセージを追加
        const newMessages = result.data.map(note => this.convertNoteToMessage(note));
        this.chatMessages = [...this.chatMessages, ...newMessages];

        // 次のページがある場合は再帰的に取得
        if (result.hasNextPage) {
          this.loadAllNotesRecursively(projectId, issueIid, page + 1);
        } else {
          // 全ページの取得が完了
          this.isLoadingMessages = false;
          this.shouldScrollToBottom = true;
          
          // 成功トーストを表示
          this.toastService.show(
            Assertion.no(99),
            `コメントを${this.chatMessages.length}件取得しました`,
            'success',
            3000
          );
        }
      },
      error: (error) => {
        this.isLoadingMessages = false;
        
        // エラートーストを表示
        this.toastService.show(
          Assertion.no(100),
          `コメントの取得に失敗しました (ページ ${page})`,
          'error',
          5000
        );
        
        // エラー時はサンプルメッセージを表示
        if (this.chatMessages.length === 0) {
          this.loadSampleMessages();
        }
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
   * コメントのポーリングを開始
   */
  private startCommentPolling(): void {
    if (isDebug) {
      return;
    }

    if (!isNull(this.commentPollingIntervalId)) {
      return; // 既にポーリング中
    }

    this.commentPollingIntervalId = window.setInterval(() => {
      // ポーリング中は自動更新（ローディング表示なし、新しいコメント・エラー時はトースト通知）
      this.loadChatMessagesQuietly();
    }, this.COMMENT_POLLING_INTERVAL);
  }

  /**
   * コメントのポーリングを停止
   */
  private stopCommentPolling(): void {
    if (isNull(this.commentPollingIntervalId)) {
      return;
    }
    window.clearInterval(this.commentPollingIntervalId);
    this.commentPollingIntervalId = null;
  }

  /**
   * サーバーからチャットメッセージを自動更新で読み込む（ポーリング用）
   * ローディング表示は行わず、新しいコメントがある場合とエラー時にトースト通知
   */
  private loadChatMessagesQuietly(): void {
    if (isUndefined(this.issue)) {
      return;
    }

    // 既存のメッセージ数を保存
    const previousMessageCount = this.chatMessages.length;

    // 一時的にメッセージをクリア
    const tempMessages: ChatMessage[] = [];

    // 全ページからNotesを再帰的に取得（自動更新）
    this.loadAllNotesRecursivelyQuietly(String(this.issue.project_id), this.issue.iid, 0, tempMessages, previousMessageCount);
  }

  /**
   * 全ページのNotesを再帰的に取得する（ポーリング用）
   * @param projectId プロジェクトID
   * @param issueIid IssueのIID
   * @param page 現在のページ番号
   * @param tempMessages 一時的なメッセージ配列
   * @param previousMessageCount 以前のメッセージ数
   */
  private loadAllNotesRecursivelyQuietly(
    projectId: string, 
    issueIid: number, 
    page: number, 
    tempMessages: ChatMessage[], 
    previousMessageCount: number
  ): void {
    this.gitlabApi.fetchIssueNotes(
      projectId,
      issueIid,
      page,
      'asc' // 古い順にソート
    ).pipe(
      catchError((error) => {
        
        // API通信エラーのトーストを表示
        this.toastService.show(
          Assertion.no(103),
          `コメント自動更新でネットワークエラーが発生しました (ページ ${page})`,
          'error',
          5000
        );
        
        // エラー時は空のデータを返す
        return of({
          hasNextPage: false,
          data: []
        });
      })
    ).subscribe({
      next: (result) => {
        // 現在のページのメッセージを追加
        const newMessages = result.data.map(note => this.convertNoteToMessage(note));
        tempMessages.push(...newMessages);

        // 次のページがある場合は再帰的に取得
        if (result.hasNextPage) {
          this.loadAllNotesRecursivelyQuietly(projectId, issueIid, page + 1, tempMessages, previousMessageCount);
        } else {
          // 全ページの取得が完了
          // 新しいメッセージがある場合のみ更新
          if (tempMessages.length > previousMessageCount) {
            const newMessageCount = tempMessages.length - previousMessageCount;
            this.chatMessages = tempMessages;
            this.shouldScrollToBottom = true;
            
            // 新しいコメントが追加されたことをトーストで通知
            this.toastService.show(
              Assertion.no(102),
              `新しいコメントが${newMessageCount}件追加されました`,
              'info',
              3000
            );
          }
        }
      },
      error: (error) => {
        
        // データ処理エラーのトーストを表示
        this.toastService.show(
          Assertion.no(104),
          `コメント自動更新の処理でエラーが発生しました (ページ ${page})`,
          'error',
          5000
        );
      }
    });
  }

  /**
   * メッセージを送信
   */
  sendMessage(): void {
    if (isDebug) {
      this.chatMessages.push({
        id: this.chatMessages.length + 1,
        author: 'デバッグユーザー',
        content: this.newMessage + ' (デバッグモード)',
        timestamp: new Date(),
      })
      this.shouldScrollToBottom = true;
      this.newMessage = '';
      // テキストエリアのサイズを初期サイズに戻す
      this.shouldResetTextarea = true;
      return;
    }

    if (this.newMessage.trim() === '') {
      return;
    }

    if (isUndefined(this.issue)) {
      return;
    }

    const messageBody = this.newMessage.trim();
    this.newMessage = '';
    this.shouldScrollToBottom = true;

    const space = this.googleChatConfigService.getConfig().find(space => space.projectId === this.issue!.project_id);
    if (!isUndefined(space)) {
      const mentionRequered = space.member.filter(item => messageBody.includes(`@${item.gitlabToken}`));
      if (mentionRequered.length > 0) {
        let text = messageBody;
        /** 
         * メンションがある場合
         * Google ChatのWebhookにメッセージを送る
         */
        mentionRequered.forEach(item => {
          text = text.replace(`@${item.gitlabToken}`, `<users/${item.googleChatUserId}>`);
        });

        /**
         * TODO 差出人（私）を記す
         */

        fetch(
          space.googleChatWebhookUrl,
          {
            method: 'POST',
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ text })
          }
        ).then(console.log);
      }
    }

    // GitLab APIに新しいNoteを送信
    this.gitlabApi.postIssueNote(String(this.issue.project_id), this.issue.iid, messageBody)
      .pipe(
        catchError((error) => {
          this.toastService.show(
            Assertion.no(106),
            'コメントの送信に失敗しました: ' + (error?.message || error),
            'error',
            5000
          );
          throw error;
        })
      )
      .subscribe({
        next: (note) => {
          this.toastService.show(
            Assertion.no(107),
            'コメントを送信しました',
            'success',
            2500
          );
          // テキストエリアのサイズを初期サイズに戻す
          this.shouldResetTextarea = true;
          // 送信後、最新のコメントを再取得
          this.loadChatMessages();
        },
        error: () => {
          // catchErrorで通知済み
        }
      });
  }

  onMessageInput(): void {
    if (isUndefined(this.messageInputElement)) {
      return;
    }
    const textarea = this.messageInputElement.nativeElement;
    textarea.style.height = 'auto';
    const maxHeight = 200;
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = newHeight + 'px';
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }

  /**
   * 初期状態のテキストエリアの高さを取得して保存
   */
  private captureInitialTextareaHeight(): void {
    if (isUndefined(this.messageInputElement)) {
      return;
    }
    
    const textarea = this.messageInputElement.nativeElement;
    // 初期状態（rows="1"、テキストなし）の高さを取得
    textarea.style.height = 'auto';
    this.initialTextareaHeight = getComputedStyle(textarea).height;
  }

  /**
   * テキストエリアを初期サイズにリセット（AfterViewChecked内で実行）
   */
  private performTextareaReset(): void {
    if (isUndefined(this.messageInputElement) || !this.initialTextareaHeight) {
      return;
    }
    
    const textarea = this.messageInputElement.nativeElement;
    // 保存しておいた初期高さに戻す
    textarea.style.height = 'auto';
    textarea.style.height = this.initialTextareaHeight;
    textarea.style.overflowY = 'hidden';
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
