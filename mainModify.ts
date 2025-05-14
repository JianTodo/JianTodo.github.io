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
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';

// 其他 imports...

const systemIdProvide = new InjectionToken<string>('system_id');
const sysInfoProvide = new InjectionToken<ISysInfo>('system_info');
const deployUrlProvide = new InjectionToken<string>('deployUrl');

const commonProviders = [
  provideZoneChangeDetection({ eventCoalescing: true }),
  provideRouter(routesSetting),
  provideAnimations(),
  provideHttpClient(withInterceptors([TokenInterceptor, ErrorInterceptor])),
  { provide: Storage, useValue: sessionStorage },
  MessageService,
  providePrimeNG({
    theme: { preset: Aura },
    zIndex: { modal: 1100, overlay: 1000, menu: 1000, tooltip: 1100 },
    ripple: true
  })
];

const createTranslateLoader = (http: HttpClient, prefix: string) =>
  new TranslateHttpLoader(http, prefix, '.json');

const appConfig: ApplicationConfig = {
  providers: [...commonProviders]
};

const isStandalone = environment.standalone;
const isLocalRun = environment.localRun;

const standaloneProviders = [
  { provide: PortalAppData, useClass: PortalAppData },
  { provide: sysInfoProvide, useValue: {} },
  { provide: SystemAuthorizeServiceInterfaceToken, useClass: SystemAuthorizeMock },
  {
    provide: AuthService,
    useFactory: (portalAppData: PortalAppData) => {
      const sysAuth = inject(SystemAuthorizeServiceInterfaceToken);
      return new AuthService(portalAppData, sysAuth);
    },
    deps: [PortalAppData, SystemAuthorizeServiceInterfaceToken]
  },
  importProvidersFrom(
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: (http: HttpClient) =>
          createTranslateLoader(
            http,
            isLocalRun
              ? `http://${environment.localUrl}:${environment.localPort}/static/${environment.sysId}/i18n/`
              : `http://${environment.localUrl}/${environment.sysId}/i18n/`
          ),
        deps: [HttpClient]
      },
      defaultLanguage: 'zh-tw'
    }),
    CommonModule,
    ToastModule
  )
];

function getProductionProviders(portalApp: PlanetPortalApplication) {
  const { currentSysList } = portalApp.data.userDataChange$.value;
  const sysInfo = currentSysList.find((sys: { sysId: string }) => sys.sysId === environment.sysId);
  const deployUrl = `${sysInfo?.hostAddr || `/static/${environment.sysId}`}/`;
  const i18nUrl =
    isLocalRun && environment.production
      ? `http://${environment.localUrl}:${environment.localPort}/static/${environment.sysId}/i18n/`
      : `${sysInfo.hostAddr}/i18n/`;

  return [
    { provide: systemIdProvide, useValue: environment.sysId },
    { provide: sysInfoProvide, useValue: sysInfo },
    { provide: deployUrlProvide, useValue: deployUrl },
    { provide: PlanetPortalApplication, useValue: portalApp },
    { provide: PortalAppData, useValue: portalApp.data },
    {
      provide: SystemAuthorizeServiceInterfaceToken,
      useFactory: (http: HttpClient, portalData: PortalAppData) => new SystemAuthorizeService(http, portalData),
      deps: [HttpClient, PortalAppData]
    },
    { provide: AuthService, useClass: AuthService },
    importProvidersFrom(
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: (http: HttpClient) => createTranslateLoader(http, i18nUrl),
          deps: [HttpClient]
        },
        defaultLanguage: 'zh-tw'
      }),
      CommonModule,
      ToastModule
    )
  ];
}

// 抽象啟動函式
function startApp() {
  return isStandalone
    ? bootstrapApplication(RootComponent, {
        ...appConfig,
        providers: [...appConfig.providers, ...standaloneProviders]
      }).catch((err) => console.error(err))
    : defineApplication(environment.sysId, {
        template: `<app-root></app-root>`,
        bootstrap: (portalApp: PlanetPortalApplication) => {
          appConfig.providers.push(...getProductionProviders(portalApp));
          return bootstrapApplication(RootComponent, appConfig).catch((error) => {
            console.error(error);
            return null;
          });
        }
      });
}

// 執行啟動
startApp();
