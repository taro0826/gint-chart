import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewSettingsComponent } from './view-settings-dialog.component';

describe('ViewSettingsComponent', () => {
  let component: ViewSettingsComponent;
  let fixture: ComponentFixture<ViewSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewSettingsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ViewSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
