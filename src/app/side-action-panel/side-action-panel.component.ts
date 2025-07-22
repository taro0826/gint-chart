import { Component } from '@angular/core';
import { DateJumpService } from '@src/app/service/date-jump.service';
import { ToastHistoryDialogExpansionService } from '@src/app/toast-history-dialog/toast-history-dialog-expansion.service';
import { Assertion } from '../utils/assertion';
import { TOAST_DURATION_LONG } from '@src/app/toast/toast.const';
import { ToastService } from '@src/app/utils/toast.service';
import { ThemeService } from '@src/app/utils/theme.service';
import { ViewSettingsDialogExpansionService } from '../view-settings-dialog/view-settings-dialog-expansion.service';
import { FilterSettingsDialogExpansionService } from '../filter-settings-dialog/filter-settings-dialog-expansion.service';
import { PollingService } from '../utils/polling.service';

@Component({
  selector: 'app-side-action-panel',
  standalone: false,
  templateUrl: './side-action-panel.component.html',
  styleUrls: ['./side-action-panel.component.scss'],
})
export class SideActionPanelComponent {
  constructor(
    private readonly dateJumpService: DateJumpService,
    private readonly toastHistoryDialogExpansionService: ToastHistoryDialogExpansionService,
    private readonly toastService: ToastService,
    private readonly themeService: ThemeService,
    private readonly viewSettingsDialogExpansionService: ViewSettingsDialogExpansionService,
    private readonly filterSettingsDialogExpansionService: FilterSettingsDialogExpansionService,
    private readonly pollingService: PollingService
  ) {}

  /**
   * パネルの展開状態
   */
  isExpanded = false;

  /**
   * 現在のテーマを取得
   */
  get currentTheme() {
    return this.themeService.getCurrentTheme();
  }

  /**
   * ポーリングが有効かどうかを取得
   */
  get isPollingEnabled() {
    return this.pollingService.isPollingEnabled;
  }

  /**
   * プルボタンをクリックして展開/収納を切り替え
   */
  onToggleExpansion(): void {
    this.isExpanded = !this.isExpanded;
  }

  /**
   * ビューの編集ページボタンクリック
   */
  onViewEditClick(): void {
    this.viewSettingsDialogExpansionService.expand();
    this.isExpanded = false;
  }

  /**
   * ログダイアログの展開ボタンクリック
   */
  onLogDialogClick(): void {
    this.toastHistoryDialogExpansionService.setExpanded(true);
    this.isExpanded = false;
  }

  /**
   * 今日の日付ジャンプボタンクリック
   */
  onJumpTodayClick(): void {
    this.dateJumpService.requestTodayJump();
    this.isExpanded = false;
  }

  /**
   * フィルターボタンクリック
   */
  onFilterClick(): void {
    this.filterSettingsDialogExpansionService.expand();
    this.isExpanded = false;
  }

  /**
   * ヘルプガイドページボタンクリック
   */
  onHelpGuideClick(): void {
    // TODO: ヘルプガイドページを表示
    this.toastService.show(
      Assertion.no(35),
      'ヘルプガイドページは現在開発中です。🤗',
      'info',
      TOAST_DURATION_LONG
    );
    this.isExpanded = false;
  }

  /**
   * 設定ボタンクリック
   */
  onSettingsClick(): void {
    // TODO: 設定ページを表示
    this.toastService.show(
      Assertion.no(38),
      '設定ページは現在開発中です。🤗',
      'info',
      TOAST_DURATION_LONG
    );
    this.isExpanded = false;
  }

  /**
   * オーバーレイクリックで閉じる
   */
  onOverlayClick(): void {
    this.isExpanded = false;
  }

  /**
   * テーマ切り替えボタンクリック
   */
  onThemeToggleClick(): void {
    this.themeService.toggleTheme();
    this.isExpanded = false;
  }

  /**
   * ポーリング切り替えボタンクリック
   */
  onPollingToggleClick(): void {
    this.pollingService.togglePolling();
    this.isExpanded = false;
  }
}
