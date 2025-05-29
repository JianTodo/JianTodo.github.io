1. layout.html
<!--提示視窗-->
<p-toast position="top-right" autoZIndex="99" />

<!--遮罩-->
<p-blockUI [target]="blockTarget" [blocked]="(blockUi.Display$ | async)!">
  <p-progressSpinner ariaLabel="loading" />
</p-blockUI>

<p-confirmPopup />

<!--Menu-->
<div [ngClass]="menuStandaloneOrPartal">
  <app-menu (menuSelect)="onMenuSelect($event)"></app-menu>
</div>

2. layout.ts
import { Component, inject, OnInit } from '@angular/core';
import { BehaviorSubject, ReplaySubject } from 'rxjs';
import { environment } from '../environment';
import { BlockUI } from './main.base.blockui';
import { SharedModule } from './shared.module';
import { MenuComponent } from './components/menu.component';
import { TabComponent } from './components/tab.component';
import { IMenuInfo } from './models/interfaces/portal.menuInfo.interface';

@Component({
  selector: 'layout',
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
  standalone: true,
  imports: [SharedModule, MenuComponent]
})
export class Layout implements OnInit {
  blockTarget!: HTMLElement;
  blockUi: BlockUI = inject(BlockUI);

  menuStandaloneOrPartal: string = 'layoutMenu';
  tableViewStandaloneOrPartal: string = 'layoutTabview sizeTransform';

  ngOnInit(): void {
    this.blockUi.Target$.subscribe((item: any) => { this.blockTarget = item; });


    if (environment.standalone) {
      this.menuStandaloneOrPartal = 'layoutMenu layoutMenuStandalone';
      this.tableViewStandaloneOrPartal = 'layoutTabview sizeTransform layoutTabviewStandalone';
    }
  }

  onMenuSelect(menu: string){// IMenuInfo) {
    // console.log('你已經按了', menu);
  }
}
3. main.base.component.ts
import { ElementRef, inject, InjectionToken } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { ConfirmationService, MessageService } from "primeng/api";
import { BlockUI } from "./main.base.blockui";
import { StringUtil } from "./extensions/string.extension";
import { TabCommunicationService } from "./services/tab-communication.service";

export const TabId = new InjectionToken<string>('tabId');

export abstract class BaseComponent {
  protected tabId = inject(TabId);
  /**
   * string 擴充
   * @protected
   * @memberof BaseComponent
   */
  protected string = StringUtil;

  /**
   * Message service used in messages and toast components.
   * @protected
   * @type {MessageService}
   * @memberof BaseComponent
   */
  protected Msg: MessageService = inject(MessageService);
  protected MsgBox: ConfirmationService = inject(ConfirmationService);
  translateSvc: TranslateService = inject(TranslateService);

  /**
   * 遮罩控制服務
   * @private
   * @type {BlockUI}
   * @memberof BaseComponent
   */
  private blockUiService: BlockUI = inject(BlockUI);
  /**
   * 顯示遮罩
   * @param target
   */
  protected showBlock(target: ElementRef<HTMLElement>) { this.blockUiService.toggle(target, true); }
  /**
   * 隱藏遮罩
   * @param target
   */
  protected hideBlock(target: ElementRef<HTMLElement>) { this.blockUiService.toggle(target, false); }

  /**
   * Tab 溝通橋樑
   * @protected
   * @memberof BaseComponent
   */
  protected tabComm = inject(TabCommunicationService);
  sendMessage(data: any) {
    this.tabComm.sendMessage(this.tabId, data);
  }
}

4. menu.component.ts
import { Component, EventEmitter, Inject, OnInit, Output } from "@angular/core";
import { Router } from "@angular/router";
import { MenuItem } from "primeng/api";
import { StringUtil } from "../extensions/string.extension";
import { SharedModule } from "../shared.module";
import { authorizeToken } from "../main";
import { IAuthorize } from "../models/interfaces/portal.authorize.interface";
import { PortalAppData } from "../services/portal.service";
import { environment } from "../../environment";
import { lastValueFrom } from "rxjs";
import { IMenuInfo } from "../models/interfaces/portal.menuInfo.interface";

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  standalone: true,
  imports: [SharedModule]
})
export class MenuComponent  implements OnInit {
  protected string = StringUtil;

  menuItems: MenuItem[] = [];
  @Output() menuSelect = new EventEmitter<string>();

  constructor(
    private router: Router,
    @Inject(authorizeToken) private iauthorize: IAuthorize,
    private portalAppData: PortalAppData
  ) {
  }

  async ngOnInit(): Promise<void> {
    let menus: IMenuInfo[] = [];
    if (environment.mockMenu) {
      menus = this.router.config
        .Where(i => i.data != null || i.data != undefined)
        .Select(i => {
          const tmp = i.data as IMenuInfo;
          tmp.lib = i.path ?? '';
          return tmp;
        });
    }
    else {
      const userData = this.portalAppData.userDataChange$?.value;
      const currentUserId = userData?.currentAgent?.userId || userData?.currentAccount?.userId || '';
      menus = await lastValueFrom(this.iauthorize.getMenuList(userData!.envId, environment.sysId, currentUserId));
    }

    if (menus.length === 0) return;

    this.menuItems = menus.Where(i => !this.string.IsNullOrEmpty(i.lib))
      .Select(i => {
        i.lib = i.lib.length > 1 && i.lib[0] == '/' ? i.lib.slice(1) : i.lib;
        return i;
      })
      .GroupBy(i => ({ menuName: i.menuName, menuId: i.menuId }))
      .OrderBy(i => i.key.menuId)
      .Select<MenuItem>(i => {
        const items = i.values.Where(j => !this.string.IsNullOrEmpty(j.funcId));
        return (items.length > 0 ?
          {
            label: i.key.menuName,
            items: items.OrderBy(j => j.funcSort)
              .Select(j => (
                {
                  label: j.funcName,
                  routerLink: j.lib,
                  command: () => this.menuSelect.emit(j.lib)
                }) as MenuItem)
          } :
          {
            label: i.key.menuName,
            routerLink: i.values.FirstOrDefault()!.lib,
            command: () => this.menuSelect.emit(i.values.FirstOrDefault()!.lib)
          }) as MenuItem;
      });
  }
}

5. page1.component.ts
import { Component, OnInit } from '@angular/core';
import { BaseComponent } from '../main.base.component';
import { SharedModule } from '../shared.module';

@Component({
  selector: 'app-page1',
  templateUrl: './page1.component.html',
  styleUrl: './page1.component.scss',
  standalone: true,
  imports: [SharedModule]
})
export class Page1Component extends BaseComponent implements OnInit {
  constructor() {
    super();
  }

  ngOnInit() {
    // Tab間溝通監聽
    this.tabComm.message$.subscribe(msg => {
      if (msg.from !== this.tabId) {
        alert(`Page1 received message from ${msg.from}: ${JSON.stringify(msg.data)}`);
      }
    });
  }

  sendHello() {
    this.sendMessage({ text: 'Hello from Page1' });
  }
}
