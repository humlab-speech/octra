import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VispTaskComponent } from './visp-task.component';

describe('VispTaskComponent', () => {
  let component: VispTaskComponent;
  let fixture: ComponentFixture<VispTaskComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VispTaskComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VispTaskComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
