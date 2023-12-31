/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*
*  Permission is hereby granted, free of charge, to any person obtaining a copy
*  of this software and associated documentation files (the ""Software""), to deal
*  in the Software without restriction, including without limitation the rights
*  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
*  copies of the Software, and to permit persons to whom the Software is
*  furnished to do so, subject to the following conditions:
*
*  The above copyright notice and this permission notice shall be included in
*  all copies or substantial portions of the Software.
*
*  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
*  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
*  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
*  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
*  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
*  THE SOFTWARE.
*/
"use strict";

import 'regenerator-runtime/runtime';

type Selection<T1, T2 = T1> = d3.Selection<any, T1, any, T2>;
import { base64conversion } from './base64conversion';
import { PDFViewSettings, FormatConfiguration } from './formattingmodel';
import { getValue } from "./objectEnumerationUtility";
import { 
  createWarningTextNode,
  createHeader,
  createPdfContainer,
  createLandingContainer,
  toggleScrollOverflow,
  toggleHeaderVisibility,
  evaluateArrowButtons,
} from './layout';
import "./../style/visual.less";
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.entry';
import { PDFDocumentLoadingTask, RenderTask } from 'pdfjs-dist/types/src/display/api';
import { PDFPageProxy } from 'pdfjs-dist';
import powerbi from "powerbi-visuals-api";
import {createTooltipServiceWrapper, ITooltipServiceWrapper} from "powerbi-visuals-utils-tooltiputils";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost =  powerbi.extensibility.visual.IVisualHost;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import IVisualLicenseManager = powerbi.extensibility.IVisualLicenseManager;
import LicenseInfoResult =  powerbi.extensibility.visual.LicenseInfoResult;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import {
  select as d3Select
} from "d3-selection";
import * as crypto from 'crypto';

const defaultSettings: PDFViewSettings = {
  pdfViewerSettings: {
    showHeader: true,
    scrollOverflow: true,
    showExportButton: true
  }
};

export class Visual implements IVisual {
    
    private selectionElement: Selection<any>;
    private tooltipServiceWrapper: ITooltipServiceWrapper;
    public self: Visual;
    public target: HTMLElement;
    public host: IVisualHost
    public pdfContainer: HTMLDivElement;
    public context: CanvasRenderingContext2D;
    public canvas: HTMLCanvasElement
    public headerContainer: HTMLDivElement;
    public base64encodedString: string  = "";
    public loadingTask: PDFDocumentLoadingTask = undefined;
    public renderTask: RenderTask = undefined;
    public pageNumber: number = 1;
    public numberOfPages: number = 1;
    public rightArrow: HTMLButtonElement;
    public leftArrow: HTMLButtonElement;
    public zoomPlus: HTMLButtonElement;
    public zoomMinus: HTMLButtonElement;
    public zoomResetter: HTMLButtonElement;
    public exportToFileButton: HTMLButtonElement;
    public rightArrowSign: HTMLSpanElement;
    public leftArrowSign: HTMLSpanElement;
    public pageIndicatorSpan: HTMLSpanElement;
    public zoomIndicatorSpan: HTMLSpanElement;
    public zoom_reset_and_indicator: HTMLDivElement;
    public exportToFileButtoncallout: HTMLDivElement;
    public warningDiv: HTMLDivElement;
    public warningText: Text;
    public options: VisualUpdateOptions;
    public scrollOverflow: boolean;
    public headerIsPresentable: boolean;
    public zoomLevel: number = 1.0;
    public pdfViewSettings: PDFViewSettings;
    public pdfFileName: string;
    public pageViewportWidth: number;
    public pageViewportHeight: number;
    public visualViewportWidth: number;
    public visualViewportHeight: number;
    public calculatedHeaderHeight: number;
    
    public licenseManager: IVisualLicenseManager;
    public notificationType: number;
    public hasServicePlans: boolean;
    public isLicensed: boolean = false;

    private events: IVisualEventService;
    private selectionManager: ISelectionManager;

    public landingDivElement: HTMLDivElement;
    public landingImage: HTMLImageElement;
    private isLandingPageOn: boolean;
    
    public static readonly SCROLLBAR_WIDTH = 18; // Fixed number for scroll bar width
       
    constructor(options: VisualConstructorOptions) {
      this.licenseManager = options.host.licenseManager;

      const planName = "pdfviewer_plan";
    
      this.licenseManager.getAvailableServicePlans()
        .then((result: LicenseInfoResult) => {
          this.notificationType = result.isLicenseUnsupportedEnv
            ? powerbi.LicenseNotificationType.UnsupportedEnv
            : powerbi.LicenseNotificationType.General;
          
          this.hasServicePlans = !!(
            result.plans &&
            result.plans.length &&
            keywordExistsInString(planName, result.plans[0].spIdentifier) &&
            (result.plans[0].state === powerbi.ServicePlanState.Active || result.plans[0].state === powerbi.ServicePlanState.Warning)
          );
    
          if (!this.hasServicePlans) {
            this.isLicensed = false;
          } else { 
            this.isLicensed = true;
          }
        })
        .catch((err) => {
          this.hasServicePlans = undefined;
          console.log(err);
        });
 
      this.selectionManager = options.host.createSelectionManager();
    
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
    
      this.target = options.element;
      this.host = options.host;
      this.self = this;
    
      this.scrollOverflow = false;
      this.headerIsPresentable = false;
      this.isLandingPageOn = false;
    
      this.events = options.host.eventService;
    
      createWarningTextNode(this.self);
      createHeader(this.self);
      createPdfContainer(this.self);
      createLandingContainer(this.self);

      this.selectionElement = d3Select(this.canvas);

      this.tooltipServiceWrapper = createTooltipServiceWrapper(this.host.tooltipService);

      this.handleContextMenu();
    
      options.host.refreshHostData();
    }

    public update(options: VisualUpdateOptions) {
           
      this.events.renderingStarted(options);

      this.options = options;

      this.warningDiv.hidden = true;

      this.HandleLandingPage(options);
      
      if(!this.isLandingPageOn) this.renderPdf(options);

      this.events.renderingFinished(options);
    
      return;
    }

    private HandleLandingPage(options: VisualUpdateOptions) {
      
      if(!options.dataViews || !options.dataViews[0]?.metadata?.columns?.length){
          if(!this.isLandingPageOn) {
              this.isLandingPageOn = true;
              this.landingDivElement.style.display = ''
              this.pdfContainer.style.display = 'none'
              this.headerContainer.style.display = 'none'
          }

      } else {
          if(this.isLandingPageOn){
              this.isLandingPageOn = false;
              this.landingDivElement.style.display = 'none'
              this.pdfContainer.style.display = ''
              this.headerContainer.style.display = ''
          }
      }

      this.adjustLandingSize();

    }

    private renderPdf(options: VisualUpdateOptions) {
      
      const { dataViews } = options;
      const { objects } = dataViews[0].metadata;
      const { rows, columns } = dataViews[0].table;
    
      this.visualViewportWidth = options.viewport.width;
      this.visualViewportHeight = options.viewport.height;
    
      const pdfViewSettings: PDFViewSettings = {
        pdfViewerSettings: {
          showHeader: getValue<boolean>(objects, 'dataCard', 'showHeader', defaultSettings.pdfViewerSettings.showHeader),
          scrollOverflow: getValue<boolean>(objects, 'dataCard', 'scrollOverflow', defaultSettings.pdfViewerSettings.scrollOverflow),
          showExportButton: getValue<boolean>(objects, 'dataCard', 'showExportButton', defaultSettings.pdfViewerSettings.showExportButton),
        }
      };
      
      
      this.pdfViewSettings = pdfViewSettings;
    
      const Base64Conversion = new base64conversion();
      
      const pdfDataIndex = findIndexInColumns(columns, "pdfData");
      const pdfFileNameIndex = findIndexInColumns(columns, "pdfFileName");
      const pdfTooltipIndex = findIndexInColumns(columns, "tooltipData");

      /* Only one document must be selected */
      if (!rows || rows.length !== 1) {
        this.showWarning("The visual must be filtered to one document in order to be displayed");
        return;
      }
      
      /* generate a GUID if pdf name field is not used*/
      this.pdfFileName = rows[0][pdfFileNameIndex]?.toString() || generateGUID();  
      
      const newBase64String = rows[0][pdfDataIndex]?.toString();
  
      if (!newBase64String || !Base64Conversion.isBase64(newBase64String)) {
        this.showWarning(
          (!newBase64String ? "No pdf document is selected or pdf base 64 data is empty" :
          "The selected pdf document is not properly formatted to base64"));
        return;
      }

      const pdfDataIsMeasure = dataViews[0].metadata.columns[pdfDataIndex].isMeasure;
      const pdfFileNameIsMeasure = dataViews[0]?.metadata?.columns[pdfFileNameIndex]?.isMeasure ?? false;
      const pdfTooltipIsMeasure = dataViews[0]?.metadata?.columns[pdfTooltipIndex]?.isMeasure ?? false;
  
      if (!this.isLicensed) {
        if (pdfDataIsMeasure || pdfFileNameIsMeasure || pdfTooltipIsMeasure) {
          const licenseTooltip = "Using measures is only available in the licensed version"
          this.showWarning(licenseTooltip);
          this.licenseManager.notifyFeatureBlocked(licenseTooltip);
          setTimeout(() => {
            this.licenseManager.clearLicenseNotification();
          }, 5000);
          return;
        }
      }
      
      this.warningText.textContent = '';
      if (this.base64encodedString !== newBase64String) this.pageNumber = 1;
  
      this.base64encodedString = newBase64String;  
      const pdfAsArray = Base64Conversion.convertDataURIToBinary(this.base64encodedString);
  
      this.loadingTask = pdfjsLib.getDocument({ data: pdfAsArray });
      this.processLoadingTask();
      
      if (pdfTooltipIndex) {
        this.tooltipServiceWrapper.addTooltip(this.selectionElement,
          () =>
          [{
            displayName: dataViews[0]?.metadata?.columns[pdfTooltipIndex].displayName, 
            value: rows[0][pdfTooltipIndex].toString()
          }]
        );
      }

      this.selectionElement.on("mouseover.tooltip", () => {
        if (!pdfTooltipIndex) { 
          this.tooltipServiceWrapper.hide()
        }
      })        
    }

    
    private showWarning(errorMessage: string) {
      this.warningDiv.hidden = false;
      this.base64encodedString = "(dummy)";
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
      this.headerIsPresentable = false;
      this.scrollOverflow = false;
      toggleHeaderVisibility(this.self);
      toggleScrollOverflow(this.self);
    
      this.warningText.textContent = errorMessage;
    }
    
    private processLoadingTask() {
      this.loadingTask.promise
        .then((pdf) => {
          this.numberOfPages = pdf.numPages;
          pdf.getPage(this.pageNumber)
            .then((page) => {
              this.adjustSizeAndToggle();
              this.processPage(page);
            })
            .catch((error) => {
              console.error('Error occurred during page processing:', error);
            });
        })
        .catch((reason) => {
          console.error('Error occurred during loading task:', reason);
        });
    }
    

    private processPage(page: PDFPageProxy) {
 
      const scale: number = 3;
      const viewport = page.getViewport({ scale: scale });
      const pageViewportHeight = viewport.height; 
      const pageViewportWidth = viewport.width; 
      const heightWidthRatio = pageViewportHeight / pageViewportWidth;
    
      const visualViewportWidthSubtract = this.pdfViewSettings.pdfViewerSettings.showHeader ? this.calculatedHeaderHeight : 0;
    
      this.pdfContainer.style.height = `${this.visualViewportHeight - visualViewportWidthSubtract}px`;
      this.pdfContainer.style.width =  `${this.visualViewportWidth}px`;
  
      this.canvas.height = pageViewportHeight;
      this.canvas.width = pageViewportWidth;

      this.canvas.style.height = `${this.visualViewportWidth * heightWidthRatio * this.zoomLevel}px`;
      this.canvas.style.width = `${this.visualViewportWidth * this.zoomLevel - Visual.SCROLLBAR_WIDTH}px`; // - scrollbarWidth

      const renderContext = {
        canvasContext: this.context,
        viewport: viewport
      };
    
      /* cancel render in case new pdf is loaded before previous render is finished */
      if (this.renderTask !== undefined) {
        this.renderTask.cancel();
      }
    
      this.renderTask = page.render(renderContext);
    
      this.processRenderTask();
    }
    

    private processRenderTask() {
      this.renderTask.promise
        .then(() => {
          evaluateArrowButtons(this.self);
    
          this.headerIsPresentable = true;
          this.scrollOverflow = this.pdfViewSettings.pdfViewerSettings.scrollOverflow;
    
          this.pageIndicatorSpan.textContent = `${this.pageNumber} of ${this.numberOfPages}`;
          this.zoomIndicatorSpan.textContent = `${this.zoomLevel * 100}%`;
    
          this.adjustSizeAndToggle();
        })
        .catch((renderError) => {
          console.error('Error occurred during rendering:', renderError);
        });
    }
    

    private adjustSizeAndToggle() {
      let bottommostPoint = 0;
      let topmostPoint = 0;
    
      this.headerContainer.hidden = false;
    
      const headerChildren = Array.from(this.headerContainer.children);
      for (const child of headerChildren) {
        const childStyles = getComputedStyle(child);
        const childRect = child.getBoundingClientRect();
        const topPoint = childRect.top + parseInt(childStyles.marginTop);
        const bottomPoint = childRect.bottom + parseInt(childStyles.marginBottom);
        bottommostPoint = Math.max(bottomPoint, bottommostPoint);
        topmostPoint = Math.min(topPoint, topmostPoint);
      }
    
      this.calculatedHeaderHeight = bottommostPoint - topmostPoint;
      this.headerContainer.style.height = `${this.calculatedHeaderHeight}px`;
    
      toggleHeaderVisibility(this.self);
      toggleScrollOverflow(this.self);
    }

    private adjustLandingSize() {

      const width = this.target.clientWidth;
      const height = this.target.clientHeight;
      const heightAndWidth = Math.min(width, height);

      this.landingImage.setAttribute("width", `${heightAndWidth}px`);
      this.landingImage.setAttribute("height", `${heightAndWidth}px`);
    }

    private handleContextMenu() {    
      this.selectionElement.on('contextmenu', (event: PointerEvent, dataPoint) => {
        this.selectionManager.showContextMenu(dataPoint ? dataPoint: {}, {
            x: event.clientX,
            y: event.clientY
        });
        event.preventDefault();
      });
    }

    /**
     * Returns properties pane formatting model content hierarchies, properties and latest formatting values, Then populate properties pane.
     * This method is called once every time we open properties pane or when the user edit any format property. 
     */
    
    public getFormattingModel(): powerbi.visuals.FormattingModel {
      const formatConfiguration = new FormatConfiguration();
      return formatConfiguration.getFormatConfiguration(this.pdfViewSettings);     
    }
    
}

function keywordExistsInString(keyword: string, str: string): boolean {
  return str.includes(keyword);
}

function generateGUID(): string {
  const bytes = crypto.randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Set version to 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Set variant to RFC4122

  return bytes.toString('hex').substring(0, 8) +
         '-' + bytes.toString('hex').substring(8, 12) +
         '-4' + bytes.toString('hex').substring(13, 16) +
         '-' + bytes.toString('hex').substring(16, 20) +
         '-' + bytes.toString('hex').substring(20);
}

function findIndexInColumns(columns: powerbi.DataViewMetadataColumn[], columnName: string ) {
  for (let i = 0; i < columns.length; i++) {
    const column = columns[i];
    if (column.roles && columnName in column.roles) {
        return i; // Return the index if the columnName exists in roles
    }
  }
  return undefined; // Return undefined if the columnName is not found in any roles
}
