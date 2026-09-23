import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './ui/header/header';
import { ToastHost } from './ui/toast-host/toast-host';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, Header, ToastHost],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
