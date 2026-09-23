import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { useClickOutside } from '../../helpers/use-click-outside';

@Component({
  selector: 'app-confirm-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './confirm-modal.html',
  styleUrl: './confirm-modal.css',
})
export class ConfirmModal {
  readonly heading = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Delete');
  readonly confirmed = output<void>();
  readonly closed = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private closedOnce = false;

  constructor() {
    useClickOutside(
      computed(() => this.dialog().nativeElement),
      () => this.cancel(),
    );
    afterNextRender(() => {
      this.dialog().nativeElement.showModal();
    });
  }

  protected confirm(): void {
    this.confirmed.emit();
    this.dialog().nativeElement.close();
  }

  protected cancel(): void {
    this.dialog().nativeElement.close();
  }

  protected onClose(): void {
    if (this.closedOnce) return;
    this.closedOnce = true;
    this.closed.emit();
  }
}
