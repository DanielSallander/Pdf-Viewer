import { Visual } from './visual';

  export function createHeaderContainer(self: Visual) {
    self.headerContainer = document.createElement('div');
  
    self.leftArrow = document.createElement('button');
    self.leftArrowSign = document.createElement('span');
    self.leftArrow.appendChild(self.leftArrowSign);
  
    self.rightArrow = document.createElement('button');
    self.rightArrowSign = document.createElement('span');
    self.rightArrow.appendChild(self.rightArrowSign);
  
    const pageIndicatorDiv = document.createElement('span');
    const pageIndicatorTextSpan = document.createElement('span');
    pageIndicatorTextSpan.textContent = 'Page: ';
    self.pageIndicatorSpan = document.createElement('span');
    pageIndicatorDiv.appendChild(pageIndicatorTextSpan);
    pageIndicatorDiv.appendChild(document.createElement('br'));
    pageIndicatorDiv.appendChild(self.pageIndicatorSpan);
  
    const vertical_sep1 = document.createElement('div');
    vertical_sep1.classList.add('vertical-sep');
  
    self.zoomPlus = document.createElement('button');
    self.zoomPlus.textContent = '+';
  
    self.zoomMinus = document.createElement('button');
    self.zoomMinus.textContent = '-';
  
    self.zoom_reset_and_indicator = document.createElement('div');
    self.zoomResetter = document.createElement('button');
    self.zoomResetter.textContent = 'Reset zoom';
  
    self.zoomIndicatorSpan = document.createElement('span');
  
    self.zoom_reset_and_indicator.appendChild(self.zoomIndicatorSpan);
    self.zoom_reset_and_indicator.appendChild(document.createElement('br'));
    self.zoom_reset_and_indicator.appendChild(self.zoomResetter);
  
    const vertical_sep2 = document.createElement('div');
    vertical_sep2.classList.add('vertical-sep');
  
    self.exportToFileButton = document.createElement('button');
    self.exportToFileButton.textContent = 'Export document';
  
    /* Append to header */
    appendElementsToHeaderContainer(self, [
      self.leftArrow,
      self.rightArrow,
      pageIndicatorDiv,
      vertical_sep1,
      self.zoomPlus,
      self.zoomMinus,
      self.zoom_reset_and_indicator,
      vertical_sep2,
      self.exportToFileButton,
    ]);
  
    setupElementClasses(self);
  
    createEventListeners(self);
  
    /* Hide header initially */
    hideHeaderContainer(self);
    self.target.appendChild(self.headerContainer);
  }
  
  function createEventListeners(self: Visual) {
    const zoomIncrementDecrement = 0.25;
  
    /* Arrows */
    const handleLeftArrowClick = () => {
      self.pageNumber = Math.max(1, self.pageNumber - 1);
      evaluateArrowButtons(self);
      self.update(self.options);
    };
  
    const handleRightArrowClick = () => {
      self.pageNumber = Math.min(self.numberOfPages, self.pageNumber + 1);
      evaluateArrowButtons(self);
      self.update(self.options);
    };
  
    /* Zoom buttons */
    const handleZoomPlusClick = () => {
      self.zoomLevel = Math.min(3.0, +(self.zoomLevel + zoomIncrementDecrement).toFixed(2));
      self.update(self.options);
    };
  
    const handleZoomMinusClick = () => {
      self.zoomLevel = Math.max(0.25, +(self.zoomLevel - zoomIncrementDecrement).toFixed(2));
      self.update(self.options);
    };
  
    /* Zoom reset */
    const handleZoomResetClick = () => {
      self.zoomLevel = 1;
      self.update(self.options);
    };
  
    /* Export to file button */
    const handleExportToFileClick = () => {
      if (self.isLicensed) {
        self.host.downloadService
          .exportVisualsContent(self.base64encodedString, `${self.pdfFileName}.pdf`, 'base64', 'pdf')
          .then(() => {
            console.log('Pdf downloaded');
          })
          .catch((reason) => {
            console.log(reason);
          });
      } else {
        /* Show popup message in case visual is not licensed */
        self.licenseManager.notifyFeatureBlocked('Exporting documents is only available in the licensed version');
        setTimeout(() => {
          self.licenseManager.clearLicenseNotification();
        }, 3000);
        
      }
    };
  
    self.leftArrow.addEventListener('click', handleLeftArrowClick);
    self.rightArrow.addEventListener('click', handleRightArrowClick);
    self.zoomPlus.addEventListener('click', handleZoomPlusClick);
    self.zoomMinus.addEventListener('click', handleZoomMinusClick);
    self.zoomResetter.addEventListener('click', handleZoomResetClick);
    self.exportToFileButton.addEventListener('click', handleExportToFileClick);
  }
  

  function appendElementsToHeaderContainer(self: Visual, elements: HTMLElement[]) {
    elements.forEach(element => {
      self.headerContainer.appendChild(element);
    });
  }
  
  function setupElementClasses(self: Visual) {
    self.zoomPlus.classList.add('zoom-button');
    self.zoomMinus.classList.add('zoom-button');
    self.rightArrow.classList.add('arrow-button');
    self.leftArrow.classList.add('arrow-button');
    self.zoom_reset_and_indicator.classList.add('zoom-reset-and-indicator');
    self.headerContainer.id = 'header-container';
    self.zoomPlus.id = 'zoom-plus';
    self.zoomMinus.id = 'zoom-minus';
    self.zoomResetter.id = 'zoom-resetter';
    self.zoomIndicatorSpan.id = 'zoom-indicator-span';
    self.exportToFileButton.id = 'export-to-file-button';
  }
  
  
  function hideHeaderContainer(self: Visual) {
    self.headerContainer.hidden = true;
  }


  export function createPdfContainer(self: Visual) {
    self.pdfContainer = document.createElement('div');
    self.pdfContainer.id = 'pdf-container';
  
    self.canvas = self.pdfContainer.appendChild(document.createElement('canvas'));
    self.canvas.id = 'pdf-canvas';
    self.context = self.canvas.getContext('2d');
  
    self.target.appendChild(self.pdfContainer);
  
    return;
  }
  

  export function toggleScrollOverflow(self: Visual): void {
    const { pdfContainer, canvas } = self;
    const SCROLL = 'scroll';
    const HIDDEN = 'hidden';
  
    pdfContainer.style.overflow = HIDDEN;
  
    if (self.scrollOverflow) {
      pdfContainer.style.overflowY = pdfContainer.clientHeight <= canvas.clientHeight ? SCROLL : HIDDEN;
      pdfContainer.style.overflowX = pdfContainer.clientWidth <= canvas.clientWidth ? SCROLL : HIDDEN;
    }
  }

  export function toggleHeaderVisibility(self: Visual): void {
    if (self.headerIsPresentable && self.pdfViewSettings.pdfViewerSettings.showHeader) {
      self.headerContainer.hidden = false;
    } else {
      self.headerContainer.hidden = true;
    }
  }
  

  export function createWarningTextNode(self: Visual) {
    self.warningText = document.createTextNode('');
  
    self.target.appendChild(self.warningText);
  
    return;
  }
  

  export function evaluateArrowButtons(self: Visual) {
    self.leftArrowSign.classList.remove('arrow-left-inactive', 'arrow-left');
    self.rightArrowSign.classList.remove('arrow-right-inactive', 'arrow-right');
  
    self.leftArrow.classList.remove('arrow-button-inactive', 'arrow-button');
    self.rightArrow.classList.remove('arrow-button-inactive', 'arrow-button');
  
    if (self.pageNumber <= 1 || self.numberOfPages <= 1) {
      self.leftArrowSign.classList.add('arrow-left-inactive');
      self.leftArrow.classList.add('arrow-button-inactive');
    } else {
      self.leftArrowSign.classList.add('arrow-left');
      self.leftArrow.classList.add('arrow-button');
    }
  
    if (self.pageNumber >= self.numberOfPages || self.numberOfPages <= 1) {
      self.rightArrowSign.classList.add('arrow-right-inactive');
      self.rightArrow.classList.add('arrow-button-inactive');
    } else {
      self.rightArrowSign.classList.add('arrow-right');
      self.rightArrow.classList.add('arrow-button');
    }
  }
  

