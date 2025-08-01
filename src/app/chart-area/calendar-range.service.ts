import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { DateHandler } from '@src/app/utils/time';
import { DateJumpService } from '@src/app/service/date-jump.service';

export interface CalendarRange {
  startDate: Date;
  endDate: Date;
}

/**
 * カレンダーの表示範囲を管理する
 */
@Injectable({
  providedIn: 'root',
})
export class CalendarRangeService {
  constructor(private readonly dateJumpService: DateJumpService) {
    this.dateJumpService.jumpRequest$.subscribe((date) => {
      const halfRange = Math.floor(this.totalDays / 2);
      const startDate = new Date(date);
      startDate.setDate(startDate.getDate() - halfRange);

      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + halfRange);

      this.setRange(startDate, endDate);
    });
  }

  private readonly _calendarRange = new BehaviorSubject<CalendarRange>({
    startDate: DateHandler.setTimeTo9(new Date()),
    endDate: DateHandler.setTimeTo9(new Date()),
  });

  /**
   * ATTENTION:
   * - 総日数の計算では意外とインスタンス化が多いため、
   * - カレンダーの範囲の決定とともに総日数も算出し、いつでも参照できるようにする。
   * - 総日数の管理を怠ると、カレンダーの範囲と総日数が泣き別れて、ロジックが破綻する可能性がある。
   *
   * RULE:
   * 基本的にはsetRange()を使用して、直接的に_calendarRangeや_totalDaysを更新しないこと。
   */
  private _totalDays = 1;

  public readonly calendarRange$: Observable<CalendarRange> =
    this._calendarRange.asObservable();

  /**
   * 現在のカレンダー範囲を取得
   */
  get currentRange(): CalendarRange {
    return this._calendarRange.value;
  }

  /**
   * 範囲内の日数を取得
   */
  get totalDays(): number {
    return this._totalDays;
  }

  /**
   * カレンダー範囲を設定
   */
  setRange(startDate: Date, endDate: Date): void {
    this._totalDays = DateHandler.countDateBetween(startDate, endDate);
    this._calendarRange.next({
      startDate: startDate,
      endDate: endDate,
    });
  }

  /**
   * 開始日を設定
   */
  setStartDate(startDate: Date): void {
    const currentRange = this._calendarRange.value;
    this.setRange(startDate, currentRange.endDate);
  }

  /**
   * 終了日を設定
   */
  setEndDate(endDate: Date): void {
    const currentRange = this._calendarRange.value;
    this.setRange(currentRange.startDate, endDate);
  }

  /**
   * 今月の範囲を設定
   */
  setCurrentMonth(): void {
    const startDate = DateHandler.setTimeTo9(new Date());
    startDate.setDate(1);

    const endDate = DateHandler.setTimeTo9(new Date());
    endDate.setDate(0);

    this.setRange(startDate, endDate);
  }

  /**
   * 指定された月の範囲を設定
   */
  setMonth(year: number, month: number): void {
    const startDate = DateHandler.setTimeTo9(new Date(year, month - 1, 1));
    const endDate = DateHandler.setTimeTo9(new Date(year, month, 0));
    this.setRange(startDate, endDate);
  }

  /**
   * 指定された日付が範囲内かどうかをチェック
   */
  isDateInRange(date: Date): boolean {
    const { startDate, endDate } = this._calendarRange.value;
    return startDate <= date && date <= endDate;
  }
}
