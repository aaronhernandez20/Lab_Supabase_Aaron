import { Component, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupabaseService } from '../services/supabase.service';
import { Client } from '../models/client.model';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel,
  IonItemSliding, IonItemOptions, IonItemOption, IonIcon, IonButton, IonButtons,
  IonInput, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonToast
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { createOutline, trashOutline, logOutOutline, logInOutline, addOutline, imagesOutline } from 'ionicons/icons';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    ReactiveFormsModule, RouterLink, IonHeader, IonToolbar, IonTitle, IonContent,
    IonList, IonItem, IonLabel, IonItemSliding, IonItemOptions, IonItemOption,
    IonIcon, IonButton, IonButtons, IonInput, IonCard, IonCardContent,
    IonCardHeader, IonCardTitle, IonToast
  ],
})
export class HomePage {
  private supabaseService = inject(SupabaseService);
  private fb = inject(FormBuilder);

  // Señales (la app es zoneless: las señales refrescan la vista solas)
  clients = signal<Client[]>([]);
  editingClientId = signal<string | null>(null);
  toastMessage = signal('');
  isToastOpen = signal(false);
  showLogin = signal(false);   // tarjeta de login visible
  showForm = signal(false);    // formulario de cliente visible

  clientForm: FormGroup;
  loginForm: FormGroup;

  // Señales expuestas a la vista
  isAdmin = this.supabaseService.userRole;
  currentUser = this.supabaseService.currentUser;

  // Acción que el usuario quería hacer antes de que se le pidiera login
  private pendingAction: (() => void) | null = null;

  constructor() {
    addIcons({ createOutline, trashOutline, logOutOutline, logInOutline, addOutline, imagesOutline });

    this.clientForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      empresa: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]]
    });

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

    // La lista es pública: se carga al abrir y se recarga si cambia la sesión
    effect(() => {
      this.currentUser();
      untracked(() => this.loadClients());
    });
  }

  // ¿Se muestran las opciones de escritura? Sin sesión sí (para pedir login); con sesión solo admin
  canWrite(): boolean {
    return !this.currentUser() || this.isAdmin() === 'admin';
  }

  // --- LOGIN BAJO DEMANDA ---
  // Si no hay sesión, pide login y guarda la acción para ejecutarla después
  private requireLogin(action: () => void) {
    if (this.currentUser()) {
      action();
      return;
    }
    this.pendingAction = action;
    this.showLogin.set(true);
    this.showToast('Inicia sesión para modificar clientes');
  }

  async doLogin() {
    if (this.loginForm.invalid) return;
    try {
      const { email, password } = this.loginForm.value;
      await this.supabaseService.login(email, password);
      this.loginForm.reset();
      this.showLogin.set(false);

      if (this.isAdmin() !== 'admin') {
        this.pendingAction = null;
        this.showToast('Sesión iniciada, pero tu rol no permite modificar clientes');
        return;
      }
      this.pendingAction?.();
      this.pendingAction = null;
    } catch (e: any) {
      this.showToast('Error de login: ' + e.message);
    }
  }

  openLogin() {
    this.pendingAction = null;
    this.showLogin.set(true);
  }

  cancelLogin() {
    this.pendingAction = null;
    this.showLogin.set(false);
  }

  async doLogout() {
    await this.supabaseService.logout();
    this.resetForm();
  }

  // --- CRUD ---
  newClient() {
    this.requireLogin(() => {
      this.resetForm();
      this.showForm.set(true);
    });
  }

  async loadClients() {
    try {
      this.clients.set(await this.supabaseService.getClients());
    } catch (e: any) {
      this.showToast('Error cargando clientes: ' + e.message);
    }
  }

  async saveClient() {
    if (this.clientForm.invalid) return;

    try {
      const formValue = this.clientForm.value;
      const id = this.editingClientId();
      if (id) {
        await this.supabaseService.updateClient(id, formValue);
        this.showToast('Cliente actualizado');
      } else {
        await this.supabaseService.createClient(formValue);
        this.showToast('Cliente insertado');
      }
      this.resetForm();
      await this.loadClients();
    } catch (e: any) {
      this.showToast('Error de guardado (¿Eres admin?): ' + e.message);
    }
  }

  editClient(client: Client) {
    this.requireLogin(() => {
      this.editingClientId.set(client.id!);
      this.clientForm.patchValue({
        nombre: client.nombre,
        empresa: client.empresa,
        email: client.email
      });
      this.showForm.set(true);
    });
  }

  deleteClient(id: string) {
    this.requireLogin(async () => {
      try {
        await this.supabaseService.deleteClient(id);
        this.showToast('Cliente eliminado');
        await this.loadClients();
      } catch (e: any) {
        this.showToast('Error eliminando: ' + e.message);
      }
    });
  }

  resetForm() {
    this.clientForm.reset();
    this.editingClientId.set(null);
    this.showForm.set(false);
  }

  setToastOpen(isOpen: boolean) {
    this.isToastOpen.set(isOpen);
  }

  showToast(msg: string) {
    this.toastMessage.set(msg);
    this.isToastOpen.set(true);
  }
}
