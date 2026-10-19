import { Component, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SupabaseService, StorageImage } from '../services/supabase.service';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonSpinner, IonToast
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';

@Component({
  selector: 'app-galeria',
  templateUrl: 'galeria.page.html',
  styleUrls: ['galeria.page.scss'],
  imports: [
    RouterLink, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonSpinner, IonToast
  ],
})
export class GaleriaPage {
  private supabaseService = inject(SupabaseService);

  images = signal<StorageImage[]>([]);
  loading = signal(true);
  toastMessage = signal('');
  isToastOpen = signal(false);

  constructor() {
    addIcons({ arrowBackOutline });
    effect(() => {
      untracked(() => this.loadImages());
    });
  }

  async loadImages() {
    this.loading.set(true);
    try {
      this.images.set(await this.supabaseService.getImages());
    } catch (e: any) {
      this.toastMessage.set('Error cargando imágenes: ' + e.message);
      this.isToastOpen.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  // Quita la extensión para usar el nombre como título de la card
  title(name: string): string {
    return name.replace(/\.[^.]+$/, '');
  }
}
