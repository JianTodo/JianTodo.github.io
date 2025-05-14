import { ApplicationConfig, importProvidersFrom, inject, InjectionToken, provideZoneChangeDetection } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { defineApplication, PlanetPortalApplication } from '@worktile/planet';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

import { routesSetting } from './app.routes';
import { environment } from '../environment';
import { RootComponent } from './core/component/root/root.component';
import { ErrorInterceptor } from './core/interceptors/error.interceptor';
import { TokenInterceptor } from './core/interceptors/token.interceptor';
import { ISysInfo } from './models/interfaces/sysInfo.interface';
import { PortalAppData } from './core/services/auth/portal-app-context.service';


const systemIdProvide = new InjectionToken<string>('system_id');
const sysInfoProvide = new InjectionToken<ISysInfo>('system_info');
const deployUrlProvide = new InjectionToken<string>('deployUrl');

const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routesSetting),
    provideAnimations(),
    provideHttpClient(withInterceptors([
      TokenInterceptor,
      ErrorInterceptor
    ])),
    { provide: Storage, useValue: sessionStorage },
    MessageService
  ]
};

if (environment.standalone && environment.localRun) { //本地執行(ng-serve)

  appConfig.providers = appConfig.providers.concat([
    {
      provide: PortalAppData,
      useClass: PortalAppData
    },
    {
      provide: sysInfoProvide,
      useValue: {}
    },
    {
      provide: SystemAuthorizeServiceInterfaceToken,
      useClass: SystemAuthorizeMock
    },
    {
      provide: AuthService,
      useFactory: (portalAppData: PortalAppData) => {
        let sysAuth = inject(SystemAuthorizeServiceInterfaceToken);
        return new AuthService(portalAppData, sysAuth);
      },
      deps: [PortalAppData, SystemAuthorizeServiceInterfaceToken]
    },
    importProvidersFrom(
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: (http: HttpClient) => new TranslateHttpLoader(http, `http://${environment.localUrl}:${environment.localPort}/static/${environment.sysId}/i18n/`, '.json'),
          deps: [HttpClient]
        },
        defaultLanguage: 'zh-tw'
      }),
      CommonModule,
      ToastModule
    )
  ]);

  bootstrapApplication(RootComponent, appConfig)
    .catch((err) => console.error(err));
}
else if (environment.standalone && environment.localRun === false) { //佈署(Standalone版本)
  appConfig.providers = appConfig.providers.concat([
    {
      provide: PortalAppData,
      useClass: PortalAppData
    },
    {
      provide: SystemAuthorizeServiceInterfaceToken,
      useClass: SystemAuthorizeMock
    },
    {
      provide: sysInfoProvide,
      useValue: {}
    },
    {
      provide: AuthService,
      useFactory: (portalAppData: PortalAppData) => {
        let sysAuth = inject(SystemAuthorizeServiceInterfaceToken);
        return new AuthService(portalAppData, sysAuth);
      },
      deps: [PortalAppData, SystemAuthorizeServiceInterfaceToken]
    },
    importProvidersFrom(
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: (http: HttpClient) => new TranslateHttpLoader(http, `http://${environment.localUrl}/${environment.sysId}/i18n/`, '.json'
          ),
          deps: [HttpClient]
        },
        defaultLanguage: 'zh-tw'
      }),
      CommonModule,
      ToastModule
    )
  ]);

  bootstrapApplication(RootComponent, appConfig)
    .catch((err) => console.error(err));
}
else { //production版本(Portal)
  defineApplication(environment.sysId, {
    template: `<app-root></app-root>`,
    bootstrap: (portalApp: PlanetPortalApplication) => {
      const { currentSysList } = portalApp.data.userDataChange$.value;
      const sysInfo = currentSysList.find((sys: { sysId: string; }) => sys.sysId === environment.sysId);
      const deployUrl = `${sysInfo?.hostAddr || `/static/${environment.sysId}`}/`;
      const i18nUrl = environment.localRun === true && environment.production === true
        ? `http://${environment.localUrl}:${environment.localPort}/static/${environment.sysId}}/i18n/`
        : `${sysInfo.hostAddr}/i18n/`;

      appConfig.providers = appConfig.providers.concat([
        {
          provide: systemIdProvide,
          useValue: environment.sysId,
        },
        {
          provide: sysInfoProvide,
          useValue: sysInfo
        },
        {
          provide: deployUrlProvide,
          useValue: deployUrl
        },
        {
          provide: PlanetPortalApplication,
          useValue: portalApp
        },
        {
          provide: PortalAppData,
          useValue: portalApp.data,
        },
        {
          provide: SystemAuthorizeServiceInterfaceToken,
          useFactory: (http: HttpClient, portalData: PortalAppData) => new SystemAuthorizeService(http, portalData),
          deps: [HttpClient, PortalAppData]
        },
        {
          provide: AuthService,
          useClass: AuthService
        },
        importProvidersFrom(
          TranslateModule.forRoot({
            loader: {
              provide: TranslateLoader,
              useFactory: (http: HttpClient) => new TranslateHttpLoader(http, i18nUrl, '.json'),
              deps: [HttpClient]
            },
            defaultLanguage: 'zh-tw'
          }),
          CommonModule,
          ToastModule
        )
      ]);

      return bootstrapApplication(RootComponent, appConfig)
        .catch((error: any) => {
          console.error(error);
          return null;
        });
    }
  });
}


