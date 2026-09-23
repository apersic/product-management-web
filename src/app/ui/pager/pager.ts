import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { PAGE_SIZE, pageControls } from '../../catalog/catalog-page';

@Component({
  selector: 'app-pager',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pager.html',
  styleUrl: './pager.css',
})
export class Pager {
  readonly total = input.required<number>();
  readonly skip = input.required<number>();
  readonly pageSize = input(PAGE_SIZE);
  readonly previous = output<void>();
  readonly next = output<void>();
  readonly select = output<number>();

  protected readonly controls = computed(() =>
    pageControls(this.total(), this.pageSize(), this.skip()),
  );

  protected readonly hasPrevious = computed(() => this.skip() > 0);
  protected readonly hasNext = computed(() => this.skip() + this.pageSize() < this.total());
}
