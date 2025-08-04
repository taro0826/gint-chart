import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppComponent } from '@src/app/app.component';
import { ChartAreaComponent } from '@src/app/chart-area/chart-area.component';
import { IssueRowComponent } from '@src/app/chart-area/issue-row/issue-row.component';
import { IssueColumnComponent } from '@src/app/chart-area/issue-column/issue-column.component';
import { IssueDetailDialogComponent } from '@src/app/issue-detail-dialog/issue-detail-dialog.component';
import { SwitchToggleComponent } from '@src/app/design/switch-toggle/switch-toggle.component';
import { ToastComponent } from '@src/app/toast/toast.component';
import { ToastHistoryDialogComponent } from '@src/app/toast-history-dialog/toast-history-dialog.component';
import { StatusSelectorDialogComponent } from '@src/app/status-selector-dialog/status-selector-dialog.component';
import { AssigneeSelectorDialogComponent } from '@src/app/assignee-selector-dialog/assignee-selector-dialog.component';
import { IssueIidPipe } from '@src/app/chart-area/issue-row/issue-iid.pipe';
import { IssueStatusNamePipe } from '@src/app/chart-area/issue-row/issue-status-name.pipe';
import { IssueAssigneeNamePipe } from '@src/app/chart-area/issue-row/issue-assignee-name.pipe';
import { SideActionPanelComponent } from '@src/app/side-action-panel/side-action-panel.component';
import { ViewSettingsDialogComponent } from '@src/app/view-settings-dialog/view-settings-dialog.component';
import { FilterSettingsDialogComponent } from '@src/app/filter-settings-dialog/filter-settings-dialog.component';
import { IssueCreateDialogComponent } from '@src/app/issue-create-dialog/issue-create-dialog.component';
import { ButtonComponent } from './design/button/button.component';

@NgModule({
  declarations: [
    AppComponent,
    ChartAreaComponent,
    IssueRowComponent,
    IssueColumnComponent,
    IssueDetailDialogComponent,
    ToastComponent,
    ToastHistoryDialogComponent,
    StatusSelectorDialogComponent,
    AssigneeSelectorDialogComponent,
    SideActionPanelComponent,
    ViewSettingsDialogComponent,
    FilterSettingsDialogComponent,
    IssueCreateDialogComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    CommonModule,
    DragDropModule,
    MatIconModule,
    MatCheckboxModule,
    SwitchToggleComponent,
    ButtonComponent,
    IssueIidPipe,
    IssueStatusNamePipe,
    IssueAssigneeNamePipe,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
