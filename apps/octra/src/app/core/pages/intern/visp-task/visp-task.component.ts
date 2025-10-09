import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AppStorageService } from '../../../shared/service/appstorage.service';
import { OctraAPIService } from '@octra/ngx-octra-api';
import { ProjectDto, ProjectRoleDto, ProjectDtoStatistics, ProjectDtoStatusStatistics, ProjectDtoTasksStatistics } from '@octra/api-types';
import { Action, Store } from '@ngrx/store';
import { APIActions } from '../../../store/api';
import { AccountLoginMethod } from '@octra/api-types';
import { AuthenticationStoreService } from '../../../store/authentication';
import { RootState, LoginMode } from '../../../store';
import { ApplicationStoreService } from '../../../store/application/application-store.service';
import { combineLatest, filter, take } from 'rxjs';

@Component({
  selector: 'octra-visp-task',
  imports: [CommonModule],
  templateUrl: './visp-task.component.html',
  styleUrl: './visp-task.component.scss',
})
export class VispTaskComponent implements OnInit {

  constructor(
    private route: ActivatedRoute,
    private apiService: OctraAPIService,
    private appStorage: AppStorageService,
    private router: Router,
    private store: Store<RootState>,
    private authStoreService: AuthenticationStoreService,
    private appStoreService: ApplicationStoreService
  ) {}

  ngOnInit(): void {
    this.startTask();
  }

  startTask() {
    console.log('Starting VISP task...');
    const projectId = this.route.snapshot.paramMap.get('projectId');

    if (!projectId) {
      console.error('No project ID provided');
      return;
    }

    // Check current authentication and application state
    combineLatest([
      this.authStoreService.authenticated$,
      this.store.select(state => state.application.mode),
      this.store.select(state => state.application.loggedIn)
    ]).pipe(
      take(1)
    ).subscribe(([authenticated, appMode, loggedIn]) => {
      console.log('Current state:', { authenticated, appMode, loggedIn });

      if (authenticated && appMode === LoginMode.ONLINE && loggedIn) {
        // User is already authenticated and in online mode
        console.log('User already authenticated, starting annotation directly');
        this.fetchProjectAndStartAnnotation(projectId);
      } else {
        // User needs to be authenticated first
        console.log('User not authenticated or not in online mode, logging in first');
        this.authenticateAndStartAnnotation(projectId);
      }
    });
  }

  private authenticateAndStartAnnotation(projectId: string) {
    // Initialize API service first
    const apiUrl = "http://localhost:3000";
    const appToken = "";

    console.log('Initializing API service...');
    this.store.dispatch(APIActions.init.do({
      url: apiUrl,
      appToken: appToken,
      authType: AccountLoginMethod.local,
      authenticated: false
    }));

    // Wait for API initialization and then authenticate
    this.store.select(state => state.authentication.serverOnline).pipe(
      filter(serverOnline => serverOnline !== undefined),
      take(1)
    ).subscribe(serverOnline => {
      if (serverOnline) {
        console.log('API initialized, logging in user...');
        
        // For VISP tasks, we'll use a simple local authentication
        // You might need to adjust this based on your authentication requirements
        this.authStoreService.loginOnline(
          AccountLoginMethod.local,
          'visp-user', // You might want to get this from the project or session
          undefined // No password for local method
        );

        // Wait for successful authentication
        this.authStoreService.authenticated$.pipe(
          filter(authenticated => authenticated === true),
          take(1)
        ).subscribe(() => {
          console.log('Authentication successful, fetching project...');
          this.fetchProjectAndStartAnnotation(projectId);
        });

        // Handle authentication failure
        this.store.select(state => state.authentication.loginErrorMessage).pipe(
          filter(error => !!error),
          take(1)
        ).subscribe(error => {
          console.error('Authentication failed:', error);
          // You might want to show an error message or redirect
        });
      } else {
        console.error('API server is not online');
        // Handle offline server case
      }
    });
  }

  private fetchProjectAndStartAnnotation(projectId: string) {
    console.log('Fetching project from VISP server...');
    
    fetch('http://localhost:3000/visp/project/' + projectId, {
    }).then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    }).then((octraProject: ProjectDto) => {
      console.log('Starting online annotation for project:', octraProject);
      
      // Start the online annotation process
      this.appStorage.startOnlineAnnotation(octraProject);

      // Navigate to transcription page
      console.log('Redirecting to transcription interface...');
      this.router.navigate(['/intern/transcr']);

    }).catch(error => {
      console.error('Error fetching VISP project:', error);
      // Handle project fetch error
    });
  }

}
