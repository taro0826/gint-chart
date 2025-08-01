import { Component, OnInit } from '@angular/core';
import { ViewService } from '@src/app/service/view.service';
import { LabelStoreService } from '@src/app/store/label-store.service';
import { MemberStoreService } from '@src/app/store/member-store.service';
import { Label } from '../model/label.model';
import { Subject, takeUntil } from 'rxjs';
import { isUndefined } from '../utils/utils';
import { generateRGBColorFromString } from '../utils/color-utils';

@Component({
  selector: 'app-filter-settings-dialog',
  standalone: false,
  templateUrl: './filter-settings-dialog.component.html',
  styleUrl: './filter-settings-dialog.component.scss',
})
export class FilterSettingsDialogComponent implements OnInit {
  constructor(
    private readonly viewService: ViewService,
    private readonly labelStoreService: LabelStoreService,
    private readonly memberStoreService: MemberStoreService
  ) {}

  ngOnInit(): void {
    this.labelStoreService.classifiedLabels$
      .pipe(takeUntil(this.destroy$))
      .subscribe((labelBox) => {
        this.statusLabels = labelBox.status;
      });
  }

  /**
   * ラベルフィルターの有効状態を取得
   */
  get isLabelFilterEnabled(): boolean {
    return this.viewService.isFilteredByLabel;
  }

  /**
   * 担当者フィルターの有効状態を取得
   */
  get isAssigneeFilterEnabled(): boolean {
    return this.viewService.isFilteredByAssignee;
  }

  /**
   * ステータスフィルターの有効状態を取得
   */
  get isStatusFilterEnabled(): boolean {
    return this.viewService.isFilteredByStatus;
  }

  /**
   * ステータスラベル群
   */
  statusLabels: Label[] = [];

  private destroy$ = new Subject<void>();

  /**
   * ラベルフィルターの切り替え
   */
  onLabelFilterChange(checked: boolean): void {
    this.viewService.isFilteredByLabel = checked;
  }

  /**
   * 担当者フィルターの切り替え
   */
  onAssigneeFilterChange(checked: boolean): void {
    this.viewService.isFilteredByAssignee = checked;
  }

  /**
   * そのメンバーを表示する/しないを返す
   * @param id メンバーID
   * @returns True: 表示するメンバーである, False: 表示しないメンバーである
   */
  isFilteredAssignee(id: number): boolean {
    return this.viewService.filteredAssigneeIDs.includes(id);
  }

  /**
   * メンバーの表示する/しないを更新する
   * @param id メンバーID
   */
  onAssigneeIsFilteredChange(id: number): void {
    if (this.viewService.filteredAssigneeIDs.includes(id)) {
      this.viewService.filteredAssigneeIDs =
        this.viewService.filteredAssigneeIDs.filter((item) => item !== id);
      return;
    }
    this.viewService.filteredAssigneeIDs = [
      ...this.viewService.filteredAssigneeIDs,
      id,
    ];
  }

  /**
   * ステータスフィルターの切り替え
   */
  onStatusFilterChange(checked: boolean): void {
    this.viewService.isFilteredByStatus = checked;
  }

  /**
   * そのステータスを表示する/しないを返す
   * @param id ラベルID
   * @returns True: 表示するステータスである, False: 表示しないステータスである
   */
  isFilteredStatus(id: number): boolean {
    return this.viewService.filteredStatusIDs.includes(id);
  }

  /**
   * ステータスの表示する/しないを更新する
   * @param id ラベルID
   */
  onStatusIsFilteredChange(id: number): void {
    if (this.viewService.filteredStatusIDs.includes(id)) {
      this.viewService.filteredStatusIDs =
        this.viewService.filteredStatusIDs.filter((item) => item !== id);
      return;
    }
    this.viewService.filteredStatusIDs = [
      ...this.viewService.filteredStatusIDs,
      id,
    ];
  }

  /**
   * ステータスカラーを返す
   * @param id ラベルID
   * @returns 色調
   */
  getStatusColor(id: number): string {
    if (id === -1) {
      return '#202020';
    }
    const label = this.labelStoreService.findStatusLabel(id);
    if (isUndefined(label)) {
      return '#202020';
    }
    return label.color;
  }

  getAssigneeColor(id: number): string {
    if (id === -1) {
      return '#202020';
    }
    const member = this.memberStoreService.findMemberById(id);
    if (isUndefined(member)) {
      return '#202020';
    }
    return generateRGBColorFromString(member.name);
  }

  /**
   * ラベルリストのObservableを取得
   */
  get labels$() {
    return this.labelStoreService.labels$;
  }

  /**
   * 担当者リストのObservableを取得
   */
  get members$() {
    return this.memberStoreService.members$;
  }

  wholeSelectAssigneeAction = (bool: boolean) => {
    if (bool) {
      // 全選択されている場合は、クリックすることで全部選択解除する
      this.viewService.filteredAssigneeIDs = [];
    } else {
      // 一つでも選択外がある場合は、クリックすることで全部選択する
      this.viewService.filteredAssigneeIDs = [
        ...this.memberStoreService.membersId,
        -1,
      ];
    }
  };

  get wholeSelectAssignee(): boolean {
    /**
     * すべての担当者が選択されているかどうか、選択の数から判断する
     * 総メンバー数＋1(未定義状態)ならば、すべて選択されていると判断する
     */
    return (
      this.viewService.filteredAssigneeIDs.length ===
      this.memberStoreService.membersId.length + 1
    );
  }

  wholeSelectStatusAction = (bool: boolean) => {
    if (bool) {
      // 全選択されている場合は、クリックすることで全部選択解除する
      this.viewService.filteredStatusIDs = [];
    } else {
      // 一つでも選択外がある場合は、クリックすることで全部選択する
      this.viewService.filteredStatusIDs = [
        ...this.labelStoreService.statusLabels.map((item) => item.id),
        -1,
      ];
    }
  };

  get wholeSelectStatus(): boolean {
    /**
     * すべてのステータスが選択されているかどうか、選択の数から判断する
     * 総ステータス数＋1(未定義状態)ならば、すべて選択されていると判断する
     */
    return (
      this.viewService.filteredStatusIDs.length ===
      this.labelStoreService.statusLabels.length + 1
    );
  }
}
